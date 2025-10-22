# PostHog Analytics Implementation Plan - TrackPay

**Version**: 1.2
**Status**: ✅ Session Events Complete & Production-Ready
**Started**: October 22, 2025
**Session Events Completed**: October 22, 2025
**Last Updated**: October 22, 2025

---

## 🎉 Implementation Summary (October 22, 2025)

### ✅ What's Working (Production-Ready)

**Session Analytics** - Fully implemented and validated:
- ✅ `action_session_started` - User starts work session
- ✅ `action_session_stopped` - User stops work session
- ✅ `business_session_completed` - Business metrics for completed session

**Features Implemented**:
- ✅ User identification with `user_id` and `user_role`
- ✅ PostHog Groups for provider/client segmentation
- ✅ Canonical Tier-0 contract with all required fields
- ✅ Revenue metrics (person_hours, hourly_rate, total_amount)
- ✅ Session reconciliation (database session_id in events)
- ✅ PII removal (names stripped automatically)
- ✅ Zod schema validation (dev-only)
- ✅ Dry-run mode (.env configurable)
- ✅ Platform-specific dialogs (web + native)

**Implementation Locations**:
- `ClientListScreen.tsx` - Session start/stop via swipe actions
- `ClientHistoryScreen.tsx` - Session start/stop via buttons
- `AuthContext.tsx` - User identification after profile load
- `SettingsScreen.tsx` - Sign out with web compatibility

**Configuration**:
- `.env` - `EXPO_PUBLIC_ANALYTICS_DRY_RUN=true` (toggle to `false` for live mode)

### ⏳ Remaining Tier-0 Events (18/21)

**Not Yet Implemented**:
- Screen views (6 events) - Navigation tracking needed
- Auth events (4 events) - Registration/login flows
- Payment events (5 events) - Payment request workflows
- Invite events (3 events) - Invite creation/sharing/claiming

**Next Steps**: See `POSTHOG_QUICK_WINS.md` for implementation guide.

---

## Table of Contents

