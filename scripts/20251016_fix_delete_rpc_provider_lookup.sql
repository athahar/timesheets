-- TrackPay: Fix delete_client_relationship_safely RPC Provider Lookup
-- Created: 2025-10-16
-- Purpose: Fix provider_id lookup to use trackpay_users.id instead of auth.uid()

-- ============================================================================
-- PROBLEM: RPC uses auth.uid() directly as provider_id
-- ============================================================================
-- The RPC was using auth.uid() (auth.users.id) directly as provider_id
-- But trackpay_relationships uses trackpay_users.id
-- This caused the RPC to check the wrong provider and always return false

-- ============================================================================
-- SOLUTION: Look up trackpay_users.id from auth.uid() first
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.delete_client_relationship_safely(p_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_id    uuid := auth.uid();
  v_provider   uuid;
  v_deleted    boolean := false;
  v_reason     text := null;
BEGIN
  -- Check authentication
  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  -- Look up trackpay_users.id from auth_user_id
  SELECT id INTO v_provider
  FROM public.trackpay_users
  WHERE auth_user_id = v_auth_id
    AND role = 'provider'
  LIMIT 1;

  IF v_provider IS NULL THEN
    RAISE EXCEPTION 'Provider account not found.';
  END IF;

  -- Attempt atomic delete with blocker checks
  WITH del AS (
    DELETE FROM public.trackpay_relationships r
    WHERE r.provider_id = v_provider
      AND r.client_id = p_client_id
      AND NOT EXISTS (
        SELECT 1 FROM public.trackpay_sessions s
        WHERE s.provider_id = v_provider
          AND s.client_id = p_client_id
          AND s.status IN ('active', 'unpaid', 'requested')
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.trackpay_requests pr
        WHERE pr.provider_id = v_provider
          AND pr.client_id = p_client_id
          AND pr.status IN ('pending', 'sent', 'requested')
      )
    RETURNING 1
  )
  SELECT true INTO v_deleted FROM del;

  -- If successfully deleted, log it
  IF v_deleted THEN
    INSERT INTO public.trackpay_relationship_audit (provider_id, client_id, action, created_at)
    VALUES (v_provider, p_client_id, 'delete_success', now());
    RETURN true;
  END IF;

  -- Check why delete failed (for audit logging)
  IF EXISTS (
    SELECT 1 FROM public.trackpay_sessions s
    WHERE s.provider_id = v_provider
      AND s.client_id = p_client_id
      AND s.status IN ('active', 'unpaid', 'requested')
  ) THEN
    v_reason := 'active_or_unpaid_sessions';
    INSERT INTO public.trackpay_relationship_audit (provider_id, client_id, action, reason, created_at)
    VALUES (v_provider, p_client_id, 'delete_blocked', v_reason, now());
    RAISE EXCEPTION 'Cannot delete. Active or unpaid sessions exist.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.trackpay_requests pr
    WHERE pr.provider_id = v_provider
      AND pr.client_id = p_client_id
      AND pr.status IN ('pending', 'sent', 'requested')
  ) THEN
    v_reason := 'outstanding_payment_requests';
    INSERT INTO public.trackpay_relationship_audit (provider_id, client_id, action, reason, created_at)
    VALUES (v_provider, p_client_id, 'delete_blocked', v_reason, now());
    RAISE EXCEPTION 'Cannot delete. Outstanding payment requests exist.';
  END IF;

  -- Relationship doesn't exist (already deleted)
  INSERT INTO public.trackpay_relationship_audit (provider_id, client_id, action, created_at)
  VALUES (v_provider, p_client_id, 'delete_already_gone', now());
  RETURN false;
END $$;

ALTER FUNCTION public.delete_client_relationship_safely(uuid) SET search_path = public;
ALTER FUNCTION public.delete_client_relationship_safely(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.delete_client_relationship_safely(uuid) TO authenticated;

COMMIT;

-- ============================================================================
-- Test the fix
-- ============================================================================
-- Run this as Lucy (authenticated user) to verify it works:
-- SELECT delete_client_relationship_safely('eef0de49-232e-45ea-b277-5c3dc4eb50e1');
--
-- Expected: true (relationship deleted)
-- Then check: SELECT * FROM trackpay_relationships WHERE client_id = 'eef0de49-232e-45ea-b277-5c3dc4eb50e1';
-- Expected: 0 rows

-- ============================================================================
-- Verification
-- ============================================================================
-- Check audit log after running the delete:
-- SELECT * FROM trackpay_relationship_audit
-- WHERE client_id = 'eef0de49-232e-45ea-b277-5c3dc4eb50e1'
-- ORDER BY created_at DESC LIMIT 1;
--
-- Expected: action = 'delete_success' and provider_id matches your trackpay_users.id
