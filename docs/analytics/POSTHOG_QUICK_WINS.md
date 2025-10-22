# PostHog Analytics - Quick Wins Checklist

**Status**: Ready to implement
**Date**: October 22, 2025
**Version**: 1.0

This guide covers the immediate next steps after canonical contract restoration.

---

## ✅ Quick Wins (Priority Order)

### 1. Set Group Properties (Names & Labels)

**Why**: Enables readable labels in PostHog breakdowns without sending PII in every event.

**Where to add**: After user login/registration in `AuthContext.tsx`

```typescript
// In AuthContext.tsx - after successful login
import { group, setGroupProperties } from '@/services/analytics';

// After signIn success:
const userProfile = await getUserProfile(user.id);

// Set group context
group(userProfile.role, user.id);

// Set group properties (one-time, cached by PostHog)
setGroupProperties(userProfile.role, user.id, {
  name: userProfile.name || `${userProfile.role}_${user.id.slice(0, 8)}`,
  created_at: userProfile.createdAt || new Date().toISOString(),
  role: userProfile.role,
});
```

**For provider-client relationships** (when provider views client):
```typescript
// In ClientHistoryScreen.tsx or wherever provider interacts with client
import { group, setGroupProperties } from '@/services/analytics';

// Set both groups
group('provider', user.id);
group('client', clientId);

// Set client group properties (if not already set)
setGroupProperties('client', clientId, {
  name: client.name,
  created_at: client.createdAt || new Date().toISOString(),
  role: 'client',
});
```

**Verify**: PostHog → Data → Groups should show readable names.

---

### 2. Smoke-Test the North Star Metric

**Goal**: Verify `days_since_session_completed` is being computed correctly.

**In PostHog Dashboard**:
1. Navigate to **Trends**
2. Create new insight:
   - Event: `business_payment_confirmed`
   - Formula: `median(days_since_session_completed)`
   - Breakdown: Group by `provider`
3. Expected values: `≥0` and `<60` for test data
4. If you see `null` or missing values:
   - Check normalizer has `session_end_time` in payload
   - Verify `end_time` is being sent on `business_session_completed`

**Debug in dry-run mode**:
```typescript
// Look for this in console logs:
[analytics] Event captured: business_payment_confirmed
Payload (normalized): {
  payment_ids: [...],
  days_since_session_completed: 3,  // ✅ Should be a number
  // ...
}
```

---

### 3. QA Full Happy Path (End-to-End)

**Provider Flow**:
1. ✅ Register → `auth_register_submitted`, `business_user_registered`
2. ✅ Login → `identify()` called
3. ✅ Start session → `action_session_started`
4. ✅ Stop session → `action_session_stopped`, `business_session_completed`
5. ✅ Request payment → `action_payment_requested`, `business_payment_requested`
6. ✅ Mark paid → `action_mark_as_paid_submitted`, `business_payment_confirmed`

**Client Flow**:
1. ✅ Claim invite → `auth_invite_claimed`, `business_invite_code_claimed`, `business_user_registered`
2. ✅ Login → `identify()` called
3. ✅ Mark sent → `action_payment_sent_submitted`

**Verify in PostHog → Live Events**:
- All events appear
- All `business_*` events show provider/client groups in event details
- No schema validation warnings in console
- All canonical fields present

---

### 4. Background Flush Hook ✅ (Already Implemented)

**Status**: Already done in `App.tsx:140-148`

```typescript
// App.tsx - AppState listener already flushes on background
const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
  if (nextAppState === 'background') {
    flush(); // Flush queued events
    if (__DEV__) {
      console.log('📤 TrackPay: Analytics events flushed (app backgrounded)');
    }
  }
});
```

**Verify**: Background the app and check PostHog receives events.

---

### 5. Create & Pin Dashboards

Create these 4 dashboards in PostHog:

#### Dashboard 1: Payment Velocity (North Star)
**Type**: Trends (Line Chart)
- **Event**: `business_payment_confirmed`
- **Formula**: `median(days_since_session_completed)`
- **Breakdown**: Group by `provider`
- **Target**: <7 days average

#### Dashboard 2: Provider Onboarding Funnel
**Type**: Funnel
1. `auth_register_submitted` (filter: `user_role = 'provider'`)
2. `action_session_started` (first meaningful action)
3. `action_payment_requested`

**Targets**:
- Step 1→2: >80%
- Step 2→3: >60%

#### Dashboard 3: Invite Conversion
**Type**: Trends (Bar Chart)
- **Metric**: `business_invite_code_claimed` / `business_invite_code_created` * 100
- **Breakdown**: `share_method` (or `share_target` if using share_sheet)
- **Target**: >40% conversion

#### Dashboard 4: Role-Based Retention
**Type**: Retention
- **Cohort**: Users with any `screen_view_*` event
- **Filter**: `user_role = 'provider'` (create separate for clients)
- **Active Definition**: Any `screen_view_*` in period
- **Chart**: D1, D7, D14, D30

