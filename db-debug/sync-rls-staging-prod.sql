-- ============================================================================
-- Synchronize RLS between STAGING and PRODUCTION
-- Base: existing staging posture, tightened for production safety
-- ============================================================================
-- This script:
--   * Aligns RLS enable/disable flags with staging (invites open, others protected)
--   * Rebuilds trackpay_users policies to cover registration + invite claim flows
--   * Preserves pre-auth invite lookup while keeping user data locked down
--   * Runs inside a transaction so partial updates don't leave tables unprotected
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- STEP 1: RLS status (matches staging)
-- ---------------------------------------------------------------------------

ALTER TABLE public.trackpay_invites DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.trackpay_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trackpay_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trackpay_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trackpay_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trackpay_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trackpay_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trackpay_relationship_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.trackpay_unpaid_balances ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- STEP 2: Rebuild RLS policies for trackpay_users
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.current_trackpay_profile_id();

CREATE FUNCTION public.current_trackpay_profile_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    current_id uuid;
BEGIN
    PERFORM set_config('row_security', 'off', true);
    SELECT id
      INTO current_id
      FROM public.trackpay_users
     WHERE auth_user_id = auth.uid()
     LIMIT 1;
    RETURN current_id;
END;
$$;

REVOKE ALL ON FUNCTION public.current_trackpay_profile_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_trackpay_profile_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_trackpay_profile_id() TO anon;

DO
$$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'trackpay_users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.trackpay_users', pol.policyname);
    END LOOP;
END;
$$;

-- Policy: authenticated sign-up must bind new row to caller's auth.uid()
DROP POLICY IF EXISTS "tp_users_insert_self" ON public.trackpay_users;
CREATE POLICY "tp_users_insert_self"
    ON public.trackpay_users
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth_user_id = auth.uid()
    );

-- Policy: authenticated users can read their own profile
DROP POLICY IF EXISTS "tp_users_select_self" ON public.trackpay_users;
CREATE POLICY "tp_users_select_self"
    ON public.trackpay_users
    FOR SELECT
    TO authenticated
    USING (
        auth_user_id = auth.uid()
    );

-- Policy: authenticated users can update their own profile
DROP POLICY IF EXISTS "tp_users_update_self" ON public.trackpay_users;
CREATE POLICY "tp_users_update_self"
    ON public.trackpay_users
    FOR UPDATE
    TO authenticated
    USING (
        auth_user_id = auth.uid()
    )
    WITH CHECK (
        auth_user_id = auth.uid()
    );

-- Policy: authenticated users can claim an unclaimed client profile (invite flow)
DROP POLICY IF EXISTS "tp_users_claim_invite" ON public.trackpay_users;
CREATE POLICY "tp_users_claim_invite"
    ON public.trackpay_users
    FOR UPDATE
    TO authenticated
    USING (
        role = 'client'
        AND claimed_status = 'unclaimed'
        AND auth_user_id IS NULL
    )
    WITH CHECK (
        role = 'client'
        AND auth_user_id = auth.uid()
        AND claimed_status = 'claimed'
    );

-- Policy: limited public lookup for invite validation (anon can only see unclaimed clients)
DROP POLICY IF EXISTS "tp_users_lookup_unclaimed_clients" ON public.trackpay_users;
CREATE POLICY "tp_users_lookup_unclaimed_clients"
    ON public.trackpay_users
    FOR SELECT
    TO anon
    USING (
        role = 'client'
        AND claimed_status = 'unclaimed'
    );

-- Policy: allow invite screens to show provider name for active invites
DROP POLICY IF EXISTS "tp_users_lookup_invite_providers" ON public.trackpay_users;
CREATE POLICY "tp_users_lookup_invite_providers"
    ON public.trackpay_users
    FOR SELECT
    TO anon
    USING (
        role = 'provider'
        AND EXISTS (
            SELECT 1
            FROM public.trackpay_invites inv
            WHERE inv.provider_id = trackpay_users.id
              AND inv.status = 'pending'
              AND inv.expires_at > now()
        )
    );

-- Policy: authenticated users can see providers/clients they are related to
DROP POLICY IF EXISTS "tp_users_select_related" ON public.trackpay_users;
CREATE POLICY "tp_users_select_related"
    ON public.trackpay_users
    FOR SELECT
    TO authenticated
    USING (
        trackpay_users.id IN (
            SELECT rel.provider_id
            FROM public.trackpay_relationships rel
            WHERE rel.client_id = public.current_trackpay_profile_id()
        )
        OR trackpay_users.id IN (
            SELECT rel.client_id
            FROM public.trackpay_relationships rel
            WHERE rel.provider_id = public.current_trackpay_profile_id()
        )
    );

-- ---------------------------------------------------------------------------
-- STEP 3: Optional sanity checks (run manually after deployment)
-- ---------------------------------------------------------------------------
-- SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public'
--     AND tablename LIKE 'trackpay_%'
--   ORDER BY tablename;
--
-- SELECT policyname, cmd, roles, qual
--   FROM pg_policies
--   WHERE schemaname = 'public'
--     AND tablename = 'trackpay_users'
--   ORDER BY policyname;

COMMIT;

-- ============================================================================
-- Post-apply checklist:
--   * From an unauthenticated client, ensure /rest/v1/trackpay_users?select=name&id=eq… only works for unclaimed clients.
--   * From an authenticated unrelated user, verify /rest/v1/trackpay_users blocks access to others’ data.
--   * Run the invite claim flow end-to-end to confirm the new user lands on the provider dashboard.
-- ============================================================================
