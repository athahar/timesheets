-- TrackPay: Fix FK Constraints - SAFE SEQUENTIAL VERSION
-- Created: 2025-10-15
-- Purpose: Avoid deadlocks by running in careful order

-- ============================================================================
-- PRE-FLIGHT: Check for Active Queries
-- ============================================================================
-- Run this first to see what's blocking:
-- SELECT pid, usename, application_name, state, query
-- FROM pg_stat_activity
-- WHERE datname = current_database()
--   AND state != 'idle'
--   AND pid != pg_backend_pid();
--
-- If you see active queries, wait for them to complete or:
-- SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE ...;

-- ============================================================================
-- IMPORTANT: Run Each Section Separately (Copy/Paste One at a Time)
-- ============================================================================
-- DO NOT run the entire file at once - this causes deadlocks
-- Run each BEGIN/COMMIT block individually in Supabase SQL Editor

-- ============================================================================
-- SECTION 1: Fix trackpay_sessions (Most Critical)
-- ============================================================================
BEGIN;

ALTER TABLE public.trackpay_sessions
  DROP CONSTRAINT IF EXISTS trackpay_sessions_client_id_fkey;

ALTER TABLE public.trackpay_sessions
  ADD CONSTRAINT trackpay_sessions_client_id_fkey
    FOREIGN KEY (client_id)
    REFERENCES public.trackpay_users(id)
    ON DELETE RESTRICT;

COMMIT;

-- Wait 5 seconds, then run next section
-- ============================================================================
-- SECTION 2: Fix trackpay_sessions provider
-- ============================================================================
BEGIN;

ALTER TABLE public.trackpay_sessions
  DROP CONSTRAINT IF EXISTS trackpay_sessions_provider_id_fkey;

ALTER TABLE public.trackpay_sessions
  ADD CONSTRAINT trackpay_sessions_provider_id_fkey
    FOREIGN KEY (provider_id)
    REFERENCES public.trackpay_users(id)
    ON DELETE RESTRICT;

COMMIT;

-- ============================================================================
-- SECTION 3: Fix trackpay_relationships (Missing from original!)
-- ============================================================================
BEGIN;

ALTER TABLE public.trackpay_relationships
  DROP CONSTRAINT IF EXISTS trackpay_relationships_client_id_fkey;

ALTER TABLE public.trackpay_relationships
  ADD CONSTRAINT trackpay_relationships_client_id_fkey
    FOREIGN KEY (client_id)
    REFERENCES public.trackpay_users(id)
    ON DELETE RESTRICT;

COMMIT;

-- ============================================================================
-- SECTION 4: Fix trackpay_relationships provider
-- ============================================================================
BEGIN;

ALTER TABLE public.trackpay_relationships
  DROP CONSTRAINT IF EXISTS trackpay_relationships_provider_id_fkey;

ALTER TABLE public.trackpay_relationships
  ADD CONSTRAINT trackpay_relationships_provider_id_fkey
    FOREIGN KEY (provider_id)
    REFERENCES public.trackpay_users(id)
    ON DELETE RESTRICT;

COMMIT;

-- ============================================================================
-- SECTION 5: Fix trackpay_payments
-- ============================================================================
BEGIN;

ALTER TABLE public.trackpay_payments
  DROP CONSTRAINT IF EXISTS trackpay_payments_client_id_fkey;

ALTER TABLE public.trackpay_payments
  ADD CONSTRAINT trackpay_payments_client_id_fkey
    FOREIGN KEY (client_id)
    REFERENCES public.trackpay_users(id)
    ON DELETE RESTRICT;

ALTER TABLE public.trackpay_payments
  DROP CONSTRAINT IF EXISTS trackpay_payments_provider_id_fkey;

ALTER TABLE public.trackpay_payments
  ADD CONSTRAINT trackpay_payments_provider_id_fkey
    FOREIGN KEY (provider_id)
    REFERENCES public.trackpay_users(id)
    ON DELETE RESTRICT;

