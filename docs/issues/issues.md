# TrackPay - Issue Tracker

This file tracks known issues, bugs, and technical debt that need to be addressed.

---

## 🔴 Active Issues

### Issue #1: Excessive Database Calls - `getClients()` Called 7+ Times on Multiple Screens

**Status:** Open
**Priority:** High (Performance Impact)
**Component:** Multiple screens (navigation cascade issue)
**Date Reported:** October 22, 2025

#### Description

The `getClients()` database query is called **7+ times** consecutively with the same `providerId` on multiple screens and user actions. This causes unnecessary database load and potential performance degradation, especially for users with many clients.

**Screens that DIRECTLY call `getClients()`:**
- **ClientListScreen.tsx** (lines 89, 149) - Calls in `loadClients()` and refresh handler
- **HistoryScreen.tsx** (line 29) - Calls in data loading
- **ClientViewScreen.tsx** (line 48) - Calls in data loading
- **AccountSelectionScreen.tsx** (line 46) - Calls during account switching

**Screens where EXCESSIVE calls are OBSERVED (indirect triggers):**
- **ClientHistoryScreen** - Triggers cascade when session ends or navigating to/from screen
- **ClientProfileScreen** - Triggers cascade after invite creation/navigation
- **ClientListScreen** - Parent screen that refreshes on navigation back from child screens


  Impact Multiplier: The issue
  scales with client count - a
  user with 50 clients would
  trigger 350+ wasted API calls
  on a single session end!

  Audit Recommended: Similar
  patterns likely exist for:
  - getSessions()
  - getActivities()
  - getClientSummary()
  - getProviders()
  - getPaymentRequests()

  All details documented in
  /docs/issues/issues.md with
  testing scenarios, suggested
  fixes, and acceptance criteria
#### Evidence

Console logs show multiple identical calls:
```
👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
👥 Raw relationships query result: {count: 14, relationships: Array(14)}
👥 Returning clients: (14) [{…}, {…}, ...]
// ↑ This repeats 7+ times
```

**Triggers:**
- Stopping a work session from ClientHistoryScreen footer button
- Navigating to ClientHistoryScreen
- Navigating to ClientProfileScreen
- Creating a new invite/client
- Returning to ClientListScreen from any child screen

#### Root Cause Analysis

Likely causes:
1. **Multiple React re-renders** - State updates triggering cascading re-renders
2. **useFocusEffect timing** - Effect running multiple times on navigation
3. **Parent-child refresh cascade** - Both ClientListScreen and ClientHistoryScreen calling `loadData()`
4. **Missing memoization** - No caching or debouncing of database calls
5. **Navigation state changes** - Navigation events triggering multiple effects

#### Impact

- **Performance:** Wasted database queries (7x overhead)
- **Cost:** Increased Supabase API usage
- **UX:** Potential loading delays for users with many clients
- **Scalability:** Issue will worsen as user base grows

#### Suggested Fixes

**Option 1: Request Deduplication (Quick Fix)**
```typescript
// Add request deduplication in directSupabase.ts
const pendingRequests = new Map();

export async function getClients(providerId: string) {
  const key = `getClients:${providerId}`;

  // Return pending request if one exists
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  // Create new request
  const request = fetchClientsFromDB(providerId);
  pendingRequests.set(key, request);

  try {
    const result = await request;
    return result;
  } finally {
    pendingRequests.delete(key);
  }
}
```

**Option 2: React Query / SWR Integration (Better Long-term)**
- Implement React Query or SWR for automatic caching and deduplication
- Provides stale-while-revalidate pattern
- Built-in request deduplication

**Option 3: useFocusEffect Optimization**
```typescript
// In ClientHistoryScreen.tsx
useFocusEffect(
  useCallback(() => {
    if (initialLoad) {
      loadData(false);
    } else {
      // Stale-time pattern: only refetch if >30s old
      const STALE_MS = 30_000;
      if (Date.now() - lastFetchedRef.current > STALE_MS) {
        loadData(true); // Silent refetch
      }
    }
  }, [initialLoad, loadData])
);
```

**Option 4: Global State Management**
- Move client list to global state (Context or Zustand)
- Single source of truth across screens
- Eliminates redundant fetches

#### Files Involved

**Direct callers:**
- `src/screens/ClientListScreen.tsx` (loadClients, refresh handler, useFocusEffect)
- `src/screens/HistoryScreen.tsx` (loadData on mount)
- `src/screens/ClientViewScreen.tsx` (loadData on mount)
- `src/screens/AccountSelectionScreen.tsx` (account switching)

**Indirect triggers:**
- `src/screens/ClientHistoryScreen.tsx` (session end triggers parent refresh)
- `src/screens/ClientProfileScreen.tsx` (invite creation triggers parent refresh)
- `src/navigation/AppNavigator.tsx` (navigation state changes trigger focus effects)

**Core service:**
- `src/services/directSupabase.ts` (getClients function - needs request deduplication)

#### Testing Steps to Reproduce

**Scenario 1: Session End**
1. Login as a provider
2. Go to Client History screen for any client
3. Start a work session (click "Start")
4. Immediately stop the session (click "Stop")
5. Open browser console
6. Observe 7+ `getClients()` calls

**Scenario 2: Navigation**
1. Login as a provider
2. Open browser console
3. Navigate from ClientList → ClientHistory → ClientProfile
4. Observe multiple `getClients()` calls at each navigation step

**Scenario 3: Invite Creation**
1. Login as a provider
2. Open browser console
3. Create a new client/invite
4. Observe excessive `getClients()` calls after creation

#### Acceptance Criteria

- [ ] `getClients()` called **maximum 2 times** on session end (initial + refresh)
- [ ] No duplicate database queries within 1 second window
- [ ] Loading indicators show appropriately
- [ ] Data remains fresh across screens
- [ ] No regression in existing functionality

#### Related Issues

- None yet

#### Notes

- Issue discovered during PostHog analytics implementation testing (October 22, 2025)
- Does not affect analytics functionality or app correctness - purely a performance issue
- Affects **8 screens total**: 4 direct callers + 4 indirect triggers
- Pattern is systemic across the app, not isolated to one screen
- **Root cause**: React Navigation's focus/blur events + parent-child screen refresh cascade
- Similar pattern likely exists for other database calls (`getSessions`, `getActivities`, `getClientSummary`)
- Should audit all database calls for similar issues
- **Impact multiplier**: Issue scales linearly with number of clients (user with 50 clients = 350+ wasted API calls on single session end)

