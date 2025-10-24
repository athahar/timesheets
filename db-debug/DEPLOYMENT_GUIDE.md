# Production RLS Deployment Guide

## 🎯 Objective
Apply secure Row Level Security (RLS) policies to all trackpay tables in production database.

## 📋 What This Fixes

### Current Issues:
1. ❌ **406 errors** - Users unable to read their own data
2. ❌ **Invite flow broken** - Registration fails with RLS blocking
3. ❌ **Overly permissive policies** - Some tables allow public access
4. ❌ **Inconsistent security** - Different tables have different patterns

### After Deployment:
1. ✅ **Secure by default** - All tables protected with RLS
2. ✅ **Invite flow works** - Proper policies for registration
3. ✅ **Role-based access** - Providers and clients have appropriate permissions
4. ✅ **Consistent pattern** - All tables follow same security model

## 🚀 Deployment Steps

### Step 1: Backup Current State (CRITICAL!)

Before applying ANY changes, capture current database state:

```sql
-- Run this in Supabase SQL Editor and SAVE the output
SELECT
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as policy_count
FROM pg_tables
WHERE tablename LIKE 'trackpay_%'
ORDER BY tablename;
```

### Step 2: Review the Master File

Open `APPLY_THIS_secure-all-rls.sql` and review:
- [ ] All 7 tables covered (users, relationships, sessions, payments, requests, activities, invites)
- [ ] 24 total policies
- [ ] Transaction-wrapped (BEGIN/COMMIT)
- [ ] Drop existing policies before creating new ones

### Step 3: Apply in Supabase SQL Editor

1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `APPLY_THIS_secure-all-rls.sql`
3. Paste into SQL Editor
4. Click "Run" (should complete in ~5 seconds)
5. Verify success message

**Expected Output:**
```
BEGIN
ALTER TABLE
... (drop policy statements)
CREATE POLICY
... (create policy statements)
COMMIT
```

If you see ANY errors:
- DO NOT CONTINUE
- The transaction will rollback automatically
- Share error message for investigation

### Step 4: Verify Deployment

Run verification queries (included at end of master file):

```sql
-- Should show 24 policies
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename LIKE 'trackpay_%'
GROUP BY tablename
ORDER BY tablename;
```

**Expected Results:**
| Table | Policy Count |
|-------|-------------|
| trackpay_activities | 3 |
| trackpay_invites | 0 |
| trackpay_payments | 4 |
| trackpay_relationships | 3 |
| trackpay_requests | 4 |
| trackpay_sessions | 4 |
| trackpay_users | 6 |

### Step 5: Run End-to-End Tests (CRITICAL!)

Use the testing checklist in the master file:

#### Test 1: Invite Flow (Most Important)
1. Login as existing provider (athahar+lucy@gmail.com)
2. Generate new invite code
3. Use incognito browser
4. Register as new client with invite code
5. **VERIFY**:
   - ✅ Registration succeeds (no 406/400 errors)
   - ✅ Client profile created
   - ✅ Relationship exists in database
   - ✅ Client sees provider immediately after login

#### Test 2: User Isolation
1. Login as Provider A
2. Try to view Provider B's sessions/clients
3. **VERIFY**: No data visible (proper isolation)

#### Test 3: Session Tracking
1. Provider starts/stops session
2. Login as client
3. **VERIFY**: Client sees session with correct amounts

#### Test 4: Payment Flow
1. Provider requests payment
2. Login as client
3. Client marks payment as sent
4. **VERIFY**: Provider sees status update

### Step 6: Monitor for Issues

After deployment, monitor for:
- 406 errors in app console
- Users unable to see expected data
- Invite flow failures

If ANY issues occur:
1. Check browser console for RLS errors
2. Verify user is authenticated (auth.uid() exists)
3. Check database for orphaned records

## 🔒 Security Model

### Authentication Pattern
```
auth.users.id → trackpay_users.auth_user_id → trackpay_users.id
```

All policies use this pattern via EXISTS subqueries:
```sql
EXISTS (
  SELECT 1 FROM trackpay_users
  WHERE auth_user_id = auth.uid()
    AND id = [provider_id or client_id]
)
```

### Role-Based Access

**Providers Can:**
- Create sessions, payments, requests
- Read their own data
- Update their own data

**Clients Can:**
- Read sessions/payments for them
- Update payment status
- Claim unclaimed invites

**Both Can:**
- See users they have relationships with
- Read activity feed for their relationships

**Public Can:**
- Validate invite codes (trackpay_invites has RLS disabled)
- View unclaimed client profiles (for invite flow)

## 🆘 Rollback Plan

If something goes wrong and you need to rollback:

### Option 1: Restore from Backup
Use Supabase Dashboard → Database → Backups

### Option 2: Disable RLS Temporarily (UNSAFE!)
```sql
-- ONLY use in emergency to restore service
ALTER TABLE trackpay_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE trackpay_relationships DISABLE ROW LEVEL SECURITY;
-- etc. for all tables
```

⚠️ **This removes ALL security - only for emergency recovery**

### Option 3: Apply Previous Policies
If you saved the backup state from Step 1, manually recreate previous policies.

## 📞 Support

If issues occur:
1. Check verification queries
2. Run testing checklist
3. Review browser console for specific RLS errors
4. Check Supabase logs for denied queries

## ✅ Success Criteria

Deployment is successful when:
- [ ] All 24 policies created
- [ ] Invite flow works end-to-end
- [ ] Users can access their own data
- [ ] Users CANNOT access others' data
- [ ] No 406 errors in app console
- [ ] All tests pass

---

**Estimated Time:** 15 minutes (5 min apply, 10 min testing)
**Risk Level:** Low (transaction-wrapped, reversible)
**Impact:** Fixes critical security and functionality issues
