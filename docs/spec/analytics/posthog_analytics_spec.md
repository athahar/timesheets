Claude Code Spec — PostHog Analytics for TrackPay
0) Objectives (what success looks like)

Measure provider/client onboarding, session-to-payment velocity, and invite conversion.

Keep event set lean (≈20–25 events) with consistent names + properties.

Support 2-sided analysis via PostHog Groups (provider, client).

Be privacy-light (no PII), production-ready, and testable.

1) SDK & project wiring

Dependencies

posthog-react-native (latest)

@react-navigation/native (already present)

zod (for schema validation) — optional but recommended

Env

POSTHOG_KEY

POSTHOG_HOST (e.g., https://app.posthog.com or self-host)

App init (one place only)

Initialize PostHog on app start

Enable lifecycle/device capture

Respect a user-facing analytics toggle (opt-out)

2) File layout (create these files)
src/lib/analytics/posthog.ts           // SDK init, identify/alias, group helpers, capture wrapper
src/lib/analytics/events.ts            // Event name constants + payload zod schemas
src/lib/analytics/context.tsx          // AnalyticsProvider: attaches global context, opt-in/out
src/lib/analytics/navigation.ts        // Navigation listener (screen_view_* events)
src/lib/analytics/flags.ts             // Feature flags (invite modal, etc.)
src/lib/analytics/error.ts             // Error capturing utilities (boundary hook)
src/lib/analytics/qa.ts                // Test helpers & dry-run logger for dev
src/types/ids.ts                       // Branded types for ids (ProviderId, ClientId, SessionId)

3) Naming standard (strict)

Event names: snake_case, pattern = {category}_{object}_{action}
Examples: auth_register_submitted, business_payment_confirmed, screen_view_client_list.

Property keys: snake_case only. Reuse enums across events.

4) Global context (sent on every event)

Attach via wrapper/context; do not repeat in every call.

{ 
  user_id,          // internal uuid (non-PII)
  user_role,        // "provider" | "client" | "guest"
  app_version,      // "1.0.3"
  build_number,     // 42
  platform,         // "ios" | "android"
  os_version,       // "17.2"
  device_model,     // "iPhone 14"
  language,         // "en-US"
  timezone,         // "America/Los_Angeles"
  session_id,       // app session uuid
  storage_mode      // "local_only" | "cloud_synced"
}

5) Minimal event dictionary (ship this first)
5.1 Screen views (navigation listener)

screen_view_client_list → { previous_screen? }

screen_view_session_tracking → { previous_screen?, client_id? }

screen_view_client_history → { client_id }

screen_view_provider_list → { } // for client role

screen_view_provider_summary → { provider_id }

screen_view_invite_claim → { deep_link: true, invite_code }

5.2 Auth & lifecycle

auth_register_submitted → { user_role, success, error_code? }

business_user_registered → { user_role, registration_method, invite_code?, provider_id? }

business_user_activated → { activation_action, days_since_registration }
Activation action = first meaningful action by role (e.g., start session or send payment).

5.3 Sessions (core)

action_session_started → { client_id, crew_size, hourly_rate, start_time }

action_session_stopped → { session_id, client_id, total_duration_minutes, crew_size, person_hours, hourly_rate, total_amount }

business_session_completed → { session_id, provider_id, client_id, duration_minutes, crew_size, person_hours, hourly_rate, total_amount, start_time, end_time }

5.4 Payments (core)

action_payment_requested → { session_id, client_id, amount, success }

business_payment_requested → { payment_request_id, session_id, provider_id, client_id, amount, requested_at }

action_payment_sent_submitted → { session_ids, provider_id, total_amount, success } // client-side submit

action_mark_as_paid_submitted → { session_ids, client_id, total_amount, payment_method?, success } // provider-side confirm UI

business_payment_confirmed → { payment_ids, provider_id, client_id, total_amount, confirmed_at, days_since_session_completed }

5.5 Invites (growth loop)

business_invite_code_created → { invite_code, provider_id, client_id?, created_at }