#### Audit Needed - Other Database Functions
The following functions should be audited for similar excessive call patterns:
- `getSessions()` - Session data loading
- `getActivities()` - Activity feed loading
- `getClientSummary()` - Client summary calculations
- `getProviders()` - Provider list (client-side)
- `getPaymentRequests()` - Payment request loading

---

## 📋 Issue Template

```markdown
### Issue #X: [Title]

**Status:** Open | In Progress | Fixed | Won't Fix
**Priority:** Critical | High | Medium | Low
**Component:** [Component/Screen Name]
**Date Reported:** [Date]

#### Description
[Clear description of the issue]

#### Evidence
[Logs, screenshots, error messages]

#### Root Cause Analysis
[What's causing this issue]

#### Impact
[How this affects users/performance]

#### Suggested Fixes
[Possible solutions]

#### Files Involved
[List of files that need changes]

#### Testing Steps to Reproduce
1. Step 1
2. Step 2
3. ...

#### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

#### Related Issues
[Links to related issues]

#### Notes
[Additional context]
```

---

## ✅ Resolved Issues

### Issue #2: PostHog Analytics Schema Validation Warnings

**Status:** ✅ Fixed
**Priority:** Medium
**Component:** Analytics (PostHog integration)
**Date Reported:** October 22, 2025
**Date Resolved:** October 22, 2025

#### Description
Multiple PostHog analytics events had schema validation warnings in development mode. The Zod schemas didn't match the actual payloads being sent from screens.

#### Issues Found
1. `action_payment_requested` - Schema expected different fields
2. `business_payment_requested` - Missing unpaid_session_ids array
3. `action_payment_sent_submitted` - Missing provider_name, payment_method
4. `business_payment_confirmed` - Missing session details
5. `action_session_stopped` - Schema too complex, didn't match simple payload
6. `business_session_completed` - Used start_time/end_time instead of completed_at
7. `business_invite_code_shared` - Wrong ShareMethod enum values, missing fields

#### Resolution
All 7 schema mismatches fixed in `/src/services/analytics/events.ts`. Schemas now match actual payloads sent from screens. All events validating correctly in dry-run mode.

#### Files Modified
- `src/services/analytics/events.ts` - Updated 7 event schemas

---

---

## 📊 Issue Statistics

- **Total Open Issues:** 1
- **Total Resolved Issues:** 1
- **Critical:** 0
- **High Priority:** 1 (open)
- **Medium Priority:** 0 (open), 1 (resolved)
- **Low Priority:** 0

---

## 🏷️ Issue Labels

- **bug** - Something isn't working correctly
- **performance** - Performance optimization needed
- **technical-debt** - Code quality/architecture improvements
- **enhancement** - New feature or improvement
- **security** - Security-related issue
- **documentation** - Documentation needs update
- **analytics** - Analytics-related issue
- **database** - Database/Supabase issue
- **ui/ux** - User interface/experience issue

---

**Last Updated:** October 22, 2025

### evdience log

