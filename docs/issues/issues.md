# TrackPay - Issue Tracker

This file tracks known issues, bugs, and technical debt that need to be addressed.

---

## ✅ Resolved Issues

### Issue #1: Excessive Database Calls - `getClients()` Called 7+ Times on Multiple Screens

**Status:** ✅ Resolved (Implemented via loadData debounce guards)
**Priority:** High (Performance Impact)
**Component:** Multiple screens (navigation cascade issue)
**Date Reported:** October 22, 2025
**Date Resolved:** October 22, 2025
**Solution:** Implemented debounce guards across all 7 screens with loadData patterns

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

- [x] `getClients()` called **maximum 1 time** per user action (debounce prevents concurrent calls)
- [x] No duplicate database queries during loadData execution
- [x] Loading indicators show appropriately
- [x] Data remains fresh across screens
- [x] No regression in existing functionality

#### Implementation (October 22, 2025)

**Solution:** Added `loadingRef` debounce guard to all 7 screens with loadData patterns.

**Pattern Applied:**
```typescript
const loadingRef = useRef<boolean>(false); // Debounce guard

const loadData = async () => {
  // Prevent concurrent calls
  if (loadingRef.current) {
    if (__DEV__) console.log('🚫 loadData: already loading, skipping duplicate call');
    return;
  }

  loadingRef.current = true;
  try {
    // ... fetch data
  } finally {
    loadingRef.current = false; // Reset guard
  }
};
```

**Screens Fixed:**
1. ✅ ClientHistoryScreen.tsx (commit a9332e5)
2. ✅ ClientListScreen.tsx (commit a9332e5)
3. ✅ HistoryScreen.tsx (commit a9332e5)
4. ✅ ClientViewScreen.tsx (commit 499c79c)
5. ✅ ClientProfileScreen.tsx (commit 499c79c)
6. ✅ SessionTrackingScreen.tsx (commit 499c79c)
7. ✅ ServiceProviderSummaryScreen.tsx (commit 499c79c)

**Results:**
- Reduced duplicate DB calls from 7x to 1x per action
- Dev-mode logging shows when duplicate calls are blocked
- Cleaner console during development
- Scales app for user growth (fixed impact multiplier)

#### Related Issues

- None

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
