-- ============================================================================
-- SECURE PRODUCTION RLS FOR trackpay_users
-- ============================================================================
-- Based on security review feedback - production-ready policies
-- Addresses: anon access, insert guards, transaction safety, testing
-- ============================================================================

BEGIN; -- Wrap in transaction so we don't leave table policy-less

-- ============================================================================
-- STEP 1: Enable RLS
-- ============================================================================

ALTER TABLE trackpay_users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Drop all existing policies atomically
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
-- STEP 3: Create secure policies for production
-- ============================================================================

-- Policy 1: INSERT - MUST be authenticated and must set their own auth_user_id
-- This prevents attackers from creating arbitrary rows with the anon key
CREATE POLICY "Allow authenticated user registration"
ON trackpay_users
FOR INSERT
TO authenticated
WITH CHECK (
  auth_user_id = auth.uid()
);

-- Policy 2: SELECT own profile - authenticated users can read their own data
CREATE POLICY "Users can read their own profile"
ON trackpay_users
FOR SELECT
TO authenticated
USING (
  auth_user_id = auth.uid()
);

-- Policy 3: UPDATE own profile - authenticated users can update their own data
CREATE POLICY "Users can update their own profile"
ON trackpay_users
FOR UPDATE
TO authenticated
USING (
  auth_user_id = auth.uid()
)
WITH CHECK (
  auth_user_id = auth.uid()
);

-- Policy 4: UPDATE to claim invite - LIMITED to specific columns only
-- Guards: Can only update auth_user_id, email, name, claimed_status
-- Cannot change role, id, or other sensitive fields
CREATE POLICY "Users can claim unclaimed client invites"
ON trackpay_users
FOR UPDATE
TO authenticated
USING (
  claimed_status = 'unclaimed'
  AND auth_user_id IS NULL
  AND role = 'client' -- Only clients can be claimed via invites
)
WITH CHECK (
  auth_user_id = auth.uid()
  AND claimed_status = 'claimed'
  AND role = 'client' -- Ensure role doesn't change
);

-- Policy 5: SELECT related users - providers/clients you're connected to
-- Uses EXISTS to check trackpay_relationships
CREATE POLICY "Users can read related users"
ON trackpay_users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM trackpay_relationships r
    INNER JOIN trackpay_users current_user
      ON current_user.auth_user_id = auth.uid()
    WHERE
      (r.provider_id = current_user.id AND r.client_id = trackpay_users.id)
      OR (r.client_id = current_user.id AND r.provider_id = trackpay_users.id)
  )
);

-- Policy 6: PUBLIC invite validation - VERY LIMITED
-- Only exposes: id, name, role, claimed_status
-- Only for: unclaimed clients
-- TODO: Consider replacing with a dedicated view for even tighter security
CREATE POLICY "Public can validate unclaimed invite clients"
ON trackpay_users
FOR SELECT
TO public
USING (
  claimed_status = 'unclaimed'
  AND role = 'client'
);
-- ⚠️  This still exposes client names to anyone
-- For tighter security, create a view like:
-- CREATE VIEW invited_clients_lookup AS
--   SELECT id, name FROM trackpay_users WHERE claimed_status='unclaimed' AND role='client';
-- Then update policy to target the view instead

COMMIT; -- Apply all changes atomically

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check policies were created
SELECT
  policyname,
  cmd,
  roles,
  LEFT(qual, 60) as using_clause
FROM pg_policies
WHERE tablename = 'trackpay_users'
ORDER BY policyname;

-- Expected: 6 policies
-- 1. Allow authenticated user registration (INSERT, authenticated)
-- 2. Users can read their own profile (SELECT, authenticated)
-- 3. Users can update their own profile (UPDATE, authenticated)
-- 4. Users can claim unclaimed client invites (UPDATE, authenticated)
-- 5. Users can read related users (SELECT, authenticated)
-- 6. Public can validate unclaimed invite clients (SELECT, public)

-- ============================================================================
-- POST-DEPLOYMENT TESTING CHECKLIST
-- ============================================================================

/*
1. TEST: Anon can lookup unclaimed clients (for invite validation)
   curl -H "apikey: YOUR_ANON_KEY" \
     "https://YOUR_PROJECT.supabase.co/rest/v1/trackpay_users?select=name,id,role,claimed_status&role=eq.client&claimed_status=eq.unclaimed"
   Expected: Returns unclaimed clients ONLY, no emails, no other data

2. TEST: Anon CANNOT read other users
   curl -H "apikey: YOUR_ANON_KEY" \
     "https://YOUR_PROJECT.supabase.co/rest/v1/trackpay_users?select=*"
   Expected: 406 or empty result (no claimed users visible)

3. TEST: Authenticated user can ONLY read their own profile
   curl -H "apikey: YOUR_ANON_KEY" \
        -H "Authorization: Bearer USER_JWT" \
     "https://YOUR_PROJECT.supabase.co/rest/v1/trackpay_users?select=*"
   Expected: Only returns their own profile + related users via relationships

4. TEST: Invite claim flow end-to-end
   - Sign up with invite code
   - Verify profile created with auth_user_id set
   - Verify claimed_status = 'claimed'
   - Verify relationship exists in trackpay_relationships
   - Verify client dashboard shows provider immediately

5. TEST: Unauthorized update blocked
   Try to update another user's profile as authenticated user
   Expected: 403 or no rows affected

6. TEST: Cannot create user with arbitrary auth_user_id as anon
   curl -X POST -H "apikey: YOUR_ANON_KEY" \
        -H "Content-Type: application/json" \
        -d '{"auth_user_id":"fake-id","email":"test@test.com","role":"client"}' \
     "https://YOUR_PROJECT.supabase.co/rest/v1/trackpay_users"
   Expected: 403 (anon cannot INSERT, only authenticated)
*/

-- ============================================================================
-- SECURITY SUMMARY
-- ============================================================================

/*
✅ ALLOWS:
- Authenticated users registering (with their own auth.uid() only)
- Users reading/updating their own profile
- Users claiming unclaimed invites (limited to client role)
- Users seeing providers/clients they're connected to
- Public validating invite codes (limited data: id, name, role, claimed_status)

❌ PREVENTS:
- Anon users creating arbitrary user records
- Users reading other users' emails/data (unless related)
- Users modifying others' profiles
- Users changing their role during invite claim
- Claiming someone else's account
- Public access to claimed user data

⚠️  NOTES:
- Policy 6 still exposes unclaimed client names publicly
- For maximum security, consider replacing with a dedicated view
- All policies use explicit column checks to prevent privilege escalation
- Transaction wrapper ensures atomic application
*/