[analytics] Screen not tracked (not Tier-0): ClientProfile
ClientProfile?clientId=76c55e22-68cb-4b05-8a09-c98a4224274f:1 Blocked aria-hidden on an element because its descendant retained focus. The focus must not be hidden from assistive technology users. Avoid using aria-hidden on a focused element or its ancestor. Consider using the inert attribute instead, which will also prevent focus. For more details, see the aria-hidden section of the WAI-ARIA specification at https://w3c.github.io/aria/#aria-hidden.
Element with focus: <div.css-view-g5y9jx r-transitionProperty-1i6wzkk r-userSelect-lrvibr r-cursor-1loqt21 r-touchAction-1otgn73 r-alignItems-1awozwy r-height-eu3ka r-justifyContent-1777fci r-width-1aockid>
Ancestor with aria-hidden: <div.css-view-g5y9jx r-bottom-1p0dtai r-left-1d2f490 r-position-u8s1d r-right-zchlnj r-top-ipm5af r-pointerEvents-633pao> <div class=​"css-view-g5y9jx r-bottom-1p0dtai r-left-1d2f490 r-position-u8s1d r-right-zchlnj r-top-ipm5af r-pointerEvents-633pao" aria-hidden=​"true" style=​"display:​ flex;​ visibility:​ hidden;​ overflow:​ hidden;​">​…​</div>​flexUnderstand this warning
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 15, relationships: Array(15)}
directSupabase.ts:123 👥 Returning clients: (15) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 15, relationships: Array(15)}
directSupabase.ts:123 👥 Returning clients: (15) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
ClientProfileScreen.tsx:191 Error sharing invite: AbortError: Share canceled
handleShareInvite @ ClientProfileScreen.tsx:191
await in handleShareInvite
onClick @ PressResponder.js:314
executeDispatch @ react-dom-client.development.js:16368
runWithFiberInDEV @ react-dom-client.development.js:1519
processDispatchQueue @ react-dom-client.development.js:16418
(anonymous) @ react-dom-client.development.js:17016
batchedUpdates$1 @ react-dom-client.development.js:3262
dispatchEventForPluginEventSystem @ react-dom-client.development.js:16572
dispatchEvent @ react-dom-client.development.js:20658
dispatchDiscreteEvent @ react-dom-client.development.js:20626
<div>
exports.createElement @ react.development.js:1033
createElement @ index.js:24
View @ index.js:111
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateForwardRef @ react-dom-client.development.js:8645
beginWork @ react-dom-client.development.js:10861
runWithFiberInDEV @ react-dom-client.development.js:1519
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14419
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45
<View>
exports.createElement @ react.development.js:1033
TouchableOpacity @ index.js:90
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateForwardRef @ react-dom-client.development.js:8645
beginWork @ react-dom-client.development.js:10861
runWithFiberInDEV @ react-dom-client.development.js:1522
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14419
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45Understand this error
posthog.ts:192 [analytics] Event captured: screen_view_client_history
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 15, relationships: Array(15)}
directSupabase.ts:123 👥 Returning clients: (15) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
ClientHistoryScreen.tsx:224 📋 Timeline items: []
directSupabase.ts:318 ✅ Session saved to Supabase: 75014507-3652-4a4a-b827-4a4cdeba2b2a
directSupabase.ts:697 🔍 Getting provider ID for activity...
directSupabase.ts:702 📝 Inserting activity to database: {id: 'facd1cfb-c317-4202-96bc-f50fbe5f66c1', type: 'session_start', provider_id: '5c0f4c79-bc6d-47dd-af6c-735215f11004', client_id: '76c55e22-68cb-4b05-8a09-c98a4224274f', session_id: '75014507-3652-4a4a-b827-4a4cdeba2b2a', …}
directSupabase.ts:738 ✅ Activity saved to Supabase: facd1cfb-c317-4202-96bc-f50fbe5f66c1
posthog.ts:125 [analytics] Group set: provider = 6a120f36-7ac8-4bda-899b-202f93845644
posthog.ts:125 [analytics] Group set: client = 76c55e22-68cb-4b05-8a09-c98a4224274f
posthog.ts:192 [analytics] Event captured: action_session_started
ClientHistoryScreen.tsx:224 📋 Timeline items: []
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 15, relationships: Array(15)}
directSupabase.ts:123 👥 Returning clients: (15) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
ClientHistoryScreen.tsx:224 📋 Timeline items: [{…}]
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-10-22T19:58:04.591Z', dayKey: '2025-10-22', formatDateResult: 'Oct 22, 2025'}
ClientHistoryScreen.tsx:224 📋 Timeline items: [{…}]
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-10-22T19:58:04.591Z', dayKey: '2025-10-22', formatDateResult: 'Oct 22, 2025'}
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 15, relationships: Array(15)}
directSupabase.ts:123 👥 Returning clients: (15) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 15, relationships: Array(15)}
directSupabase.ts:123 👥 Returning clients: (15) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 15, relationships: Array(15)}
directSupabase.ts:123 👥 Returning clients: (15) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:352 🛑 endSession called with sessionId: 75014507-3652-4a4a-b827-4a4cdeba2b2a
directSupabase.ts:366 📊 Session fetch result: {session: {…}, fetchError: null}
directSupabase.ts:383 💰 Calculated duration and amount: {durationMinutes: 2, durationHours: 0.03333333333333333, amount: 0.9}
directSupabase.ts:408 ✅ Session ended successfully - updated to unpaid status: 75014507-3652-4a4a-b827-4a4cdeba2b2a
directSupabase.ts:697 🔍 Getting provider ID for activity...
directSupabase.ts:702 📝 Inserting activity to database: {id: '036379bb-1e3a-45a6-80e8-b86481f9478a', type: 'session_end', provider_id: '5c0f4c79-bc6d-47dd-af6c-735215f11004', client_id: '76c55e22-68cb-4b05-8a09-c98a4224274f', session_id: '75014507-3652-4a4a-b827-4a4cdeba2b2a', …}
directSupabase.ts:738 ✅ Activity saved to Supabase: 036379bb-1e3a-45a6-80e8-b86481f9478a
posthog.ts:125 [analytics] Group set: provider = 6a120f36-7ac8-4bda-899b-202f93845644
posthog.ts:125 [analytics] Group set: client = 76c55e22-68cb-4b05-8a09-c98a4224274f
posthog.ts:176 [analytics] Schema mismatch: action_session_stopped
capture @ posthog.ts:176
handleEndSession @ ClientHistoryScreen.tsx:396
await in handleEndSession
onClick @ PressResponder.js:314
executeDispatch @ react-dom-client.development.js:16368
runWithFiberInDEV @ react-dom-client.development.js:1519
processDispatchQueue @ react-dom-client.development.js:16418
(anonymous) @ react-dom-client.development.js:17016
batchedUpdates$1 @ react-dom-client.development.js:3262
dispatchEventForPluginEventSystem @ react-dom-client.development.js:16572
dispatchEvent @ react-dom-client.development.js:20658
dispatchDiscreteEvent @ react-dom-client.development.js:20626Understand this warning
posthog.ts:177   Issues: (5) [{…}, {…}, {…}, {…}, {…}]
capture @ posthog.ts:177
handleEndSession @ ClientHistoryScreen.tsx:396
await in handleEndSession
onClick @ PressResponder.js:314
executeDispatch @ react-dom-client.development.js:16368
runWithFiberInDEV @ react-dom-client.development.js:1519
processDispatchQueue @ react-dom-client.development.js:16418
(anonymous) @ react-dom-client.development.js:17016
batchedUpdates$1 @ react-dom-client.development.js:3262
dispatchEventForPluginEventSystem @ react-dom-client.development.js:16572
dispatchEvent @ react-dom-client.development.js:20658
dispatchDiscreteEvent @ react-dom-client.development.js:20626Understand this warning
posthog.ts:178   Payload: {session_id: '75014507-3652-4a4a-b827-4a4cdeba2b2a', client_id: '76c55e22-68cb-4b05-8a09-c98a4224274f', client_name: 'aaaabcd magic', duration_minutes: 2}
capture @ posthog.ts:178
handleEndSession @ ClientHistoryScreen.tsx:396
await in handleEndSession
onClick @ PressResponder.js:314
executeDispatch @ react-dom-client.development.js:16368
runWithFiberInDEV @ react-dom-client.development.js:1519
processDispatchQueue @ react-dom-client.development.js:16418
(anonymous) @ react-dom-client.development.js:17016
batchedUpdates$1 @ react-dom-client.development.js:3262
dispatchEventForPluginEventSystem @ react-dom-client.development.js:16572
dispatchEvent @ react-dom-client.development.js:20658
dispatchDiscreteEvent @ react-dom-client.development.js:20626Understand this warning
posthog.ts:192 [analytics] Event captured: action_session_stopped
posthog.ts:176 [analytics] Schema mismatch: business_session_completed
capture @ posthog.ts:176
handleEndSession @ ClientHistoryScreen.tsx:404
await in handleEndSession
onClick @ PressResponder.js:314
executeDispatch @ react-dom-client.development.js:16368
runWithFiberInDEV @ react-dom-client.development.js:1519
processDispatchQueue @ react-dom-client.development.js:16418
(anonymous) @ react-dom-client.development.js:17016
batchedUpdates$1 @ react-dom-client.development.js:3262
dispatchEventForPluginEventSystem @ react-dom-client.development.js:16572
dispatchEvent @ react-dom-client.development.js:20658
dispatchDiscreteEvent @ react-dom-client.development.js:20626Understand this warning
posthog.ts:177   Issues: (2) [{…}, {…}]
capture @ posthog.ts:177
handleEndSession @ ClientHistoryScreen.tsx:404
await in handleEndSession
onClick @ PressResponder.js:314
executeDispatch @ react-dom-client.development.js:16368
runWithFiberInDEV @ react-dom-client.development.js:1519
processDispatchQueue @ react-dom-client.development.js:16418
(anonymous) @ react-dom-client.development.js:17016
batchedUpdates$1 @ react-dom-client.development.js:3262
dispatchEventForPluginEventSystem @ react-dom-client.development.js:16572
dispatchEvent @ react-dom-client.development.js:20658
dispatchDiscreteEvent @ react-dom-client.development.js:20626Understand this warning
posthog.ts:178   Payload: {session_id: '75014507-3652-4a4a-b827-4a4cdeba2b2a', provider_id: '6a120f36-7ac8-4bda-899b-202f93845644', client_id: '76c55e22-68cb-4b05-8a09-c98a4224274f', client_name: 'aaaabcd magic', crew_size: 1, …}
capture @ posthog.ts:178
handleEndSession @ ClientHistoryScreen.tsx:404
await in handleEndSession
onClick @ PressResponder.js:314
executeDispatch @ react-dom-client.development.js:16368
runWithFiberInDEV @ react-dom-client.development.js:1519
processDispatchQueue @ react-dom-client.development.js:16418
(anonymous) @ react-dom-client.development.js:17016
batchedUpdates$1 @ react-dom-client.development.js:3262
dispatchEventForPluginEventSystem @ react-dom-client.development.js:16572
dispatchEvent @ react-dom-client.development.js:20658
dispatchDiscreteEvent @ react-dom-client.development.js:20626Understand this warning
posthog.ts:192 [analytics] Event captured: business_session_completed
ClientHistoryScreen.tsx:224 📋 Timeline items: [{…}]
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-10-22T19:58:04.591Z', dayKey: '2025-10-22', formatDateResult: 'Oct 22, 2025'}
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 15, relationships: Array(15)}
directSupabase.ts:123 👥 Returning clients: (15) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
ClientHistoryScreen.tsx:224 📋 Timeline items: [{…}]
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-10-22T20:00:25.299Z', dayKey: '2025-10-22', formatDateResult: 'Oct 22, 2025'}
posthog.ts:192 [analytics] Event captured: screen_view_client_list
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 15, relationships: Array(15)}
directSupabase.ts:123 👥 Returning clients: (15) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 15, relationships: Array(15)}
directSupabase.ts:123 👥 Returning clients: (15) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:154 ✅ Unclaimed client created in Supabase: 9e0abbfb-ab82-4e71-a157-88a7f98673aa
directSupabase.ts:175 ✅ Client-provider relationship created
fetch.js:23  GET https://qpoqeqasefatyrjeronp.supabase.co/rest/v1/trackpay_invites?select=id&invite_code=eq.4WPRJC2Q 406 (Not Acceptable)
(anonymous) @ fetch.js:23
(anonymous) @ fetch.js:44
fulfilled @ fetch.js:4
Promise.then
step @ fetch.js:6
(anonymous) @ fetch.js:7
__awaiter @ fetch.js:3
(anonymous) @ fetch.js:34
then @ PostgrestBuilder.js:66Understand this error
directSupabase.ts:835 ✅ Invite created for client: 4WPRJC2Q
directSupabase.ts:189 ✅ Invite created for client: 4WPRJC2Q
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
ClientHistoryScreen.tsx:224 📋 Timeline items: []
posthog.ts:192 [analytics] Event captured: screen_view_client_history
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
ClientHistoryScreen.tsx:224 📋 Timeline items: []
navigation.ts:72 [analytics] Screen not tracked (not Tier-0): ClientProfile
ClientProfile?clientId=9e0abbfb-ab82-4e71-a157-88a7f98673aa:1 Blocked aria-hidden on an element because its descendant retained focus. The focus must not be hidden from assistive technology users. Avoid using aria-hidden on a focused element or its ancestor. Consider using the inert attribute instead, which will also prevent focus. For more details, see the aria-hidden section of the WAI-ARIA specification at https://w3c.github.io/aria/#aria-hidden.
Element with focus: <div.css-view-g5y9jx r-transitionProperty-1i6wzkk r-userSelect-lrvibr r-cursor-1loqt21 r-touchAction-1otgn73 r-alignItems-1awozwy r-height-eu3ka r-justifyContent-1777fci r-width-1aockid>
Ancestor with aria-hidden: <div.css-view-g5y9jx r-bottom-1p0dtai r-left-1d2f490 r-position-u8s1d r-right-zchlnj r-top-ipm5af r-pointerEvents-633pao> <div class=​"css-view-g5y9jx r-bottom-1p0dtai r-left-1d2f490 r-position-u8s1d r-right-zchlnj r-top-ipm5af r-pointerEvents-633pao" aria-hidden=​"true" style=​"display:​ flex;​ visibility:​ hidden;​ overflow:​ hidden;​">​…​</div>​flexUnderstand this warning
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
ClientProfileScreen.tsx:191 Error sharing invite: AbortError: Share canceled
handleShareInvite @ ClientProfileScreen.tsx:191
await in handleShareInvite
onClick @ PressResponder.js:314
executeDispatch @ react-dom-client.development.js:16368
runWithFiberInDEV @ react-dom-client.development.js:1519
processDispatchQueue @ react-dom-client.development.js:16418
(anonymous) @ react-dom-client.development.js:17016
batchedUpdates$1 @ react-dom-client.development.js:3262
dispatchEventForPluginEventSystem @ react-dom-client.development.js:16572
dispatchEvent @ react-dom-client.development.js:20658
dispatchDiscreteEvent @ react-dom-client.development.js:20626
<div>
exports.createElement @ react.development.js:1033
createElement @ index.js:24
View @ index.js:111
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateForwardRef @ react-dom-client.development.js:8645
beginWork @ react-dom-client.development.js:10861
runWithFiberInDEV @ react-dom-client.development.js:1519
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14419
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45
<View>
exports.createElement @ react.development.js:1033
TouchableOpacity @ index.js:90
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateForwardRef @ react-dom-client.development.js:8645
beginWork @ react-dom-client.development.js:10861
runWithFiberInDEV @ react-dom-client.development.js:1522
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14419
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45Understand this error
posthog.ts:192 [analytics] Event captured: screen_view_client_history
directSupabase.ts:318 ✅ Session saved to Supabase: 30c92440-d854-41d7-bf57-602ba1499c82
directSupabase.ts:697 🔍 Getting provider ID for activity...
directSupabase.ts:702 📝 Inserting activity to database: {id: 'f7ea5486-6adf-493f-9df2-55b517b0e7d6', type: 'session_start', provider_id: '5c0f4c79-bc6d-47dd-af6c-735215f11004', client_id: '9e0abbfb-ab82-4e71-a157-88a7f98673aa', session_id: '30c92440-d854-41d7-bf57-602ba1499c82', …}
directSupabase.ts:738 ✅ Activity saved to Supabase: f7ea5486-6adf-493f-9df2-55b517b0e7d6
posthog.ts:125 [analytics] Group set: provider = 6a120f36-7ac8-4bda-899b-202f93845644
posthog.ts:125 [analytics] Group set: client = 9e0abbfb-ab82-4e71-a157-88a7f98673aa
posthog.ts:192 [analytics] Event captured: action_session_started
ClientHistoryScreen.tsx:224 📋 Timeline items: []
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
ClientHistoryScreen.tsx:224 📋 Timeline items: [{…}]
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-10-22T20:01:39.337Z', dayKey: '2025-10-22', formatDateResult: 'Oct 22, 2025'}
ClientHistoryScreen.tsx:224 📋 Timeline items: [{…}]
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-10-22T20:01:39.337Z', dayKey: '2025-10-22', formatDateResult: 'Oct 22, 2025'}
posthog.ts:192 [analytics] Event captured: screen_view_client_list
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:318 ✅ Session saved to Supabase: f2bfe39a-38bb-4e9a-a43a-2343b5ee985f
directSupabase.ts:697 🔍 Getting provider ID for activity...
directSupabase.ts:702 📝 Inserting activity to database: {id: '3f01dfef-39d6-4493-95f1-4c3cc65b12b9', type: 'session_start', provider_id: '5c0f4c79-bc6d-47dd-af6c-735215f11004', client_id: '8012dfc5-38ad-4e6a-abb7-159fc15f40ae', session_id: 'f2bfe39a-38bb-4e9a-a43a-2343b5ee985f', …}
directSupabase.ts:738 ✅ Activity saved to Supabase: 3f01dfef-39d6-4493-95f1-4c3cc65b12b9
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
ClientHistoryScreen.tsx:224 📋 Timeline items: []
posthog.ts:192 [analytics] Event captured: screen_view_client_history
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
ClientHistoryScreen.tsx:224 📋 Timeline items: (13) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
ClientHistoryScreen.tsx:233 💰 Payment request data: (5) [{…}, {…}, {…}, {…}, {…}]
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-10-22T20:01:54.625Z', dayKey: '2025-10-22', formatDateResult: 'Oct 22, 2025'}
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-10-22T19:55:42.996Z', dayKey: '2025-10-22', formatDateResult: 'Oct 22, 2025'}
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'payment_request', timestamp: '2025-10-21T19:00:57.229Z', dayKey: '2025-10-21', formatDateResult: 'Oct 21, 2025'}
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-10-16T01:23:22.376Z', dayKey: '2025-10-16', formatDateResult: 'Oct 15, 2025'}
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'payment_request', timestamp: '2025-09-24T05:09:18.905Z', dayKey: '2025-09-24', formatDateResult: 'Sep 23, 2025'}
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-09-24T05:09:08.059Z', dayKey: '2025-09-24', formatDateResult: 'Sep 23, 2025'}
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'payment_request', timestamp: '2025-09-23T08:28:14.257Z', dayKey: '2025-09-23', formatDateResult: 'Sep 23, 2025'}
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-09-23T06:06:20.732Z', dayKey: '2025-09-23', formatDateResult: 'Sep 22, 2025'}
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'payment_request', timestamp: '2025-09-23T05:33:33.050Z', dayKey: '2025-09-23', formatDateResult: 'Sep 22, 2025'}
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-09-23T05:33:27.467Z', dayKey: '2025-09-23', formatDateResult: 'Sep 22, 2025'}
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'payment_request', timestamp: '2025-09-23T04:14:50.472Z', dayKey: '2025-09-23', formatDateResult: 'Sep 22, 2025'}
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-09-23T03:45:00.318Z', dayKey: '2025-09-23', formatDateResult: 'Sep 22, 2025'}
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-09-22T16:14:57.335Z', dayKey: '2025-09-22', formatDateResult: 'Sep 22, 2025'}
ClientHistoryScreen.tsx:224 📋 Timeline items: (13) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
ClientHistoryScreen.tsx:233 💰 Payment request data: (5) [{…}, {…}, {…}, {…}, {…}]
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-10-22T20:01:54.625Z', dayKey: '2025-10-22', formatDateResult: 'Oct 22, 2025'}
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-10-22T19:55:42.996Z', dayKey: '2025-10-22', formatDateResult: 'Oct 22, 2025'}
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'payment_request', timestamp: '2025-10-21T19:00:57.229Z', dayKey: '2025-10-21', formatDateResult: 'Oct 21, 2025'}
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-10-16T01:23:22.376Z', dayKey: '2025-10-16', formatDateResult: 'Oct 15, 2025'}
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'payment_request', timestamp: '2025-09-24T05:09:18.905Z', dayKey: '2025-09-24', formatDateResult: 'Sep 23, 2025'}
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-09-24T05:09:08.059Z', dayKey: '2025-09-24', formatDateResult: 'Sep 23, 2025'}
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'payment_request', timestamp: '2025-09-23T08:28:14.257Z', dayKey: '2025-09-23', formatDateResult: 'Sep 23, 2025'}
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-09-23T06:06:20.732Z', dayKey: '2025-09-23', formatDateResult: 'Sep 22, 2025'}
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'payment_request', timestamp: '2025-09-23T05:33:33.050Z', dayKey: '2025-09-23', formatDateResult: 'Sep 22, 2025'}
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-09-23T05:33:27.467Z', dayKey: '2025-09-23', formatDateResult: 'Sep 22, 2025'}
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'payment_request', timestamp: '2025-09-23T04:14:50.472Z', dayKey: '2025-09-23', formatDateResult: 'Sep 22, 2025'}
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-09-23T03:45:00.318Z', dayKey: '2025-09-23', formatDateResult: 'Sep 22, 2025'}
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-09-22T16:14:57.335Z', dayKey: '2025-09-22', formatDateResult: 'Sep 22, 2025'}
posthog.ts:192 [analytics] Event captured: screen_view_client_list
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
ClientHistoryScreen.tsx:224 📋 Timeline items: []
posthog.ts:192 [analytics] Event captured: screen_view_client_history
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
ClientHistoryScreen.tsx:224 📋 Timeline items: (5) [{…}, {…}, {…}, {…}, {…}]
ClientHistoryScreen.tsx:233 💰 Payment request data: (2) [{…}, {…}]
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'payment_request', timestamp: '2025-10-22T19:49:10.463Z', dayKey: '2025-10-22', formatDateResult: 'Oct 22, 2025'}
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-10-21T21:46:52.788Z', dayKey: '2025-10-21', formatDateResult: 'Oct 21, 2025'}
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-09-24T15:48:15.630Z', dayKey: '2025-09-24', formatDateResult: 'Sep 24, 2025'}
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'payment_request', timestamp: '2025-09-23T04:57:17.480Z', dayKey: '2025-09-23', formatDateResult: 'Sep 22, 2025'}
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-09-23T04:57:06.647Z', dayKey: '2025-09-23', formatDateResult: 'Sep 22, 2025'}
posthog.ts:192 [analytics] Event captured: screen_view_client_list
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:352 🛑 endSession called with sessionId: f2bfe39a-38bb-4e9a-a43a-2343b5ee985f
directSupabase.ts:366 📊 Session fetch result: {session: {…}, fetchError: null}
directSupabase.ts:383 💰 Calculated duration and amount: {durationMinutes: 1, durationHours: 0.016666666666666666, amount: 0.5833333333333334}
directSupabase.ts:408 ✅ Session ended successfully - updated to unpaid status: f2bfe39a-38bb-4e9a-a43a-2343b5ee985f
directSupabase.ts:697 🔍 Getting provider ID for activity...
directSupabase.ts:702 📝 Inserting activity to database: {id: 'c59b3def-09ad-4f9c-8f53-ab2c56467046', type: 'session_end', provider_id: '5c0f4c79-bc6d-47dd-af6c-735215f11004', client_id: '8012dfc5-38ad-4e6a-abb7-159fc15f40ae', session_id: 'f2bfe39a-38bb-4e9a-a43a-2343b5ee985f', …}
directSupabase.ts:738 ✅ Activity saved to Supabase: c59b3def-09ad-4f9c-8f53-ab2c56467046
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
ClientHistoryScreen.tsx:224 📋 Timeline items: []
posthog.ts:192 [analytics] Event captured: screen_view_client_history
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
ClientHistoryScreen.tsx:224 📋 Timeline items: [{…}]
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-10-22T20:01:39.337Z', dayKey: '2025-10-22', formatDateResult: 'Oct 22, 2025'}
ClientHistoryScreen.tsx:224 📋 Timeline items: [{…}]
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-10-22T20:01:39.337Z', dayKey: '2025-10-22', formatDateResult: 'Oct 22, 2025'}
directSupabase.ts:352 🛑 endSession called with sessionId: 30c92440-d854-41d7-bf57-602ba1499c82
directSupabase.ts:366 📊 Session fetch result: {session: {…}, fetchError: null}
directSupabase.ts:383 💰 Calculated duration and amount: {durationMinutes: 1, durationHours: 0.016666666666666666, amount: 0.48333333333333334}
directSupabase.ts:408 ✅ Session ended successfully - updated to unpaid status: 30c92440-d854-41d7-bf57-602ba1499c82
directSupabase.ts:697 🔍 Getting provider ID for activity...
directSupabase.ts:702 📝 Inserting activity to database: {id: 'b0f4ed42-e60c-48a1-aabe-4ae414ea3196', type: 'session_end', provider_id: '5c0f4c79-bc6d-47dd-af6c-735215f11004', client_id: '9e0abbfb-ab82-4e71-a157-88a7f98673aa', session_id: '30c92440-d854-41d7-bf57-602ba1499c82', …}
directSupabase.ts:738 ✅ Activity saved to Supabase: b0f4ed42-e60c-48a1-aabe-4ae414ea3196
posthog.ts:125 [analytics] Group set: provider = 6a120f36-7ac8-4bda-899b-202f93845644
posthog.ts:125 [analytics] Group set: client = 9e0abbfb-ab82-4e71-a157-88a7f98673aa
posthog.ts:176 [analytics] Schema mismatch: action_session_stopped
capture @ posthog.ts:176
handleEndSession @ ClientHistoryScreen.tsx:396
await in handleEndSession
onClick @ PressResponder.js:314
executeDispatch @ react-dom-client.development.js:16368
runWithFiberInDEV @ react-dom-client.development.js:1519
processDispatchQueue @ react-dom-client.development.js:16418
(anonymous) @ react-dom-client.development.js:17016
batchedUpdates$1 @ react-dom-client.development.js:3262
dispatchEventForPluginEventSystem @ react-dom-client.development.js:16572
dispatchEvent @ react-dom-client.development.js:20658
dispatchDiscreteEvent @ react-dom-client.development.js:20626
<div>
exports.createElement @ react.development.js:1033
createElement @ index.js:24
View @ index.js:111
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateForwardRef @ react-dom-client.development.js:8645
beginWork @ react-dom-client.development.js:10861
runWithFiberInDEV @ react-dom-client.development.js:1519
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14419
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45
<View>
exports.createElement @ react.development.js:1033
TouchableOpacity @ index.js:90
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateForwardRef @ react-dom-client.development.js:8645
beginWork @ react-dom-client.development.js:10861
runWithFiberInDEV @ react-dom-client.development.js:1522
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14419
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45Understand this warning
posthog.ts:177   Issues: (5) [{…}, {…}, {…}, {…}, {…}]
capture @ posthog.ts:177
handleEndSession @ ClientHistoryScreen.tsx:396
await in handleEndSession
onClick @ PressResponder.js:314
executeDispatch @ react-dom-client.development.js:16368
runWithFiberInDEV @ react-dom-client.development.js:1519
processDispatchQueue @ react-dom-client.development.js:16418
(anonymous) @ react-dom-client.development.js:17016
batchedUpdates$1 @ react-dom-client.development.js:3262
dispatchEventForPluginEventSystem @ react-dom-client.development.js:16572
dispatchEvent @ react-dom-client.development.js:20658
dispatchDiscreteEvent @ react-dom-client.development.js:20626
<div>
exports.createElement @ react.development.js:1033
createElement @ index.js:24
View @ index.js:111
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateForwardRef @ react-dom-client.development.js:8645
beginWork @ react-dom-client.development.js:10861
runWithFiberInDEV @ react-dom-client.development.js:1519
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14419
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45
<View>
exports.createElement @ react.development.js:1033
TouchableOpacity @ index.js:90
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateForwardRef @ react-dom-client.development.js:8645
beginWork @ react-dom-client.development.js:10861
runWithFiberInDEV @ react-dom-client.development.js:1522
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14419
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45Understand this warning
posthog.ts:178   Payload: {session_id: '30c92440-d854-41d7-bf57-602ba1499c82', client_id: '9e0abbfb-ab82-4e71-a157-88a7f98673aa', client_name: 'aaaabbbbb poas', duration_minutes: 1}
capture @ posthog.ts:178
handleEndSession @ ClientHistoryScreen.tsx:396
await in handleEndSession
onClick @ PressResponder.js:314
executeDispatch @ react-dom-client.development.js:16368
runWithFiberInDEV @ react-dom-client.development.js:1519
processDispatchQueue @ react-dom-client.development.js:16418
(anonymous) @ react-dom-client.development.js:17016
batchedUpdates$1 @ react-dom-client.development.js:3262
dispatchEventForPluginEventSystem @ react-dom-client.development.js:16572
dispatchEvent @ react-dom-client.development.js:20658
dispatchDiscreteEvent @ react-dom-client.development.js:20626
<div>
exports.createElement @ react.development.js:1033
createElement @ index.js:24
View @ index.js:111
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateForwardRef @ react-dom-client.development.js:8645
beginWork @ react-dom-client.development.js:10861
runWithFiberInDEV @ react-dom-client.development.js:1519
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14419
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45
<View>
exports.createElement @ react.development.js:1033
TouchableOpacity @ index.js:90
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateForwardRef @ react-dom-client.development.js:8645
beginWork @ react-dom-client.development.js:10861
runWithFiberInDEV @ react-dom-client.development.js:1522
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14419
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45Understand this warning
posthog.ts:192 [analytics] Event captured: action_session_stopped
posthog.ts:176 [analytics] Schema mismatch: business_session_completed
capture @ posthog.ts:176
handleEndSession @ ClientHistoryScreen.tsx:404
await in handleEndSession
onClick @ PressResponder.js:314
executeDispatch @ react-dom-client.development.js:16368
runWithFiberInDEV @ react-dom-client.development.js:1519
processDispatchQueue @ react-dom-client.development.js:16418
(anonymous) @ react-dom-client.development.js:17016
batchedUpdates$1 @ react-dom-client.development.js:3262
dispatchEventForPluginEventSystem @ react-dom-client.development.js:16572
dispatchEvent @ react-dom-client.development.js:20658
dispatchDiscreteEvent @ react-dom-client.development.js:20626
<div>
exports.createElement @ react.development.js:1033
createElement @ index.js:24
View @ index.js:111
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateForwardRef @ react-dom-client.development.js:8645
beginWork @ react-dom-client.development.js:10861
runWithFiberInDEV @ react-dom-client.development.js:1519
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14419
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45
<View>
exports.createElement @ react.development.js:1033
TouchableOpacity @ index.js:90
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateForwardRef @ react-dom-client.development.js:8645
beginWork @ react-dom-client.development.js:10861
runWithFiberInDEV @ react-dom-client.development.js:1522
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14419
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45Understand this warning
posthog.ts:177   Issues: (2) [{…}, {…}]
capture @ posthog.ts:177
handleEndSession @ ClientHistoryScreen.tsx:404
await in handleEndSession
onClick @ PressResponder.js:314
executeDispatch @ react-dom-client.development.js:16368
runWithFiberInDEV @ react-dom-client.development.js:1519
processDispatchQueue @ react-dom-client.development.js:16418
(anonymous) @ react-dom-client.development.js:17016
batchedUpdates$1 @ react-dom-client.development.js:3262
dispatchEventForPluginEventSystem @ react-dom-client.development.js:16572
dispatchEvent @ react-dom-client.development.js:20658
dispatchDiscreteEvent @ react-dom-client.development.js:20626
<div>
exports.createElement @ react.development.js:1033
createElement @ index.js:24
View @ index.js:111
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateForwardRef @ react-dom-client.development.js:8645
beginWork @ react-dom-client.development.js:10861
runWithFiberInDEV @ react-dom-client.development.js:1519
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14419
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45
<View>
exports.createElement @ react.development.js:1033
TouchableOpacity @ index.js:90
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateForwardRef @ react-dom-client.development.js:8645
beginWork @ react-dom-client.development.js:10861
runWithFiberInDEV @ react-dom-client.development.js:1522
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14419
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45Understand this warning
posthog.ts:178   Payload: {session_id: '30c92440-d854-41d7-bf57-602ba1499c82', provider_id: '6a120f36-7ac8-4bda-899b-202f93845644', client_id: '9e0abbfb-ab82-4e71-a157-88a7f98673aa', client_name: 'aaaabbbbb poas', crew_size: 1, …}
capture @ posthog.ts:178
handleEndSession @ ClientHistoryScreen.tsx:404
await in handleEndSession
onClick @ PressResponder.js:314
executeDispatch @ react-dom-client.development.js:16368
runWithFiberInDEV @ react-dom-client.development.js:1519
processDispatchQueue @ react-dom-client.development.js:16418
(anonymous) @ react-dom-client.development.js:17016
batchedUpdates$1 @ react-dom-client.development.js:3262
dispatchEventForPluginEventSystem @ react-dom-client.development.js:16572
dispatchEvent @ react-dom-client.development.js:20658
dispatchDiscreteEvent @ react-dom-client.development.js:20626
<div>
exports.createElement @ react.development.js:1033
createElement @ index.js:24
View @ index.js:111
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateForwardRef @ react-dom-client.development.js:8645
beginWork @ react-dom-client.development.js:10861
runWithFiberInDEV @ react-dom-client.development.js:1519
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14419
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45
<View>
exports.createElement @ react.development.js:1033
TouchableOpacity @ index.js:90
react-stack-bottom-frame @ react-dom-client.development.js:23863
renderWithHooks @ react-dom-client.development.js:5529
updateForwardRef @ react-dom-client.development.js:8645
beginWork @ react-dom-client.development.js:10861
runWithFiberInDEV @ react-dom-client.development.js:1522
performUnitOfWork @ react-dom-client.development.js:15132
workLoopSync @ react-dom-client.development.js:14956
renderRootSync @ react-dom-client.development.js:14936
performWorkOnRoot @ react-dom-client.development.js:14419
performWorkOnRootViaSchedulerTask @ react-dom-client.development.js:16216
performWorkUntilDeadline @ scheduler.development.js:45Understand this warning
posthog.ts:192 [analytics] Event captured: business_session_completed
ClientHistoryScreen.tsx:224 📋 Timeline items: [{…}]
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-10-22T20:01:39.337Z', dayKey: '2025-10-22', formatDateResult: 'Oct 22, 2025'}
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
ClientHistoryScreen.tsx:224 📋 Timeline items: [{…}]
ClientHistoryScreen.tsx:253 🗓️ Grouping item: {type: 'session', timestamp: '2025-10-22T20:02:37.381Z', dayKey: '2025-10-22', formatDateResult: 'Oct 22, 2025'}
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
App.tsx:53 🚀 TrackPay: Starting app initialization...
App.tsx:58 🌐 TrackPay: Initializing i18n...
simple.ts:1031 ✅ Simple i18n initialized with language: en-US
App.tsx:62 ✅ TrackPay: i18n initialized successfully
App.tsx:71 📊 TrackPay: Initializing PostHog Analytics...
posthog.ts:43 [analytics] PostHog initialized successfully
qa.ts:32 [analytics] Dry-run mode: ENABLED
App.tsx:78 🧪 TrackPay: Analytics dry-run mode enabled (events logged to console)
App.tsx:82 ✅ TrackPay: PostHog initialized successfully
App.tsx:41 ✅ Environment variables validated successfully
App.tsx:100 🌱 TrackPay: Starting direct Supabase initialization...
App.tsx:104 🎉 TrackPay: Direct Supabase initialization completed successfully
App.tsx:111 🛠️  TrackPay: Direct Supabase - Debug functions available:
App.tsx:112   - directSupabase: Direct access to Supabase service
App.tsx:113   - debugInfo(): Health check and debug information
App.tsx:114   - No sync queue needed - everything saves directly to Supabase!
2directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
2directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
App.tsx:53 🚀 TrackPay: Starting app initialization...
App.tsx:58 🌐 TrackPay: Initializing i18n...
simple.ts:1031 ✅ Simple i18n initialized with language: en-US
App.tsx:62 ✅ TrackPay: i18n initialized successfully
App.tsx:71 📊 TrackPay: Initializing PostHog Analytics...
posthog.ts:43 [analytics] PostHog initialized successfully
qa.ts:32 [analytics] Dry-run mode: ENABLED
App.tsx:78 🧪 TrackPay: Analytics dry-run mode enabled (events logged to console)
App.tsx:82 ✅ TrackPay: PostHog initialized successfully
App.tsx:41 ✅ Environment variables validated successfully
App.tsx:100 🌱 TrackPay: Starting direct Supabase initialization...
App.tsx:104 🎉 TrackPay: Direct Supabase initialization completed successfully
App.tsx:111 🛠️  TrackPay: Direct Supabase - Debug functions available:
App.tsx:112   - directSupabase: Direct access to Supabase service
App.tsx:113   - debugInfo(): Health check and debug information
App.tsx:114   - No sync queue needed - everything saves directly to Supabase!
2directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
2directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
App.tsx:53 🚀 TrackPay: Starting app initialization...
App.tsx:58 🌐 TrackPay: Initializing i18n...
simple.ts:1031 ✅ Simple i18n initialized with language: en-US
App.tsx:62 ✅ TrackPay: i18n initialized successfully
App.tsx:71 📊 TrackPay: Initializing PostHog Analytics...
posthog.ts:43 [analytics] PostHog initialized successfully
qa.ts:32 [analytics] Dry-run mode: ENABLED
App.tsx:78 🧪 TrackPay: Analytics dry-run mode enabled (events logged to console)
App.tsx:82 ✅ TrackPay: PostHog initialized successfully
App.tsx:41 ✅ Environment variables validated successfully
App.tsx:100 🌱 TrackPay: Starting direct Supabase initialization...
App.tsx:104 🎉 TrackPay: Direct Supabase initialization completed successfully
App.tsx:111 🛠️  TrackPay: Direct Supabase - Debug functions available:
App.tsx:112   - directSupabase: Direct access to Supabase service
App.tsx:113   - debugInfo(): Health check and debug information
App.tsx:114   - No sync queue needed - everything saves directly to Supabase!
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
2directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
App.tsx:53 🚀 TrackPay: Starting app initialization...
App.tsx:58 🌐 TrackPay: Initializing i18n...
simple.ts:1031 ✅ Simple i18n initialized with language: en-US
App.tsx:62 ✅ TrackPay: i18n initialized successfully
App.tsx:71 📊 TrackPay: Initializing PostHog Analytics...
posthog.ts:43 [analytics] PostHog initialized successfully
qa.ts:32 [analytics] Dry-run mode: ENABLED
App.tsx:78 🧪 TrackPay: Analytics dry-run mode enabled (events logged to console)
App.tsx:82 ✅ TrackPay: PostHog initialized successfully
App.tsx:41 ✅ Environment variables validated successfully
App.tsx:100 🌱 TrackPay: Starting direct Supabase initialization...
App.tsx:104 🎉 TrackPay: Direct Supabase initialization completed successfully
App.tsx:111 🛠️  TrackPay: Direct Supabase - Debug functions available:
App.tsx:112   - directSupabase: Direct access to Supabase service
App.tsx:113   - debugInfo(): Health check and debug information
App.tsx:114   - No sync queue needed - everything saves directly to Supabase!
2directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]
directSupabase.ts:73 👥 getClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
directSupabase.ts:93 👥 Raw relationships query result: {count: 16, relationships: Array(16)}
directSupabase.ts:123 👥 Returning clients: (16) [{…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}, {…}]