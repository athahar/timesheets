-- 015_rls_helper.sql
-- Create helper function to map auth.uid() → trackpay_users.id
-- This is CRITICAL for RLS policies to work correctly
--
-- Auth pattern:
--   auth.users.id (Supabase auth UUID)
--     ↓ linked via
--   trackpay_users.auth_user_id
--     ↓ our internal ID
--   trackpay_users.id (used in ALL foreign keys)

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- Add unique constraint on auth_user_id to prevent ghost user bugs
-- Each Supabase auth user can only map to ONE trackpay_users row
CREATE UNIQUE INDEX IF NOT EXISTS ux_trackpay_users_auth_user
  ON public.trackpay_users(auth_user_id);

-- Helper function to get the current user's trackpay_users.id
-- Returns NULL if user is not authenticated or doesn't have a trackpay_users record
CREATE OR REPLACE FUNCTION public.current_trackpay_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id
  FROM public.trackpay_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1
$$;

-- Security: Lock down search_path to prevent injection attacks
ALTER FUNCTION public.current_trackpay_user_id()
  SET search_path = public;

-- Grant execute to authenticated users (required for RLS policies)
GRANT EXECUTE ON FUNCTION public.current_trackpay_user_id() TO authenticated;

COMMIT;

-- Verification
DO $$
DECLARE
  func_exists boolean;
  index_exists boolean;
BEGIN
  -- Check function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'current_trackpay_user_id'
  ) INTO func_exists;

  IF NOT func_exists THEN
    RAISE EXCEPTION 'current_trackpay_user_id() function not created';
  END IF;

  -- Check unique index exists
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'ux_trackpay_users_auth_user'
  ) INTO index_exists;

  IF NOT index_exists THEN
    RAISE EXCEPTION 'Unique index on auth_user_id not created';
  END IF;

  RAISE NOTICE '✅ RLS helper function and auth_user_id unique index created';
END $$;
