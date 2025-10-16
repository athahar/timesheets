-- 020_rls_policies.sql
-- Enable Row Level Security (RLS) on all TrackPay tables
-- Uses current_trackpay_user_id() helper to correctly map auth.uid() → trackpay_users.id
--
-- CRITICAL: All policies use current_trackpay_user_id() instead of auth.uid()
-- because our foreign keys reference trackpay_users.id, NOT auth.users.id

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- ============================================================================
-- USERS TABLE
-- ============================================================================

ALTER TABLE public.trackpay_users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
DROP POLICY IF EXISTS tp_users_select_self ON public.trackpay_users;
CREATE POLICY tp_users_select_self
  ON public.trackpay_users
  FOR SELECT TO authenticated
  USING (id = current_trackpay_user_id());

-- Users can update their own profile
DROP POLICY IF EXISTS tp_users_update_self ON public.trackpay_users;
CREATE POLICY tp_users_update_self
  ON public.trackpay_users
  FOR UPDATE TO authenticated
  USING (id = current_trackpay_user_id())
  WITH CHECK (id = current_trackpay_user_id());

-- ============================================================================
-- RELATIONSHIPS TABLE
-- ============================================================================

ALTER TABLE public.trackpay_relationships ENABLE ROW LEVEL SECURITY;

-- View relationships where user is involved (provider OR client)
DROP POLICY IF EXISTS tp_rels_select_party ON public.trackpay_relationships;
CREATE POLICY tp_rels_select_party
  ON public.trackpay_relationships
  FOR SELECT TO authenticated
  USING (
    provider_id = current_trackpay_user_id()
    OR client_id = current_trackpay_user_id()
  );

-- Providers can create relationships
DROP POLICY IF EXISTS tp_rels_insert_provider ON public.trackpay_relationships;
CREATE POLICY tp_rels_insert_provider
  ON public.trackpay_relationships
  FOR INSERT TO authenticated
  WITH CHECK (provider_id = current_trackpay_user_id());

-- Providers can update their relationships
DROP POLICY IF EXISTS tp_rels_update_provider ON public.trackpay_relationships;
CREATE POLICY tp_rels_update_provider
  ON public.trackpay_relationships
  FOR UPDATE TO authenticated
  USING (provider_id = current_trackpay_user_id())
  WITH CHECK (provider_id = current_trackpay_user_id());

-- NO DELETE POLICY - deletes must go through delete_client_relationship_safely() RPC
REVOKE DELETE ON public.trackpay_relationships FROM authenticated;

-- ============================================================================
-- SESSIONS TABLE
-- ============================================================================

ALTER TABLE public.trackpay_sessions ENABLE ROW LEVEL SECURITY;

-- View sessions where user is involved (provider OR client)
DROP POLICY IF EXISTS tp_sessions_select_party ON public.trackpay_sessions;
CREATE POLICY tp_sessions_select_party
  ON public.trackpay_sessions
  FOR SELECT TO authenticated
  USING (
    provider_id = current_trackpay_user_id()
    OR client_id = current_trackpay_user_id()
  );

-- Providers can create sessions
DROP POLICY IF EXISTS tp_sessions_insert_provider ON public.trackpay_sessions;
CREATE POLICY tp_sessions_insert_provider
  ON public.trackpay_sessions
  FOR INSERT TO authenticated
  WITH CHECK (provider_id = current_trackpay_user_id());

-- Providers can update their sessions
DROP POLICY IF EXISTS tp_sessions_update_provider ON public.trackpay_sessions;
CREATE POLICY tp_sessions_update_provider
  ON public.trackpay_sessions
  FOR UPDATE TO authenticated
  USING (provider_id = current_trackpay_user_id())
  WITH CHECK (provider_id = current_trackpay_user_id());

-- ============================================================================
-- REQUESTS TABLE
-- ============================================================================

ALTER TABLE public.trackpay_requests ENABLE ROW LEVEL SECURITY;

-- View requests where user is involved (provider OR client)
DROP POLICY IF EXISTS tp_requests_select_party ON public.trackpay_requests;
CREATE POLICY tp_requests_select_party
  ON public.trackpay_requests
  FOR SELECT TO authenticated
  USING (
    provider_id = current_trackpay_user_id()
    OR client_id = current_trackpay_user_id()
  );

-- Providers can create payment requests
DROP POLICY IF EXISTS tp_requests_insert_provider ON public.trackpay_requests;
CREATE POLICY tp_requests_insert_provider
  ON public.trackpay_requests
  FOR INSERT TO authenticated
  WITH CHECK (provider_id = current_trackpay_user_id());

