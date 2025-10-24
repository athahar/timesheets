-- Fix Production RLS for trackpay_invites
-- Issue: Authenticated users can't read pending invites to claim them
-- Root Cause: tp_invites_select_party policy only allows viewing YOUR OWN invites
--             But new users need to read invites BEFORE they become "theirs"

-- ============================================================================
-- FIX: Add policy for authenticated users to read pending invites
-- ============================================================================

-- This mirrors the anon policy but for authenticated users
-- Allows users to SELECT pending invites by code (needed for claiming flow)
CREATE POLICY "Allow authenticated to read pending invites"
ON trackpay_invites
FOR SELECT
TO authenticated
USING (
  status = 'pending'
  AND expires_at > now()
);

-- Also add UPDATE policy for claiming invites
CREATE POLICY "Allow authenticated to claim invites"
ON trackpay_invites
FOR UPDATE
TO authenticated
USING (
  status = 'pending'
  AND expires_at > now()
)
WITH CHECK (
  status IN ('claimed', 'expired')
  OR (status = 'pending' AND expires_at > now()) -- Allow updating other fields
);

-- ============================================================================
-- VERIFICATION: Test with authenticated user
-- ============================================================================

-- After applying, test in your app:
-- 1. Register new user
-- 2. Try to claim invite code W5MQPA9B
-- 3. Should succeed!

-- To verify policies are applied:
SELECT
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'trackpay_invites'
ORDER BY policyname;
