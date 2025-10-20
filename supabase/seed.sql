-- TrackPay Seed Data
-- Test accounts for local development and preview branches
-- This file is run automatically by `supabase db reset`

BEGIN;

-- =====================================================
-- TEST PROVIDER ACCOUNT
-- =====================================================
INSERT INTO trackpay_users (id, email, role, name, hourly_rate, created_at)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
  'test-provider@trackpay.test',
  'provider',
  'Test Provider (Lucy)',
  50.00,
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- TEST CLIENT ACCOUNTS
-- =====================================================
INSERT INTO trackpay_users (id, email, role, name, created_at)
VALUES
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid,
    'test-client-1@trackpay.test',
    'client',
    'Test Client (Kelly)',
    NOW()
  ),
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d481'::uuid,
    'test-client-2@trackpay.test',
    'client',
    'Test Client (Molly)',
    NOW()
  )
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- TEST RELATIONSHIPS
-- =====================================================
INSERT INTO trackpay_relationships (provider_id, client_id, hourly_rate, created_at)
VALUES
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'f47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid,
    50.00,
    NOW()
  ),
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'f47ac10b-58cc-4372-a567-0e02b2c3d481'::uuid,
    45.00,
    NOW()
  )
ON CONFLICT (provider_id, client_id) DO NOTHING;

-- =====================================================
-- TEST SESSIONS (Completed)
-- =====================================================
INSERT INTO trackpay_sessions (
  provider_id,
  client_id,
  start_time,
  end_time,
  duration_minutes,
  hourly_rate,
  amount_due,
  status,
  notes,
  crew_size,
  person_hours,
  created_at
)
VALUES
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'f47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days' + INTERVAL '2 hours',
    120,
    50.00,
    100.00,
    'unpaid',
    'Test session - lawn mowing',
    1,
    2.00,
    NOW() - INTERVAL '3 days'
  ),
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'f47ac10b-58cc-4372-a567-0e02b2c3d481'::uuid,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day' + INTERVAL '3 hours',
    180,
    45.00,
    135.00,
    'paid',
    'Test session - garden work',
    1,
    3.00,
    NOW() - INTERVAL '1 day'
  );

-- =====================================================
-- TEST ACTIVITIES
-- =====================================================
INSERT INTO trackpay_activities (
  user_id,
  provider_id,
  client_id,
  activity_type,
  description,
  created_at
)
VALUES
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'f47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid,
    'session_start',
    'Started work session',
    NOW() - INTERVAL '3 days'
  ),
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'f47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid,
    'session_end',
    'Completed work session - 2 hours',
    NOW() - INTERVAL '3 days' + INTERVAL '2 hours'
  ),
  (
    'f47ac10b-58cc-4372-a567-0e02b2c3d480'::uuid,
    'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid,
    'f47ac10b-58cc-4372-a567-0e02b2c3d481'::uuid,
    'payment_sent',
    'Marked session as paid',
    NOW() - INTERVAL '1 day' + INTERVAL '5 hours'
  );

COMMIT;

-- =====================================================
-- SEED DATA SUMMARY
-- =====================================================
DO $$
DECLARE
  user_count INT;
  relationship_count INT;
  session_count INT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM trackpay_users;
  SELECT COUNT(*) INTO relationship_count FROM trackpay_relationships;
  SELECT COUNT(*) INTO session_count FROM trackpay_sessions;

  RAISE NOTICE '';
  RAISE NOTICE '✅ TrackPay seed data loaded successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Database Summary:';
  RAISE NOTICE '   - Users: %', user_count;
  RAISE NOTICE '   - Relationships: %', relationship_count;
  RAISE NOTICE '   - Sessions: %', session_count;
  RAISE NOTICE '';
  RAISE NOTICE '👤 Test Accounts:';
  RAISE NOTICE '   Provider: test-provider@trackpay.test';
  RAISE NOTICE '   Client 1: test-client-1@trackpay.test';
  RAISE NOTICE '   Client 2: test-client-2@trackpay.test';
  RAISE NOTICE '';
END $$;