-- Providers can update their payment requests
DROP POLICY IF EXISTS tp_requests_update_provider ON public.trackpay_requests;
CREATE POLICY tp_requests_update_provider
  ON public.trackpay_requests
  FOR UPDATE TO authenticated
  USING (provider_id = current_trackpay_user_id())
  WITH CHECK (provider_id = current_trackpay_user_id());

-- ============================================================================
-- PAYMENTS TABLE
-- ============================================================================

ALTER TABLE public.trackpay_payments ENABLE ROW LEVEL SECURITY;

-- View payments where user is involved (provider OR client)
DROP POLICY IF EXISTS tp_payments_select_party ON public.trackpay_payments;
CREATE POLICY tp_payments_select_party
  ON public.trackpay_payments
  FOR SELECT TO authenticated
  USING (
    provider_id = current_trackpay_user_id()
    OR client_id = current_trackpay_user_id()
  );

-- Providers can create payment records
DROP POLICY IF EXISTS tp_payments_insert_provider ON public.trackpay_payments;
CREATE POLICY tp_payments_insert_provider
  ON public.trackpay_payments
  FOR INSERT TO authenticated
  WITH CHECK (provider_id = current_trackpay_user_id());

-- Providers can update payment records
DROP POLICY IF EXISTS tp_payments_update_provider ON public.trackpay_payments;
CREATE POLICY tp_payments_update_provider
  ON public.trackpay_payments
  FOR UPDATE TO authenticated
  USING (provider_id = current_trackpay_user_id())
  WITH CHECK (provider_id = current_trackpay_user_id());

-- ============================================================================
-- ACTIVITIES TABLE
-- ============================================================================

ALTER TABLE public.trackpay_activities ENABLE ROW LEVEL SECURITY;

-- View activities where user is involved (provider OR client)
DROP POLICY IF EXISTS tp_activities_select_party ON public.trackpay_activities;
CREATE POLICY tp_activities_select_party
  ON public.trackpay_activities
  FOR SELECT TO authenticated
  USING (
    provider_id = current_trackpay_user_id()
    OR client_id = current_trackpay_user_id()
  );

-- Activities are typically created by app logic, not direct inserts
-- But if needed, allow providers to create activities
-- DROP POLICY IF EXISTS tp_activities_insert_provider ON public.trackpay_activities;
-- CREATE POLICY tp_activities_insert_provider
--   ON public.trackpay_activities
--   FOR INSERT TO authenticated
--   WITH CHECK (provider_id = current_trackpay_user_id());

-- ============================================================================
-- INVITES TABLE
-- ============================================================================

ALTER TABLE public.trackpay_invites ENABLE ROW LEVEL SECURITY;

-- View invites where user is involved (provider OR claimed by user)
DROP POLICY IF EXISTS tp_invites_select_party ON public.trackpay_invites;
CREATE POLICY tp_invites_select_party
  ON public.trackpay_invites
  FOR SELECT TO authenticated
  USING (
    provider_id = current_trackpay_user_id()
    OR claimed_by = current_trackpay_user_id()
  );

-- Providers can create invites
DROP POLICY IF EXISTS tp_invites_insert_provider ON public.trackpay_invites;
CREATE POLICY tp_invites_insert_provider
  ON public.trackpay_invites
  FOR INSERT TO authenticated
  WITH CHECK (provider_id = current_trackpay_user_id());

-- ============================================================================
-- RELATIONSHIP AUDIT TABLE
-- ============================================================================

ALTER TABLE public.trackpay_relationship_audit ENABLE ROW LEVEL SECURITY;

-- Providers can view their audit logs
DROP POLICY IF EXISTS tp_rel_audit_select_provider ON public.trackpay_relationship_audit;
CREATE POLICY tp_rel_audit_select_provider
  ON public.trackpay_relationship_audit
  FOR SELECT TO authenticated
  USING (provider_id = current_trackpay_user_id());

COMMIT;

-- Verification
DO $$
DECLARE
  rls_enabled_count int;
  policy_count int;
BEGIN
  -- Check RLS enabled on all 8 tables
  SELECT COUNT(*)
  INTO rls_enabled_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename LIKE 'trackpay_%'
    AND rowsecurity = true;

  IF rls_enabled_count < 8 THEN
    RAISE EXCEPTION 'RLS not enabled on all TrackPay tables (found %, expected 8)', rls_enabled_count;
  END IF;

  -- Check policies created (should have multiple policies per table)
  SELECT COUNT(*)
  INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename LIKE 'trackpay_%';

  IF policy_count < 15 THEN
    RAISE WARNING 'Expected at least 15 RLS policies, found %', policy_count;
  END IF;

  RAISE NOTICE '✅ RLS enabled on 8 tables with % policies', policy_count;
END $$;
