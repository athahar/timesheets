-- Complete RLS Fix for Production - Match Staging Configuration
-- Issue: Invite claim failing due to RLS blocking database operations
-- Solution: Disable RLS on key tables to match staging (which works perfectly)

-- ============================================================================
-- DISABLE RLS ON CORE TABLES
-- ============================================================================

-- trackpay_users: Disable RLS (staging has this disabled)
ALTER TABLE trackpay_users DISABLE ROW LEVEL SECURITY;

-- trackpay_invites: Already requested, but ensure it's disabled
ALTER TABLE trackpay_invites DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CLEANUP: Drop all policies (they're ignored when RLS is disabled anyway)
-- ============================================================================

-- Drop trackpay_users policies
DROP POLICY IF EXISTS "Users can insert their own\n  profile" ON trackpay_users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON trackpay_users;
DROP POLICY IF EXISTS "Users can view their own\n  profile" ON trackpay_users;
DROP POLICY IF EXISTS "Users can view their own profile" ON trackpay_users;
DROP POLICY IF EXISTS "Allow users to read their own record" ON trackpay_users;
DROP POLICY IF EXISTS "Allow users to update their own record" ON trackpay_users;
DROP POLICY IF EXISTS "Allow users to claim unclaimed profiles" ON trackpay_users;

-- Drop trackpay_invites policies
DROP POLICY IF EXISTS "Allow public invite code validation" ON trackpay_invites;
DROP POLICY IF EXISTS "tp_invites_select_party" ON trackpay_invites;
DROP POLICY IF EXISTS "tp_invites_insert_provider" ON trackpay_invites;
DROP POLICY IF EXISTS "Allow authenticated to read pending invites" ON trackpay_invites;
DROP POLICY IF EXISTS "Allow authenticated to claim invites" ON trackpay_invites;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check RLS status (should be false for both tables)
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('trackpay_users', 'trackpay_invites', 'trackpay_relationships')
ORDER BY tablename;

-- Expected results:
-- trackpay_invites: rowsecurity = false
-- trackpay_users: rowsecurity = false
-- trackpay_relationships: rowsecurity = true (keep enabled, policies are correct)
