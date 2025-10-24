# Balance Calculation Confusion - "Why is Balance $58.33 not $1,110?"

**Status**: 🟢 Not a Bug - UX Confusion
**Priority**: Medium
**Impact**: UX / User Understanding
**Date Investigated**: October 23, 2025
**Affects**: ServiceProviderSummaryScreen (Client View)

---

## Problem Statement

User reported confusion seeing **Balance Due: $58.33** when the timeline displays 11 sessions totaling **~$1,110**.

User's question: *"how is the total withstanding 58.33 when there should be a much larger balance due"*

---

## Investigation Summary

### Initial Hypothesis (INCORRECT)
- ❌ Session amounts not being calculated
- ❌ Database not storing amount_due values
- ❌ Hybrid storage issue between AsyncStorage and Supabase

### Actual Findings (CORRECT)

**The app is working exactly as designed.**

#### Database Query Results

Client: `athmash247@gmail.com` (Mash n)
Provider: `athahar+lucy@gmail.com` (Lucy Provider)

**11 Total Sessions:**

| Session ID | Status | Amount | Duration | Crew | Created |
|------------|--------|--------|----------|------|---------|
| 12ab72ba... | **requested** | **$21.47** | 23 min | 2 | Oct 21, 2025 |
| d6a460a2... | **requested** | **$34.53** | 74 min | 1 | Oct 15, 2025 |
| 27a858d6... | **requested** | **$1.40** | 3 min | 1 | Oct 10, 2025 |
| d023e424... | **requested** | **$0.93** | 2 min | 1 | Oct 10, 2025 |
| 07f8fc60... | **paid** | $876.40 | 1878 min | 1 | Sep 23, 2025 |
| 49a9e11f... | **paid** | $1.40 | 3 min | 1 | Sep 23, 2025 |
| a7644725... | **paid** | $61.13 | 131 min | 1 | Sep 23, 2025 |
| 46c3d594... | **paid** | $80.73 | 173 min | 1 | Sep 23, 2025 |
| 9b50d0f1... | **paid** | $0.93 | 2 min | 1 | Sep 22, 2025 |
| e6c2b814... | **paid** | $27.53 | 59 min | 1 | Sep 21, 2025 |
| c008a6f1... | **paid** | $3.73 | 8 min | 1 | Sep 21, 2025 |

**Totals:**
- **Requested Sessions**: 4 sessions = **$58.33**
- **Paid Sessions**: 7 sessions = **$1,051.85**
- **Grand Total**: 11 sessions = **$1,110.18**

---

## Why Balance Shows $58.33 (CORRECT BEHAVIOR)

### Code Analysis

**File**: `ios-app/src/services/storageService.ts` (lines 256-310)

```typescript
export const getClientSummary = async (clientId: string) => {
  const sessions = await directSupabase.getSessionsByClient(clientId);

  const unpaidSessions = sessions.filter(s => s.status === 'unpaid');
  const requestedSessions = sessions.filter(s => s.status === 'requested');
  const paidSessions = sessions.filter(s => s.status === 'paid');

  // Balance calculation - ONLY unpaid + requested
  const unpaidBalance = unpaidSessions.reduce((sum, s) => sum + (s.amount || 0), 0);
  const requestedBalance = requestedSessions.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalUnpaidBalance = unpaidBalance + requestedBalance;  // ← $58.33

  // Paid sessions tracked separately
  const totalEarned = paidSessions.reduce((sum, s) => sum + (s.amount || 0), 0);  // ← $1,051.85

  return {
    totalUnpaidBalance,  // Only unpaid + requested
    totalEarned,         // Only paid
    // ...
  };
};
```

**File**: `ios-app/src/services/storageService.ts` (lines 513-547)

```typescript
export const getClientMoneyState = async (clientId: string, providerId?: string) => {
  const summary = await getClientSummary(clientId);

  // Balance due calculation
  const balanceDueCents = Math.round(summary.totalUnpaidBalance * 100);  // ← $58.33 in cents

  return {
    balanceDueCents,  // Returns 5833 cents = $58.33
    // ...
  };
};
```

### Business Logic (CORRECT)

**Balance Due Definition**: Money owed to the provider that hasn't been paid yet.

**Should Include:**
- ✅ `unpaid` sessions - Work done, payment not requested yet
- ✅ `requested` sessions - Payment requested, waiting for client to pay

**Should NOT Include:**
- ❌ `paid` sessions - Already paid, no longer owed
- ❌ `active` sessions - Work in progress, not yet complete

**For This Client:**
- Unpaid: 0 sessions = $0.00
- **Requested: 4 sessions = $58.33** ← This is the Balance Due
- Paid: 7 sessions = $1,051.85 (history only, not owed)

