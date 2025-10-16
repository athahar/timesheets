-- TrackPay: Fix FK Constraints and RLS Policies
-- Created: 2025-10-15
-- Purpose: CRITICAL FIX - Change CASCADE to RESTRICT and lock down RLS

-- ============================================================================
-- CRITICAL: Fix Foreign Key Constraints
-- ============================================================================
-- Current: confdeltype = 'c' (CASCADE) - DANGEROUS!
-- Target: confdeltype = 'r' (RESTRICT) - Safe, preserves data integrity
--
-- CASCADE would delete all sessions when relationship deleted (bypasses blockers)
-- RESTRICT prevents deletion if sessions exist (enforces data integrity)

-- Fix trackpay_sessions FK constraints
ALTER TABLE public.trackpay_sessions
  DROP CONSTRAINT IF EXISTS trackpay_sessions_client_id_fkey,
  ADD CONSTRAINT trackpay_sessions_client_id_fkey
    FOREIGN KEY (client_id)
    REFERENCES public.trackpay_users(id)
    ON DELETE RESTRICT;

ALTER TABLE public.trackpay_sessions
  DROP CONSTRAINT IF EXISTS trackpay_sessions_provider_id_fkey,
  ADD CONSTRAINT trackpay_sessions_provider_id_fkey
    FOREIGN KEY (provider_id)
    REFERENCES public.trackpay_users(id)
    ON DELETE RESTRICT;

-- Fix trackpay_requests FK constraints (if table exists)
ALTER TABLE public.trackpay_requests
  DROP CONSTRAINT IF EXISTS trackpay_requests_client_id_fkey,
  ADD CONSTRAINT trackpay_requests_client_id_fkey
    FOREIGN KEY (client_id)
    REFERENCES public.trackpay_users(id)
    ON DELETE RESTRICT;

ALTER TABLE public.trackpay_requests
  DROP CONSTRAINT IF EXISTS trackpay_requests_provider_id_fkey,
  ADD CONSTRAINT trackpay_requests_provider_id_fkey
    FOREIGN KEY (provider_id)
    REFERENCES public.trackpay_users(id)
    ON DELETE RESTRICT;

-- Fix trackpay_payments FK constraints
ALTER TABLE public.trackpay_payments
  DROP CONSTRAINT IF EXISTS trackpay_payments_client_id_fkey,
  ADD CONSTRAINT trackpay_payments_client_id_fkey
    FOREIGN KEY (client_id)
    REFERENCES public.trackpay_users(id)
    ON DELETE RESTRICT;

ALTER TABLE public.trackpay_payments
  DROP CONSTRAINT IF EXISTS trackpay_payments_provider_id_fkey,
  ADD CONSTRAINT trackpay_payments_provider_id_fkey
    FOREIGN KEY (provider_id)
    REFERENCES public.trackpay_users(id)
    ON DELETE RESTRICT;

-- Fix trackpay_activities FK constraints
ALTER TABLE public.trackpay_activities
  DROP CONSTRAINT IF EXISTS trackpay_activities_client_id_fkey,
  ADD CONSTRAINT trackpay_activities_client_id_fkey
    FOREIGN KEY (client_id)
    REFERENCES public.trackpay_users(id)
    ON DELETE RESTRICT;

ALTER TABLE public.trackpay_activities
  DROP CONSTRAINT IF EXISTS trackpay_activities_provider_id_fkey,
  ADD CONSTRAINT trackpay_activities_provider_id_fkey
    FOREIGN KEY (provider_id)
    REFERENCES public.trackpay_users(id)
    ON DELETE RESTRICT;

-- Fix trackpay_invites FK constraints
ALTER TABLE public.trackpay_invites
  DROP CONSTRAINT IF EXISTS trackpay_invites_client_id_fkey,
  ADD CONSTRAINT trackpay_invites_client_id_fkey
    FOREIGN KEY (client_id)
    REFERENCES public.trackpay_users(id)
    ON DELETE RESTRICT;

ALTER TABLE public.trackpay_invites
  DROP CONSTRAINT IF EXISTS trackpay_invites_provider_id_fkey,
  ADD CONSTRAINT trackpay_invites_provider_id_fkey
    FOREIGN KEY (provider_id)
    REFERENCES public.trackpay_users(id)
    ON DELETE RESTRICT;

-- ============================================================================
-- CRITICAL: Lock Down RLS - Force RPC Usage
-- ============================================================================
-- Remove direct DELETE policy to prevent bypassing blocker checks
-- Only the SECURITY DEFINER RPC should be able to delete relationships

-- Drop the DELETE policy (prevents direct table access)
DROP POLICY IF EXISTS rel_delete_by_provider ON public.trackpay_relationships;

