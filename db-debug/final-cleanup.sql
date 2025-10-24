-- ============================================================================
-- Final RLS Cleanup - Fix Remaining Issues
-- ============================================================================

-- ============================================================================
-- ISSUE 1: Remove duplicate trackpay_users policies with \n in name
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert their own\n  profile" ON trackpay_users;
DROP POLICY IF EXISTS "Users can view their own\n  profile" ON trackpay_users;

-- After this, trackpay_users should have exactly 3 policies:
-- 1. "Users can insert their own profile" (INSERT)
-- 2. "Users can view their own profile" (SELECT)
-- 3. "Users can update their own profile" (ALL)

-- ============================================================================
-- ISSUE 2: Add missing rel_select_by_party policy for trackpay_relationships
-- ============================================================================

CREATE POLICY "rel_select_by_party"
ON trackpay_relationships
FOR SELECT
TO authenticated
USING (
  provider_id = auth.uid() OR client_id = auth.uid()
);

-- After this, trackpay_relationships should have exactly 2 policies:
-- 1. "All can view relationships" (ALL, public)
-- 2. "rel_select_by_party" (SELECT, authenticated)

-- ============================================================================
-- VERIFICATION - Final Check
-- ============================================================================

-- Count policies (should match staging exactly now)
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename LIKE 'trackpay_%'
GROUP BY tablename
ORDER BY tablename;

-- Expected counts:
-- trackpay_activities: 2
-- trackpay_payments: 3
-- trackpay_relationship_audit: 1
-- trackpay_relationships: 2  ← Fixed!
-- trackpay_requests: 1
-- trackpay_sessions: 4
-- trackpay_users: 3  ← Fixed!

-- List all policies with details
SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename LIKE 'trackpay_%'
ORDER BY tablename, policyname;

-- ============================================================================
-- SUCCESS CRITERIA
-- ============================================================================
-- ✅ All tables have correct policy counts
-- ✅ No duplicate policies with \n in names
-- ✅ trackpay_relationships has both policies
-- ✅ Production RLS matches staging configuration
-- ============================================================================
