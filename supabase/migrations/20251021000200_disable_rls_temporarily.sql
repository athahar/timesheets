-- Migration: Temporarily disable RLS on trackpay_users for testing
-- Date: 2025-10-21
-- TEMPORARY - will re-enable after signup works

-- Disable RLS temporarily
ALTER TABLE public.trackpay_users DISABLE ROW LEVEL SECURITY;