COMMIT;

-- ============================================================================
-- SECTION 6: Fix trackpay_requests
-- ============================================================================
BEGIN;

ALTER TABLE public.trackpay_requests
  DROP CONSTRAINT IF EXISTS trackpay_requests_client_id_fkey;

ALTER TABLE public.trackpay_requests
  ADD CONSTRAINT trackpay_requests_client_id_fkey
    FOREIGN KEY (client_id)
    REFERENCES public.trackpay_users(id)
    ON DELETE RESTRICT;

ALTER TABLE public.trackpay_requests
  DROP CONSTRAINT IF EXISTS trackpay_requests_provider_id_fkey;

ALTER TABLE public.trackpay_requests
  ADD CONSTRAINT trackpay_requests_provider_id_fkey
    FOREIGN KEY (provider_id)
    REFERENCES public.trackpay_users(id)
    ON DELETE RESTRICT;

COMMIT;

-- ============================================================================
-- SECTION 7: Fix trackpay_activities
-- ============================================================================
BEGIN;

ALTER TABLE public.trackpay_activities
  DROP CONSTRAINT IF EXISTS trackpay_activities_client_id_fkey;

ALTER TABLE public.trackpay_activities
  ADD CONSTRAINT trackpay_activities_client_id_fkey
    FOREIGN KEY (client_id)
    REFERENCES public.trackpay_users(id)
    ON DELETE RESTRICT;

ALTER TABLE public.trackpay_activities
  DROP CONSTRAINT IF EXISTS trackpay_activities_provider_id_fkey;

ALTER TABLE public.trackpay_activities
  ADD CONSTRAINT trackpay_activities_provider_id_fkey
    FOREIGN KEY (provider_id)
    REFERENCES public.trackpay_users(id)
    ON DELETE RESTRICT;

COMMIT;

-- ============================================================================
-- SECTION 8: Fix trackpay_invites (Use CASCADE for cleanup)
-- ============================================================================
BEGIN;

-- Invites are ephemeral - can safely cascade
ALTER TABLE public.trackpay_invites
  DROP CONSTRAINT IF EXISTS trackpay_invites_client_id_fkey;

ALTER TABLE public.trackpay_invites
  ADD CONSTRAINT trackpay_invites_client_id_fkey
    FOREIGN KEY (client_id)
    REFERENCES public.trackpay_users(id)
    ON DELETE CASCADE;

ALTER TABLE public.trackpay_invites
  DROP CONSTRAINT IF EXISTS trackpay_invites_provider_id_fkey;

ALTER TABLE public.trackpay_invites
  ADD CONSTRAINT trackpay_invites_provider_id_fkey
    FOREIGN KEY (provider_id)
    REFERENCES public.trackpay_users(id)
    ON DELETE CASCADE;

-- Keep invite record but NULL the claimer if they're deleted
ALTER TABLE public.trackpay_invites
  DROP CONSTRAINT IF EXISTS trackpay_invites_claimed_by_fkey;

ALTER TABLE public.trackpay_invites
  ADD CONSTRAINT trackpay_invites_claimed_by_fkey
    FOREIGN KEY (claimed_by)
    REFERENCES public.trackpay_users(id)
    ON DELETE SET NULL;

COMMIT;

-- ============================================================================
-- SECTION 9: Remove DELETE Policy (Force RPC-Only)
-- ============================================================================
BEGIN;

DROP POLICY IF EXISTS rel_delete_by_provider ON public.trackpay_relationships;
REVOKE DELETE ON public.trackpay_relationships FROM authenticated;

COMMIT;

