TrackPay Spec — Relationship-Only Hourly Rates (Final Implementation Version)
Objective

Make trackpay_relationships.hourly_rate the single source of truth for provider↔client pricing.
Remove all trackpay_users.hourly_rate usage.
Ensure all reads/writes and billing use the relationship rate only.

Assumptions

Environment: Pre-prod/staging (safe to wipe data).

Stack: Expo React Native + Supabase + PostHog.

Imports: Relative imports (no @/ alias).

Auth Helper: Uses current_trackpay_user_id() to map auth.uid() → trackpay_users.id.

Deliverables

Migration applied with timestamped file.

RLS: provider can insert/update; both sides can select.

All rate reads/writes via relationship helpers.

Unified billing function (supports crewSize).

UI copy clarifies “rate with” scope.

PostHog analytics events on create/edit.

QA checklist passes (including crew test).

1) Supabase — SQL Migration

Create: supabase/migrations/20251024120000_relationship_only_rates.sql

-- =====================================================================================
-- Relationship-only hourly rates migration
-- ⚠️ ONLY FOR STAGING/NON-PROD! Remove the TRUNCATE before any production migration.
-- =====================================================================================

-- ⚠️ STAGING WIPE: clears dependent tables
TRUNCATE TABLE trackpay_sessions, trackpay_requests, trackpay_relationships RESTART IDENTITY CASCADE;

-- ⚠️⚠️ EXTREMELY DANGEROUS: WIPES ALL USERS. DO NOT RUN IN PROD.
-- TRUNCATE TABLE trackpay_users RESTART IDENTITY CASCADE;

-- 1) Ensure one relationship per provider↔client
ALTER TABLE trackpay_relationships
  DROP CONSTRAINT IF EXISTS uq_relationship,
  ADD CONSTRAINT uq_relationship UNIQUE (provider_id, client_id);

-- 2) Ensure hourly_rate exists and is required, with integrity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='trackpay_relationships' AND column_name='hourly_rate'
  ) THEN
    ALTER TABLE trackpay_relationships ADD COLUMN hourly_rate NUMERIC(12,2);
  END IF;
END$$;

ALTER TABLE trackpay_relationships
  DROP CONSTRAINT IF EXISTS chk_rel_hourly_rate_nonneg,
  ADD CONSTRAINT chk_rel_hourly_rate_nonneg CHECK (hourly_rate >= 0);

ALTER TABLE trackpay_relationships
  ALTER COLUMN hourly_rate SET NOT NULL;

-- 3) Remove deprecated client-level rate
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='trackpay_users' AND column_name='hourly_rate'
  ) THEN
    ALTER TABLE trackpay_users DROP COLUMN hourly_rate;
  END IF;
END$$;

-- 4) RLS: both sides read; only provider writes
DROP POLICY IF EXISTS rel_select ON trackpay_relationships;
CREATE POLICY rel_select ON trackpay_relationships
FOR SELECT
USING (current_trackpay_user_id() = provider_id OR current_trackpay_user_id() = client_id);

DROP POLICY IF EXISTS rel_insert ON trackpay_relationships;
CREATE POLICY rel_insert ON trackpay_relationships
FOR INSERT
WITH CHECK (current_trackpay_user_id() = provider_id);

DROP POLICY IF EXISTS rel_update ON trackpay_relationships;
CREATE POLICY rel_update ON trackpay_relationships
FOR UPDATE
USING (current_trackpay_user_id() = provider_id)
WITH CHECK (current_trackpay_user_id() = provider_id);

-- (Optional for prod migration)
-- UPDATE trackpay_relationships r
-- SET hourly_rate = COALESCE(r.hourly_rate, u.hourly_rate, 0)
-- FROM trackpay_users u
-- WHERE r.client_id = u.id;

Rollback (if needed)
ALTER TABLE trackpay_users ADD COLUMN hourly_rate NUMERIC(12,2);
UPDATE trackpay_users u
SET hourly_rate = r.hourly_rate
FROM trackpay_relationships r
WHERE r.client_id = u.id;
ALTER TABLE trackpay_relationships ALTER COLUMN hourly_rate DROP NOT NULL;

Optional seed for testing
WITH lucy AS (SELECT id FROM trackpay_users WHERE email='lucy@example.com' LIMIT 1),
     mashaal AS (SELECT id FROM trackpay_users WHERE email='mashaal@example.com' LIMIT 1)
INSERT INTO trackpay_relationships (provider_id, client_id, hourly_rate)
SELECT lucy.id, mashaal.id, 28.00 FROM lucy, mashaal
ON CONFLICT (provider_id, client_id) DO UPDATE SET hourly_rate = EXCLUDED.hourly_rate;

2) Types

File: ios-app/src/types/index.ts

export type Relationship = {
  id: string;
  provider_id: string;
  client_id: string;
  hourly_rate: number; // $/hr — canonical source
  created_at?: string;
  // ...
};

// Clean Client type
export type Client = {
  id: string;
  name: string;
  email: string;
  claimedStatus: 'claimed' | 'unclaimed';
  // ❌ REMOVE: hourlyRate
};

3) Centralized Rate I/O

File: ios-app/src/services/relationshipRates.ts

import { supabase } from '../services/supabase';

