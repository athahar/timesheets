-- Migration: Grant INSERT permission to authenticated users on trackpay_users
-- Date: 2025-10-21
-- Required for user signup to work

BEGIN;

-- Grant INSERT permission to authenticated role
GRANT INSERT ON public.trackpay_users TO authenticated;

-- Verify the grant worked
DO $$
BEGIN
  IF NOT has_table_privilege('authenticated', 'trackpay_users', 'INSERT') THEN
    RAISE EXCEPTION 'INSERT permission not granted to authenticated';
  END IF;

  RAISE NOTICE '✅ INSERT permission granted to authenticated users on trackpay_users';
END $$;

COMMIT;
