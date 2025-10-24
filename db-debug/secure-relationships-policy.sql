-- ============================================================================
-- Secure trackpay_relationships - Remove Overly Permissive Policy
-- ============================================================================
-- Issue: "All can view relationships" allows public access to all relationships
-- Solution: Remove it - the "rel_select_by_party" policy is sufficient
-- ============================================================================

-- ============================================================================
-- STEP 1: Remove the overly permissive policy
-- ============================================================================

DROP POLICY IF EXISTS "All can view relationships" ON trackpay_relationships;

-- ============================================================================
-- STEP 2: Verify remaining policies are secure
-- ============================================================================

-- Should now have only 1 policy:
SELECT
  policyname,
  cmd,
  roles,
  qual
FROM pg_policies
WHERE tablename = 'trackpay_relationships';

-- Expected: Only "rel_select_by_party" remains
-- - FOR SELECT (read-only)
-- - TO authenticated (must be logged in)
-- - USING checks provider_id = auth.uid() OR client_id = auth.uid()

-- ============================================================================
-- STEP 3: Test that invite flow still works
-- ============================================================================

-- The invite flow should still work because:
-- 1. Provider creates invite (authenticated as provider) ✅
-- 2. Provider creates relationship (authenticated as provider) ✅
-- 3. Client claims invite (authenticated after registration) ✅
-- 4. Client reads relationships (authenticated, uses rel_select_by_party) ✅

-- ============================================================================
-- NOTES
-- ============================================================================
-- Why this is safe to remove:
-- 1. Invite creation happens when provider is authenticated
-- 2. Relationship creation happens when provider is authenticated
-- 3. Client reads relationships after they're authenticated
-- 4. The "rel_select_by_party" policy properly restricts access
--
-- Why it was there:
-- - Copied from staging's overly permissive development setup
-- - Not actually needed for any production workflow
-- ============================================================================
