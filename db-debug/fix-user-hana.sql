-- ============================================================================
-- Fix User: ha@na.com (Hana)
-- ============================================================================
-- Issue: User registered but profile creation failed
-- Auth ID: 287c404c-bac3-45c3-a199-da7b49f630c4
-- Unclaimed Client ID from invite: a09df6d4-91d7-4ae3-bdfd-bff732523e34
-- Invite Code: 9D7GCGYV
-- Provider: Magic int (b667b40b-3d91-4f77-b48f-d078a2a74947)
-- ============================================================================

-- ============================================================================
-- STEP 1: Claim the unclaimed client record
-- ============================================================================

UPDATE trackpay_users
SET
  auth_user_id = '287c404c-bac3-45c3-a199-da7b49f630c4',
  email = 'ha@na.com',
  name = 'Hana',
  claimed_status = 'claimed',
  updated_at = NOW()
WHERE id = 'a09df6d4-91d7-4ae3-bdfd-bff732523e34';

-- ============================================================================
-- STEP 2: Mark invite as claimed
-- ============================================================================

UPDATE trackpay_invites
SET
  status = 'claimed',
  claimed_by = 'a09df6d4-91d7-4ae3-bdfd-bff732523e34',
  claimed_at = NOW(),
  updated_at = NOW()
WHERE invite_code = '9D7GCGYV';

-- ============================================================================
-- STEP 3: Verify the fix
-- ============================================================================

-- Check user record
SELECT
  id,
  name,
  email,
  role,
  auth_user_id,
  claimed_status,
  created_at
FROM trackpay_users
WHERE email = 'ha@na.com';

-- Expected: 1 record
-- - role: 'client'
-- - auth_user_id: '287c404c-bac3-45c3-a199-da7b49f630c4'
-- - claimed_status: 'claimed'

-- Check relationship (should exist from invite creation)
SELECT
  r.id,
  r.provider_id,
  r.client_id,
  p.name as provider_name,
  c.name as client_name,
  r.created_at
FROM trackpay_relationships r
LEFT JOIN trackpay_users p ON r.provider_id = p.id
LEFT JOIN trackpay_users c ON r.client_id = c.id
WHERE r.client_id = 'a09df6d4-91d7-4ae3-bdfd-bff732523e34';

-- Expected: 1 relationship
-- - provider_name: 'Magic int'
-- - client_name: 'Hana'

-- Check invite status
SELECT
  invite_code,
  status,
  claimed_by,
  claimed_at,
  provider_id,
  client_id
FROM trackpay_invites
WHERE invite_code = '9D7GCGYV';

-- Expected:
-- - status: 'claimed'
-- - claimed_by: 'a09df6d4-91d7-4ae3-bdfd-bff732523e34'
-- - claimed_at: (current timestamp)

-- ============================================================================
-- SUCCESS!
-- ============================================================================
-- After this fix:
-- 1. User ha@na.com can sign in ✅
-- 2. Will see role='client' ✅
-- 3. Will see ServiceProviderList screen ✅
-- 4. "Magic int" will appear as their provider ✅
-- ============================================================================
