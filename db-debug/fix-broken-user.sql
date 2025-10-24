-- Fix for broken user: ha@na.com
-- Issue: User registered but profile creation failed due to RLS
-- Auth ID: 287c404c-bac3-45c3-a199-da7b49f630c4
-- Unclaimed Client ID: a09df6d4-91d7-4ae3-bdfd-bff732523e34

-- ============================================================================
-- STEP 1: Fix RLS (apply fix-all-rls-prod.sql first!)
-- ============================================================================

-- Must be done first - see fix-all-rls-prod.sql

-- ============================================================================
-- STEP 2: Claim the unclaimed client record for this user
-- ============================================================================

-- Update the unclaimed client record with auth details
UPDATE trackpay_users
SET
  auth_user_id = '287c404c-bac3-45c3-a199-da7b49f630c4',
  email = 'ha@na.com',
  name = 'Hana',
  claimed_status = 'claimed',
  updated_at = NOW()
WHERE id = 'a09df6d4-91d7-4ae3-bdfd-bff732523e34';

-- Mark invite as claimed
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
  claimed_status
FROM trackpay_users
WHERE email = 'ha@na.com';

-- Expected: 1 record with role='client', auth_user_id set, claimed_status='claimed'

-- Check relationship
SELECT
  r.*,
  p.name as provider_name
FROM trackpay_relationships r
JOIN trackpay_users p ON r.provider_id = p.id
WHERE r.client_id = 'a09df6d4-91d7-4ae3-bdfd-bff732523e34';

-- Expected: 1 relationship with provider_id = b667b40b-3d91-4f77-b48f-d078a2a74947 (Magic int)

-- Check invite
SELECT
  invite_code,
  status,
  claimed_by
FROM trackpay_invites
WHERE invite_code = '9D7GCGYV';

-- Expected: status='claimed', claimed_by set
