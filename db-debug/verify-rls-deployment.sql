-- ============================================================================
-- RLS Deployment Verification Script
-- ============================================================================
-- Run this BEFORE and AFTER applying secure-all-rls.sql
-- Compare the results to verify successful deployment
-- ============================================================================

-- ============================================================================
-- CHECK 1: RLS Enabled Status
-- ============================================================================

SELECT
  tablename,
  rowsecurity as rls_enabled,
  CASE
    WHEN tablename = 'trackpay_invites' AND rowsecurity = false THEN '✅ Correct (disabled)'
    WHEN tablename = 'trackpay_invites' AND rowsecurity = true THEN '❌ Wrong (should be disabled)'
    WHEN tablename != 'trackpay_invites' AND rowsecurity = true THEN '✅ Correct (enabled)'
    WHEN tablename != 'trackpay_invites' AND rowsecurity = false THEN '❌ Wrong (should be enabled)'
  END as status
FROM pg_tables
WHERE tablename LIKE 'trackpay_%'
ORDER BY tablename;

-- Expected:
-- trackpay_activities: true ✅
-- trackpay_invites: false ✅
-- trackpay_payments: true ✅
-- trackpay_relationships: true ✅
-- trackpay_requests: true ✅
-- trackpay_sessions: true ✅
-- trackpay_users: true ✅

-- ============================================================================
-- CHECK 2: Policy Counts
-- ============================================================================

WITH expected AS (
  SELECT 'trackpay_activities' as tablename, 3 as expected_count
  UNION ALL SELECT 'trackpay_invites', 0
  UNION ALL SELECT 'trackpay_payments', 4
  UNION ALL SELECT 'trackpay_relationships', 3
  UNION ALL SELECT 'trackpay_requests', 4
  UNION ALL SELECT 'trackpay_sessions', 4
  UNION ALL SELECT 'trackpay_users', 6
),
actual AS (
  SELECT
    tablename,
    COUNT(*) as actual_count
  FROM pg_policies
  WHERE tablename LIKE 'trackpay_%'
  GROUP BY tablename
)
SELECT
  COALESCE(e.tablename, a.tablename) as table_name,
  COALESCE(e.expected_count, 0) as expected,
  COALESCE(a.actual_count, 0) as actual,
  CASE
    WHEN COALESCE(e.expected_count, 0) = COALESCE(a.actual_count, 0) THEN '✅ Match'
    ELSE '❌ Mismatch'
  END as status
FROM expected e
FULL OUTER JOIN actual a ON e.tablename = a.tablename
ORDER BY table_name;

-- Expected: All rows show ✅ Match

-- ============================================================================
-- CHECK 3: Policy Details (trackpay_users)
-- ============================================================================

SELECT
  policyname,
  cmd,
  roles::text as role,
  LEFT(qual, 50) as using_clause_preview,
  LEFT(with_check, 50) as with_check_preview
FROM pg_policies
WHERE tablename = 'trackpay_users'
ORDER BY cmd, policyname;

-- Expected 6 policies:
-- 1. Allow authenticated user registration (INSERT, authenticated)
-- 2. Users can read their own profile (SELECT, authenticated)
-- 3. Users can update their own profile (UPDATE, authenticated)
-- 4. Users can claim unclaimed client invites (UPDATE, authenticated)
-- 5. Users can read related users (SELECT, authenticated)
-- 6. Public can validate unclaimed invite clients (SELECT, public)

-- ============================================================================
-- CHECK 4: Policy Details (trackpay_sessions)
-- ============================================================================

SELECT
  policyname,
  cmd,
  roles::text as role
FROM pg_policies
WHERE tablename = 'trackpay_sessions'
ORDER BY cmd, policyname;

-- Expected 4 policies:
-- 1. Providers can create sessions (INSERT, authenticated)
-- 2. Providers can read their sessions (SELECT, authenticated)
-- 3. Clients can read their sessions (SELECT, authenticated)
-- 4. Providers can update their sessions (UPDATE, authenticated)

-- ============================================================================
-- CHECK 5: All Policies Summary
-- ============================================================================

SELECT
  tablename,
  policyname,
  cmd,
  roles::text
FROM pg_policies
WHERE tablename LIKE 'trackpay_%'
ORDER BY tablename, cmd, policyname;

-- Total expected: 24 policies

-- ============================================================================
-- CHECK 6: Security Audit - Public Access
-- ============================================================================

-- Find any policies with TO public or TO anon
SELECT
  tablename,
  policyname,
  cmd,
  roles::text as role,
  LEFT(qual, 60) as using_clause
FROM pg_policies
WHERE tablename LIKE 'trackpay_%'
  AND (roles::text LIKE '%public%' OR roles::text LIKE '%anon%')
ORDER BY tablename, policyname;

-- Expected: Only 1 policy
-- trackpay_users: "Public can validate unclaimed invite clients" (SELECT, public)

-- ============================================================================
-- CHECK 7: Authentication Pattern Validation
-- ============================================================================

-- Check if policies properly use auth.uid()
SELECT
  tablename,
  policyname,
  CASE
    WHEN qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%' THEN '✅ Uses auth.uid()'
    WHEN roles::text = '{public}' THEN '⚠️  Public policy (expected)'
    ELSE '❌ Missing auth.uid()'
  END as auth_check
FROM pg_policies
WHERE tablename LIKE 'trackpay_%'
ORDER BY tablename, policyname;

-- Expected: All policies either use auth.uid() or are public policies

-- ============================================================================
-- SUMMARY REPORT
-- ============================================================================

SELECT
  '📊 DEPLOYMENT SUMMARY' as report_section,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename LIKE 'trackpay_%') as total_policies,
  (SELECT COUNT(*) FROM pg_tables WHERE tablename LIKE 'trackpay_%' AND rowsecurity = true) as tables_with_rls,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename LIKE 'trackpay_%' AND roles::text LIKE '%public%') as public_policies
UNION ALL
SELECT
  'Expected Values' as report_section,
  24 as total_policies,
  6 as tables_with_rls,
  1 as public_policies;

-- ============================================================================
-- TROUBLESHOOTING QUERIES
-- ============================================================================

-- If you see mismatches, use these queries to investigate:

-- Find tables missing policies
-- SELECT tablename
-- FROM pg_tables
-- WHERE tablename LIKE 'trackpay_%'
--   AND rowsecurity = true
--   AND tablename NOT IN (SELECT DISTINCT tablename FROM pg_policies WHERE tablename LIKE 'trackpay_%');

-- Find policies with problematic patterns
-- SELECT tablename, policyname
-- FROM pg_policies
-- WHERE tablename LIKE 'trackpay_%'
--   AND (
--     qual LIKE '%true%'
--     OR with_check LIKE '%true%'
--   )
--   AND roles::text != '{public}';

-- Check for duplicate policy names
-- SELECT tablename, policyname, COUNT(*)
-- FROM pg_policies
-- WHERE tablename LIKE 'trackpay_%'
-- GROUP BY tablename, policyname
-- HAVING COUNT(*) > 1;
