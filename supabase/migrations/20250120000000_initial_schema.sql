-- Initial TrackPay Schema
-- Created from existing staging database
-- 8 core tables for TrackPay time tracking and payment system

BEGIN;

-- =====================================================
-- TABLE: trackpay_users
-- Providers and clients with Supabase auth integration
-- =====================================================
CREATE TABLE IF NOT EXISTS trackpay_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE, -- Links to auth.users.id
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('provider', 'client')),
    name TEXT NOT NULL,
    phone TEXT,
    hourly_rate DECIMAL(10,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE: trackpay_relationships
-- Provider-client associations
-- =====================================================
CREATE TABLE IF NOT EXISTS trackpay_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES trackpay_users(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES trackpay_users(id) ON DELETE RESTRICT,
    hourly_rate DECIMAL(10,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(provider_id, client_id)
);

-- =====================================================
-- TABLE: trackpay_sessions
-- Work tracking sessions with duration in minutes
-- =====================================================
CREATE TABLE IF NOT EXISTS trackpay_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES trackpay_users(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES trackpay_users(id) ON DELETE RESTRICT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    hourly_rate DECIMAL(10,2) NOT NULL,
    amount_due DECIMAL(10,2),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unpaid', 'requested', 'paid')),
    notes TEXT,
    crew_size INTEGER DEFAULT 1,
    person_hours DECIMAL(10,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE: trackpay_payments
-- Payment records (financial data)
-- =====================================================
CREATE TABLE IF NOT EXISTS trackpay_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES trackpay_users(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES trackpay_users(id) ON DELETE RESTRICT,
    session_id UUID,
    session_ids UUID[] NOT NULL DEFAULT '{}',
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT,
    payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE: trackpay_requests
-- Payment request workflow
-- =====================================================
CREATE TABLE IF NOT EXISTS trackpay_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES trackpay_users(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES trackpay_users(id) ON DELETE RESTRICT,
    session_id UUID REFERENCES trackpay_sessions(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE: trackpay_activities
-- Activity feed/audit trail
-- =====================================================
CREATE TABLE IF NOT EXISTS trackpay_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES trackpay_users(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES trackpay_users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES trackpay_users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES trackpay_sessions(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE: trackpay_invites
-- Client invitation system
-- =====================================================
CREATE TABLE IF NOT EXISTS trackpay_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES trackpay_users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES trackpay_users(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT,
    hourly_rate DECIMAL(10,2),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired')),
    claimed_by UUID REFERENCES trackpay_users(id) ON DELETE SET NULL,
    claimed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLE: trackpay_relationship_audit
-- Relationship deletion audit
-- =====================================================
CREATE TABLE IF NOT EXISTS trackpay_relationship_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL,
    client_id UUID NOT NULL,
    action TEXT NOT NULL,
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE trackpay_users IS 'TrackPay users: providers and clients';
COMMENT ON TABLE trackpay_relationships IS 'Provider-client associations';
COMMENT ON TABLE trackpay_sessions IS 'Work tracking sessions';
COMMENT ON TABLE trackpay_payments IS 'Payment records';
COMMENT ON TABLE trackpay_requests IS 'Payment request workflow';
COMMENT ON TABLE trackpay_activities IS 'Activity feed and audit trail';
COMMENT ON TABLE trackpay_invites IS 'Client invitation system';
COMMENT ON TABLE trackpay_relationship_audit IS 'Audit log for deleted relationships';
