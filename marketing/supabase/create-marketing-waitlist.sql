-- =============================================
-- TrackPay Marketing Waitlist - Supabase Table
-- =============================================
--
-- Run this SQL in your Supabase SQL Editor to create the marketing_waitlist table
--
-- Features:
-- - Captures email, name, language preference
-- - Tracks UTM parameters for campaign attribution
-- - Records IP address and user agent for analytics
-- - Unique constraint on email (prevents duplicates)
-- - Created_at timestamp for cohort analysis
-- - RLS enabled (service role bypasses in Netlify Function)

-- 1) Create the table
CREATE TABLE IF NOT EXISTS public.marketing_waitlist (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT,
  language      TEXT DEFAULT 'en' CHECK (language IN ('en', 'es')),
  utm_source    TEXT,
  utm_campaign  TEXT,
  ip            TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) Create helpful indexes
CREATE INDEX IF NOT EXISTS marketing_waitlist_created_at_idx
  ON public.marketing_waitlist (created_at DESC);

CREATE INDEX IF NOT EXISTS marketing_waitlist_language_idx
  ON public.marketing_waitlist (language);

CREATE INDEX IF NOT EXISTS marketing_waitlist_utm_source_idx
  ON public.marketing_waitlist (utm_source)
  WHERE utm_source IS NOT NULL;

-- 3) Enable Row Level Security (RLS)
-- The Netlify Function uses service_role key which bypasses RLS
-- This is safe and recommended for server-side operations
ALTER TABLE public.marketing_waitlist ENABLE ROW LEVEL SECURITY;

-- 4) Optional: Allow authenticated users to read waitlist (for admin panel later)
-- Uncomment if you want to build an admin dashboard
-- CREATE POLICY "authenticated_read_waitlist"
--   ON public.marketing_waitlist
--   FOR SELECT
--   TO authenticated
--   USING (true);

-- 5) Grant permissions (optional, service_role already has full access)
-- GRANT SELECT ON public.marketing_waitlist TO authenticated;

-- =============================================
-- Verification Queries (run these to test)
-- =============================================

-- Check table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'marketing_waitlist'
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'marketing_waitlist';

-- Check RLS policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'marketing_waitlist';

-- Sample query: View all signups
-- SELECT id, email, language, utm_source, utm_campaign, created_at
-- FROM marketing_waitlist
-- ORDER BY created_at DESC
-- LIMIT 10;

-- Sample query: Count signups by language
-- SELECT language, COUNT(*) as count
-- FROM marketing_waitlist
-- GROUP BY language;

-- Sample query: Count signups by UTM source
-- SELECT utm_source, COUNT(*) as count
-- FROM marketing_waitlist
-- WHERE utm_source IS NOT NULL
-- GROUP BY utm_source
-- ORDER BY count DESC;
