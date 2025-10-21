-- Emergency Fix: Disable RLS on trackpay_activities
-- Issue: Activity inserts failing with "new row violates row-level security policy"
-- Root Cause: Table has RLS enabled but no policies after restructure
--
-- Temporary solution: Disable RLS to unblock activity feed
-- TODO: Implement proper RLS policies when auth is fully configured

ALTER TABLE trackpay_activities DISABLE ROW LEVEL SECURITY;

-- Add comment explaining the temporary state
COMMENT ON TABLE trackpay_activities IS
'Activity feed/audit trail for TrackPay. Uses JSONB structure for flexible activity logging.
RLS temporarily disabled - will be re-enabled when proper auth policies are implemented.';
