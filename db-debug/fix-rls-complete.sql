-- Complete RLS Policy Fix for Production
-- Issue: 406 Not Acceptable errors when authenticated users try to access tables
-- Root Cause: Missing RLS policies for authenticated users

-- ============================================================================
-- FIX 1: trackpay_invites - Allow authenticated users to read and claim invites
-- ============================================================================

-- Policy: Allow authenticated users to SELECT invites (for claiming)
CREATE POLICY IF NOT EXISTS "Allow authenticated users to read pending invites"
ON trackpay_invites
FOR SELECT
TO authenticated
USING (
  status = 'pending'
  AND expires_at > now()
);

-- Policy: Allow authenticated users to UPDATE invites (for claiming)
CREATE POLICY IF NOT EXISTS "Allow authenticated users to claim invites"
ON trackpay_invites
FOR UPDATE
TO authenticated
USING (
  status = 'pending'
  AND expires_at > now()
)
WITH CHECK (
  status IN ('claimed', 'expired')
);

-- ============================================================================
-- FIX 2: trackpay_users - Allow users to read and update their own record
-- ============================================================================

-- Policy: Allow authenticated users to SELECT their own user record
CREATE POLICY IF NOT EXISTS "Allow users to read their own record"
ON trackpay_users
FOR SELECT
TO authenticated
USING (
  auth_user_id = auth.uid()
);

-- Policy: Allow authenticated users to UPDATE their own profile
CREATE POLICY IF NOT EXISTS "Allow users to update their own record"
ON trackpay_users
FOR UPDATE
TO authenticated
USING (
  auth_user_id = auth.uid()
)
WITH CHECK (
  auth_user_id = auth.uid()
);

-- Policy: Allow INSERT for new user registration (unclaimed clients claiming invites)
CREATE POLICY IF NOT EXISTS "Allow users to claim unclaimed profiles"
ON trackpay_users
FOR UPDATE
TO authenticated
USING (
  claimed_status = 'unclaimed'
  AND auth_user_id IS NULL
)
WITH CHECK (
  auth_user_id = auth.uid()
  AND claimed_status = 'claimed'
);

-- ============================================================================
-- FIX 3: trackpay_relationships - Allow users to read their relationships
-- ============================================================================

CREATE POLICY IF NOT EXISTS "Allow users to read their provider relationships"
ON trackpay_relationships
FOR SELECT
TO authenticated
USING (
  provider_id IN (
    SELECT id FROM trackpay_users WHERE auth_user_id = auth.uid()
  )
);

CREATE POLICY IF NOT EXISTS "Allow users to read their client relationships"
ON trackpay_relationships
FOR SELECT
TO authenticated
USING (
  client_id IN (
    SELECT id FROM trackpay_users WHERE auth_user_id = auth.uid()
  )
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('trackpay_invites', 'trackpay_users', 'trackpay_relationships');

-- List all policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('trackpay_invites', 'trackpay_users', 'trackpay_relationships')
ORDER BY tablename, policyname;
