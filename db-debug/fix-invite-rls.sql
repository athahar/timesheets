-- Fix RLS policies for trackpay_invites to allow public invite validation
-- Issue: Invite codes exist but are blocked by RLS from anonymous users
-- Root Cause: Missing SELECT policy for anon role on trackpay_invites table

-- ============================================================================
-- SOLUTION: Add RLS policy for invite validation
-- ============================================================================

-- Policy: Allow anonymous users to SELECT pending invites by invite_code
-- This enables the invite validation flow without exposing all invite data
CREATE POLICY "Allow public invite code validation"
ON trackpay_invites
FOR SELECT
TO anon
USING (
  status = 'pending'
  AND expires_at > now()
);

-- Explanation:
-- - TO anon: Allows unauthenticated users (those using ANON_KEY)
-- - status = 'pending': Only show invites that haven't been claimed yet
-- - expires_at > now(): Only show non-expired invites
-- - This allows users to validate invite codes before registering/logging in