-- ============================================================================
-- SECTION 10: Create Audit Table
-- ============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.trackpay_relationship_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  client_id uuid NOT NULL,
  action text NOT NULL,
  reason text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_relationship_audit_provider_created
  ON public.trackpay_relationship_audit(provider_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_relationship_audit_client_created
  ON public.trackpay_relationship_audit(client_id, created_at DESC);

ALTER TABLE public.trackpay_relationship_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_select_by_provider ON public.trackpay_relationship_audit;
CREATE POLICY audit_select_by_provider
  ON public.trackpay_relationship_audit
  FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

COMMIT;

-- ============================================================================
-- SECTION 11: Update RPC with Audit Logging
-- ============================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.delete_client_relationship_safely(p_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_provider uuid := auth.uid();
  v_deleted  boolean := false;
  v_reason   text := null;
BEGIN
  IF v_provider IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  WITH del AS (
    DELETE FROM public.trackpay_relationships r
    WHERE r.provider_id = v_provider
      AND r.client_id = p_client_id
      AND NOT EXISTS (
        SELECT 1 FROM public.trackpay_sessions s
        WHERE s.provider_id = v_provider
          AND s.client_id = p_client_id
          AND s.status IN ('active', 'unpaid', 'requested')
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.trackpay_requests pr
        WHERE pr.provider_id = v_provider
          AND pr.client_id = p_client_id
          AND pr.status IN ('pending', 'sent', 'requested')
      )
    RETURNING 1
  )
  SELECT true INTO v_deleted FROM del;

  IF v_deleted THEN
    INSERT INTO public.trackpay_relationship_audit (provider_id, client_id, action, created_at)
    VALUES (v_provider, p_client_id, 'delete_success', now());
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.trackpay_sessions s
    WHERE s.provider_id = v_provider
      AND s.client_id = p_client_id
      AND s.status IN ('active', 'unpaid', 'requested')
  ) THEN
    v_reason := 'active_or_unpaid_sessions';
    INSERT INTO public.trackpay_relationship_audit (provider_id, client_id, action, reason, created_at)
    VALUES (v_provider, p_client_id, 'delete_blocked', v_reason, now());
    RAISE EXCEPTION 'Cannot delete. Active or unpaid sessions exist.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.trackpay_requests pr
    WHERE pr.provider_id = v_provider
      AND pr.client_id = p_client_id
      AND pr.status IN ('pending', 'sent', 'requested')
  ) THEN
    v_reason := 'outstanding_payment_requests';
    INSERT INTO public.trackpay_relationship_audit (provider_id, client_id, action, reason, created_at)
    VALUES (v_provider, p_client_id, 'delete_blocked', v_reason, now());
    RAISE EXCEPTION 'Cannot delete. Outstanding payment requests exist.';
  END IF;

  INSERT INTO public.trackpay_relationship_audit (provider_id, client_id, action, created_at)
  VALUES (v_provider, p_client_id, 'delete_already_gone', now());
  RETURN false;
END $$;

ALTER FUNCTION public.delete_client_relationship_safely(uuid) SET search_path = public;
ALTER FUNCTION public.delete_client_relationship_safely(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.delete_client_relationship_safely(uuid) TO authenticated;

COMMIT;

-- ============================================================================
-- SECTION 12: Verification
-- ============================================================================
-- Run this to verify all constraints are correct:
SELECT
  conname,
  conrelid::regclass AS table_name,
  CASE confdeltype
    WHEN 'r' THEN 'RESTRICT ✅'
    WHEN 'c' THEN 'CASCADE ⚠️'
    WHEN 'n' THEN 'SET NULL'
    WHEN 'a' THEN 'NO ACTION'
  END AS delete_action
FROM pg_constraint
WHERE conname LIKE '%trackpay_%_fkey'
  AND contype = 'f'
ORDER BY table_name, conname;

-- Expected:
-- trackpay_sessions: RESTRICT ✅
-- trackpay_relationships: RESTRICT ✅
-- trackpay_payments: RESTRICT ✅
-- trackpay_requests: RESTRICT ✅
-- trackpay_activities: RESTRICT ✅
-- trackpay_invites (client_id, provider_id): CASCADE ⚠️ (intentional)
-- trackpay_invites (claimed_by): SET NULL (intentional)
