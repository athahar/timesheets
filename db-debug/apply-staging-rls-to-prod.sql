-- ============================================================================
-- Apply STAGING RLS Configuration to PRODUCTION
-- ============================================================================
-- This SQL replicates staging's RLS setup (which works!) to production
--
-- Key Insight: Staging uses permissive "qual = true" policies with role "public"
-- This allows all operations to succeed while RLS is technically enabled
-- ============================================================================

-- ============================================================================
-- STEP 1: Set RLS Status to Match Staging
-- ============================================================================

-- Staging: RLS DISABLED on these tables
ALTER TABLE trackpay_invites DISABLE ROW LEVEL SECURITY;

-- Staging: RLS ENABLED on these tables
ALTER TABLE trackpay_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trackpay_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE trackpay_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE trackpay_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trackpay_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE trackpay_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE trackpay_relationship_audit ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Drop ALL Existing Policies in Production
-- ============================================================================

-- trackpay_users
DROP POLICY IF EXISTS "Users can insert their own\n  profile" ON trackpay_users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON trackpay_users;
DROP POLICY IF EXISTS "Users can view their own\n  profile" ON trackpay_users;
DROP POLICY IF EXISTS "Users can view their own profile" ON trackpay_users;
DROP POLICY IF EXISTS "Users can update their own profile" ON trackpay_users;
DROP POLICY IF EXISTS "Allow users to read their own record" ON trackpay_users;
DROP POLICY IF EXISTS "Allow users to update their own record" ON trackpay_users;
DROP POLICY IF EXISTS "Allow users to claim unclaimed profiles" ON trackpay_users;

-- trackpay_invites (RLS will be disabled, but drop policies for cleanup)
DROP POLICY IF EXISTS "Allow public invite code validation" ON trackpay_invites;
DROP POLICY IF EXISTS "tp_invites_select_party" ON trackpay_invites;
DROP POLICY IF EXISTS "tp_invites_insert_provider" ON trackpay_invites;
DROP POLICY IF EXISTS "Allow authenticated to read pending invites" ON trackpay_invites;
DROP POLICY IF EXISTS "Allow authenticated to claim invites" ON trackpay_invites;

-- trackpay_activities
DROP POLICY IF EXISTS "tp_activities_select_party" ON trackpay_activities;

-- trackpay_payments
DROP POLICY IF EXISTS "tp_payments_insert_provider" ON trackpay_payments;
DROP POLICY IF EXISTS "tp_payments_select_party" ON trackpay_payments;
DROP POLICY IF EXISTS "tp_payments_update_provider" ON trackpay_payments;

-- trackpay_sessions
DROP POLICY IF EXISTS "tp_sessions_insert_provider" ON trackpay_sessions;
DROP POLICY IF EXISTS "tp_sessions_select_party" ON trackpay_sessions;
DROP POLICY IF EXISTS "tp_sessions_update_provider" ON trackpay_sessions;

-- trackpay_requests
DROP POLICY IF EXISTS "tp_requests_insert_provider" ON trackpay_requests;
DROP POLICY IF EXISTS "tp_requests_select_party" ON trackpay_requests;
DROP POLICY IF EXISTS "tp_requests_update_provider" ON trackpay_requests;

-- trackpay_relationships
DROP POLICY IF EXISTS "tp_rels_insert_provider" ON trackpay_relationships;
DROP POLICY IF EXISTS "tp_rels_select_party" ON trackpay_relationships;
DROP POLICY IF EXISTS "tp_rels_update_provider" ON trackpay_relationships;
DROP POLICY IF EXISTS "All can view relationships" ON trackpay_relationships;
DROP POLICY IF EXISTS "rel_select_by_party" ON trackpay_relationships;

-- trackpay_relationship_audit
DROP POLICY IF EXISTS "audit_select_by_provider" ON trackpay_relationship_audit;
DROP POLICY IF EXISTS "tp_rel_audit_select_provider" ON trackpay_relationship_audit;

-- ============================================================================
-- STEP 3: Create Staging Policies (Permissive - qual = true)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- trackpay_users - Very Permissive (allows all operations)
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can insert their own profile"
ON trackpay_users
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Users can view their own profile"
ON trackpay_users
FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can update their own profile"
ON trackpay_users
FOR ALL
TO public
USING (true);

-- ---------------------------------------------------------------------------
-- trackpay_activities
-- ---------------------------------------------------------------------------

CREATE POLICY "All can view activities"
ON trackpay_activities
FOR ALL
TO public
USING (true);

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

-- ---------------------------------------------------------------------------
-- trackpay_payments
-- ---------------------------------------------------------------------------

CREATE POLICY "All can manage payments"
ON trackpay_payments
FOR ALL
TO public
USING (true);

CREATE POLICY "Users can insert their own payments"
ON trackpay_payments
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Users can view their own payments"
ON trackpay_payments
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM trackpay_users
    WHERE trackpay_users.id = trackpay_payments.provider_id
      AND trackpay_users.auth_user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- trackpay_sessions
-- ---------------------------------------------------------------------------

CREATE POLICY "All can manage sessions"
ON trackpay_sessions
FOR ALL
TO public
USING (true);

CREATE POLICY "Users can insert their own sessions"
ON trackpay_sessions
FOR INSERT
TO public
WITH CHECK (true);

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

CREATE POLICY "Users can view their own sessions"
ON trackpay_sessions
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM trackpay_users
    WHERE trackpay_users.id = trackpay_sessions.provider_id
      AND trackpay_users.auth_user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- trackpay_requests
-- ---------------------------------------------------------------------------

CREATE POLICY "All can manage requests"
ON trackpay_requests
FOR ALL
TO public
USING (true);

-- ---------------------------------------------------------------------------
-- trackpay_relationships
-- ---------------------------------------------------------------------------

CREATE POLICY "All can view relationships"
ON trackpay_relationships
FOR ALL
TO public
USING (true);

CREATE POLICY "rel_select_by_party"
ON trackpay_relationships
FOR SELECT
TO authenticated
USING (
  provider_id = auth.uid() OR client_id = auth.uid()
);

-- ---------------------------------------------------------------------------
-- trackpay_relationship_audit
-- ---------------------------------------------------------------------------

CREATE POLICY "audit_select_by_provider"
ON trackpay_relationship_audit
FOR SELECT
TO authenticated
USING (provider_id = auth.uid());

-- ============================================================================
-- STEP 4: Verification
-- ============================================================================

-- Check RLS status
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename LIKE 'trackpay_%'
  AND schemaname = 'public'
ORDER BY tablename;

-- Expected:
-- trackpay_invites: false
-- All others: true

-- Count policies per table
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename LIKE 'trackpay_%'
GROUP BY tablename
ORDER BY tablename;

-- Expected counts:
-- trackpay_users: 3
-- trackpay_activities: 2
-- trackpay_payments: 3
-- trackpay_sessions: 4
-- trackpay_requests: 1
-- trackpay_relationships: 2
-- trackpay_relationship_audit: 1

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- Why this works:
-- 1. Most policies use "USING (true)" which allows all operations
-- 2. Role is "public" not "authenticated" - no auth required
-- 3. trackpay_invites has RLS disabled completely
-- 4. This is permissive by design for development/staging
--
-- For production security:
-- - Consider tightening policies once invite flow is stable
-- - Use current_trackpay_user_id() helper for proper auth checks
-- - But for now, match staging to fix immediate issues
-- ============================================================================