export async function getRelationshipRate(providerId: string, clientId: string): Promise<number> {
  const { data, error } = await supabase
    .from('trackpay_relationships')
    .select('hourly_rate')
    .eq('provider_id', providerId)
    .eq('client_id', clientId)
    .single();
  if (error) throw error;
  return data.hourly_rate as number;
}

export async function upsertRelationshipRate(providerId: string, clientId: string, hourlyRate: number): Promise<void> {
  const { error } = await supabase
    .from('trackpay_relationships')
    .upsert({ provider_id: providerId, client_id: clientId, hourly_rate: hourlyRate },
            { onConflict: 'provider_id,client_id' });
  if (error) throw error;
}

4) Billing Function (Crew Support)

File: ios-app/src/services/billing.ts

import { getRelationshipRate } from './relationshipRates';

export async function computeSessionAmountUSD(opts: {
  providerId: string;
  clientId: string;
  minutes: number;
  crewSize?: number; // defaults to 1
}): Promise<number> {
  const rate = await getRelationshipRate(opts.providerId, opts.clientId); // $/hr
  const hours = Math.max(0, opts.minutes) / 60;
  const personHours = hours * (opts.crewSize ?? 1);
  return Number((rate * personHours).toFixed(2));
}

5) Writes — Create/Invite/Edit use relationship only

Touch:

ios-app/src/components/AddClientModal.tsx

ios-app/src/components/InviteClientModal.tsx

ios-app/src/services/storageService.ts

ios-app/src/services/directSupabase.ts

Example helper:

import { supabase } from '../services/supabase';

export async function createClientWithRelationship(input: {
  providerId: string;
  clientEmail: string;
  clientName: string;
  hourlyRate: number;
}) {
  const { data: client, error: userErr } = await supabase
    .from('trackpay_users')
    .insert({ email: input.clientEmail, name: input.clientName })
    .select('id')
    .single();
  if (userErr) throw userErr;

  const { error: relErr } = await supabase
    .from('trackpay_relationships')
    .insert({ provider_id: input.providerId, client_id: client.id, hourly_rate: input.hourlyRate });
  if (relErr) throw relErr;

  return { clientId: client.id, hourlyRate: input.hourlyRate };
}


Edit flow (provider-only):

import { capture } from '../services/analytics';
import { upsertRelationshipRate } from '../services/relationshipRates';

await upsertRelationshipRate(providerId, clientId, newRate);
capture('relationship_rate_changed', {
  provider_id: providerId,
  client_id: clientId,
  old_rate,
  new_rate: newRate,
  source: 'edit',
});

6) Reads — Update Screens

Touch:

ios-app/src/screens/ProviderProfileScreen.tsx

ios-app/src/screens/ClientProfileScreen.tsx

ios-app/src/screens/SessionTrackingScreen.tsx

ios-app/src/screens/StyledSessionTrackingScreen.tsx (if present)

ios-app/src/screens/ClientListScreen.tsx

ios-app/src/screens/ClientHistoryScreen.tsx

Example:

import { getRelationshipRate } from '../services/relationshipRates';
import { computeSessionAmountUSD } from '../services/billing';

const rate = await getRelationshipRate(providerId, clientId);
setHourlyRate(rate);

const amount = await computeSessionAmountUSD({ providerId, clientId, minutes, crewSize });
setAmount(amount);


UI copy:

Client view: “Your rate with {Provider}”

Provider view: “{Client}’s rate with you”

7) Remove Legacy References

Purge:

client.hourlyRate

trackpay_users.hourly_rate

Any “provider base rate” in billing logic (display-only OK).

8) Analytics (PostHog)

Add helper shim:

File: ios-app/src/services/analytics/index.ts

// Normalizes analytics imports
let _client: any = null;

export function setAnalyticsClient(client: any) {
  _client = client;
}

export function capture(event: string, props?: Record<string, any>) {
  if (!_client?.capture) return;
  _client.capture(event, props ?? {});
}

// default export for legacy imports
const defaultExport = { capture };
export default defaultExport;


Usage:

import posthog from '../services/analytics';
posthog.capture('relationship_rate_set', {...});

import { capture } from '../services/analytics';
capture('relationship_rate_changed', {...});

9) QA Checklist

 Migration applied; trackpay_users.hourly_rate removed.

 RLS works via current_trackpay_user_id().

 Provider can insert/update; client cannot.

 Client creation stores rate in relationship only.

 Provider view → “{Client}’s rate with you: $X/hr.”

 Client view → “Your rate with {Provider}: $X/hr.”

 30 min @ $28/hr (crew 1) = $14.00.

 60 min @ $35/hr (crew 1) = $35.00.

 30 min @ $28/hr (crew 2) = $28.00 (two person-hours).

 All session screens (incl. Styled) use computeSessionAmountUSD.

 No client-level hourly references remain.

 PostHog events fire on create/edit.

10) Commands
# Apply DB changes
supabase db push   # or supabase db reset for staging only

# Type-check & run
pnpm tsc -b
pnpm lint
pnpm dev  # or expo start

11) Optional Improvements

Inline editable rate field (provider-only) with validation (>= 0, 2 decimals).

Batch-fetch rates for client list views (perf optimization later).