# Marketing Site - Production Database Migration

This guide walks you through setting up the `marketing_waitlist` table in **Supabase Production** for the TrackPay marketing website.

---

## 📋 Prerequisites

Before running these migrations, ensure you have:

1. ✅ **Production Supabase project** created
2. ✅ **Production project reference ID** (from Supabase dashboard)
3. ✅ **Production SUPABASE_URL** (Project Settings → API → Project URL)
4. ✅ **Production SUPABASE_SERVICE_ROLE_KEY** (Project Settings → API → service_role key)

---

## 🚀 Migration Steps

### Step 1: Apply Database Schema

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to **Supabase Production Dashboard** → **SQL Editor**
2. Click **New query**
3. Copy the entire contents of `001_marketing_waitlist_table.sql`
4. Paste into SQL Editor
5. Click **Run** (Cmd/Ctrl + Enter)
6. Verify success message: `marketing_waitlist table created successfully!`

**Option B: Via Supabase CLI**

```bash
# Link to production project
cd /Users/athahar/work/claude-apps/timesheets
supabase link --project-ref <PRODUCTION_PROJECT_REF>

# Apply migration (if supabase db push works)
supabase db push

# OR manually via psql
psql <PRODUCTION_DB_URL> < scripts/prod-migrate/marketing/001_marketing_waitlist_table.sql
```

---

### Step 2: Verify Table Creation

Run this query in **SQL Editor** to verify:

```sql
-- Check table exists with all columns
select 
  column_name, 
  data_type,
  is_nullable,
  column_default
from information_schema.columns 
where table_schema = 'public' 
  and table_name = 'marketing_waitlist'
order by ordinal_position;

-- Should see 16 columns:
-- id, email, name, language, utm_source, utm_campaign, 
-- ip, user_agent, country, country_code, region, city,
-- latitude, longitude, timezone, created_at
```

---

### Step 3: Configure Netlify Environment Variables

**Critical:** The marketing site Netlify Function needs production Supabase credentials.

1. Go to **Netlify Dashboard** → Your marketing site → **Site settings**
2. Navigate to **Environment variables**
3. **Update** (or add if not present):

   ```
   SUPABASE_URL=https://<PRODUCTION_PROJECT_REF>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<PRODUCTION_SERVICE_ROLE_KEY>
   ```

4. **Important:** Use PRODUCTION credentials, not staging!
5. Click **Save**
6. **Trigger redeploy**: Deploys → Trigger deploy → Clear cache and deploy site

---

### Step 4: Test the Integration

1. **Wait 2 minutes** for Netlify to redeploy with new environment variables
2. **Go to** https://www.tracktimepay.com
3. **Submit a test email** (use a real email you control)
4. **Check Supabase Production** → Table Editor → `marketing_waitlist`
5. **Verify data**:
   - ✅ Email saved
   - ✅ Language captured (en or es)
   - ✅ IP address captured
   - ✅ Geolocation data (country, city, etc.) - may be NULL if IP is private/VPN
   - ✅ Timestamp recorded

---

## 🔍 Verification Checklist

Run these queries in **Supabase Production SQL Editor**:

```sql
-- 1. Check table exists
select exists (
  select from pg_tables 
  where schemaname = 'public' 
    and tablename = 'marketing_waitlist'
) as table_exists;

-- 2. Check indexes
select indexname, indexdef 
from pg_indexes 
where tablename = 'marketing_waitlist'
order by indexname;

-- Should see 4 indexes:
-- marketing_waitlist_pkey (primary key)
-- marketing_waitlist_created_at_idx
-- marketing_waitlist_country_idx
-- marketing_waitlist_country_code_idx
-- marketing_waitlist_language_idx

-- 3. Check RLS is enabled
select tablename, rowsecurity 
from pg_tables 
where tablename = 'marketing_waitlist';

-- rowsecurity should be: true

-- 4. View sample data (after testing)
select 
  id,
  email,
  language,
  country,
  city,
  created_at
from marketing_waitlist 
order by created_at desc 
limit 5;
```

