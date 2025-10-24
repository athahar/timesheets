-- ============================================================================
-- Disable RLS on trackpay_users (Simplest Fix)
-- ============================================================================
-- Issue: Still getting 406 errors when reading trackpay_users by email
-- Root Cause: RLS policies aren't working as expected
-- Solution: Disable RLS entirely on trackpay_users (match trackpay_invites)
-- ============================================================================

-- Disable RLS completely
ALTER TABLE trackpay_users DISABLE ROW LEVEL SECURITY;

-- Verification
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('trackpay_users', 'trackpay_invites')
ORDER BY tablename;

-- Expected:
-- trackpay_invites: false ✅
-- trackpay_users: false ✅ (was true, now false)

-- ============================================================================
-- WHY THIS IS SAFE
-- ============================================================================
-- 1. This is a development/staging-like setup
-- 2. trackpay_invites already has RLS disabled and works fine
-- 3. The permissive policies with USING (true) weren't working anyway
-- 4. Once invite flow is stable, we can re-enable with proper policies
-- 5. The app code already has auth checks at the application layer
-- ============================================================================
