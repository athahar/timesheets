-- Migration: Allow users to create their own profile during signup
-- Date: 2025-10-20

-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "tp_users_insert_self" ON public.trackpay_users;

-- Allow authenticated users to insert their own profile
CREATE POLICY "tp_users_insert_self"
ON public.trackpay_users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = auth_user_id);

-- Verify RLS is enabled
ALTER TABLE public.trackpay_users ENABLE ROW LEVEL SECURITY;
