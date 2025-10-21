-- Emergency Production Fix: Make email nullable for unclaimed clients
-- Issue: Production cannot create clients without email, causing app crashes
-- Root Cause: Schema drift - staging has email nullable, production has NOT NULL
--
-- This migration brings production in line with staging's actual schema
-- which the app was developed and tested against.

-- Remove NOT NULL constraint from email column
-- This allows creating "unclaimed" client placeholders without email addresses
ALTER TABLE trackpay_users
ALTER COLUMN email DROP NOT NULL;

-- Drop the existing unique constraint on email
-- (The old constraint doesn't allow multiple NULL values)
ALTER TABLE trackpay_users DROP CONSTRAINT IF EXISTS trackpay_users_email_key;

-- Create a partial unique index that only applies to non-NULL emails
-- This allows multiple unclaimed clients (with NULL email) while ensuring
-- claimed clients have unique email addresses
CREATE UNIQUE INDEX IF NOT EXISTS trackpay_users_email_unique
ON trackpay_users (email)
WHERE email IS NOT NULL;

-- Add comment explaining the new behavior
COMMENT ON COLUMN trackpay_users.email IS
'User email address. Nullable for unclaimed/invited clients who have not registered yet. Unique constraint applies only to non-null values (claimed accounts).';
