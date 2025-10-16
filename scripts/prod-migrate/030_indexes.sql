-- 030_indexes.sql
-- Create performance indexes based on actual query patterns in the app
-- These indexes support the most common queries:
--   - Blocker checks during client deletion
--   - Client history screens
--   - Activity feed
--   - Relationship audit logs
--   - Invite management

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- ============================================================================
-- BLOCKER CHECK INDEXES
-- Used by delete_client_relationship_safely() RPC to check for unpaid work
-- ============================================================================

-- Sessions blocker check: find active/unpaid sessions for provider-client pair
CREATE INDEX IF NOT EXISTS idx_sessions_provider_client_status
  ON public.trackpay_sessions(provider_id, client_id, status);

-- Requests blocker check: find pending payment requests for provider-client pair
CREATE INDEX IF NOT EXISTS idx_requests_provider_client_status
  ON public.trackpay_requests(provider_id, client_id, status);

-- ============================================================================
-- HISTORY/TIMELINE SCREENS
-- Used by client history views and provider session lists
-- ============================================================================

-- Client history: show all sessions for a client, newest first
-- Used in ClientHistoryScreen and ServiceProviderListScreen
CREATE INDEX IF NOT EXISTS idx_sessions_client_created
  ON public.trackpay_sessions(client_id, start_time DESC);

-- Provider session list: show all sessions for a provider, newest first
-- Used in HistoryScreen
CREATE INDEX IF NOT EXISTS idx_sessions_provider_created
  ON public.trackpay_sessions(provider_id, start_time DESC);

-- ============================================================================
-- ACTIVITY FEED
-- Used by ActivityFeedScreen to show recent actions
-- ============================================================================

-- Activity feed: show all activities, newest first
CREATE INDEX IF NOT EXISTS idx_activities_created
  ON public.trackpay_activities(created_at DESC);

-- Activity feed filtered by provider
CREATE INDEX IF NOT EXISTS idx_activities_provider_created
  ON public.trackpay_activities(provider_id, created_at DESC);

-- Activity feed filtered by client
CREATE INDEX IF NOT EXISTS idx_activities_client_created
  ON public.trackpay_activities(client_id, created_at DESC);

-- ============================================================================
-- RELATIONSHIP AUDIT LOGS
-- Used by relationship deletion audit tracking
-- ============================================================================

-- Audit log by provider: see deletion history
CREATE INDEX IF NOT EXISTS idx_relationship_audit_provider_created
  ON public.trackpay_relationship_audit(provider_id, created_at DESC);

-- Audit log by client: see when they were removed from relationships
CREATE INDEX IF NOT EXISTS idx_relationship_audit_client_created
  ON public.trackpay_relationship_audit(client_id, created_at DESC);

-- ============================================================================
-- INVITE MANAGEMENT
-- Used by invite creation and claiming flows
-- ============================================================================

-- Invites by provider: show invites created by provider, filtered by status
CREATE INDEX IF NOT EXISTS idx_invites_provider_status
  ON public.trackpay_invites(provider_id, status);

-- Invite lookup by code: fast lookup when claiming an invite
CREATE INDEX IF NOT EXISTS idx_invites_code
  ON public.trackpay_invites(invite_code);

-- ============================================================================
-- RELATIONSHIPS
-- Used for provider-client relationship lookups
-- ============================================================================

-- Relationships by provider: show all clients for a provider
CREATE INDEX IF NOT EXISTS idx_relationships_provider
  ON public.trackpay_relationships(provider_id);

-- Relationships by client: show all providers for a client
CREATE INDEX IF NOT EXISTS idx_relationships_client
  ON public.trackpay_relationships(client_id);

COMMIT;

-- Verification
DO $$
DECLARE
  index_count int;
BEGIN
  SELECT COUNT(*)
  INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename LIKE 'trackpay_%'
    AND indexname LIKE 'idx_%';

  IF index_count < 12 THEN
    RAISE WARNING 'Expected at least 12 custom indexes, found %', index_count;
  END IF;

  RAISE NOTICE '✅ Created % performance indexes', index_count;
END $$;
