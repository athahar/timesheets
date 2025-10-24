-- Migration: Add has_seen_welcome field to trackpay_users
-- Date: 2025-10-23
-- Purpose: Track whether client has seen the welcome modal after first login

-- Add has_seen_welcome column to trackpay_users table
ALTER TABLE public.trackpay_users
ADD COLUMN IF NOT EXISTS has_seen_welcome BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing users (all should be false by default)
UPDATE public.trackpay_users
SET has_seen_welcome = false
WHERE has_seen_welcome IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.trackpay_users.has_seen_welcome IS
'Tracks whether the user has seen the welcome modal after claiming an invite. Used to show confetti modal only on first-time login.';
