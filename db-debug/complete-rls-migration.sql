-- ============================================================================
-- Complete the RLS Migration - Add Missing Policies
-- ============================================================================
-- Based on comparison with staging, these policies are missing:
-- ============================================================================

-- ============================================================================
-- STEP 1: Clean up duplicate trackpay_users policies
-- ============================================================================

-- Remove the policies with \n in the name (old ones)
DROP POLICY IF EXISTS "Users can insert their own\n  profile" ON trackpay_users;
DROP POLICY IF EXISTS "Users can view their own\n  profile" ON trackpay_users;

-- Now we should have:
-- - "Users can insert their own profile" ✅
-- - "Users can view their own profile" ✅
-- - Need to add: "Users can update their own profile"

-- ============================================================================
-- STEP 2: Add missing trackpay_users policy
-- ============================================================================

CREATE POLICY "Users can update their own profile"
ON trackpay_users
FOR ALL
TO public
USING (true);

-- ============================================================================
-- STEP 3: Add missing trackpay_activities policy
-- ============================================================================

CREATE POLICY "Users can view their own activities"
ON trackpay_activities
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM trackpay_users
    WHERE trackpay_users.id = trackpay_activities.provider_id
      AND trackpay_users.auth_user_id = auth.uid()
  )
);

-- ============================================================================
-- STEP 4: Add missing trackpay_relationships policy
-- ============================================================================

CREATE POLICY "rel_select_by_party"
ON trackpay_relationships
FOR SELECT
TO authenticated
USING (
  provider_id = auth.uid() OR client_id = auth.uid()
);

-- ============================================================================
-- STEP 5: Add missing trackpay_sessions policies
-- ============================================================================

CREATE POLICY "All can manage sessions"
ON trackpay_sessions
FOR ALL
TO public
USING (true);

CREATE POLICY "Users can update their own sessions"
ON trackpay_sessions
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM trackpay_users
    WHERE trackpay_users.id = trackpay_sessions.provider_id
      AND trackpay_users.auth_user_id = auth.uid()
  )
);

-- ============================================================================
-- STEP 6: Add missing trackpay_requests policy
-- ============================================================================

CREATE POLICY "All can manage requests"
ON trackpay_requests
FOR ALL
TO public
USING (true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check policy counts (should match staging now)
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename LIKE 'trackpay_%'
GROUP BY tablename
ORDER BY tablename;

-- Expected counts (matching staging):
-- trackpay_activities: 2
-- trackpay_payments: 3
-- trackpay_relationship_audit: 1
-- trackpay_relationships: 2
-- trackpay_requests: 1
-- trackpay_sessions: 4
-- trackpay_users: 3

-- List all policies to verify
SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename LIKE 'trackpay_%'
ORDER BY tablename, policyname;