-- Keep SELECT policy (users can view their relationships)
-- This was already added in previous migration - keeping for reference
-- DROP POLICY IF EXISTS rel_select_by_party ON public.trackpay_relationships;
-- CREATE POLICY rel_select_by_party
--   ON public.trackpay_relationships
--   FOR SELECT
--   TO authenticated
--   USING (provider_id = auth.uid() OR client_id = auth.uid());

-- Revoke DELETE grant from authenticated role (belt and suspenders)
REVOKE DELETE ON public.trackpay_relationships FROM authenticated;

-- Grant is still needed for SECURITY DEFINER RPC to work
-- Postgres handles the grant through ownership, so this is just defensive

-- ============================================================================
-- Audit Logging for Deletions
-- ============================================================================
-- Track all deletion attempts for debugging and compliance

CREATE TABLE IF NOT EXISTS public.trackpay_relationship_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL,
  client_id uuid NOT NULL,
  action text NOT NULL, -- 'delete_success', 'delete_blocked', 'delete_already_gone'
  reason text, -- blocker reason if blocked
  metadata jsonb, -- additional context
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for querying audit logs
CREATE INDEX IF NOT EXISTS idx_relationship_audit_provider_created
  ON public.trackpay_relationship_audit(provider_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_relationship_audit_client_created
  ON public.trackpay_relationship_audit(client_id, created_at DESC);

-- Enable RLS on audit table
ALTER TABLE public.trackpay_relationship_audit ENABLE ROW LEVEL SECURITY;

-- Providers can only see their own audit logs
CREATE POLICY audit_select_by_provider
  ON public.trackpay_relationship_audit
  FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

-- ============================================================================
-- Update RPC to Include Audit Logging
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_client_relationship_safely(p_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_provider uuid := auth.uid();
  v_deleted  boolean := false;
  v_reason   text := null;
BEGIN
  -- Authentication check
  IF v_provider IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  -- Atomic DELETE with blocker guards in WHERE clause
  -- This prevents TOCTTOU race conditions
  WITH del AS (
    DELETE FROM public.trackpay_relationships r
    WHERE r.provider_id = v_provider
      AND r.client_id = p_client_id
      -- Blocker 1: No active, unpaid, or requested sessions
      AND NOT EXISTS (
        SELECT 1 FROM public.trackpay_sessions s
        WHERE s.provider_id = v_provider
          AND s.client_id = p_client_id
          AND s.status IN ('active', 'unpaid', 'requested')
      )
      -- Blocker 2: No pending, sent, or requested payment requests
      AND NOT EXISTS (
        SELECT 1 FROM public.trackpay_requests pr
        WHERE pr.provider_id = v_provider
          AND pr.client_id = p_client_id
          AND pr.status IN ('pending', 'sent', 'requested')
      )
    RETURNING 1
  )
  SELECT true INTO v_deleted FROM del;

  -- If deleted successfully, log and return
  IF v_deleted THEN
    INSERT INTO public.trackpay_relationship_audit (provider_id, client_id, action, created_at)
    VALUES (v_provider, p_client_id, 'delete_success', now());

    RETURN true;
  END IF;

  -- If not deleted, determine why for clearer error messages and audit
  -- Check sessions first
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

  -- Check payment requests
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

  -- No blockers found, relationship already deleted (idempotent)
  INSERT INTO public.trackpay_relationship_audit (provider_id, client_id, action, created_at)
  VALUES (v_provider, p_client_id, 'delete_already_gone', now());

  RETURN false;
END $$;

-- Security: Set search_path to prevent schema hijacking
ALTER FUNCTION public.delete_client_relationship_safely(uuid) SET search_path = public;

-- Ownership and permissions
ALTER FUNCTION public.delete_client_relationship_safely(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.delete_client_relationship_safely(uuid) TO authenticated;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify FK constraints are now RESTRICT ('r')
-- Run this to confirm the fix:
-- SELECT
--   conname,
--   conrelid::regclass AS table_name,
--   confdeltype,
--   CASE confdeltype
--     WHEN 'a' THEN 'NO ACTION'
--     WHEN 'r' THEN 'RESTRICT'
--     WHEN 'c' THEN 'CASCADE'
--     WHEN 'n' THEN 'SET NULL'
--     WHEN 'd' THEN 'SET DEFAULT'
--   END AS delete_action
-- FROM pg_constraint
-- WHERE conname LIKE '%trackpay_%_fkey'
--   AND contype = 'f'
-- ORDER BY table_name, conname;

-- Expected: All should show 'r' (RESTRICT)

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Changes:
-- 1. Fixed FK constraints: CASCADE → RESTRICT (prevents data loss)
-- 2. Removed DELETE policy on trackpay_relationships (forces RPC usage)
-- 3. Added audit logging table for deletion tracking
-- 4. Updated RPC to log all deletion attempts with reasons
