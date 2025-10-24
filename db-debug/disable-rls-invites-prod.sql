-- Disable RLS on trackpay_invites in Production (to match Staging)
-- Staging has RLS disabled on trackpay_invites and it works perfectly
-- This is the simplest fix - remove all the complexity

-- ============================================================================
-- DISABLE RLS on trackpay_invites
-- ============================================================================

ALTER TABLE trackpay_invites DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- OPTIONAL: Drop existing policies (cleanup)
-- ============================================================================
-- These will no longer apply once RLS is disabled, but good to clean up

DROP POLICY IF EXISTS "Allow public invite code validation" ON trackpay_invites;
DROP POLICY IF EXISTS "tp_invites_select_party" ON trackpay_invites;
DROP POLICY IF EXISTS "tp_invites_insert_provider" ON trackpay_invites;
DROP POLICY IF EXISTS "Allow authenticated to read pending invites" ON trackpay_invites;
DROP POLICY IF EXISTS "Allow authenticated to claim invites" ON trackpay_invites;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify RLS is disabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'trackpay_invites';

-- Expected result: rowsecurity = false

-- Verify no policies exist
SELECT
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'trackpay_invites';

-- Expected result: 0 rows
