-- TrackPay Database Schema
-- This file contains the complete database schema for the TrackPay application
-- Execute these commands in your Supabase SQL editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users table - holds both service providers and clients
CREATE TABLE trackpay_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT CHECK (role IN ('provider', 'client')) NOT NULL,
  hourly_rate NUMERIC(10,2), -- for providers, optional
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Client-Provider Relationships - one provider can have many clients
CREATE TABLE trackpay_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES trackpay_users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES trackpay_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, client_id)
);

-- 3. Sessions - tracks each work session
CREATE TABLE trackpay_sessions (
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
CREATE TABLE trackpay_requests (
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
CREATE TABLE trackpay_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES trackpay_sessions(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES trackpay_users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES trackpay_users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  method TEXT CHECK (method IN ('cash', 'zelle', 'paypal', 'bank_transfer', 'other')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Activity items for feed (optional - can be derived from other tables)
CREATE TABLE trackpay_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'session_start', 'session_end', 'payment_request', 'payment_completed'
  provider_id UUID REFERENCES trackpay_users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES trackpay_users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES trackpay_sessions(id) ON DELETE CASCADE,
  data JSONB, -- flexible data storage for activity details
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Computed view for unpaid balances
CREATE VIEW trackpay_unpaid_balances AS
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

-- Indexes for performance
CREATE INDEX idx_sessions_provider_client ON trackpay_sessions(provider_id, client_id);
CREATE INDEX idx_sessions_status ON trackpay_sessions(status);
CREATE INDEX idx_sessions_created_at ON trackpay_sessions(created_at);
CREATE INDEX idx_payments_session ON trackpay_payments(session_id);
CREATE INDEX idx_relationships_provider ON trackpay_relationships(provider_id);
CREATE INDEX idx_relationships_client ON trackpay_relationships(client_id);
CREATE INDEX idx_activities_provider_client ON trackpay_activities(provider_id, client_id);

-- Row Level Security (RLS) Policies
ALTER TABLE trackpay_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trackpay_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE trackpay_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trackpay_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE trackpay_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE trackpay_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Users
CREATE POLICY "Users can view their own profile" ON trackpay_users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON trackpay_users
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for Relationships
CREATE POLICY "Providers can view their client relationships" ON trackpay_relationships
  FOR SELECT USING (auth.uid() = provider_id);

CREATE POLICY "Clients can view their provider relationships" ON trackpay_relationships
  FOR SELECT USING (auth.uid() = client_id);

-- RLS Policies for Sessions
CREATE POLICY "Providers can view/manage their sessions" ON trackpay_sessions
  FOR ALL USING (auth.uid() = provider_id);

CREATE POLICY "Clients can view sessions for them" ON trackpay_sessions
  FOR SELECT USING (auth.uid() = client_id);

-- RLS Policies for Payments
CREATE POLICY "Providers can view their payments" ON trackpay_payments
  FOR SELECT USING (auth.uid() = provider_id);

CREATE POLICY "Clients can view/create payments" ON trackpay_payments
  FOR ALL USING (auth.uid() = client_id);

-- RLS Policies for Activities
CREATE POLICY "Providers can view their activities" ON trackpay_activities
  FOR SELECT USING (auth.uid() = provider_id);

CREATE POLICY "Clients can view activities for them" ON trackpay_activities
  FOR SELECT USING (auth.uid() = client_id);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_trackpay_users_updated_at BEFORE UPDATE ON trackpay_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trackpay_sessions_updated_at BEFORE UPDATE ON trackpay_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trackpay_requests_updated_at BEFORE UPDATE ON trackpay_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data insertion (for testing)
-- Note: Replace these with actual user IDs from Supabase Auth after setting up authentication

/*
-- Sample provider
INSERT INTO trackpay_users (name, email, role, hourly_rate) VALUES
('Lucy Provider', 'lucy@example.com', 'provider', 45.00);

-- Sample clients
INSERT INTO trackpay_users (name, email, role) VALUES
('Molly Johnson', 'molly@example.com', 'client'),
('Sarah Davis', 'sarah@example.com', 'client'),
('Mike Wilson', 'mike@example.com', 'client');

-- Note: Relationships and sessions should be created through the application
-- after proper authentication is set up
*/