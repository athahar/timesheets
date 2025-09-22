-- TrackPay Invites Table Schema
-- Creates the trackpay_invites table for universal client invitation system
-- Run this in your Supabase SQL Editor

CREATE TABLE trackpay_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES trackpay_users(id) ON DELETE CASCADE,
  invite_code VARCHAR(8) UNIQUE NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  hourly_rate DECIMAL(10,2) NOT NULL CHECK (hourly_rate >= 0),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired')),
  claimed_by UUID REFERENCES trackpay_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT valid_claimed_status CHECK (
    (status = 'claimed' AND claimed_by IS NOT NULL AND claimed_at IS NOT NULL) OR
    (status != 'claimed' AND claimed_by IS NULL AND claimed_at IS NULL)
  ),
  CONSTRAINT expires_after_creation CHECK (expires_at > created_at)
);

-- Indexes for performance
CREATE INDEX idx_trackpay_invites_provider_id ON trackpay_invites(provider_id);
CREATE INDEX idx_trackpay_invites_invite_code ON trackpay_invites(invite_code);
CREATE INDEX idx_trackpay_invites_status ON trackpay_invites(status);
CREATE INDEX idx_trackpay_invites_expires_at ON trackpay_invites(expires_at);

-- Row Level Security (RLS)
ALTER TABLE trackpay_invites ENABLE ROW LEVEL SECURITY;

-- Providers can see and manage their own invites
CREATE POLICY "Providers can manage their own invites" ON trackpay_invites
  FOR ALL USING (
    provider_id IN (
      SELECT id FROM trackpay_users
      WHERE auth_user_id = auth.uid() AND role = 'provider'
    )
  );

-- Anyone can view pending invites by code (for claiming)
CREATE POLICY "Anyone can view pending invites by code" ON trackpay_invites
  FOR SELECT USING (status = 'pending' AND expires_at > NOW());

-- Clients can see invites they have claimed
CREATE POLICY "Clients can see their claimed invites" ON trackpay_invites
  FOR SELECT USING (
    claimed_by IN (
      SELECT id FROM trackpay_users
      WHERE auth_user_id = auth.uid() AND role = 'client'
    )
  );

-- Function to automatically expire old invites
CREATE OR REPLACE FUNCTION expire_old_invites()
RETURNS void AS $$
BEGIN
  UPDATE trackpay_invites
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule function to run periodically (optional - can be called manually)
-- Note: Supabase doesn't support pg_cron by default, so this would need to be called from the app
COMMENT ON FUNCTION expire_old_invites() IS 'Call this function periodically to expire old invites';

-- Seed comment for documentation
COMMENT ON TABLE trackpay_invites IS 'Universal client invitation system for TrackPay - stores shareable invite codes';
COMMENT ON COLUMN trackpay_invites.invite_code IS '8-character unique code for sharing (e.g. ABC12XYZ)';
COMMENT ON COLUMN trackpay_invites.status IS 'pending: not claimed yet, claimed: client joined, expired: no longer valid';
COMMENT ON COLUMN trackpay_invites.expires_at IS 'Invite expires after 7 days by default';