---

## UPDATE: Timeline Sort Bug Discovered

**See**: [`timeline-wrong-sort-order.md`](./timeline-wrong-sort-order.md)

After reviewing user's screenshot, discovered timeline is sorted **alphabetically** instead of **chronologically**:
- September sessions show at TOP
- October sessions show at BOTTOM (wrong!)

This compounds the balance confusion:
- User sees Sep 24 ($876) at top, thinks it's most recent
- Doesn't realize Oct 21 ($21.47) is hidden below
- Adds up wrong sessions when calculating expected balance

**Fix required**: ServiceProviderSummaryScreen.tsx line 302 - sort by date, not alphabetically.

---

## Why User is Confused

### UX Issue: Timeline Shows All Sessions + Wrong Sort Order

**Screen**: ServiceProviderSummaryScreen (Client view of their work with a provider)

**What User Sees:**
1. **Top Section**: Balance Due = **$58.33**
2. **Timeline Below**: 11 session cards showing:
   - Session 1: $21.47 (requested)
   - Session 2: $34.53 (requested)
   - Session 3: $1.40 (requested)
   - Session 4: $0.93 (requested)
   - Session 5: $876.40 (paid) ← **User adds this to balance**
   - Session 6: $1.40 (paid)
   - Session 7: $61.13 (paid)
   - Session 8: $80.73 (paid)
   - ... etc

**User's Mental Math:**
- Sees 11 sessions in timeline
- Adds up all visible amounts: ~$1,110
- Expects Balance to show ~$1,110
- Confused why it shows $58.33

### Visual Distinction Problem

**Current Implementation**: Timeline likely shows all session cards similarly, without clear visual separation between:
- Sessions that are owed (unpaid/requested)
- Sessions already paid (should be visually de-emphasized)

**Potential UX Improvements** (see Solutions section below)

---

## Database Schema Verification

### Amount Calculation is Working

**File**: `ios-app/src/services/directSupabase.ts` (lines 424-519)

```typescript
async endSession(sessionId: string): Promise<Session> {
  const endTime = new Date();

  // Get session to calculate duration
  const { data: session } = await supabase
    .from('trackpay_sessions')
    .select('start_time, hourly_rate, client_id, crew_size')
    .eq('id', sessionId)
    .single();

  const startTime = new Date(session.start_time);
  const crewSize = Math.max(session.crew_size || 1, 1);
  const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  const durationHours = durationMinutes / 60;
  const personHours = durationHours * crewSize;
  const amount = personHours * session.hourly_rate;  // ← Calculated correctly

  // Update session in Supabase
  const { error } = await supabase
    .from('trackpay_sessions')
    .update({
      end_time: endTime.toISOString(),
      duration_minutes: durationMinutes,
      person_hours: personHours,
      amount_due: amount,  // ← Saved to database
      status: 'unpaid',
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId);

  return {
    id: sessionId,
    amount,  // ← Returned to caller
    status: 'unpaid'
  };
}
```

**Database Verification:**
```sql
-- Query: Get all sessions for this client-provider relationship
SELECT id, status, amount_due, duration_minutes, crew_size, start_time, end_time
FROM trackpay_sessions
WHERE client_id = 'b8af72bb-e0d1-4256-b5d6-fb891209cdcb'
  AND provider_id = '5c0f4c79-bc6d-47dd-af6c-735215f11004'
ORDER BY start_time DESC;

-- Result: All 11 sessions have correct amount_due values ✅
-- No $0.00 amounts, no NULL durations
-- Calculation logic is working perfectly
```

---

## Session Lifecycle and Status Transitions

### Status Flow

```
[Session Created]
       ↓
   status: 'active'
   amount_due: NULL
       ↓
  [Provider Ends Session]
       ↓
   status: 'unpaid'
   amount_due: $X.XX  ← Calculated from duration * hourly_rate
       ↓
  [Provider Requests Payment]
       ↓
   status: 'requested'
   amount_due: $X.XX  ← Unchanged
       ↓
  [Client Marks as Paid]
       ↓
   status: 'paid'
   amount_due: $X.XX  ← Unchanged
```

### Balance Calculation at Each Stage

| Status | Included in Balance? | Reason |
|--------|---------------------|--------|
| `active` | ❌ No | Work in progress |
| `unpaid` | ✅ Yes | Completed work, payment not requested |
| `requested` | ✅ Yes | Payment requested, waiting for client |
| `paid` | ❌ No | Already paid, no longer owed |

---

## Console Log Analysis

From user's provided logs:

