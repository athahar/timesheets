-- =============================================
-- Marketing Waitlist Table - Production Migration
-- =============================================
--
-- Purpose: Create marketing_waitlist table for website signups
-- Run this FIRST before deploying Netlify marketing site to production
--
-- Prerequisites: None (standalone table)
-- Deployment: Copy and run in Supabase Production SQL Editor

-- Create table with all columns (including geolocation)
create table if not exists public.marketing_waitlist (
  id            bigserial primary key,
  email         text not null unique,
  name          text,
  language      text default 'en',
  utm_source    text,
  utm_campaign  text,
  ip            text,
  user_agent    text,
  
  -- Geolocation columns (enriched from IP via ipwho.is)
  country       text,
  country_code  text,
  region        text,
  city          text,
  latitude      double precision,
  longitude     double precision,
  timezone      text,
  
  created_at    timestamptz not null default now()
);

-- Indexes for performance
create index if not exists marketing_waitlist_created_at_idx
  on public.marketing_waitlist (created_at desc);

create index if not exists marketing_waitlist_country_idx
  on public.marketing_waitlist (country);

create index if not exists marketing_waitlist_country_code_idx
  on public.marketing_waitlist (country_code);

create index if not exists marketing_waitlist_language_idx
  on public.marketing_waitlist (language);

-- RLS (Netlify Function uses SERVICE_ROLE_KEY which bypasses RLS)
alter table public.marketing_waitlist enable row level security;

-- No public policies - server-side only access via service role key
-- This is intentional and secure (Netlify Function has SERVICE_ROLE_KEY)

-- Comments for documentation
comment on table public.marketing_waitlist is 'Website waitlist signups with geolocation tracking';
comment on column public.marketing_waitlist.email is 'Signup email (unique)';
comment on column public.marketing_waitlist.language is 'User language preference (en or es)';
comment on column public.marketing_waitlist.utm_source is 'Marketing campaign source';
comment on column public.marketing_waitlist.utm_campaign is 'Marketing campaign name';
comment on column public.marketing_waitlist.ip is 'IP address at signup';
comment on column public.marketing_waitlist.user_agent is 'Browser user agent string';
comment on column public.marketing_waitlist.country is 'Country name from IP geolocation';
comment on column public.marketing_waitlist.country_code is 'ISO country code (e.g., US, MX, ES)';
comment on column public.marketing_waitlist.region is 'State/region from IP geolocation';
comment on column public.marketing_waitlist.city is 'City from IP geolocation';
comment on column public.marketing_waitlist.latitude is 'Approximate latitude coordinates';
comment on column public.marketing_waitlist.longitude is 'Approximate longitude coordinates';
comment on column public.marketing_waitlist.timezone is 'IANA timezone (e.g., America/New_York)';

-- Verification query
select 
  'marketing_waitlist table created successfully!' as status,
  count(*) as column_count
from information_schema.columns 
where table_schema = 'public' 
  and table_name = 'marketing_waitlist';
