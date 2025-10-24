# Client List Unnecessary Refetch Issue

**Status**: 🔴 Open
**Priority**: High
**Impact**: Performance & UX
**Date Identified**: October 24, 2025
**Affects**: ClientListScreen navigation performance

---

## Problem Statement

Every time a user navigates back to ClientListScreen from ClientHistoryScreen, the app force-refetches all 22 clients from Supabase, **ignoring the 30-second cache**. This causes:

1. **Unnecessary database calls** - 2 full client list fetches on every navigation
2. **Shimmer flicker** - Loading state appears twice during refetch
3. **Poor UX** - Delay and visual instability when navigating

---

## Evidence

### Console Logs Pattern

**Observed behavior when starting a session and navigating back:**

```
# User starts session on detail screen
LOG  ✅ Activity saved to Supabase
LOG  🟩 getClientsCached: cache hit  ← GOOD! Using cache

# User navigates back to ClientListScreen
LOG  [analytics] screen_view_client_list
LOG  🟦 getClientsCached: fetching fresh  ← BAD! Force refetch
LOG  👥 actuallyFetchClients() called with providerId: 5c0f4c79-bc6d-47dd-af6c-735215f11004
LOG  👥 Raw relationships query result: {"count": 22, "relationships": [...]}
LOG  👥 Returning clients: [22 clients...]

# Navigate to detail screen again
LOG  🟩 getClientsCached: cache hit  ← Using cache (good)

# Start another session
LOG  🟩 getClientsCached: cache hit  ← Using cache (good)

# Navigate back to list AGAIN
LOG  🟦 getClientsCached: fetching fresh  ← Force refetch AGAIN!
LOG  👥 actuallyFetchClients() called...
```

**Key Observation**: The 🟦 emoji indicates `force: true` is being passed to `getClientsCached()`, bypassing the stale-time cache.

### Frequency

This happens on **every single navigation** back to ClientListScreen:
- From ClientHistoryScreen after viewing details
- From ClientHistoryScreen after starting a session
- From ClientHistoryScreen after stopping a session
- From ClientHistoryScreen after requesting payment

**Current behavior**: ~4-6 force refetches per typical user session
**Expected behavior**: 0 force refetches (use 30s cache)

---

## Root Cause Analysis

### Primary Cause: ClientListScreen Force Refresh

**File**: `ios-app/src/screens/ClientListScreen.tsx`

**Likely culprit**: The `useFocusEffect` hook or initial load is calling `refreshClients()` which internally calls `load(true)`, forcing a fresh fetch.

**Code path**:
```
ClientListScreen mounts/focuses
  ↓
useFocusEffect or useEffect triggers
  ↓
refreshClients() called
  ↓
useClients.refresh() → load(true)
  ↓
getClientsCached(providerId, { force: true })
  ↓
BYPASS CACHE → actuallyFetchClients()
```

### Secondary Cause: Double Shimmer

**File**: `ios-app/src/screens/ClientListScreen.tsx` (lines 580-697)

The shimmer appears twice because of overlapping loading states:

```typescript
const showSkeleton = loading || buildingSections || !sectionsBuiltOnce;
```

**Flow**:
1. `loading = true` from useClients → **First shimmer**
2. Data arrives, `loading = false`
3. `buildingSections = true` during async section computation → **Second shimmer**
4. Finally `buildingSections = false` → Shimmer gone

---

## Impact Assessment

### Performance Metrics

| Metric | Current | Optimal |
|--------|---------|---------|
| DB calls per navigation | 1 (force refetch) | 0 (use cache) |
| Network requests | ~200ms per fetch | 0ms (local cache) |
| Shimmer duration | ~400-600ms | 0ms |
| User-perceived delay | Noticeable flicker | Instant |

### User Experience Impact

**Severity**: Medium-High
- Users notice the shimmer flicker every time they navigate
- App feels "jittery" and unpolished
- Creates perception of slow performance
- Battery drain from unnecessary network calls

### Scale Considerations

- 22 clients currently
- Each client fetch includes relationships query
- As client count grows (50, 100+), impact worsens
- Mobile data usage increases unnecessarily

---

## Proposed Solutions

### Phase 1: Remove Unnecessary Force Refetch (Quick Win)

**Goal**: Stop forcing fresh fetch on every navigation

**Changes Required**:

1. **ClientListScreen.tsx** - Remove or conditionally call `refreshClients()`
   - Option A: Don't refresh on focus at all (trust cache)
   - Option B: Only refresh if cache is older than 30s (respect stale-time)

2. **useClients.ts** - Add cache age check before force refresh
   ```typescript
   refresh: (options = {}) => {
     const { force = false, maxAge = 5000 } = options;
     const cached = CLIENTS_CACHE.get(`clients:${providerId}`);

     // Only force if cache is stale
     if (cached && Date.now() - cached.ts < maxAge && !force) {
       return Promise.resolve(cached.data);
     }

     return load(true);
   }
   ```

**Expected Results**:
- ✅ Zero force refetches when cache is fresh
- ✅ No shimmer flicker on navigation
- ✅ Instant screen transitions
- ✅ Reduced network usage

**Risks**: Low
- Cache might be slightly stale (< 30s)
- User might not see updates immediately (acceptable for most use cases)

---