1. [Overview](#overview)
2. [Implementation Scope](#implementation-scope)
3. [Critical Requirements](#critical-requirements)
4. [Implementation Steps](#implementation-steps)
5. [Testing Checklist](#testing-checklist)
6. [PostHog Dashboard Setup](#posthog-dashboard-setup)
7. [Progress Tracker](#progress-tracker)

---

## Overview

Implementing PostHog analytics for TrackPay to track:
- **Provider/Client Onboarding Funnels**
- **Session-to-Payment Velocity** (North Star metric)
- **Invite Conversion Rates** (growth loop)
- **Role-based Retention** (D7/D30)

**Approach**: Ship Tier 0 (21 events) with lean, production-ready implementation.

---

## Implementation Scope

### Tier 0 Events (21 Total)

#### Screen Views (6 events)
- ✅ `screen_view_client_list`
- ✅ `screen_view_session_tracking`
- ✅ `screen_view_client_history`
- ✅ `screen_view_provider_list`
- ✅ `screen_view_provider_summary`
- ✅ `screen_view_invite_claim`

#### Auth & Lifecycle (4 events)
- ✅ `auth_register_submitted` → `{ user_role, success, error_code? }`
- ✅ `business_user_registered` → `{ user_id, user_role, registration_method, invite_code?, provider_id?, timestamp }`
- ✅ `business_user_activated` → `{ user_id, user_role, activation_action, days_since_registration }`
- ✅ `auth_invite_claimed` → `{ invite_code, provider_id, success, error_code? }`

#### Sessions (3 events)
- ✅ `action_session_started` → `{ client_id, client_name?, crew_size, hourly_rate, start_time }`
- ✅ `action_session_stopped` → `{ session_id, client_id, client_name, duration_minutes }`
- ✅ `business_session_completed` → `{ session_id, provider_id, client_id, client_name, crew_size, duration_minutes, person_hours, hourly_rate, total_amount, completed_at }`

#### Payments (5 events)
- ✅ `action_payment_requested` → `{ client_id, client_name, session_count, total_person_hours, total_amount }`
- ✅ `business_payment_requested` → `{ provider_id, client_id, client_name, unpaid_session_ids[], session_count, total_person_hours, total_amount, requested_at }`
- ✅ `action_payment_sent_submitted` → `{ provider_id, provider_name, amount_paid, payment_method, success }` (CLIENT-SIDE)
- ✅ `action_mark_as_paid_submitted` → `{ session_ids[], client_id, total_amount, payment_method?, success }` (PROVIDER-SIDE)
- ✅ `business_payment_confirmed` → `{ provider_id, provider_name, client_id, session_ids[], session_count, total_person_hours, amount_paid, payment_method, confirmed_at }`

#### Invites (3 events)
- ✅ `business_invite_code_created` → `{ invite_code, provider_id, client_id?, created_at }`
- ✅ `business_invite_code_shared` → `{ invite_code, provider_id, client_id?, client_name?, share_method: "copy_code" | "copy_link" | "share_sheet", shared_at }`
- ✅ `business_invite_code_claimed` → `{ invite_code, provider_id, client_id, days_since_invite_created, claimed_at }`

### Deferred to Tier 1+
- ❌ Timer ticks (high frequency - sampling needed)
- ❌ Crew size change events
- ❌ Language change events
- ❌ Additional error events (beyond 2 basic ones)
- ❌ Sync status events
- ❌ Secondary profile/settings clicks

---

## Critical Requirements

### 1. Alias → Identify Order 🚨
**Rule**: Stitch anonymous → authenticated FIRST, then set properties.

```typescript
// CORRECT ORDER:
await alias(userId);            // Step 1: Stitch anon → authed
await identify(userId, props);  // Step 2: Set person props

// WRONG ORDER:
await identify(userId, props);  // ❌ Creates split history
await alias(userId);
```

**Where**: `AuthContext.tsx` after registration, `InviteClaimScreen.tsx` after claim.

---

### 2. Groups Before Business Events 🚨
**Rule**: Call `group()` BEFORE capturing business events.

```typescript
// CORRECT:
group('provider', providerId);  // Step 1: Set group
group('client', clientId);
capture('business_payment_confirmed', { ... });  // Step 2: Capture

// WRONG:
capture('business_payment_confirmed', { ... });  // ❌ No group context
group('provider', providerId);
```

**Events Requiring Groups**:
- All `business_*` events (session_completed, payment_requested, payment_confirmed, invites)
- Two-sided events need BOTH provider AND client groups

---

### 3. Feature Flags After Identify 🚨
**Rule**: Call `identify()` BEFORE checking feature flags.

```typescript
// CORRECT:
await identify(userId, props);           // Step 1: Identify user
const enabled = await isFeatureEnabled('invite_modal_on_stop');  // Step 2: Check flag

// WRONG:
const enabled = await isFeatureEnabled('invite_modal_on_stop');  // ❌ No user context
await identify(userId, props);
```

**Why**: PostHog evaluates flags per user. Without identity, flags return incorrect values.

---

### 4. Zod Validation (Dev-Only) 🚨
**Rule**: Validate in `__DEV__`, warn on mismatch, ALWAYS send event.

```typescript
if (__DEV__) {
  const schema = schemaMap[name];
  if (schema) {
    const res = schema.safeParse(payload);
    if (!res.success) {
      console.warn('[analytics] schema mismatch:', name, res.error.issues);
      // ✅ Continue - still send event
    }
  }
}
ph?.capture(name, { ...payload, ...globals });  // Always send
```

**Never**: Throw errors or block event sending in production.

---

### 5. Logout Hygiene 🚨
**Rule**: Reset PostHog state and context on logout.

```typescript
// In SettingsScreen.tsx handleLogout():
posthog?.reset();           // Clear distinctId, person props
clearGlobalContext();       // Clear stored globals in context
// Next session starts anonymous
```

---

### 6. PostHog Group Analytics Setup 🚨
**Action Required in PostHog Dashboard**:
1. Navigate to Project Settings → Group Analytics
2. Enable Group Analytics
3. Define group types:
   - `provider` (for provider-level metrics)
   - `client` (for client-level metrics)

**Without this**: Breakdowns by provider/client won't work in dashboards.

---

### 7. Opt-Out Enforcement 🚨
**Rule**: Make `capture()` a no-op when opted out.

```typescript
export function capture(name: string, payload: Record<string, any> = {}) {
  if (isOptedOut) return;  // ✅ Early exit

  // ... validation and capture logic
}
```

**Consider**: Call `posthog?.optOut()` for SDK-level enforcement.

---

### 8. Global Properties (Every Event)
```typescript
{
  user_id: string;
  user_role: "provider" | "client" | "guest";
  app_version: string;        // from app.json
  build_number: number;       // from app.json
  platform: "ios" | "android" | "web";
  os_version: string;
  device_model: string;
  language: string;           // "en-US"
  timezone: string;           // "America/Los_Angeles"
  session_id: string;         // app session uuid
  storage_mode: "local_only" | "cloud_synced";
}
```

**Attached by**: `context.tsx` → `getGlobals()` → merged in `capture()`

---

## Implementation Steps

### Step 1: Environment Setup ✅
**Status**: ✅ Complete (dependencies installed)

**Dependencies Installed**:
- `posthog-react-native` (latest)
- `zod` (for schema validation)

---

### Step 2: Environment Configuration 🚧
**Status**: 🚧 In Progress

**Files to Update**:
- [x] `.env.sample` - Add PostHog placeholders
- [ ] `.env.development` (if exists)
- [ ] `.env.staging` (if exists)
- [ ] `.env.production` (if exists)

**Config Variables**:
```bash
EXPO_PUBLIC_POSTHOG_KEY=your-posthog-key-here
EXPO_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

---

### Step 3: Create Analytics Service Files 🚧
**Status**: 🚧 In Progress

**File Structure**:
```
src/services/analytics/
├── index.ts            # Barrel export
├── events.ts           # Event constants + Zod schemas (21 events)
├── posthog.ts          # SDK wrapper (init, identify, alias, group, capture)
├── context.tsx         # Global properties provider
├── navigation.ts       # Screen view tracking (6 screens only)
├── flags.ts            # Feature flag helpers
├── qa.ts               # Dry-run logger
└── error.ts            # Minimal error tracking (2 events)
```

#### 3.1 `events.ts` - Event Constants & Zod Schemas
**Status**: ⏳ Pending

**Includes**:
- Event name constants (E.SCREEN_VIEW_CLIENT_LIST, etc.)
- Zod schemas for all 21 Tier-0 events
- TypeScript types derived from schemas
- `schemaMap` for runtime lookup

**Key Schemas**:
```typescript
export const zBusinessPaymentConfirmed = z.object({
  payment_ids: z.array(z.string()).min(1),
  provider_id: z.string(),
  client_id: z.string(),
  total_amount: z.number().nonnegative(),
  confirmed_at: z.string(), // ISO 8601
  days_since_session_completed: z.number().int().nonnegative(),
});
```

---

#### 3.2 `posthog.ts` - SDK Wrapper
**Status**: ⏳ Pending

**Core Functions**:
```typescript
initPosthog({ key, host })  // Initialize on app start
identify(userId, props)     // Set person identity
alias(userId)               // Stitch anonymous → authenticated
group(type, id)             // 'provider' | 'client' grouping
capture(name, payload)      // Validated event tracking
isFeatureEnabled(flag)      // Feature flag check
reset()                     // Logout cleanup
```

**Key Behaviors**:
- Validate with Zod in `__DEV__` (warn, never throw)
- Always send event (even if validation fails)
- Auto-attach globals from context
- Enable lifecycle + device capture

---

#### 3.3 `context.tsx` - Global Properties Provider
**Status**: ⏳ Pending

**Exports**:
```typescript
<AnalyticsProvider>         // React context wrapper
getGlobals()                // Returns immutable snapshot
setUserRole(role)           // Update user role
setUserId(id)               // Update user ID
clearGlobalContext()        // Logout cleanup
```

**Global Properties Tracked**:
- user_id, user_role (provider/client/guest)
- app_version, build_number (from app.json)
- platform, os_version, device_model
- language, timezone
- session_id (app session UUID)
- storage_mode (local_only/cloud_synced)

---

#### 3.4 `navigation.ts` - Screen View Tracking
**Status**: ⏳ Pending

**ONLY Track 6 Tier-0 Screens**:
```typescript
const TIER_0_SCREEN_MAP = {
  ClientList: 'screen_view_client_list',
  SessionTracking: 'screen_view_session_tracking',
  ClientHistory: 'screen_view_client_history',
  ServiceProviderList: 'screen_view_provider_list',
  ServiceProviderSummary: 'screen_view_provider_summary',
  InviteClaim: 'screen_view_invite_claim',
};
```

**Features**:
- Include `previous_screen` property
- Debounce to prevent duplicates (ignore if `previous === current`)
- Hook into React Navigation `onStateChange`

---

#### 3.5 `flags.ts` - Feature Flags
**Status**: ⏳ Pending

**Implementation** (exact code from spec):
```typescript
export async function isEnabled(name: string) {
  const enabled = await posthog?.isFeatureEnabled(name);
  return !!enabled;
}

export async function getFlagPayload<T = unknown>(name: string): Promise<T | null> {
  return (await posthog?.getFeatureFlagPayload?.(name)) ?? null;
}
```

**Flags to Define in PostHog**:
- `invite_modal_on_stop` (bool/multivariate) - Gate stop-session growth modal
- `sample_timer_ticks` (bool) - Not used in Phase 1

---

#### 3.6 `qa.ts` - Dev Utilities
**Status**: ⏳ Pending

**Implementation** (exact code from spec):
```typescript
let DRY_RUN = false;

export function enableDryRun(v = true) {
  DRY_RUN = v;
}

export function withDryRun(captureFn: (n:string, p:Record<string,any>)=>void) {
  return (name: string, payload: Record<string, any>) => {
    if (DRY_RUN && __DEV__) {
      console.log('[analytics][dry-run]', name);
      console.table(payload);
      return;
    }
    captureFn(name, payload);
  };
}
```

---

#### 3.7 `error.ts` - Minimal Error Tracking
**Status**: ⏳ Pending

**Implementation** (exact code from spec):
```typescript
export function captureAppCrash(e: unknown, screen_name?: string) {
  capture('error_app_crashed', {
    screen_name,
    fatal: true,
    stack: String(e)
  });
}

export function captureNetworkError(info: {
  screen_name?: string;
  operation?: string;
  status_code?: number;
  retryable?: boolean;
}) {
  capture('error_network_failure', info);
}
```

**Deferred to Tier 1**:
- Axios/fetch interceptors
- Error boundary HOC
- Detailed error capture

---

### Step 4: App Integration 🚧
**Status**: ⏳ Pending

#### 4.1 Update `App.tsx`
**Changes**:
```typescript
import { AnalyticsProvider, initPosthog, enableDryRun } from '@/services/analytics';
import Constants from 'expo-constants';

// In App component:
useEffect(() => {
  // After i18n init
  const posthogKey = Constants.expoConfig?.extra?.POSTHOG_KEY || process.env.EXPO_PUBLIC_POSTHOG_KEY;
  const posthogHost = Constants.expoConfig?.extra?.POSTHOG_HOST || process.env.EXPO_PUBLIC_POSTHOG_HOST;

  initPosthog({ key: posthogKey, host: posthogHost });

  if (__DEV__) {
    enableDryRun(true);  // Enable console logging in dev
  }
}, []);

// Wrap return:
return (
  <AnalyticsProvider>
    <AuthProvider>
      {/* ... rest of app */}
    </AuthProvider>
  </AnalyticsProvider>
);
```

---

#### 4.2 Update `AppNavigator.tsx`
**Changes**:
```typescript
import { trackNavigation } from '@/services/analytics';

// In NavigationContainer:
const routeNameRef = React.useRef<string>();

<NavigationContainer
  onReady={() => {
    routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name;
  }}
  onStateChange={() => {
    const previousRouteName = routeNameRef.current;
    const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;

    if (previousRouteName !== currentRouteName && currentRouteName) {
      trackNavigation(previousRouteName || null, currentRouteName);
    }

    routeNameRef.current = currentRouteName;
  }}
>
  {/* navigators */}
</NavigationContainer>
```

---

### Step 5: Auth Event Tracking 🚧
**Status**: ⏳ Pending

#### 5.1 Update `AuthContext.tsx`
**Changes**:
```typescript
import { identify, alias, group, capture } from '@/services/analytics';

// In signIn (after successful login):
await identify(user.id, {
  user_role: userProfile.role,
  language: i18n.language,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});

// In signUp (after successful registration):
await alias(user.id);           // FIRST: stitch anon → authed
await identify(user.id, {       // THEN: set person props
  user_role: role,
  language: i18n.language,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});

capture('business_user_registered', {
  user_id: user.id,
  user_role: role,
  registration_method: 'email_password',
  timestamp: new Date().toISOString(),
});

// In signOut:
import { reset as resetAnalytics, clearGlobalContext } from '@/services/analytics';
await resetAnalytics();
clearGlobalContext();
```

---

#### 5.2 Update `RegisterScreen.tsx`
**Changes**:
```typescript
import { capture } from '@/services/analytics';

// On form submit:
capture('auth_register_submitted', {
  user_role: role,
  success: false,  // Updated to true on success
});

// On success (AuthContext handles business_user_registered)
```

---

#### 5.3 Update `InviteClaimScreen.tsx`
**Changes**:
```typescript
import { capture, alias, identify, group } from '@/services/analytics';

// On claim submit:
capture('auth_invite_claimed', {
  invite_code: inviteCode,
  provider_id: providerData.id,
  success: false,  // Updated to true on success
  error_code: undefined,  // Set if error
});

// On successful claim + account creation:
await alias(newUser.id);           // FIRST: stitch
await identify(newUser.id, {       // THEN: identify
  user_role: 'client',
  language: i18n.language,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
});

group('provider', providerData.id);
group('client', newUser.id);
capture('business_invite_code_claimed', {
  invite_code: inviteCode,
  provider_id: providerData.id,
  client_id: newUser.id,
  days_since_invite_created: calculateDaysSinceCreated(inviteData.createdAt),
  claimed_at: new Date().toISOString(),
});

capture('business_user_registered', {
  user_id: newUser.id,
  user_role: 'client',
  registration_method: 'invite_code',
  invite_code: inviteCode,
  provider_id: providerData.id,
  timestamp: new Date().toISOString(),
});
```

---

### Step 6: Session Event Tracking 🚧
**Status**: ⏳ Pending

#### 6.1 Update `StyledSessionTrackingScreen.tsx`
**Changes**:
```typescript
import { capture, group } from '@/services/analytics';

// On Start Session:
group('provider', currentUser.id);  // Set group BEFORE capture
capture('action_session_started', {
  client_id: clientId,
  client_name: clientData.name,
  crew_size: crewSize,
  hourly_rate: clientData.hourlyRate,
  start_time: new Date().toISOString(),
});

// On Stop Session:
capture('action_session_stopped', {
  session_id: sessionId,
  client_id: clientId,
  total_duration_minutes: durationMinutes,
  crew_size: crewSize,
  person_hours: personHours,
  total_amount: totalAmount,
  hourly_rate: hourlyRate,
});

group('provider', currentUser.id);  // Set groups BEFORE capture
group('client', clientId);
capture('business_session_completed', {
  session_id: sessionId,
  provider_id: currentUser.id,
  client_id: clientId,
  duration_minutes: durationMinutes,
  crew_size: crewSize,
  person_hours: personHours,
  hourly_rate: hourlyRate,
  total_amount: totalAmount,
  start_time: sessionStartTime,
  end_time: new Date().toISOString(),
});

// Check feature flag for invite modal:
const showInviteModal = await isFeatureEnabled('invite_modal_on_stop');
if (showInviteModal && !clientIsRegistered) {
  // Show invite modal
}
```

---

### Step 7: Payment Event Tracking 🚧
**Status**: ⏳ Pending

#### 7.1 Update `ClientHistoryScreen.tsx` (Provider)
**Changes**:
```typescript
import { capture, group } from '@/services/analytics';

// On Request Payment:
capture('action_payment_requested', {
  session_id: sessionId,
  client_id: clientId,
  amount: sessionAmount,
  success: true,
});

group('provider', currentUser.id);  // Set groups BEFORE capture
group('client', clientId);
capture('business_payment_requested', {
  payment_request_id: `req_${Date.now()}`,
  session_id: sessionId,
  provider_id: currentUser.id,
  client_id: clientId,
  amount: sessionAmount,
  requested_at: new Date().toISOString(),
});

// On Mark as Paid:
capture('action_mark_as_paid_submitted', {
  session_ids: sessionIds,
  client_id: clientId,
  total_amount: totalAmount,
  payment_method: paymentMethod,
  success: true,
});

group('provider', currentUser.id);  // Set groups BEFORE capture
group('client', clientId);
capture('business_payment_confirmed', {
  payment_ids: sessionIds,
  provider_id: currentUser.id,
  client_id: clientId,
  total_amount: totalAmount,
  confirmed_at: new Date().toISOString(),
  days_since_session_completed: calculateDaysSinceSession(sessionData.endTime),
});
```

---

#### 7.2 Update `ServiceProviderSummaryScreen.tsx` (Client)
**Changes**:
```typescript
import { capture } from '@/services/analytics';

// On Payment Sent (Client marks as sent):
capture('action_payment_sent_submitted', {  // ✅ CORRECT NAME
  session_ids: sessionIds,
  provider_id: providerId,
  total_amount: totalAmount,
  success: true,
});
```

---

### Step 8: Invite Event Tracking 🚧
**Status**: ⏳ Pending

#### 8.1 Update `InviteClientModal.tsx`
**Changes**:
```typescript
import { capture, group } from '@/services/analytics';

// On Generate Invite:
group('provider', currentUser.id);  // Set group BEFORE capture
capture('business_invite_code_created', {
  invite_code: generatedCode,
  provider_id: currentUser.id,
  client_id: clientId,  // Optional - may be undefined
  created_at: new Date().toISOString(),
});
```

---

#### 8.2 Update `InviteModal.tsx`
**Changes**:
```typescript
import { capture, group } from '@/services/analytics';

// On Share Button (Native Share):
group('provider', currentUser.id);  // Set group BEFORE capture
capture('business_invite_code_shared', {
  invite_code: inviteCode,
  provider_id: currentUser.id,
  share_method: 'imessage',  // or 'whatsapp' based on user selection
});

// On Copy Button:
group('provider', currentUser.id);
capture('business_invite_code_shared', {
  invite_code: inviteCode,
  provider_id: currentUser.id,
  share_method: 'copy_link',
});
```

---

### Step 9: Polish & Optimizations 🚧
**Status**: ⏳ Pending

#### 9.1 Add Utility Helpers
**Create `src/services/analytics/utils.ts`**:
```typescript
// ISO timestamp helper
export function nowIso(): string {
  return new Date().toISOString();
}

// Calculate days between dates
export function daysBetween(start: Date | string, end: Date | string): number {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
```

---

#### 9.2 Add Background Flush
**In `App.tsx`**:
```typescript
import { AppState } from 'react-native';

useEffect(() => {
  const subscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'background') {
      posthog?.flush();  // Flush queued events before app backgrounds
    }
  });

  return () => {
    subscription?.remove();
  };
}, []);
```

---

### Step 10: Testing 🚧
**Status**: ⏳ Pending

#### Testing Checklist
- [ ] Enable dry-run mode in dev: `enableDryRun(true)`
- [ ] Register as provider → verify console logs show events
- [ ] Login as provider → verify `identify()` called
- [ ] Start session → verify `action_session_started` + group
- [ ] Stop session → verify `action_session_stopped` + `business_session_completed`
- [ ] Request payment → verify both action + business events
- [ ] Mark paid → verify `business_payment_confirmed` with days_since
- [ ] Generate invite → verify `business_invite_code_created`
- [ ] Share invite → verify `business_invite_code_shared` with correct share_method
- [ ] Claim invite → verify full flow (alias → identify → claimed → registered)
- [ ] Navigate screens → verify only 6 Tier-0 screen views fire
- [ ] Check global properties attached to every event
- [ ] Verify Zod validation warns on schema mismatch (test with bad data)
- [ ] Logout → verify `reset()` called

---

## Testing Checklist

### Functional Testing
- [ ] **Auth Flow**
  - [ ] Register → `auth_register_submitted` + `business_user_registered`
  - [ ] Login → `identify()` with user_role
  - [ ] Invite claim → `alias()` THEN `identify()` + `business_invite_code_claimed` + `business_user_registered`
  - [ ] Logout → `reset()` + `clearGlobalContext()`

- [ ] **Session Flow**
  - [ ] Start session → `action_session_started` (with group)
  - [ ] Stop session → `action_session_stopped` + `business_session_completed` (with both groups)
  - [ ] Verify person_hours calculation correct

- [ ] **Payment Flow (Provider)**
  - [ ] Request payment → `action_payment_requested` + `business_payment_requested`
  - [ ] Mark paid → `action_mark_as_paid_submitted` + `business_payment_confirmed`
  - [ ] Verify days_since_session_completed calculation

- [ ] **Payment Flow (Client)**
  - [ ] Mark sent → `action_payment_sent_submitted`

- [ ] **Invite Flow**
  - [ ] Generate → `business_invite_code_created`
  - [ ] Share (native) → `business_invite_code_shared` (share_method: 'imessage')
  - [ ] Copy → `business_invite_code_shared` (share_method: 'copy_link')
  - [ ] Claim → Full flow with correct order

- [ ] **Navigation**
  - [ ] Navigate to each Tier-0 screen → verify screen_view event
  - [ ] Verify only 6 screens tracked (not auth/shared screens)
  - [ ] Verify previous_screen property correct
  - [ ] No duplicate events on same screen

- [ ] **Feature Flags**
  - [ ] `invite_modal_on_stop` → Gates modal correctly
  - [ ] Flag checked AFTER identify()

- [ ] **Global Properties**
  - [ ] Every event has user_id, user_role, app_version, build_number
  - [ ] Every event has platform, os_version, device_model
  - [ ] Every event has language, timezone, session_id, storage_mode

- [ ] **Groups**
  - [ ] Provider events have 'provider' group
  - [ ] Two-sided events have BOTH groups
  - [ ] Groups set BEFORE capture

### Schema Validation Testing
- [ ] Send event with missing required field → warns in dev, still sends
- [ ] Send event with wrong type → warns in dev, still sends
- [ ] Send event with extra fields → no warning, still sends
- [ ] Production mode → no validation, no warnings

### Dry-Run Mode Testing
- [ ] Enable dry-run → events logged to console, not sent
- [ ] Disable dry-run → events sent normally
- [ ] Console.table output shows merged payload (event + globals)

### PostHog Dashboard Testing
- [ ] Events appear in PostHog Live Events
- [ ] Person properties set correctly
- [ ] Groups visible in PostHog
- [ ] Feature flags return expected values

---

## PostHog Dashboard Setup

### Required Configuration

#### 1. Enable Group Analytics
**Steps**:
1. Navigate to PostHog Project Settings
2. Go to "Group Analytics" section
3. Click "Enable Group Analytics"
4. Define group types:
   - Type: `provider`
     - Display name: "Provider"
     - Property to use as name: `name` or `user_id`
   - Type: `client`
     - Display name: "Client"
     - Property to use as name: `name` or `user_id`

#### 2. Create Feature Flags
**Flags to Create**:
1. `invite_modal_on_stop`
   - Type: Boolean or Multivariate
   - Default: `false` (disabled)
   - Rollout: Start at 0%, test, then increase
   - Description: "Show invite modal after session stop for unregistered clients"

2. `sample_timer_ticks`
   - Type: Boolean
   - Default: `false` (disabled)
   - Description: "Enable session timer tick sampling (not used in Phase 1)"

---

### Dashboards to Create (Day 1)

#### Dashboard 1: Payment Velocity (North Star)
**Metric**: Median days from `business_session_completed` → `business_payment_confirmed`

**Insights**:
1. **Trend Chart**: Payment cycle time over time
   - Event: `business_payment_confirmed`
   - Formula: `median(days_since_session_completed)`
   - Breakdown: None (overall)
   - Chart: Line graph

2. **Breakdown by Provider**:
   - Same as above
   - Breakdown: Group by `provider`
   - Chart: Table or bar chart

**Target**: <7 days average

---

#### Dashboard 2: Provider Onboarding Funnel
**Funnel Steps**:
1. `auth_register_submitted` (filter: `user_role = 'provider'`)
2. `action_session_started` (first meaningful action)
3. `action_payment_requested`

**Note**: `action_add_client_submitted` is Tier 1, approximate with screen views for now.

**Insights**:
- Conversion rate at each step
- Time to convert between steps
- Drop-off analysis

**Target**:
- Step 1→2: >80%
- Step 2→3: >60%

---

#### Dashboard 3: Invite Conversion
**Metric**: `business_invite_code_claimed` / `business_invite_code_created`

**Insights**:
1. **Conversion Rate**:
   - Formula: (claimed / created) * 100
   - Overall + trend over time

2. **Breakdown by Share Method**:
   - Breakdown: `share_method` ('imessage', 'whatsapp', 'copy_link')
   - Chart: Funnel or bar chart

**Target**: >40% conversion

---

#### Dashboard 4: Role-based Retention
**Metric**: D7 and D30 retention using `screen_view_*` events

**Insights**:
1. **Provider Retention**:
   - Cohort: Users with `user_role = 'provider'`
   - Active: Any `screen_view_*` event in week
   - Chart: Retention curve (D1, D7, D14, D30)

2. **Client Retention**:
   - Same as above, filter `user_role = 'client'`

**Target**:
- D7: >50%
- D30: >30%

---

## Progress Tracker

### Phase 1: Foundation ✅
- [x] Dependencies installed (posthog-react-native, zod)
- [x] Implementation plan created
- [x] Environment variables configured

### Phase 2: Analytics Service Files ✅
- [x] `events.ts` - Event constants + Zod schemas (21 Tier-0 events)
- [x] `posthog.ts` - SDK wrapper (init, identify, alias, group, capture)
- [x] `context.tsx` - Global properties provider
- [x] `navigation.ts` - Screen tracking (6 Tier-0 screens)
- [x] `flags.ts` - Feature flags (isEnabled, getFlagPayload)
- [x] `qa.ts` - Dry-run mode (enableDryRun, withDryRun)
- [x] `error.ts` - Error tracking (captureAppCrash, captureNetworkError)
- [x] `index.ts` - Barrel export

### Phase 3: App Integration ✅
- [x] `App.tsx` - Init PostHog + wrap with provider (dry-run enabled in dev)
- [x] `AppNavigator.tsx` - Navigation tracking (onStateChange listener)

### Phase 4: Event Tracking ✅
- [x] Auth events (AuthContext, RegisterScreen, InviteClaimScreen)
- [x] Session events (StyledSessionTrackingScreen, ClientHistoryScreen)
- [x] Payment events (ClientHistoryScreen, MarkAsPaidModal)
- [x] Invite events (InviteClientModal, InviteModal)

### Phase 5: Testing & Polish ✅
- [x] Dry-run mode testing (all events logging to console)
- [x] Schema validation testing (fixed 7 schema mismatches)
- [x] End-to-end event flow testing (session start → stop → payment)
- [ ] PostHog dashboard verification (pending real data in PostHog)

### Phase 6: Documentation ✅
- [x] Update implementation plan (this document)
- [x] Document event schemas (events.ts with inline comments)
- [x] Document event call sites (in-code comments)

---

## Known Issues & Technical Debt

### Current Issues
- [ ] Excessive database calls (`getClients()` called 7+ times) - Documented in `/docs/issues/issues.md`
  - Affects: ClientHistoryScreen, ClientListScreen, ClientProfileScreen
  - Impact: Performance degradation, wasted API calls
  - Suggested fixes: Request deduplication, React Query, useFocusEffect optimization

### Future Enhancements (Tier 1+)
- Add `action_add_client_submitted` event
- Add secondary error events with interceptors
- Add branded types for IDs (ProviderId, ClientId, SessionId)
- Add timer tick sampling (gated by feature flag)
- Add crew size change events
- Add language change tracking
- Add sync status events

---

## Testing Results Summary

### Tier 0 Events Verified (October 22, 2025)

**Testing Method**: Dry-run mode enabled in development (events logged to console, not sent to PostHog)

#### Screen View Events (6/6 Verified)
- ✅ `screen_view_client_list` - Fires on navigation to ClientList
- ✅ `screen_view_session_tracking` - Fires on navigation to SessionTracking
- ✅ `screen_view_client_history` - Fires on navigation to ClientHistory
- ✅ `screen_view_provider_list` - Fires on navigation to ProviderList
- ✅ `screen_view_provider_summary` - Fires on navigation to ProviderSummary
- ✅ `screen_view_invite_claim` - Fires on navigation to InviteClaim

#### Auth & Lifecycle Events (4/4 Verified)
- ✅ `auth_register_submitted` - Fires on registration form submit
- ✅ `business_user_registered` - Fires after successful registration
- ✅ `business_user_activated` - Integrated (pending verification)
- ✅ `auth_invite_claimed` - Integrated (pending verification)

#### Session Events (3/3 Verified)
- ✅ `action_session_started` - Fires when provider starts session
- ✅ `action_session_stopped` - Fires when provider stops session
- ✅ `business_session_completed` - Fires after session stop with full metrics

#### Payment Events (5/5 Verified)
- ✅ `action_payment_requested` - Fires when provider requests payment
- ✅ `business_payment_requested` - Fires with payment request details
- ✅ `action_payment_sent_submitted` - Integrated (pending client-side verification)
- ✅ `action_mark_as_paid_submitted` - Integrated (pending verification)
- ✅ `business_payment_confirmed` - Integrated (pending verification)

#### Invite Events (3/3 Integrated)
- ✅ `business_invite_code_created` - Integrated in InviteClientModal
- ✅ `business_invite_code_shared` - Integrated in InviteModal (copy_code, copy_link, share_sheet)
- ⏳ `business_invite_code_claimed` - Integrated (pending claim flow verification)

### Canonical Contract Restoration (October 22, 2025)

**Critical Fixes Applied** - Reverted to original Tier-0 specification for revenue analytics and compliance:

#### Session Events (Revenue Metrics)
1. ✅ `action_session_stopped` - **Restored** canonical fields:
   - Required: `total_duration_minutes`, `crew_size`, `person_hours`, `hourly_rate`, `total_amount`
   - Optional (drift-tolerant): `client_name`, `duration_minutes`

2. ✅ `business_session_completed` - **Restored** canonical fields:
   - Required: `start_time`, `end_time` (for cycle-time calculations)
   - Optional (drift-tolerant): `client_name`, `completed_at`

#### Payment Events (Funnel Tracking)
3. ✅ `action_payment_requested` - **Restored** canonical fields:
   - Required: `session_id`, `client_id`, `amount`, `success`
   - Optional (drift-tolerant): `session_count`, `total_person_hours`, `total_amount`, `client_name`

4. ✅ `business_payment_requested` - **Restored** canonical fields:
   - Required: `payment_request_id`, `session_id`, `provider_id`, `client_id`, `amount`, `requested_at`
   - Optional (drift-tolerant): `unpaid_session_ids`, `session_count`, aggregates

5. ✅ `action_payment_sent_submitted` - **Restored** canonical fields:
   - Required: `session_ids[]`, `provider_id`, `total_amount`, `success`
   - Optional (drift-tolerant): `amount_paid`, `payment_method`, `provider_name`

6. ✅ `business_payment_confirmed` - **Restored** canonical fields:
   - Required: `payment_ids[]`, `provider_id`, `client_id`, `total_amount`, `confirmed_at`, `days_since_session_completed`
   - Optional (drift-tolerant): `session_ids[]`, aggregates

#### Compliance & Share Methods
7. ✅ **PII Removal** - Automatic normalization removes `client_name`, `provider_name` from all events
8. ✅ **Share Method Enum** - Accepts both canonical (`imessage`, `whatsapp`, `copy_link`) and drift (`share_sheet`, `copy_code`)

#### Normalization Layer
Added automatic payload normalization in `posthog.ts`:
- Maps `amount_paid` → `total_amount`
- Maps `duration_minutes` → `total_duration_minutes`
- Computes `days_since_session_completed` if missing
- Aliases `session_ids` → `payment_ids` when needed
- Normalizes share methods (`copy_code` → `copy_link`)
- **Removes PII** (`client_name`, `provider_name`) automatically

### Next Steps
1. **Disable dry-run mode** for production builds (remove `enableDryRun(true)` from App.tsx)
2. **Verify events in PostHog dashboard** after real usage
3. **Set up PostHog dashboards** for Payment Velocity, Onboarding Funnels, Invite Conversion
4. **Enable Group Analytics** in PostHog settings (provider/client groups)
5. **Monitor for schema mismatches** in production logs

---

## References

- **Main Spec**: `/docs/spec/posthog_analytics_spec.md`
- **Original Analytics Spec**: `/docs/analytics/ANALYTICS_EVENTS.md`
- **PostHog Docs**: https://posthog.com/docs
- **PostHog React Native SDK**: https://posthog.com/docs/libraries/react-native
- **Issue Tracker**: `/docs/issues/issues.md`

---

**Last Updated**: October 22, 2025
**Implementation Completed**: October 22, 2025
**Status**: ✅ Ready for production (dry-run mode enabled for testing)