business_invite_code_shared → { invite_code, provider_id, share_method } // "imessage" | "whatsapp" | "copy_link"

business_invite_code_claimed → { invite_code, provider_id, client_id, days_since_invite_created, claimed_at }

auth_invite_claimed → { invite_code, provider_id, success, error_code? }

5.6 Errors (baseline)

error_app_crashed → { screen_name?, stack?, fatal: true }

error_network_failure → { screen_name?, operation?, status_code?, retryable? }

Not now: high-frequency timer ticks. If ever needed, sample (e.g., every 10 minutes) and gate behind a flag.

6) Groups (2-sided analytics)

Use PostHog Groups:

Group type "provider" → provider_id

Group type "client" → client_id

Behavior

When provider context is present: posthog.group('provider', provider_id)

When client context is present: posthog.group('client', client_id)

Events may have both when relevant (e.g., payment confirmed).

7) Feature flags

Define:

invite_modal_on_stop (boolean/multivariate) — controls growth modal on session stop.

sample_timer_ticks (boolean) — disables/enables timer sampling collection.

Usage:

Gate UI with posthog.isFeatureEnabled('invite_modal_on_stop').

Only emit sampled ticks when sample_timer_ticks is true.

8) Schema enforcement (events.ts)

Define TypeScript constants and zod schemas for payloads. The capture wrapper validates in dev; in prod it bypasses for performance but logs shape mismatches.

Example

// events.ts
import { z } from 'zod';

export const E = {
  SCREEN_VIEW_CLIENT_LIST: 'screen_view_client_list',
  BUSINESS_PAYMENT_CONFIRMED: 'business_payment_confirmed',
  // ...
} as const;

export const zBusinessPaymentConfirmed = z.object({
  payment_ids: z.array(z.string().uuid()).min(1),
  provider_id: z.string().uuid(),
  client_id: z.string().uuid(),
  total_amount: z.number().nonnegative(),
  confirmed_at: z.string(), // ISO
  days_since_session_completed: z.number().int().nonnegative(),
});

export type BusinessPaymentConfirmed = z.infer<typeof zBusinessPaymentConfirmed>;

9) SDK wrapper (posthog.ts)

Requirements

initPosthog() — one-time initialization

identify(userId, props) — set person props (role, language…)

alias(userId) — stitch anon to authed

group(type, id) — provider/client grouping

capture(name, payload, options) — validates against schema map in dev; attaches globals; dry-run logger in dev

Pseudocode

// posthog.ts
import PostHog from 'posthog-react-native';
import { __DEV__ } from 'react-native';
import { schemaFor } from './schemaMap'; // map event -> zod schema
import { getGlobals } from './context';

let client: PostHog | null = null;

export function initPosthog(cfg) {
  client = new PostHog(cfg.key, {
    host: cfg.host,
    captureApplicationLifecycleEvents: true,
    captureDeviceInfo: true,
    enable: true,
  });
}

export async function identify(userId: string, props: Record<string, any>) {
  client?.identify(userId, props);
}

export async function alias(userId: string) {
  client?.alias(userId);
}

export function group(type: 'provider'|'client', id: string) {
  client?.group(type, id);
}

export function capture(name: string, payload: Record<string, any> = {}) {
  const globals = getGlobals();
  if (__DEV__) {
    const schema = schemaFor(name);
    if (schema) {
      const res = schema.safeParse(payload);
      if (!res.success) {
        console.warn('[analytics] schema error', name, res.error.issues);
      }
    }
    // optional: console.table({ name, ...payload });
  }
  client?.capture(name, { ...payload, ...globals });
}

10) Navigation tracking (navigation.ts)

Hook into onStateChange in your root navigator.

Emit screen_view_* events per route with { previous_screen }.

Debounce to avoid duplicate emits on quick transitions.

Example

// navigation.ts
export function trackNavigation(prevRouteName: string | null, currentRouteName: string) {
  const map: Record<string, string> = {
    ClientList: 'screen_view_client_list',
    SessionTracking: 'screen_view_session_tracking',
    ClientHistory: 'screen_view_client_history',
    ProviderList: 'screen_view_provider_list',
    ProviderSummary: 'screen_view_provider_summary',
    InviteClaim: 'screen_view_invite_claim',
  };
  const event = map[currentRouteName];
  if (event) capture(event, { previous_screen: prevRouteName || null });
}

