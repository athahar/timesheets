-- actual migration script -> claude-apps/timesheets/scripts/prod-migrate/marketing/001_marketing_waitlist_table.sql

 -- TrackPay Marketing Waitlist Table Migration
  -- Migration: 20251022010632_add_marketing_waitlist.sql

  -- Create table
  CREATE TABLE IF NOT EXISTS
  public.marketing_waitlist (
    id            bigserial
  primary key,
    email         text not null
  unique,
    name          text,
    language      text default
  'en',
    utm_source    text,
    utm_campaign  text,
    ip            text,
    user_agent    text,
    created_at    timestamptz not
   null default now()
  );

  -- Create index
  CREATE INDEX IF NOT EXISTS mark
  eting_waitlist_created_at_idx
    ON public.marketing_waitlist
  (created_at desc);

  -- Enable RLS
  ALTER TABLE
  public.marketing_waitlist
  ENABLE ROW LEVEL SECURITY;

  -- Verify
  SELECT 'marketing_waitlist 
  table created successfully!' as
   status;
  SELECT COUNT(*) as row_count
  FROM marketing_waitlist;





   -- Add geolocation columns to marketing_waitlist
  alter table
  public.marketing_waitlist
    add column if not exists
  country text,
    add column if not exists
  country_code text,
    add column if not exists
  region text,
    add column if not exists city
   text,
    add column if not exists
  latitude double precision,
    add column if not exists
  longitude double precision,
    add column if not exists
  timezone text;

  -- Indexes for analytics
  create index if not exists
  marketing_waitlist_country_idx
    on public.marketing_waitlist
  (country);

  create index if not exists mark
  eting_waitlist_country_code_idx
    on public.marketing_waitlist
  (country_code);

  -- Verify
  select
    column_name,
    data_type
  from information_schema.columns
  where table_name =
  'marketing_waitlist'
    and column_name in
  ('country', 'country_code',
  'region', 'city', 'latitude',
  'longitude', 'timezone')
  order by ordinal_position;