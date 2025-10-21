-- Add claimed_status column to trackpay_users table
-- This column tracks whether an invited client has claimed their account
-- Values: 'unclaimed' | 'claimed'

ALTER TABLE trackpay_users
ADD COLUMN IF NOT EXISTS claimed_status TEXT DEFAULT 'claimed';

-- Add check constraint for valid values
ALTER TABLE trackpay_users
ADD CONSTRAINT claimed_status_check
CHECK (claimed_status IN ('unclaimed', 'claimed'));

-- Set default to 'claimed' for existing users (they're already claimed)
UPDATE trackpay_users
SET claimed_status = 'claimed'
WHERE claimed_status IS NULL;

-- Comment for documentation
COMMENT ON COLUMN trackpay_users.claimed_status IS
'Tracks whether an invited client has claimed their account. Values: unclaimed, claimed';