```javascript
LOG  💰 Balance state for Mash: {
  "balanceDueCents": 5833,  // $58.33 ✅
  "hasActiveSession": false,
  "lastPendingRequest": null,
  "unpaidDurationSec": 9180  // 2.55 hours
}

LOG  👥 Returning clients: [
  {
    "id": "b8af72bb-e0d1-4256-b5d6-fb891209cdcb",
    "name": "Mash",
    "paymentStatus": "requested",
    "balanceDue": 58.33  // ✅ Matches database calculation
  }
]
```

**Interpretation:**
- Balance calculation is **mathematically correct**
- Only counting the 4 "requested" sessions
- Excluding the 7 "paid" sessions (as designed)

---

## Why This is NOT a Bug

### Business Logic is Correct

**"Balance Due"** should only show money currently owed:
- If you already paid $1,051.85 (the 7 paid sessions), you don't owe that anymore
- You only owe $58.33 (the 4 requested sessions that haven't been paid yet)

**Analogy:**
- You've made 11 purchases from a vendor
- 7 purchases you already paid: $1,051.85 (history)
- 4 purchases you haven't paid: $58.33 (current balance)
- Your **credit card balance** should show $58.33, not $1,110.18

### Database is Correct

- All amounts are calculated and saved correctly
- All durations are calculated and saved correctly
- Session statuses are accurate
- No data loss or corruption

### Code is Correct

- `getClientSummary` filters by status correctly
- `getClientMoneyState` calculates balance correctly
- `endSession` computes amount correctly
- `requestPayment` and `markPaid` update statuses correctly

---

## UX Improvements (Optional)

While the logic is correct, the user confusion suggests potential UX enhancements:

### Option 1: Visual Distinction in Timeline

**Problem**: All session cards look the same, regardless of paid status

**Solution**: Add visual indicators for paid sessions

```tsx
// ServiceProviderSummaryScreen.tsx - Timeline Session Card

<View style={[
  styles.sessionCard,
  session.status === 'paid' && styles.sessionCardPaid  // Add muted style
]}>
  <View style={styles.sessionHeader}>
    <Text style={[
      styles.sessionAmount,
      session.status === 'paid' && styles.amountPaid  // Gray out paid amounts
    ]}>
      {formatCurrency(session.amount)}
    </Text>
    {session.status === 'paid' && (
      <Text style={styles.paidBadge}>✓ Paid</Text>  // Green checkmark badge
    )}
  </View>
</View>

const styles = StyleSheet.create({
  sessionCardPaid: {
    opacity: 0.6,  // Muted appearance
    borderColor: '#34C759',  // Green border for paid
  },
  amountPaid: {
    color: '#8E8E93',  // Gray out the amount
    textDecoration: 'line-through',  // Strike through (if supported)
  },
  paidBadge: {
    color: '#34C759',
    fontSize: 12,
    fontWeight: '600',
  }
});
```

### Option 2: Add Breakdown Summary

**Problem**: User doesn't understand how balance is calculated

**Solution**: Show breakdown above timeline

```tsx
<View style={styles.balanceBreakdown}>
  <View style={styles.breakdownRow}>
    <Text style={styles.breakdownLabel}>Balance Due</Text>
    <Text style={styles.breakdownAmount}>${balanceDue.toFixed(2)}</Text>
  </View>

  {totalEarned > 0 && (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabelSecondary}>
        Already Paid
      </Text>
      <Text style={styles.breakdownAmountSecondary}>
        ${totalEarned.toFixed(2)}
      </Text>
    </View>
  )}

  <View style={styles.breakdownRow}>
    <Text style={styles.breakdownLabelTotal}>Total Earned</Text>
    <Text style={styles.breakdownAmountTotal}>
      ${(balanceDue + totalEarned).toFixed(2)}
    </Text>
  </View>
</View>
```

**Visual Result:**
```
┌────────────────────────────────┐
│ Balance Due         $58.33     │
│ Already Paid     $1,051.85     │
│ ───────────────────────────── │
│ Total Earned     $1,110.18     │
└────────────────────────────────┘
```

### Option 3: Tab-Based Timeline Filtering

**Problem**: Mixing paid and unpaid sessions in one timeline

**Solution**: Add tabs to filter timeline

```tsx
<SegmentedControl
  values={['Owed', 'Paid', 'All']}
  selectedIndex={selectedTab}
  onChange={(event) => setSelectedTab(event.nativeEvent.selectedSegmentIndex)}
/>

// Timeline shows filtered sessions based on tab:
// - "Owed": Only unpaid + requested (4 sessions)
// - "Paid": Only paid (7 sessions)
// - "All": All 11 sessions
```

### Option 4: Tooltip/Info Button

**Problem**: User doesn't understand what "Balance Due" means

**Solution**: Add info icon with explanation

```tsx
<View style={styles.balanceHeader}>
  <Text style={styles.balanceLabel}>Balance Due</Text>
  <TouchableOpacity onPress={() => setShowBalanceInfo(true)}>
    <Text style={styles.infoIcon}>ℹ️</Text>
  </TouchableOpacity>
</View>

// Modal/Tooltip:
"Balance Due shows unpaid and requested payments only.
Completed payments are shown in your history below but
not included in the balance."
```

---

## Recommendation

**Status**: ✅ **No bug fix needed** - App working as designed

**UX Enhancement Priority**: Medium

**Suggested Improvements** (in order of impact):
1. **Visual distinction for paid sessions** (Option 1) - Quick win, high impact
2. **Balance breakdown** (Option 2) - Helps user understand calculation
3. **Info tooltip** (Option 4) - Low effort, reduces confusion
4. **Tab filtering** (Option 3) - More complex, optional

**Implementation Timeline:**
- Option 1: 1-2 hours
- Option 2: 2-3 hours
- Option 4: 30 minutes
- Option 3: 4-6 hours (navigation changes)

---

## Related Files

### Primary Files (Balance Calculation)
- `ios-app/src/services/storageService.ts` (lines 256-310, 513-547)
- `ios-app/src/services/directSupabase.ts` (lines 424-519)

### UI Files (Timeline Display)
- `ios-app/src/screens/ServiceProviderSummaryScreen.tsx` (timeline rendering)
- `ios-app/src/screens/ClientHistoryScreen.tsx` (provider view)

### Type Definitions
- `ios-app/src/types/index.ts` (Session interface, status types)

---

## Testing Verification

### Database Query Results
```bash
# Script: ios-app/query-sessions-debug.js
# Executed: October 23, 2025

Client: athmash247@gmail.com (b8af72bb-e0d1-4256-b5d6-fb891209cdcb)
Provider: athahar+lucy@gmail.com (5c0f4c79-bc6d-47dd-af6c-735215f11004)

Found: 11 sessions
- Requested: 4 sessions, $58.33 total ✅
- Paid: 7 sessions, $1,051.85 total ✅
- Total: 11 sessions, $1,110.18 total ✅

Balance Due (unpaid + requested): $58.33 ✅
```

### Mathematical Verification

**Requested Sessions Calculation:**
```
Session 1: 23 min × 2 crew × $28/hr = 0.38hr × 2 × $28 = $21.28 ≈ $21.47 ✅
Session 2: 74 min × 1 crew × $28/hr = 1.23hr × $28 = $34.44 ≈ $34.53 ✅
Session 3: 3 min × 1 crew × $28/hr = 0.05hr × $28 = $1.40 ✅
Session 4: 2 min × 1 crew × $28/hr = 0.03hr × $28 = $0.84 ≈ $0.93 ✅

Total: $58.33 ✅ (matches balanceDueCents: 5833)
```

---

## Lessons Learned

### Investigation Process

1. ✅ **Don't assume database issues first** - Check actual data
2. ✅ **Query database directly** - Don't rely on UI or logs alone
3. ✅ **Understand business logic** - "Balance" ≠ "Total Revenue"
4. ✅ **Check UX, not just code** - User confusion can indicate UX problems even when code is correct

### Database Connection Troubleshooting

**Issues Encountered:**
- Wrong Supabase URL (.com vs .co) - DNS failure
- Wrong anon key (old expired key) - Auth failure
- Node.js fetch failures - IPv4/IPv6 issues

**Solution:**
- Always check .env file for current credentials
- Use `nslookup` to verify DNS resolution
- Use `NODE_OPTIONS="--dns-result-order=ipv4first"` for Node.js scripts

### Code Patterns to Remember

**When reading Supabase data:**
- Raw query: `select('*')` → Database column names (`amount_due`, `duration_minutes`)
- Mapped query: Through service layer → TypeScript interface (`amount`, `duration`)

**Session status meanings:**
- `active` = In progress
- `unpaid` = Completed, not requested
- `requested` = Payment requested
- `paid` = Payment received

---

## Status Updates

**October 23, 2025** - Investigation complete
- ✅ Database queried successfully
- ✅ Amount calculation verified
- ✅ Balance logic confirmed correct
- ✅ User confusion explained
- 📝 UX improvements documented for future consideration

---

## Conclusion

**The $58.33 balance is CORRECT.**

The user is seeing $1,110 because they're looking at ALL sessions (including already-paid ones) in the timeline. The Balance Due correctly shows only the 4 requested sessions totaling $58.33.

This is not a bug - it's working as designed. However, the UX could be improved to make it clearer which sessions are paid vs. owed.
