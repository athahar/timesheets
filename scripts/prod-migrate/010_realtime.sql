-- 010_realtime.sql
-- Enable Supabase Realtime for all TrackPay tables
-- This allows real-time subscriptions in the app for live updates

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- Add all TrackPay tables to the supabase_realtime publication
-- This enables real-time subscriptions for providers and clients
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.trackpay_users,
  public.trackpay_relationships,
  public.trackpay_sessions,
  public.trackpay_requests,
  public.trackpay_payments,
  public.trackpay_activities,
  public.trackpay_invites,
  public.trackpay_relationship_audit;

COMMIT;

-- Verification
DO $$
DECLARE
  realtime_tables text[];
BEGIN
  SELECT ARRAY_AGG(tablename::text)
  INTO realtime_tables
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
    AND tablename LIKE 'trackpay_%';

  IF NOT (realtime_tables @> ARRAY['trackpay_users', 'trackpay_relationships',
          'trackpay_sessions', 'trackpay_requests', 'trackpay_payments',
          'trackpay_activities', 'trackpay_invites', 'trackpay_relationship_audit']) THEN
    RAISE EXCEPTION 'Not all TrackPay tables added to realtime publication';
  END IF;

  RAISE NOTICE '✅ Realtime publication configured for 8 TrackPay tables';
END $$;