11) Error capture (error.ts)

Provide captureAppError({screen_name, stack, fatal}) and wrap a top-level error boundary.

Add a network interceptor utility to emit error_network_failure.

12) Growth loop specifics

When provider taps “Stop Session”:

Show modal only if client not registered.

If confirmed “Share”, emit business_invite_code_shared with { share_method }.

Ensure invite creation emits business_invite_code_created (if created just-in-time).

On deep-link claim, emit both screen_view_invite_claim and auth_invite_claimed.

Post-claim success → push to minimal client onboarding and track business_user_registered.

Flag this end-session modal with invite_modal_on_stop.

13) Sampling & privacy

No raw emails/phones. Use hashed if ever needed.

Don’t emit action_timer_tick unless flagged, and then at most every 10 min.

14) QA checklist (manual & automated)

 Events fire once per user action

 user_role present on all events post-login

 provider_id & client_id attached where applicable

 Grouping works (PostHog “Groups” tab shows counts)

 Feature flag toggles show/hide invite modal

 Crash/error events appear with stack traces in dev

 Screen views have correct previous_screen

15) Dashboards to create (in PostHog)

Payment velocity (North Star)

Insight: Median days from business_session_completed → business_payment_confirmed

Breakdown: by provider group

Provider onboarding funnel

auth_register_submitted{role=provider} → action_add_client_submitted → action_session_started → action_payment_requested

Invite conversion

Ratio business_invite_code_claimed / business_invite_code_created

Breakdown: share_method

Retention by role

Active if any screen_view_* in week; plot D7/D30 by user_role

16) Acceptance criteria (what Claude should verify)

All Tier-0 events implemented with schema-validated payloads.

Navigation listener producing exactly one screen_view_* per visible screen change.

identify, alias, and group correctly called at login/claim contexts.

Feature flag invite_modal_on_stop gates the modal’s rendering.

Dry-run logger in dev that prints each capture for rapid manual verification.

Unit tests (if feasible) for payload validators on at least 5 critical events.

17) Code stubs (Claude should fill in)

src/lib/analytics/context.tsx

Holds global props; exposes setUserRole, setProvider, setClient, setAppVersion

getGlobals() returns the current immutable snapshot

src/lib/analytics/flags.ts

getFlag(name: string) | isEnabled(name: string) wrappers

Boot-time posthog.getFeatureFlagPayload('invite_modal_on_stop')?

src/lib/analytics/qa.ts

enableDryRun() toggles console logging of events

wrapCapture() to inject console.table in dev

src/types/ids.ts

type ProviderId = string & { __brand: 'provider' } (optional branding)

18) Example usage (call sites)

On registration success

await identify(user.id, { user_role: 'provider', language, timezone });
await alias(user.id);
capture('business_user_registered', { user_role: 'provider', registration_method: 'email_password' });


Start session

group('provider', providerId);
capture('action_session_started', {
  client_id: clientId,
  crew_size,
  hourly_rate,
  start_time: new Date().toISOString(),
});


Stop session (and show invite modal if client unregistered)

capture('action_session_stopped', {
  session_id,
  client_id,
  total_duration_minutes,
  crew_size,
  person_hours,
  hourly_rate,
  total_amount,
});
if (isFeatureEnabled('invite_modal_on_stop') && !clientIsRegistered) {
  // show modal; on share:
  capture('business_invite_code_shared', { invite_code, provider_id, share_method });
}


Payment confirmed

group('provider', providerId);
group('client', clientId);
capture('business_payment_confirmed', {
  payment_ids,
  provider_id: providerId,
  client_id: clientId,
  total_amount,
  confirmed_at: new Date().toISOString(),
  days_since_session_completed,
});

19) Stretch (Week 2+)

Cohorts & paths: add action_session_history_viewed, action_outstanding_balance_viewed

