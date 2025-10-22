-- =============================================
-- Add Geolocation Columns to Marketing Waitlist
-- =============================================
--
-- Purpose: Track geographic signup data from IP enrichment
-- Integration: Netlify Function uses ipwho.is API

alter table public.marketing_waitlist
  add column if not exists country text,
  add column if not exists country_code text,
  add column if not exists region text,
  add column if not exists city text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists timezone text;

-- Index for analytics queries
create index if not exists marketing_waitlist_country_idx
  on public.marketing_waitlist (country);

create index if not exists marketing_waitlist_country_code_idx
  on public.marketing_waitlist (country_code);

-- Comments
comment on column public.marketing_waitlist.country is 'Country name from IP geolocation';
comment on column public.marketing_waitlist.country_code is 'ISO country code (e.g., US, MX, ES)';
comment on column public.marketing_waitlist.region is 'State/region from IP geolocation';
comment on column public.marketing_waitlist.city is 'City from IP geolocation';
comment on column public.marketing_waitlist.latitude is 'Approximate latitude';
comment on column public.marketing_waitlist.longitude is 'Approximate longitude';
comment on column public.marketing_waitlist.timezone is 'Timezone (e.g., America/New_York)';