**Targets**:
- D7: >50%
- D30: >30%

---

### 6. Data Quality Audit (15 minutes)

**Uniqueness Check**:
- ✅ `session_id` is stable across `action_session_started`, `action_session_stopped`, `business_session_completed`
- ✅ `payment_request_id` is unique per payment request
- ✅ `payment_ids` array contains actual payment/session IDs

**Required Fields Check** (Spot-check 5 events of each type):
- ✅ No canonical fields are missing or `null`
- ✅ All `business_*` events have provider group
- ✅ Two-sided events have both provider AND client groups

**Values Make Sense**:
- ✅ `person_hours` = `duration_minutes * crew_size / 60`
- ✅ `total_amount` = `person_hours * hourly_rate`
- ✅ No negative values or NaN
- ✅ `days_since_session_completed` ≥ 0

**Time Zones**:
- ✅ All timestamps are ISO 8601 format
- ✅ PostHog renders in project timezone
- ✅ `timezone` person property is populated

**Console Check** (Dev mode):
```bash
# Look for these in console:
✅ [analytics] Event captured: business_payment_confirmed
✅ [analytics] Group set: provider = <id>
✅ [analytics] Group set: client = <id>
❌ [analytics] Schema mismatch: <event_name>  # Should NOT see this
```

---

### 7. Kill-Switch Test

**Test opt-out/opt-in**:
```typescript
import { optOut, optIn } from '@/services/analytics';

// Opt out
optOut();
// Navigate around, do actions - verify NO events in PostHog Live Events

// Opt in
optIn();
// Navigate around - verify events resume
```

**Settings Screen Integration** (optional):
```typescript
// In SettingsScreen.tsx
import { optOut, optIn, isOptedOutStatus } from '@/services/analytics';

const [analyticsEnabled, setAnalyticsEnabled] = useState(!isOptedOutStatus());

const handleToggleAnalytics = (enabled: boolean) => {
  if (enabled) {
    optIn();
  } else {
    optOut();
  }
  setAnalyticsEnabled(enabled);
};
```

---

### 8. Alert on Regressions (Optional)

**In PostHog → Alerts**:
1. Create alert: "Payment Velocity Regression"
2. Condition: `median(days_since_session_completed)` on `business_payment_confirmed` > 10 days
3. Window: 24 hours
4. Action: Email/Slack notification

---

## 🔧 After a Day of Data (Cleanup & Hardening)

### Trim the Normalizer

Once call sites are fully migrated and data looks clean:

```typescript
// In posthog.ts normalizePayload()
// Remove these temporary aliases:
- if (p.amount_paid != null && p.total_amount == null) { ... }  // DELETE
- if (p.duration_minutes != null && p.total_duration_minutes == null) { ... }  // DELETE
- if (!p.payment_ids && Array.isArray(p.session_ids)) { ... }  // DELETE
```

### Lock Enums in Zod

Remove transitional values once dashboards populated:

```typescript
// In events.ts
// BEFORE:
export const ShareMethod = z.enum(['imessage', 'whatsapp', 'copy_link', 'share_sheet', 'copy_code']);

// AFTER (locked to canonical):
export const ShareMethod = z.enum(['imessage', 'whatsapp', 'copy_link']);
```

### Document Required Fields at Call Sites

Add JSDoc comments above each `capture()`:

```typescript
/**
 * Track session stopped
 * Required: session_id, client_id, total_duration_minutes, crew_size, person_hours, hourly_rate, total_amount
 */
capture(E.ACTION_SESSION_STOPPED, {
  session_id: activeSession.id,
  client_id: clientId,
  total_duration_minutes: durationMinutes,
  crew_size: finalCrewSize,
  person_hours: totalPersonHours,
  hourly_rate: client?.hourlyRate || 0,
  total_amount: totalAmount,
});
```

---

## 📊 Success Metrics

After 1 week of data:
- ✅ Payment velocity dashboard shows meaningful trend
- ✅ Provider funnel shows >70% conversion to first session
- ✅ Invite conversion >30% (adjust growth strategy if lower)
- ✅ D7 retention >40% for providers
- ✅ All events have provider/client groups attached
- ✅ No schema validation warnings in production logs

---

## 🚀 Tier 1 Backlog (When Ready)

1. **action_add_client_submitted** - Track client additions
2. **Error interceptors** - Network/app crash tracking
3. **Branded ID types** - TypeScript branded types for ProviderId, ClientId, SessionId
4. **Language change tracking** - Track when users switch languages
5. **Crew size change events** - Track mid-session crew changes
6. **Timer tick sampling** - Sample session timer ticks (gated by feature flag)

---

**Last Updated**: October 22, 2025
**Status**: Ready for smoke testing and deployment
