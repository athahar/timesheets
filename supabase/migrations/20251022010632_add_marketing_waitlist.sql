-- =============================================
-- TrackPay Marketing Waitlist Table
-- =============================================
--
-- Purpose: Captures waitlist signups from marketing site
-- Integration: Netlify Function → Supabase (marketing/netlify/functions/waitlist.js)
-- Access: Service role key only (RLS enabled, no public policies)

-- Table
create table if not exists public.marketing_waitlist (
  id            bigserial primary key,
  email         text not null unique,
  name          text,
  language      text default 'en',
  utm_source    text,
  utm_campaign  text,
  ip            text,
  user_agent    text,
  created_at    timestamptz not null default now()
);

-- Indexes
create index if not exists marketing_waitlist_created_at_idx
  on public.marketing_waitlist (created_at desc);

-- RLS (service role will bypass)
alter table public.marketing_waitlist enable row level security;

-- NOTE: No anon insert policy on purpose (Netlify Function uses SERVICE ROLE).
-- The marketing site's Netlify Function has SERVICE_ROLE_KEY which bypasses RLS.
-- This is correct and secure (server-side only, never exposed to client).
