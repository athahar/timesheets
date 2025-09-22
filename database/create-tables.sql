-- TrackPay Database Tables - Execute this in Supabase SQL Editor
-- Copy and paste this entire script into your Supabase SQL Editor and click "Run"

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users table - holds both service providers and clients
CREATE TABLE IF NOT EXISTS trackpay_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT CHECK (role IN ('provider', 'client')) NOT NULL,
  hourly_rate NUMERIC(10,2), -- for providers, optional
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Client-Provider Relationships - one provider can have many clients
CREATE TABLE IF NOT EXISTS trackpay_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES trackpay_users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES trackpay_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, client_id)
);

-- 3. Sessions - tracks each work session
CREATE TABLE IF NOT EXISTS trackpay_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES trackpay_users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES trackpay_users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER, -- calculated in minutes
  hourly_rate NUMERIC(10,2) NOT NULL,
  amount_due NUMERIC(10,2), -- derived from duration * rate
  status TEXT CHECK (status IN ('active', 'unpaid', 'requested', 'paid')) DEFAULT 'unpaid',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Payment Requests - when providers request payment
CREATE TABLE IF NOT EXISTS trackpay_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES trackpay_sessions(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES trackpay_users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES trackpay_users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Payments - when clients pay providers
CREATE TABLE IF NOT EXISTS trackpay_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES trackpay_sessions(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES trackpay_users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES trackpay_users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  method TEXT CHECK (method IN ('cash', 'zelle', 'paypal', 'bank_transfer', 'other')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Activity items for feed
CREATE TABLE IF NOT EXISTS trackpay_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'session_start', 'session_end', 'payment_request', 'payment_completed'
  provider_id UUID REFERENCES trackpay_users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES trackpay_users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES trackpay_sessions(id) ON DELETE CASCADE,
  data JSONB, -- flexible data storage for activity details
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_provider_client ON trackpay_sessions(provider_id, client_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON trackpay_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON trackpay_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_session ON trackpay_payments(session_id);
CREATE INDEX IF NOT EXISTS idx_relationships_provider ON trackpay_relationships(provider_id);
CREATE INDEX IF NOT EXISTS idx_relationships_client ON trackpay_relationships(client_id);
CREATE INDEX IF NOT EXISTS idx_activities_provider_client ON trackpay_activities(provider_id, client_id);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_trackpay_users_updated_at ON trackpay_users;
CREATE TRIGGER update_trackpay_users_updated_at BEFORE UPDATE ON trackpay_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trackpay_sessions_updated_at ON trackpay_sessions;
CREATE TRIGGER update_trackpay_sessions_updated_at BEFORE UPDATE ON trackpay_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trackpay_requests_updated_at ON trackpay_requests;
CREATE TRIGGER update_trackpay_requests_updated_at BEFORE UPDATE ON trackpay_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Computed view for unpaid balances
CREATE OR REPLACE VIEW trackpay_unpaid_balances AS
SELECT
  s.client_id,
  s.provider_id,
  SUM(s.amount_due) - COALESCE(SUM(p.amount), 0) AS unpaid_balance,
  COUNT(CASE WHEN s.status = 'unpaid' THEN 1 END) AS unpaid_sessions_count,
  COUNT(CASE WHEN s.status = 'requested' THEN 1 END) AS requested_sessions_count,
  SUM(CASE WHEN s.status IN ('unpaid', 'requested') THEN s.duration_minutes ELSE 0 END) AS unpaid_minutes
FROM trackpay_sessions s
LEFT JOIN trackpay_payments p ON s.id = p.session_id
WHERE s.status != 'active' -- exclude active sessions
GROUP BY s.client_id, s.provider_id;

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE trackpay_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trackpay_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE trackpay_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trackpay_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE trackpay_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE trackpay_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (for future authentication implementation)
-- Note: These policies will be activated when we implement Supabase Auth

-- Policies for Users
DROP POLICY IF EXISTS "Users can view their own profile" ON trackpay_users;
CREATE POLICY "Users can view their own profile" ON trackpay_users
  FOR SELECT USING (true); -- Temporarily allow all access

DROP POLICY IF EXISTS "Users can update their own profile" ON trackpay_users;
CREATE POLICY "Users can update their own profile" ON trackpay_users
  FOR ALL USING (true); -- Temporarily allow all access

-- Policies for Relationships
DROP POLICY IF EXISTS "All can view relationships" ON trackpay_relationships;
CREATE POLICY "All can view relationships" ON trackpay_relationships
  FOR ALL USING (true); -- Temporarily allow all access

-- Policies for Sessions
DROP POLICY IF EXISTS "All can manage sessions" ON trackpay_sessions;
CREATE POLICY "All can manage sessions" ON trackpay_sessions
  FOR ALL USING (true); -- Temporarily allow all access

-- Policies for Payments
DROP POLICY IF EXISTS "All can manage payments" ON trackpay_payments;
CREATE POLICY "All can manage payments" ON trackpay_payments
  FOR ALL USING (true); -- Temporarily allow all access

-- Policies for Activities
DROP POLICY IF EXISTS "All can view activities" ON trackpay_activities;
CREATE POLICY "All can view activities" ON trackpay_activities
  FOR ALL USING (true); -- Temporarily allow all access

-- Policies for Requests
DROP POLICY IF EXISTS "All can manage requests" ON trackpay_requests;
CREATE POLICY "All can manage requests" ON trackpay_requests
  FOR ALL USING (true); -- Temporarily allow all access

-- Insert sample data for testing
DO $$
BEGIN
  -- Only insert if tables are empty
  IF NOT EXISTS (SELECT 1 FROM trackpay_users LIMIT 1) THEN
    -- Sample provider
    INSERT INTO trackpay_users (name, email, role, hourly_rate) VALUES
    ('Lucy Provider', 'lucy@trackpay.example', 'provider', 45.00);

    -- Sample clients
    INSERT INTO trackpay_users (name, email, role) VALUES
    ('Molly Johnson', 'molly@trackpay.example', 'client'),
    ('Sarah Davis', 'sarah@trackpay.example', 'client'),
    ('Mike Wilson', 'mike@trackpay.example', 'client'),
    ('Adda Smith', 'adda@trackpay.example', 'client');

    RAISE NOTICE 'Sample data inserted successfully!';
  ELSE
    RAISE NOTICE 'Sample data already exists, skipping insert.';
  END IF;
END $$;