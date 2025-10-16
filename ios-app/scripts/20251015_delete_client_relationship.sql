-- TrackPay Delete Client Relationship Feature
-- Created: 2025-10-15
-- Purpose: Safely delete provider-client relationships with blocker checks

-- ============================================================================
-- 1. RPC Function: delete_client_relationship_safely
-- ============================================================================
-- Atomic DELETE with blocker guards to prevent race conditions (TOCTTOU)
-- Returns: boolean (true=deleted, false=already gone)
-- Blockers: active/unpaid/requested sessions, pending/sent/requested payment requests

CREATE OR REPLACE FUNCTION public.delete_client_relationship_safely(p_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_provider uuid := auth.uid();
  v_deleted  boolean := false;
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

  -- If deleted successfully, return true
  IF v_deleted THEN
    RETURN true;
  END IF;

  -- If not deleted, determine why for clearer error messages
  -- Check sessions first
  IF EXISTS (
    SELECT 1 FROM public.trackpay_sessions s
    WHERE s.provider_id = v_provider
      AND s.client_id = p_client_id
      AND s.status IN ('active', 'unpaid', 'requested')
  ) THEN
    RAISE EXCEPTION 'Cannot delete. Active or unpaid sessions exist.';
  END IF;

  -- Check payment requests
  IF EXISTS (
    SELECT 1 FROM public.trackpay_requests pr
    WHERE pr.provider_id = v_provider
      AND pr.client_id = p_client_id
      AND pr.status IN ('pending', 'sent', 'requested')
  ) THEN
    RAISE EXCEPTION 'Cannot delete. Outstanding payment requests exist.';
  END IF;

  -- No blockers found, relationship already deleted (idempotent)
  RETURN false;
END $$;

-- Security: Set search_path to prevent schema hijacking
ALTER FUNCTION public.delete_client_relationship_safely(uuid) SET search_path = public;

-- Ownership and permissions
ALTER FUNCTION public.delete_client_relationship_safely(uuid) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.delete_client_relationship_safely(uuid) TO authenticated;

-- ============================================================================
-- 2. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on trackpay_relationships if not already enabled
ALTER TABLE public.trackpay_relationships ENABLE ROW LEVEL SECURITY;

-- Policy 1: Providers can delete their own relationships
DROP POLICY IF EXISTS rel_delete_by_provider ON public.trackpay_relationships;
CREATE POLICY rel_delete_by_provider
ON public.trackpay_relationships
FOR DELETE
TO authenticated
USING (provider_id = auth.uid());

-- Policy 2: Users can view relationships they're part of
-- Prevents leaking relationship data to unauthorized users
DROP POLICY IF EXISTS rel_select_by_party ON public.trackpay_relationships;
CREATE POLICY rel_select_by_party
ON public.trackpay_relationships
FOR SELECT
TO authenticated
USING (provider_id = auth.uid() OR client_id = auth.uid());

-- ============================================================================
-- 3. Performance Indexes
-- ============================================================================

-- Index 1: Sessions blocker checks
-- Speeds up: EXISTS check on (provider_id, client_id, status)
CREATE INDEX IF NOT EXISTS idx_sessions_provider_client_status
  ON public.trackpay_sessions(provider_id, client_id, status);

-- Index 2: Payment requests blocker checks
-- Speeds up: EXISTS check on (provider_id, client_id, status)
CREATE INDEX IF NOT EXISTS idx_requests_provider_client_status
  ON public.trackpay_requests(provider_id, client_id, status);

-- Index 3: Unique relationship constraint
-- Prevents duplicate provider-client relationships
CREATE UNIQUE INDEX IF NOT EXISTS ux_relationships_provider_client
  ON public.trackpay_relationships(provider_id, client_id);

-- ============================================================================
-- 4. Foreign Key Constraints Verification
-- ============================================================================
-- Verify that FK constraints have ON DELETE RESTRICT to preserve data integrity
-- This ensures sessions and payment history remain intact when relationships are deleted

-- Note: Run these queries to verify constraints:
--
-- SELECT conname, confdeltype
-- FROM pg_constraint
-- WHERE conrelid = 'public.trackpay_sessions'::regclass
--   AND confrelid = 'public.trackpay_relationships'::regclass;
--
-- Expected: confdeltype = 'r' (RESTRICT)
-- If not, alter constraints:
-- ALTER TABLE public.trackpay_sessions
--   DROP CONSTRAINT IF EXISTS <constraint_name>,
--   ADD CONSTRAINT <constraint_name>
--   FOREIGN KEY (provider_id, client_id)
--   REFERENCES public.trackpay_relationships(provider_id, client_id)
--   ON DELETE RESTRICT;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- To apply: Run this SQL in Supabase SQL Editor
-- To test: Call function via RPC: SELECT delete_client_relationship_safely('<client_uuid>');
