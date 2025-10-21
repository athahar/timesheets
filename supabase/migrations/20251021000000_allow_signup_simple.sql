-- Migration: Simplified RLS policy for user signup
-- Date: 2025-10-21
-- Allows any authenticated user to insert their profile during signup

-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "tp_users_insert_self" ON public.trackpay_users;

-- Temporarily allow ALL authenticated users to insert
-- (We'll tighten this later once we verify it works)
CREATE POLICY "tp_users_insert_self"
ON public.trackpay_users
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Verify RLS is enabled
ALTER TABLE public.trackpay_users ENABLE ROW LEVEL SECURITY;