Add error_boundary HOC around critical flows

Server-side ingestion for backfilled confirmations (keep same event names)


### Addendum

What to track (now vs later)
Tier 0 (Foundation: ship these first)

Why: Power your core funnels, retention, and payment velocity—your North Star set.

Screen views

screen_view_client_list

screen_view_session_tracking

screen_view_client_history

screen_view_provider_list

screen_view_provider_summary

screen_view_invite_claim

Auth & lifecycle

auth_register_submitted (with user_role, success)

business_user_registered

business_user_activated (first key action)

auth_invite_claimed (for client activation via deep link)

Sessions

action_session_started

action_session_stopped

business_session_completed

Payments

action_payment_requested

business_payment_requested

action_mark_as_paid_submitted (provider)

action_payment_sent_submitted (client)

business_payment_confirmed

Invites (growth loop)

business_invite_code_created

business_invite_code_shared

business_invite_code_claimed

Drop for now: action_timer_tick (sample later), secondary profile/settings clicks. Keep noise low until dashboards are live.

Tier 1 (Week 2 once dashboards land)

action_add_client_submitted

action_session_history_viewed

action_session_details_viewed

action_provider_viewed

action_outstanding_balance_viewed

Error backbone: error_app_crashed, error_network_failure (at least these 2)

Tier 2 (Polish / ops)

Sync events, language change, crew size changed, long session alert, overdue payments, churn job, velocity job, etc. (These are great but not blocking your first insights.)

Event naming & property conventions (PostHog-ready)

Keep your existing snake_case pattern {category}_{object}_{action}—it’s clean and consistent with your doc. Use snake_case for properties too. Don’t mix camelCase. Reuse your enums (e.g., user_role, status).

Global (sent on every event)
PostHog calls these “person props” and “event props.” From your spec, keep:
user_id, user_role, app_version, build_number, platform, os_version, device_model, session_id, language, timezone, storage_mode, event_timestamp. (Good: no PII.)

Critical per-event properties (don’t skip):

Sessions: session_id, client_id, start_time, end_time, duration_minutes, crew_size, hourly_rate, total_amount, person_hours (lets you slice revenue & productivity later).

Payments: amount / total_amount, requested_at, confirmed_at, payment_method?, and always include provider_id & client_id so you can group / cohort by either side.

Invites: invite_code, share_method, days_since_invite_created. Ties your growth loop.

Privacy: Keep avoiding emails/phone; hash if ever needed. You already documented “safe vs do not track”—stick to it.

Minimal funnels & KPIs (what these unlock)

Provider onboarding funnel
auth_register_submitted{role=provider} → action_add_client_submitted → action_session_started → action_payment_requested
Dashboards: drop-offs by step, time to first session/payment.

Client onboarding funnel
screen_view_invite_claim → auth_invite_claimed → action_payment_sent_submitted (optionally business_payment_confirmed).

Payment velocity (North Star)
Cohort from business_session_completed to business_payment_confirmed; compute cycle time and trend it by provider/client. Targets are in your doc; keep those.

Invite conversion
business_invite_code_claimed / business_invite_code_created, sliced by share_method.

Retention by role (D7/D30)
Use screen_view_* events as activity pings. Track separate retention for providers vs clients.

PostHog implementation specifics (React Native)

Init & identify

posthog-react-native init on app launch.

On login/registration, call posthog.identify(distinctId, { user_role, language, … }).

For anonymous pre-auth use, let PostHog generate the ID, then call posthog.alias(userId) on registration to stitch histories.

Groups (important for 2-sided analytics)

Use PostHog Groups for provider_id and client_id so you can do group-level insights (payment velocity by provider, etc.). Attach on each relevant event:
posthog.group('provider', provider_id) and/or posthog.group('client', client_id) before tracking.

Screen views

PostHog doesn’t auto-capture RN navigation. Keep your navigator hook (already in your guide) and call posthog.capture('screen_view_client_list', {...}). Your previous_screen prop is perfect.

Feature flags