### Phase 2: Optimistic UI Updates (Best UX)

**Goal**: Update UI immediately without any database refetch

**Changes Required**:

1. **ClientHistoryScreen.tsx** - Add optimistic state updates
   ```typescript
   const handleStartSession = async () => {
     // ... existing code ...
     await startSession(clientId, crewSize);

     // ❌ REMOVE: await loadData(true);

     // ✅ ADD: Update parent screen's local state
     navigation.navigate('ClientList', {
       optimisticUpdate: {
         clientId,
         hasActiveSession: true,
         // ... other state changes
       }
     });
   }
   ```

2. **ClientListScreen.tsx** - Handle optimistic updates
   ```typescript
   useFocusEffect(
     useCallback(() => {
       const params = route?.params?.optimisticUpdate;
       if (params) {
         // Update local state immediately
         setSections(prev => updateClientInSections(prev, params));
         // Clear params
         navigation.setParams({ optimisticUpdate: undefined });
       }
     }, [route?.params])
   );
   ```

**Expected Results**:
- ✅ Instant UI updates (0ms)
- ✅ Zero database calls for UI refresh
- ✅ No shimmer at all
- ✅ Offline-friendly

**Risks**: Medium
- Need error handling to revert on failure
- State synchronization complexity
- Edge cases with concurrent updates

---

### Phase 3: Consolidate Loading States (Eliminate Double Shimmer)

**Goal**: Show shimmer only once during data load

**Changes Required**:

**ClientListScreen.tsx**:
```typescript
// ❌ REMOVE: buildingSections state entirely

// ✅ CHANGE: Only use loading from useClients
const showSkeleton = loading && !sectionsBuiltOnce;

// Build sections synchronously during useEffect
useEffect(() => {
  if (!clientsData || loading) return;

  // Compute sections immediately (no async setState)
  const newSections = buildSectionsSync(clientsData);
  setSections(newSections);
  setSectionsBuiltOnce(true);
}, [clientsData, loading]);
```

**Expected Results**:
- ✅ Single shimmer instead of double
- ✅ Cleaner state management
- ✅ More predictable UI behavior

**Risks**: Low
- Synchronous computation might block render for large lists (>100 clients)
- Can be mitigated with web worker if needed

---

## Implementation Roadmap

### Quick Fix (1-2 hours)
1. ✅ Remove force refetch on ClientListScreen focus
2. ✅ Test navigation flow with cache
3. ✅ Verify 30s cache works as expected

### Full Solution (4-6 hours)
1. ✅ Implement Phase 1 (remove force refetch)
2. ✅ Implement Phase 3 (consolidate loading states)
3. ✅ Test all navigation scenarios
4. ✅ (Optional) Implement Phase 2 (optimistic updates)

### Testing Checklist
- [ ] Navigate from list → detail → back (no session changes)
- [ ] Start session → navigate back
- [ ] Stop session → navigate back
- [ ] Request payment → navigate back
- [ ] Test with 1 client
- [ ] Test with 22 clients
- [ ] Test with slow network (throttling)
- [ ] Test cache expiration (wait 30s)

---

## Related Files

### Primary Files
- `ios-app/src/screens/ClientListScreen.tsx` (lines 172-178, 580-697)
- `ios-app/src/hooks/useClients.ts` (line 51)
- `ios-app/src/services/directSupabase.ts` (getClientsCached function)

### Secondary Files
- `ios-app/src/screens/ClientHistoryScreen.tsx` (handleStartSession, handleStopSession)
- `ios-app/src/services/storageService.ts` (startSession, endSession)

---

## Alternative Approaches Considered

### Option: Event Bus Pattern
**Description**: Use React Context or EventEmitter to signal data changes
**Pros**: Clean separation of concerns, explicit data flow
**Cons**: Additional complexity, another pattern to maintain
**Decision**: Not needed if optimistic updates work well

### Option: React Query / SWR
**Description**: Replace custom caching with battle-tested library
**Pros**: Solves many edge cases, great DevX
**Cons**: Large dependency, migration effort
**Decision**: Defer - current cache works, just needs proper usage

### Option: Realtime Subscriptions
**Description**: Use Supabase realtime to get updates automatically
**Pros**: Always in sync, no manual refresh
**Cons**: WebSocket overhead, battery drain, complexity
**Decision**: Overkill for this use case

---

## Success Metrics

### Before
- Force refetch on every navigation: ✅ Happening
- Shimmer flicker: ✅ Visible
- DB calls per session: ~4-6
- Network data: ~2KB per fetch

### After (Phase 1)
- Force refetch on navigation: ❌ Eliminated
- Shimmer flicker: ❌ Gone
- DB calls per session: ~1-2 (only on actual data changes)
- Network data: ~0.5KB per session

### After (Phase 2)
- UI update latency: 0ms (instant)
- DB calls for UI updates: 0 (optimistic)
- Offline support: ✅ Full

---

## Notes

- Original issue reported by user on Oct 24, 2025
- User specifically mentioned: "2 db calls" and "flicker of 2 shimmers"
- Cache is working correctly (30s stale-time pattern)
- Issue is purely in how ClientListScreen triggers refreshes
- No changes needed to caching infrastructure itself

---

## Status Updates

**Oct 24, 2025** - Issue documented, awaiting implementation