---

## 📊 Analytics Queries

Once you have signups, use these queries for insights:

### Top Countries
```sql
select 
  country,
  country_code,
  count(*) as signups,
  round(count(*) * 100.0 / sum(count(*)) over (), 1) as percent
from marketing_waitlist
where country is not null
group by country, country_code
order by signups desc
limit 10;
```

### Top Cities
```sql
select 
  city,
  region,
  country,
  count(*) as signups
from marketing_waitlist
where city is not null
group by city, region, country
order by signups desc
limit 20;
```

### Language Distribution
```sql
select 
  language,
  count(*) as signups,
  round(count(*) * 100.0 / sum(count(*)) over (), 1) as percent
from marketing_waitlist
group by language
order by signups desc;
```

### Signups Over Time
```sql
select 
  date_trunc('day', created_at)::date as signup_date,
  count(*) as signups,
  count(distinct country) as countries
from marketing_waitlist
group by signup_date
order by signup_date desc
limit 30;
```

### UTM Campaign Performance
```sql
select 
  coalesce(utm_source, 'direct') as source,
  coalesce(utm_campaign, 'none') as campaign,
  count(*) as signups,
  count(distinct country) as countries
from marketing_waitlist
group by utm_source, utm_campaign
order by signups desc;
```

---

## 🔒 Security Notes

### RLS Configuration
- ✅ RLS is **enabled** on `marketing_waitlist` table
- ✅ **No public policies** (intentional - server-side only)
- ✅ Netlify Function uses **SERVICE_ROLE_KEY** (bypasses RLS)
- ⚠️ **Never** expose SERVICE_ROLE_KEY in client-side code
- ✅ Key is only in Netlify environment variables (server-side)

### Data Privacy
The table captures:
- IP addresses (for geolocation)
- Approximate location (city, country)
- User agent (browser info)

**Privacy compliance:**
- ✅ Privacy page discloses data collection
- ✅ Contact email provided for data deletion requests
- ✅ No sensitive personal data (only email + location)
- ⚠️ For EU users, consider GDPR consent banner if running ads

---

## 🐛 Troubleshooting

### Issue: Form submits but no data in Supabase

**Check:**
1. Netlify environment variables set correctly?
2. Using PRODUCTION credentials (not staging)?
3. Triggered redeploy after adding env vars?
4. Check Netlify Function logs: Deploys → Functions → waitlist

### Issue: Geolocation data is NULL

**Possible causes:**
- Private/internal IP (localhost, VPN)
- ipwho.is API timeout (1.5s limit)
- IP geolocation lookup failed

**This is expected behavior** - form submission still succeeds, just missing geo data.

### Issue: Duplicate email error

**Expected:** The table has unique constraint on email. If someone submits twice:
- First submission: Creates record
- Second submission: Updates existing record (upsert behavior)

This is by design - prevents duplicate signups.

---

## 📁 Files in This Directory

```
scripts/prod-migrate/marketing/
├── README.md                              # This file
└── 001_marketing_waitlist_table.sql       # Production migration
```

---

## 🔄 Rollback (If Needed)

If you need to remove the table:

```sql
-- WARNING: This deletes all waitlist data!
drop table if exists public.marketing_waitlist cascade;
```

Better approach - keep the table, just disable the form:
- Comment out the form in `marketing/index.html`
- Or set waitlist to "closed" state

---

## ✅ Success Criteria

After completing these steps, you should have:

- ✅ `marketing_waitlist` table in production Supabase
- ✅ All 16 columns present (email, geo fields, timestamps)
- ✅ 4 indexes created (created_at, country, country_code, language)
- ✅ RLS enabled with no public policies
- ✅ Netlify environment variables configured
- ✅ Test signup working (data appears in table)
- ✅ Geolocation enrichment working (for public IPs)

---

**Production migration complete!** Your marketing site is ready to collect waitlist signups with full analytics. 🚀
