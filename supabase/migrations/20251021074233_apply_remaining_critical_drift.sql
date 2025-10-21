-- Production Fix: Apply remaining critical drift from staging
-- Issue: Missing functions and columns that app code requires
-- Root Cause: Staged manually in staging, never captured as migration
--
-- This migration applies the remaining CRITICAL changes only:
-- 1. claimed_status column (app code uses this extensively)
-- 2. current_trackpay_user_id() function (required by RLS policies in staging)
-- 3. delete_client_relationship_safely() function (delete client feature)
--
-- SKIPPED (requires security review):
-- - RLS policy changes on trackpay_users (staging has very permissive SELECT policy)
-- - INSERT permission revocation (need to test impact first)

-- ============================================================================
-- 1. Add claimed_status column to trackpay_users
-- ============================================================================
-- App uses this to track unclaimed (placeholder) vs claimed (real) users

ALTER TABLE trackpay_users
  ADD COLUMN IF NOT EXISTS claimed_status TEXT DEFAULT 'claimed';

-- Add check constraint to ensure valid values (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'claimed_status_check'
    AND conrelid = 'trackpay_users'::regclass
  ) THEN
    ALTER TABLE trackpay_users
      ADD CONSTRAINT claimed_status_check
      CHECK (claimed_status = ANY (ARRAY['unclaimed'::text, 'claimed'::text]));
  END IF;
END $$;

-- ============================================================================
-- 2. Create current_trackpay_user_id() helper function
-- ============================================================================
-- This function maps auth.uid() -> trackpay_users.id
-- Used extensively by RLS policies in staging

CREATE OR REPLACE FUNCTION public.current_trackpay_user_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id
  FROM public.trackpay_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.current_trackpay_user_id() TO anon;
GRANT EXECUTE ON FUNCTION public.current_trackpay_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_trackpay_user_id() TO service_role;

-- ============================================================================
-- 3. Create delete_client_relationship_safely() function
-- ============================================================================
-- Allows providers to safely delete client relationships with validation
-- Prevents deletion if active sessions or payment requests exist

CREATE OR REPLACE FUNCTION public.delete_client_relationship_safely(p_client_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END $function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.delete_client_relationship_safely(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.delete_client_relationship_safely(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_client_relationship_safely(uuid) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.delete_client_relationship_safely(uuid) IS
'Safely deletes a client relationship after validating no active sessions or payment requests exist.
Logs all attempts (success, blocked, or already deleted) to trackpay_relationship_audit table.';
