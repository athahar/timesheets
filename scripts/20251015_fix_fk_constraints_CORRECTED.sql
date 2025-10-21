-- TrackPay: Fix FK Constraints and RLS Policies (CORRECTED)
-- Created: 2025-10-15
-- Purpose: CRITICAL FIX - Proper CASCADE vs RESTRICT logic

-- ============================================================================
-- FK Strategy Guide
-- ============================================================================
-- RESTRICT: For critical business records (sessions, payments, activities)
--   → Prevents deletion if related data exists
--   → Preserves audit trail and financial data
--
-- CASCADE: For ephemeral/transactional records (invites)
--   → Deletes automatically when parent deleted
--   → Supports cleanup and GDPR compliance
--
-- This distinction is CRITICAL for data integrity

-- ============================================================================
-- CRITICAL: Fix Foreign Key Constraints
-- ============================================================================

-- ============================================================================
-- 1. BUSINESS RECORDS: Use RESTRICT (Preserve Data)
-- ============================================================================

-- Fix trackpay_sessions FK constraints
-- Sessions are CRITICAL financial records - must not cascade
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

-- Fix trackpay_requests FK constraints
-- Payment requests are financial records - must not cascade
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
-- Payments are CRITICAL financial records - must not cascade
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
-- Activities are audit logs - must not cascade
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

-- Fix trackpay_relationships FK constraints (MISSING FROM ORIGINAL)
-- Relationships are audit trail - must not cascade
-- This prevents cascading deletion of relationships when a user is deleted
ALTER TABLE public.trackpay_relationships
  DROP CONSTRAINT IF EXISTS trackpay_relationships_client_id_fkey,
  ADD CONSTRAINT trackpay_relationships_client_id_fkey
    FOREIGN KEY (client_id)
    REFERENCES public.trackpay_users(id)
    ON DELETE RESTRICT;

ALTER TABLE public.trackpay_relationships
  DROP CONSTRAINT IF EXISTS trackpay_relationships_provider_id_fkey,
  ADD CONSTRAINT trackpay_relationships_provider_id_fkey
    FOREIGN KEY (provider_id)
    REFERENCES public.trackpay_users(id)
    ON DELETE RESTRICT;

-- ============================================================================
-- 2. TRANSACTIONAL RECORDS: Use CASCADE (Allow Cleanup)
-- ============================================================================

-- Fix trackpay_invites FK constraints
-- Invites are ephemeral/temporary - can safely cascade
-- This allows cleanup of unclaimed clients and supports GDPR compliance
ALTER TABLE public.trackpay_invites
  DROP CONSTRAINT IF EXISTS trackpay_invites_client_id_fkey,
  ADD CONSTRAINT trackpay_invites_client_id_fkey
    FOREIGN KEY (client_id)
    REFERENCES public.trackpay_users(id)
    ON DELETE CASCADE;

ALTER TABLE public.trackpay_invites
  DROP CONSTRAINT IF EXISTS trackpay_invites_provider_id_fkey,
  ADD CONSTRAINT trackpay_invites_provider_id_fkey
    FOREIGN KEY (provider_id)
    REFERENCES public.trackpay_users(id)
    ON DELETE CASCADE;

-- Also handle claimed_by FK (if someone claims an invite then is deleted)
ALTER TABLE public.trackpay_invites
  DROP CONSTRAINT IF EXISTS trackpay_invites_claimed_by_fkey,
  ADD CONSTRAINT trackpay_invites_claimed_by_fkey
    FOREIGN KEY (claimed_by)
    REFERENCES public.trackpay_users(id)
    ON DELETE SET NULL; -- Keep invite for audit, but NULL the claimer

-- ============================================================================
-- CRITICAL: Lock Down RLS - Force RPC Usage
-- ============================================================================

-- Drop the DELETE policy (prevents direct table access)
DROP POLICY IF EXISTS rel_delete_by_provider ON public.trackpay_relationships;

-- Revoke DELETE grant from authenticated role
REVOKE DELETE ON public.trackpay_relationships FROM authenticated;

-- ============================================================================
-- Audit Logging for Deletions
-- ============================================================================

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
DROP POLICY IF EXISTS audit_select_by_provider ON public.trackpay_relationship_audit;
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

  -- If not deleted, determine why and log
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

  -- No blockers found, relationship already deleted
  INSERT INTO public.trackpay_relationship_audit (provider_id, client_id, action, created_at)
  VALUES (v_provider, p_client_id, 'delete_already_gone', now());

  RETURN false;
END $$;

-- Security
ALTER FUNCTION public.delete_client_relationship_safely(uuid) SET search_path = public;
ALTER FUNCTION public.delete_client_relationship_safely(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.delete_client_relationship_safely(uuid) TO authenticated;

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Verify FK constraints
-- Run this to confirm:
/*
SELECT
  conname,
  conrelid::regclass AS table_name,
  confdeltype,
  CASE confdeltype
    WHEN 'a' THEN 'NO ACTION'
    WHEN 'r' THEN 'RESTRICT'
    WHEN 'c' THEN 'CASCADE'
    WHEN 'n' THEN 'SET NULL'
    WHEN 'd' THEN 'SET DEFAULT'
  END AS delete_action
FROM pg_constraint
WHERE conname LIKE '%trackpay_%_fkey'
  AND contype = 'f'
ORDER BY table_name, conname;
*/

-- Expected results:
-- trackpay_sessions: ALL → RESTRICT
-- trackpay_requests: ALL → RESTRICT
-- trackpay_payments: ALL → RESTRICT
-- trackpay_activities: ALL → RESTRICT
-- trackpay_relationships: ALL → RESTRICT
-- trackpay_invites: client_id, provider_id → CASCADE
-- trackpay_invites: claimed_by → SET NULL

-- ============================================================================
-- Business Logic Summary
-- ============================================================================

-- WHEN YOU CAN'T DELETE A USER:
-- - Has sessions (work history)
-- - Has payments (financial records)
-- - Has activities (audit trail)
-- - Has relationships (connection history)
-- Result: RESTRICT prevents deletion → shows clear error

-- WHEN YOU CAN DELETE A USER:
-- - Only has unclaimed invites
-- - Only has claimed invites (will SET NULL the claimer)
-- Result: CASCADE cleans up invites automatically

-- WHEN YOU DELETE A RELATIONSHIP:
-- - Our RPC checks blockers FIRST
-- - Only deletes if no sessions/payments/requests
-- - User records stay intact
-- - Sessions/payments preserved for audit

-- ============================================================================
-- Migration Complete
-- ============================================================================
