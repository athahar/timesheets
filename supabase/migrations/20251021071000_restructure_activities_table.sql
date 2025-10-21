-- Production Fix: Restructure trackpay_activities to match staging schema
-- Issue: Activity feed code expects new schema (data/type) but production has old schema
-- Root Cause: Manual schema changes in staging never captured as migration
--
-- This migration restructures the activities table from the verbose format
-- (activity_type, description, metadata, user_id) to the streamlined format
-- (type, data) where all activity information is stored as JSONB.

-- Drop old foreign key constraint on user_id (being removed)
ALTER TABLE trackpay_activities DROP CONSTRAINT IF EXISTS trackpay_activities_user_id_fkey;

-- Drop old columns that are being consolidated into 'data' JSONB
ALTER TABLE trackpay_activities DROP COLUMN IF EXISTS activity_type;
ALTER TABLE trackpay_activities DROP COLUMN IF EXISTS description;
ALTER TABLE trackpay_activities DROP COLUMN IF EXISTS metadata;
ALTER TABLE trackpay_activities DROP COLUMN IF EXISTS user_id;

-- Add new streamlined columns
ALTER TABLE trackpay_activities ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE trackpay_activities ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'unknown';

-- Make created_at nullable to match staging
ALTER TABLE trackpay_activities ALTER COLUMN created_at DROP NOT NULL;

-- Add comment explaining the new structure
COMMENT ON TABLE trackpay_activities IS
'Activity feed/audit trail for TrackPay. Uses simplified structure where all activity
details are stored in the data JSONB column, and type indicates the activity category.';

COMMENT ON COLUMN trackpay_activities.type IS
'Activity type: session_started, session_completed, payment_requested, payment_sent, etc.';

COMMENT ON COLUMN trackpay_activities.data IS
'Activity details stored as JSONB. Structure varies by activity type but typically includes
actor info, target info, amounts, timestamps, and other relevant metadata.';
