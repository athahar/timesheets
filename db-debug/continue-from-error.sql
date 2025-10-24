-- Quick fix: Drop the existing policy first, then continue
-- Run this INSTEAD of the section that errored

-- Drop the existing policy
DROP POLICY IF EXISTS "audit_select_by_provider" ON trackpay_relationship_audit;

-- Now create it fresh
CREATE POLICY "audit_select_by_provider"
ON trackpay_relationship_audit
FOR SELECT
TO authenticated
USING (provider_id = auth.uid());

-- ============================================================================
-- Verification (run this to check if everything is applied)
-- ============================================================================

-- Check RLS status
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename LIKE 'trackpay_%'
  AND schemaname = 'public'
ORDER BY tablename;

-- Count policies per table
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename LIKE 'trackpay_%'
GROUP BY tablename
ORDER BY tablename;
