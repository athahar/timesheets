-- Updated Invite Architecture
-- Modifies the system to use placeholder clients with invite codes

-- 1. Add claimed_status to trackpay_users table
ALTER TABLE trackpay_users
ADD COLUMN IF NOT EXISTS claimed_status VARCHAR(20) DEFAULT 'claimed'
CHECK (claimed_status IN ('claimed', 'unclaimed'));

-- Update existing users to be 'claimed'
UPDATE trackpay_users SET claimed_status = 'claimed' WHERE claimed_status IS NULL;

-- 2. Modify trackpay_invites table to reference specific client
ALTER TABLE trackpay_invites
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES trackpay_users(id) ON DELETE CASCADE;

-- Drop the client_name and hourly_rate columns (they're in the client record now)
ALTER TABLE trackpay_invites
DROP COLUMN IF EXISTS client_name,
DROP COLUMN IF EXISTS hourly_rate;

-- Make client_id required for new invites
-- (Run this after migrating existing data)
-- ALTER TABLE trackpay_invites ALTER COLUMN client_id SET NOT NULL;

-- 3. Update indexes
DROP INDEX IF EXISTS idx_trackpay_invites_client_id;
CREATE INDEX idx_trackpay_invites_client_id ON trackpay_invites(client_id);

-- 4. Update RLS policies
DROP POLICY IF EXISTS "Anyone can view pending invites by code" ON trackpay_invites;

-- Allow viewing pending invites by code (for claiming)
CREATE POLICY "Anyone can view pending invites by code" ON trackpay_invites
  FOR SELECT USING (
    status = 'pending' AND
    expires_at > NOW()
  );

-- 5. Add helpful view for providers to see all their clients with invite status
CREATE OR REPLACE VIEW provider_clients_with_status AS
SELECT
  u.id,
  u.name,
  u.email,
  u.hourly_rate,
  u.claimed_status,
  u.created_at,
  i.invite_code,
  i.status as invite_status,
  i.expires_at as invite_expires_at,
  i.claimed_at as invite_claimed_at,
  r.provider_id
FROM trackpay_users u
LEFT JOIN trackpay_invites i ON i.client_id = u.id
INNER JOIN trackpay_relationships r ON r.client_id = u.id
WHERE u.role = 'client';

-- Grant access to the view
GRANT SELECT ON provider_clients_with_status TO authenticated;

-- 6. Function to create client with invite in one transaction
CREATE OR REPLACE FUNCTION create_client_with_invite(
  p_provider_id UUID,
  p_client_name VARCHAR(255),
  p_hourly_rate DECIMAL(10,2),
  p_client_email VARCHAR(255) DEFAULT NULL
)
RETURNS TABLE(
  client_id UUID,
  invite_code VARCHAR(8),
  invite_id UUID
) AS $$
DECLARE
  v_client_id UUID;
  v_invite_id UUID;
  v_invite_code VARCHAR(8);
  v_attempts INT := 0;
  v_max_attempts INT := 10;
BEGIN
  -- Create the unclaimed client
  INSERT INTO trackpay_users (
    id, name, email, role, hourly_rate, claimed_status
  ) VALUES (
    gen_random_uuid(), p_client_name, p_client_email, 'client', p_hourly_rate, 'unclaimed'
  ) RETURNING id INTO v_client_id;

  -- Create the provider-client relationship
  INSERT INTO trackpay_relationships (provider_id, client_id)
  VALUES (p_provider_id, v_client_id);

  -- Generate unique invite code
  LOOP
    v_invite_code := generate_invite_code_sql();
    v_attempts := v_attempts + 1;

    BEGIN
      -- Try to insert the invite
      INSERT INTO trackpay_invites (
        id, provider_id, client_id, invite_code, status, expires_at
      ) VALUES (
        gen_random_uuid(), p_provider_id, v_client_id, v_invite_code,
        'pending', NOW() + INTERVAL '7 days'
      ) RETURNING id INTO v_invite_id;

      EXIT; -- Success, exit loop
    EXCEPTION
      WHEN unique_violation THEN
        IF v_attempts >= v_max_attempts THEN
          RAISE EXCEPTION 'Unable to generate unique invite code';
        END IF;
        -- Try again with new code
    END;
  END LOOP;

  RETURN QUERY SELECT v_client_id, v_invite_code, v_invite_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to generate invite code (SQL version)
CREATE OR REPLACE FUNCTION generate_invite_code_sql()
RETURNS VARCHAR(8) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ123456789';
  result VARCHAR(8) := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 8. Function to claim an invite and update client record
CREATE OR REPLACE FUNCTION claim_invite(
  p_invite_code VARCHAR(8),
  p_auth_user_id UUID,
  p_email VARCHAR(255) DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  client_id UUID,
  provider_id UUID,
  message TEXT
) AS $$
DECLARE
  v_invite RECORD;
  v_client_id UUID;
  v_provider_id UUID;
BEGIN
  -- Find the invite
  SELECT i.*, u.email as current_email
  INTO v_invite
  FROM trackpay_invites i
  JOIN trackpay_users u ON u.id = i.client_id
  WHERE i.invite_code = p_invite_code
    AND i.status = 'pending'
    AND i.expires_at > NOW();

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, 'Invalid or expired invite code'::TEXT;
    RETURN;
  END IF;

  v_client_id := v_invite.client_id;
  v_provider_id := v_invite.provider_id;

  -- Update the client record to claimed
  UPDATE trackpay_users
  SET
    auth_user_id = p_auth_user_id,
    claimed_status = 'claimed',
    email = COALESCE(p_email, v_invite.current_email)
  WHERE id = v_client_id;

  -- Mark invite as claimed
  UPDATE trackpay_invites
  SET
    status = 'claimed',
    claimed_by = v_client_id,
    claimed_at = NOW()
  WHERE id = v_invite.id;

  RETURN QUERY SELECT TRUE, v_client_id, v_provider_id, 'Invite successfully claimed'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON COLUMN trackpay_users.claimed_status IS 'Whether the client has claimed their account (unclaimed = placeholder)';
COMMENT ON FUNCTION create_client_with_invite IS 'Creates an unclaimed client record and generates an invite code atomically';
COMMENT ON FUNCTION claim_invite IS 'Claims an invite, updating the client record with auth credentials';