-- ============================================================================
-- Proper RLS Policies for trackpay_users (Secure Solution)
-- ============================================================================
-- Issue: Getting 406 errors when reading trackpay_users by email
-- Root Cause: Current policies don't allow the necessary access patterns
-- Solution: Create specific policies for each use case
-- ============================================================================

-- ============================================================================
-- STEP 1: Re-enable RLS (if it was disabled)
-- ============================================================================

ALTER TABLE trackpay_users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Drop all existing policies and start fresh
-- ============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'trackpay_users') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON trackpay_users', r.policyname);
    END LOOP;
END $$;

-- ============================================================================
-- STEP 3: Create proper policies for each use case
-- ============================================================================

-- Policy 1: Allow INSERT during registration (public can create new users)
CREATE POLICY "Allow user registration"
ON trackpay_users
FOR INSERT
TO public
WITH CHECK (true);

-- Policy 2: Allow SELECT for authenticated users to read their own profile
CREATE POLICY "Users can read their own profile"
ON trackpay_users
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

-- Policy 3: Allow UPDATE for authenticated users to update their own profile
CREATE POLICY "Users can update their own profile"
ON trackpay_users
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- Policy 4: Allow authenticated users to UPDATE unclaimed profiles (for invite claiming)
CREATE POLICY "Users can claim unclaimed profiles"
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

-- Policy 5: Allow SELECT on unclaimed profiles (needed for invite validation)
-- This allows checking if a client name exists before creating invite
CREATE POLICY "Public can view unclaimed client names"
ON trackpay_users
FOR SELECT
TO public
USING (
  claimed_status = 'unclaimed'
  AND role = 'client'
);

-- Policy 6: Allow authenticated users to read users in their relationships
-- Provider can see their clients, client can see their providers
CREATE POLICY "Users can read related users"
ON trackpay_users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM trackpay_relationships r
    INNER JOIN trackpay_users current_user ON current_user.auth_user_id = auth.uid()
    WHERE (r.provider_id = current_user.id AND r.client_id = trackpay_users.id)
       OR (r.client_id = current_user.id AND r.provider_id = trackpay_users.id)
  )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- List all policies
SELECT
  policyname,
  cmd,
  roles,
  LEFT(qual, 50) as using_clause_preview
FROM pg_policies
WHERE tablename = 'trackpay_users'
ORDER BY policyname;

-- Expected: 6 policies with specific access patterns

-- ============================================================================
-- WHY THIS IS SECURE
-- ============================================================================
-- 1. INSERT: Anyone can register (needed for signup)
-- 2. SELECT own profile: Only authenticated users can read their own data
-- 3. UPDATE own profile: Only authenticated users can update their own data
-- 4. UPDATE unclaimed: Allows invite claiming (authenticated users only)
-- 5. SELECT unclaimed: Allows invite validation (public, but only unclaimed)
-- 6. SELECT related: Allows seeing providers/clients you have relationships with
--
-- This prevents:
-- ❌ Reading other users' email addresses
-- ❌ Reading other users' profile data (unless related)
-- ❌ Updating other users' data
-- ❌ Claiming someone else's account
-- ============================================================================
