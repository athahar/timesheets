-- ============================================================================
-- AGGRESSIVE CLEANUP - Force Fix the Remaining Issues
-- ============================================================================
-- The previous DROP commands didn't work because of special characters
-- Let's try a different approach
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop ALL trackpay_users policies and recreate from scratch
-- ============================================================================

-- Drop ALL existing policies on trackpay_users
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'trackpay_users') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON trackpay_users', r.policyname);
    END LOOP;
END $$;

-- Now create exactly 3 clean policies
CREATE POLICY "Users can insert their own profile"
ON trackpay_users
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Users can view their own profile"
ON trackpay_users
FOR SELECT
TO public
USING (true);

CREATE POLICY "Users can update their own profile"
ON trackpay_users
FOR ALL
TO public
USING (true);

-- ============================================================================
-- STEP 2: Fix trackpay_relationships - add missing policy
-- ============================================================================

-- Try dropping first in case it exists
DROP POLICY IF EXISTS "rel_select_by_party" ON trackpay_relationships;

-- Create the policy
CREATE POLICY "rel_select_by_party"
ON trackpay_relationships
FOR SELECT
TO authenticated
USING (
  provider_id = auth.uid() OR client_id = auth.uid()
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Count policies
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename LIKE 'trackpay_%'
GROUP BY tablename
ORDER BY tablename;

-- List all trackpay_users policies (should be exactly 3)
SELECT
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'trackpay_users'
ORDER BY policyname;

-- List all trackpay_relationships policies (should be exactly 2)
SELECT
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'trackpay_relationships'
ORDER BY policyname;