You’ll likely A/B the “invite at end session” growth modal. Define a flag invite_modal_on_stop (boolean or multivariate) and call posthog.isFeatureEnabled() to gate the UI.

Sampling

Don’t send action_timer_tick every minute. Sample to every 5–10 minutes or infer from start/stop. Your doc already notes sampling—follow it.

Error capture

Keep ErrorBoundary and send error_app_crashed with screen_name + stack. Add Sentry later if needed.

Exact event dictionary (ship list with fields)

Below are the Tier 0 events with the must-have props (only deltas from your doc shown so this stays tight).

auth_register_submitted → { user_role, success }

business_user_registered → { user_id, user_role, registration_method, invite_code?, provider_id?, timestamp }

business_user_activated → { user_id, user_role, activation_action, days_since_registration }

screen_view_client_list → { previous_screen?, user_role="provider" }

screen_view_session_tracking → { previous_screen?, user_role="provider", client_id? }

screen_view_client_history → { client_id, client_name? }

screen_view_provider_list → { user_role="client" }

screen_view_provider_summary → { provider_id }

screen_view_invite_claim → { deep_link:true, invite_code }

auth_invite_claimed → { invite_code, provider_id, success, error_code? }

action_session_started → { client_id, client_name?, crew_size, hourly_rate, start_time }

action_session_stopped → { session_id, client_id, total_duration_minutes, crew_size, person_hours, total_amount, hourly_rate }

business_session_completed → { session_id, provider_id, client_id, duration_minutes, crew_size, person_hours, hourly_rate, total_amount, start_time, end_time } (this is the “money” event)

action_payment_requested → { session_id, client_id, amount, success }

business_payment_requested → { payment_request_id, session_id, provider_id, client_id, amount, requested_at }

action_payment_sent_submitted → { session_ids, provider_id, total_amount, success }

action_mark_as_paid_submitted → { session_ids, client_id, total_amount, payment_method?, success }

business_payment_confirmed → { payment_ids, provider_id, client_id, total_amount, confirmed_at, days_since_session_completed } (enables cycle-time calc)

business_invite_code_created → { invite_code, provider_id, client_id, created_at }

business_invite_code_shared → { invite_code, provider_id, share_method }

business_invite_code_claimed → { invite_code, provider_id, client_id, days_since_invite_created, claimed_at }

That’s ~21 events—small but mighty.

Quick PostHog code shape (RN)
// analytics.ts
import PostHog from 'posthog-react-native';

export const posthog = new PostHog('<POSTHOG_KEY>', {
  host: '<POSTHOG_HOST>', // e.g., https://app.posthog.com or self-host
  captureApplicationLifecycleEvents: true,
  captureDeviceInfo: true,
  enable: true,
});

export async function identify(userId: string, props: Record<string, any>) {
  await posthog.identify(userId, props); // set person props (role, language, etc.)
}

export function capture(name: string, props: Record<string, any> = {}) {
  posthog.capture(name, props);
}

export function groupByProvider(providerId: string) {
  posthog.group('provider', providerId);
}

export function groupByClient(clientId: string) {
  posthog.group('client', clientId);
}


In your navigation container, keep your existing “onStateChange” and swap your analytics.trackScreenView for capture('screen_view_<route>').

Dashboards to build Day 1

Payment Velocity
Trends: median days from business_session_completed → business_payment_confirmed (break down by provider group). Target in spec.

Provider Onboarding Funnel
auth_register_submitted{provider} → action_add_client_submitted → action_session_started → action_payment_requested.

Invite Conversion
business_invite_code_created → business_invite_code_claimed (by share_method).

Retention (role-based)
Active if any screen_view_* in week—plot D7/D30 for providers & clients separately. Targets in spec.

Final notes (to avoid rework)

Keep “PII-light” exactly as you wrote (no raw emails/phones).

Add a simple analytics kill switch in Settings (opt-out), and sample high-frequency events.

If you later add a web portal, keep event names identical across platforms and add platform prop to segment.

If you want, I can turn this into a ready-to-paste events.ts constants file + a tiny helper that enforces property schemas at compile-time.