-- Production Fix: Align trackpay_invites schema with staging
-- Issue: Invite creation failing with "null value in column client_name violates not-null constraint"
-- Root Cause: Production has client_name NOT NULL, staging dropped this column
--
-- This migration removes redundant columns from trackpay_invites that are already
-- available via the client_id foreign key relationship to trackpay_users.

-- Drop redundant columns that duplicate data from trackpay_users
-- These can all be retrieved via JOIN on client_id
ALTER TABLE trackpay_invites DROP COLUMN IF EXISTS client_name;
ALTER TABLE trackpay_invites DROP COLUMN IF EXISTS client_email;
ALTER TABLE trackpay_invites DROP COLUMN IF EXISTS hourly_rate;

-- Make client_id NOT NULL since invites must be tied to a specific client
-- (This matches the staging schema where invites are created for specific clients)
ALTER TABLE trackpay_invites ALTER COLUMN client_id SET NOT NULL;

-- Add comment explaining the schema design
COMMENT ON TABLE trackpay_invites IS
'Client invitation system. Each invite is tied to a specific unclaimed client record.
Client details (name, email, hourly_rate) are stored in trackpay_users and accessed via client_id foreign key.';

COMMENT ON COLUMN trackpay_invites.client_id IS
'Required reference to the unclaimed client record in trackpay_users. When the invite is claimed, this client record is updated with auth_user_id and claimed_status = claimed.';
