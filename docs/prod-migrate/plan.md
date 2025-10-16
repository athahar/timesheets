# TrackPay Production Database Migration Plan

**Last Updated:** 2025-10-16
**Status:** Ready for Production
**Estimated Time:** ~45 minutes
**Migration Type:** Schema-only (no data migration)

---

## Table of Contents

1. [Overview](#overview)
2. [Critical Auth Pattern](#critical-auth-pattern)
3. [Migration Files](#migration-files)
4. [Step-by-Step Guide](#step-by-step-guide)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)
7. [Rollback Plan](#rollback-plan)

---

## Overview

### Purpose

Set up a clean production database with correct schema, FK constraints, RLS, performance indexes, and realtime subscriptions. **No data migration** - users will create fresh data in production.

### Database Schema

**8 TrackPay Tables:**
- `trackpay_users` - Providers and clients with auth mapping
- `trackpay_relationships` - Provider-client associations
- `trackpay_sessions` - Work tracking (duration in minutes)
- `trackpay_payments` - Payment records (financial data)
- `trackpay_requests` - Payment request workflow
- `trackpay_activities` - Activity feed/audit trail
- `trackpay_invites` - Client invitation system
- `trackpay_relationship_audit` - Relationship deletion audit

### Key Features

✅ **Row Level Security (RLS)** - Proper auth pattern with helper function
✅ **Foreign Key Protection** - RESTRICT for business data, SET NULL for audit
✅ **Performance Indexes** - 14 indexes for all query patterns
✅ **Realtime Subscriptions** - Live updates for all tables
✅ **Audit Logging** - Relationship deletion tracking
✅ **Schema Drift Detection** - Manifest-based verification

---

## Critical Auth Pattern

### The Problem

**ChatGPT's original assumption (WRONG for our schema):**
```sql
USING (provider_id = auth.uid())  -- ❌ This will NEVER match!
```

### Our Actual Auth Pattern

```
auth.users.id (Supabase auth UUID)
    ↓ linked via
trackpay_users.auth_user_id
    ↓ our internal ID
trackpay_users.id (different UUID!)
    ↓ used in ALL foreign keys
trackpay_sessions.provider_id, trackpay_relationships.provider_id, etc.
```

**Why the original approach fails:**
- `auth.uid()` returns `auth.users.id` (Supabase auth table)
- Our foreign keys use `trackpay_users.id` (our internal user ID)
- **These are different UUIDs!**

### The Solution

**Helper function bridges the gap:**
```sql
CREATE FUNCTION current_trackpay_user_id() RETURNS uuid AS $$
  SELECT id FROM trackpay_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1
$$;

-- Now RLS policies work:
USING (provider_id = current_trackpay_user_id())  -- ✅ Correct!
```

**Evidence from existing code:**
See `ios-app/scripts/prod-migrate/20251016_fix_delete_rpc_provider_lookup.sql`:
```sql
v_auth_id uuid := auth.uid();  -- Gets auth.users.id

-- Must look up trackpay_users.id:
SELECT id INTO v_provider
FROM trackpay_users
WHERE auth_user_id = v_auth_id AND role = 'provider';
```

**Without this fix:** RLS policies will lock everyone out in production! 🚨

---

## Migration Files

All files located in: `ios-app/scripts/prod-migrate/`

### Production Hardening Migrations (Run in Order)

| File | Purpose | Critical? |
|------|---------|-----------|
| `000_extensions.sql` | Install pgcrypto + pg_stat_statements | ✅ CRITICAL |
| `010_realtime.sql` | Enable realtime for all 8 tables | ✅ YES |
| `015_rls_helper.sql` | Create auth helper + unique constraint | ✅ CRITICAL |
| `020_rls_policies.sql` | RLS policies with correct auth pattern | ✅ CRITICAL |
| `030_indexes.sql` | Performance indexes (14 total) | ⚡ RECOMMENDED |
| `040_manifest.sql` | Schema drift detection | 📊 MONITORING |

### Schema & Constraint Migrations

| File | Purpose | Critical? |
|------|---------|-----------|
| `trackpay_schema.sql` | Table definitions (you create via pg_dump) | ✅ CRITICAL |
| `20251015_fix_fk_SAFE_SEQUENTIAL.sql` | Fix FK delete rules + audit table | ✅ CRITICAL |
| `20251015_fix_session_fk_cascades.sql` | Fix session FK delete rules | ✅ CRITICAL |
| `20251016_fix_delete_rpc_provider_lookup.sql` | Delete client RPC with auth fix | ✅ CRITICAL |

### Documentation

| File | Purpose |
|------|---------|
| `CHATGPT_CORRECTIONS.md` | Auth pattern analysis and corrections |
| `PRODUCTION_SETUP_CLEAN.md` | Original detailed setup guide |

---

## Step-by-Step Guide

### Prerequisites

- [ ] Supabase account with ability to create new projects
- [ ] Access to staging database (for schema export)
- [ ] `pg_dump` installed (for schema export)
- [ ] All migration files from `ios-app/scripts/prod-migrate/`

---

### Step 1: Create Production Supabase Project

**Time:** ~5 minutes

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Configure:
   - Name: `trackpay-production`
   - Region: Choose closest to users
   - Database Password: **Save securely!**
4. Wait for provisioning

**Save these values:**
```bash
# You'll need these for app configuration
PRODUCTION_PROJECT_URL=https://[PROJECT-ID].supabase.co
PRODUCTION_ANON_KEY=[copy from Settings → API]
PRODUCTION_DB_PASSWORD=[your database password]
```

---

### Step 2: Export Schema from Staging

**Time:** ~2 minutes

**Option A: Use pg_dump (Recommended)**

```bash
# Get connection string from Supabase → Settings → Database
# Format: postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres

pg_dump "postgresql://postgres:[STAGING_PASSWORD]@[STAGING_HOST]:5432/postgres" \
  -t 'public.trackpay_*' \
  --schema-only \
  --no-owner \
  --no-acl \
  > trackpay_schema.sql
```

**Option B: Use Supabase Dashboard**

1. Open staging project → SQL Editor
2. For each table, click "..." → "Clone table"
3. Copy the CREATE TABLE SQL
4. Paste all into `trackpay_schema.sql`

**Verify export:**
```bash
grep "CREATE TABLE" trackpay_schema.sql | wc -l
# Should show 8 tables
```

---

### Step 3: Run Migrations in Production

**Time:** ~20 minutes
**Location:** Production SQL Editor (Supabase Dashboard)

Run these migrations **one at a time** in this **exact order**:

#### 3.0 Install Extensions (RUN FIRST!) ✅

```bash
# File: ios-app/scripts/prod-migrate/000_extensions.sql
# Copy entire file contents, paste in SQL Editor, click "Run"
```

**What it does:**
- Installs `pgcrypto` (UUID generation via `gen_random_uuid()`)
- Installs `pg_stat_statements` (query performance monitoring)
- Required for table defaults and production analysis

**Verify:**
```sql
SELECT extname, extversion FROM pg_extension
WHERE extname IN ('pgcrypto', 'pg_stat_statements');
-- Should show both extensions
```

---

#### 3.1 Create Tables

```bash
# File: trackpay_schema.sql (you created in Step 2)
# Copy entire file, paste in SQL Editor, click "Run"
```

**What it does:**
- Creates all 8 TrackPay tables with basic structure
- Sets up primary keys and default values

**Verify:**
```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'trackpay_%'
ORDER BY tablename;
-- Should show 8 tables
```

---

#### 3.2 Fix FK Constraints (CRITICAL!) 🔒

```bash
# File: ios-app/scripts/prod-migrate/20251015_fix_fk_SAFE_SEQUENTIAL.sql
# Run EACH SECTION separately (1-12)
# Read comments in file for section boundaries
```

**What it does:**
- Changes FK delete rules from CASCADE → RESTRICT (protects financial data)
- Creates `trackpay_relationship_audit` table
- Removes direct DELETE access on relationships (forces RPC usage)

**Why critical:**
- Prevents accidental deletion of sessions with payments
- Protects financial records
- Ensures audit trail

**Verify:**
```sql
SELECT conrelid::regclass AS table_name, conname,
  CASE confdeltype
    WHEN 'r' THEN 'RESTRICT ✅'
    WHEN 'c' THEN 'CASCADE ⚠️'
    WHEN 'n' THEN 'SET NULL ✅'
  END AS delete_action
FROM pg_constraint
WHERE conname LIKE '%trackpay_%_fkey' AND contype = 'f'
ORDER BY table_name;
-- Should show RESTRICT for most business tables
```

---

#### 3.3 Fix Session FK Constraints

```bash
# File: ios-app/scripts/prod-migrate/20251015_fix_session_fk_cascades.sql
# Run entire file
```

**What it does:**
- `trackpay_payments.session_id` → RESTRICT (can't delete session with payments)
- `trackpay_requests.session_id` → SET NULL (preserve audit trail)
- `trackpay_activities.session_id` → SET NULL (preserve audit trail)

**Verify:**
```sql
SELECT conname, confdeltype
FROM pg_constraint
WHERE conname LIKE '%session%fkey';
-- Check delete actions match expectations
```

---

#### 3.4 Create Delete Client RPC

```bash
# File: ios-app/scripts/prod-migrate/20251016_fix_delete_rpc_provider_lookup.sql
# Run entire file
```

**What it does:**
- Creates `delete_client_relationship_safely()` function
- Includes provider ID lookup fix (auth.uid() → trackpay_users.id)
- Adds blocker checks (prevents delete if unpaid work exists)
- Logs deletion to audit table

**Verify:**
```sql
SELECT proname, prosecdef FROM pg_proc
WHERE proname = 'delete_client_relationship_safely';
-- Should show function with prosecdef = true
```

---

#### 3.5 Enable Realtime 📡

```bash
# File: ios-app/scripts/prod-migrate/010_realtime.sql
# Run entire file
```

**What it does:**
- Adds all 8 TrackPay tables to `supabase_realtime` publication
- Enables real-time subscriptions for live updates in app

**Verify:**
```sql
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename LIKE 'trackpay_%'
ORDER BY tablename;
-- Should show all 8 tables
```

---

#### 3.6 Create RLS Helper Function (CRITICAL!) 🔐

```bash
# File: ios-app/scripts/prod-migrate/015_rls_helper.sql
# Run entire file
```

**What it does:**
- Creates `current_trackpay_user_id()` helper function
- Maps `auth.uid()` → `trackpay_users.id` (required for RLS)
- Adds unique constraint on `auth_user_id` (prevents ghost users)

**Why this is critical:**
- Without this, RLS policies will lock everyone out!
- Auth pattern: `auth.uid()` returns `auth.users.id`
- Our FKs use `trackpay_users.id` (different UUID!)
- Helper bridges the gap

**Verify:**
```sql
-- Check function exists
SELECT proname FROM pg_proc WHERE proname = 'current_trackpay_user_id';

-- Check unique constraint exists
SELECT indexname FROM pg_indexes WHERE indexname = 'ux_trackpay_users_auth_user';
-- Both should exist
```

---

#### 3.7 Enable RLS Policies 🛡️

```bash
# File: ios-app/scripts/prod-migrate/020_rls_policies.sql
# Run entire file
```

**What it does:**
- Enables Row Level Security on all 8 tables
- Creates ~18 policies using `current_trackpay_user_id()` helper
- Providers can only see/modify their own data
- Clients can view sessions/payments involving them
- Prevents unauthorized data access

**Verify:**
```sql
-- Check RLS enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'trackpay_%';
-- All should show rowsecurity = true

-- Check policies created
SELECT tablename, COUNT(*) as policy_count FROM pg_policies
WHERE schemaname = 'public' AND tablename LIKE 'trackpay_%'
GROUP BY tablename
ORDER BY tablename;
-- Should show multiple policies per table
```

---

#### 3.8 Create Performance Indexes ⚡

```bash
# File: ios-app/scripts/prod-migrate/030_indexes.sql
# Run entire file
```

**What it does:**
- Creates ~14 indexes for optimal query performance
- Blocker checks (delete operations)
- History screens (client/provider views)
- Activity feed
- Invite management
- Relationship lookups

**Verify:**
```sql
SELECT tablename, indexname FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'trackpay_%'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
-- Should show ~14 custom indexes
```

---

### Step 4: Verify Production Schema

**Time:** ~10 minutes

Run the comprehensive manifest check:

```bash
# File: ios-app/scripts/prod-migrate/040_manifest.sql
# Run entire file in SQL Editor
```

**What it does:**
- Generates complete object inventory (tables, indexes, functions, policies)
- Shows expected vs actual object counts
- Verifies all critical objects exist
- **Save this output for drift detection!**

**Expected output:**
```
category      | expected_count | actual_count | status
--------------+----------------+--------------+---------
constraints   | 15             | 15+          | ✅ OK
extensions    | 2              | 2            | ✅ OK
functions     | 2              | 2            | ✅ OK
indexes       | 15             | 15+          | ✅ OK
policies      | 18             | 18+          | ✅ OK
tables        | 8              | 8            | ✅ OK
```

**Manual Verification Checklist:**

- [ ] All 8 tables exist
- [ ] Both extensions installed (pgcrypto, pg_stat_statements)
- [ ] All tables in realtime publication
- [ ] Both helper functions exist (`current_trackpay_user_id`, `delete_client_relationship_safely`)
- [ ] Unique constraint on `auth_user_id` exists
- [ ] RLS enabled on all tables
- [ ] ~18 RLS policies created
- [ ] ~14 performance indexes created
- [ ] FK constraints show correct delete actions

---

### Step 5: Update App Configuration

**Time:** ~5 minutes

#### 5.1 Update Local Development

Edit `ios-app/.env`:
```bash
EXPO_PUBLIC_SUPABASE_URL=https://[PRODUCTION-PROJECT-ID].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[PRODUCTION-ANON-KEY]
EXPO_PUBLIC_APP_NAME=TrackPay
```

Test locally:
```bash
cd ios-app
npm run web
# App should connect to production database
```

#### 5.2 Update EAS Build Secrets

```bash
cd ios-app

# Update Supabase URL
eas secret:create --scope project --name SUPABASE_URL \
  --value "https://[PRODUCTION-PROJECT-ID].supabase.co" \
  --force

# Update Supabase anon key
eas secret:create --scope project --name SUPABASE_ANON_KEY \
  --value "[PRODUCTION-ANON-KEY]" \
  --force

# Verify secrets
eas secret:list
```

---

### Step 6: Testing

**Time:** ~3 minutes

Test these critical flows in the app:

**Provider Testing:**
- [ ] Register as Provider → verify profile in database
- [ ] Login → land on ClientList screen
- [ ] Add Client → verify relationship created
- [ ] Start Session → verify session with start time
- [ ] Stop Session → verify end time and amount calculated
- [ ] Request Payment → verify status change
- [ ] View History → see correct data
- [ ] Activity Feed → all actions appear

**Client Testing:**
- [ ] Claim Invite → create account
- [ ] Login → land on correct screen
- [ ] View Sessions → see work tracked
- [ ] View Activity Timeline → see history

**RLS Testing (in SQL Editor):**
```sql
-- This should fail with "Not authenticated" (correct behavior!)
SELECT delete_client_relationship_safely('00000000-0000-0000-0000-000000000000');
-- Expected: Error P0001: Not authenticated
```

---

## Verification

### Quick Health Check

Run this in Production SQL Editor:

```sql
DO $$
DECLARE
  issues text[] := ARRAY[]::text[];
BEGIN
  -- Check tables
  IF (SELECT COUNT(*) FROM pg_tables WHERE tablename LIKE 'trackpay_%') < 8 THEN
    issues := array_append(issues, 'Missing tables');
  END IF;

  -- Check extensions
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    issues := array_append(issues, 'Missing pgcrypto extension');
  END IF;

  -- Check helper function
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_trackpay_user_id') THEN
    issues := array_append(issues, 'Missing auth helper function');
  END IF;

  -- Check unique constraint
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ux_trackpay_users_auth_user') THEN
    issues := array_append(issues, 'Missing unique constraint on auth_user_id');
  END IF;

  -- Check RLS enabled
  IF (SELECT COUNT(*) FROM pg_tables WHERE tablename LIKE 'trackpay_%' AND rowsecurity = true) < 8 THEN
    issues := array_append(issues, 'RLS not enabled on all tables');
  END IF;

  -- Report
  IF array_length(issues, 1) > 0 THEN
    RAISE EXCEPTION 'Health check failed: %', array_to_string(issues, ', ');
  ELSE
    RAISE NOTICE '✅ All health checks passed!';
  END IF;
END $$;
```

### Schema Columns Audit

**IMPORTANT:** Verify these columns exist (ChatGPT missed some):

**trackpay_users:**
- ✅ `auth_user_id` (CRITICAL - links to auth.users.id)
- ✅ `display_name` (optional)
- ✅ `claimed_status` (for invite system)

**trackpay_sessions:**
- ✅ `crew_size` (multi-person feature)
- ✅ `person_hours` (crew × duration)

**trackpay_payments:**
- ✅ `session_ids` (array - multiple sessions per payment)

**trackpay_invites:**
- ✅ `expires_at` (invite expiration)
- ✅ `claimed_at` (when claimed)
- ✅ `claimed_by` (who claimed it)

If any are missing, **DO NOT GO LIVE** - regenerate schema or add via ALTER TABLE.

---

## Troubleshooting

### Issue: "relation 'trackpay_users' does not exist"

**Cause:** Tables not created
**Fix:** Run Step 3.1 (create tables)

---

### Issue: RPC crashes with "column auth_user_id does not exist"

**Cause:** Schema export missing critical columns
**Fix:** Verify `trackpay_users.auth_user_id` exists:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'trackpay_users' AND column_name = 'auth_user_id';
```
If missing, add it:
```sql
ALTER TABLE trackpay_users ADD COLUMN auth_user_id uuid;
```

---

### Issue: App shows no data but no errors

**Cause:** RLS policies blocking access (helper function not working)
**Fix:** Test helper function:
```sql
-- Run as authenticated user in Supabase API testing panel
SELECT current_trackpay_user_id();
-- Should return your trackpay_users.id, not NULL
```

---

### Issue: "Cannot delete. Active or unpaid sessions exist"

**Cause:** Blockers working correctly! (This is expected behavior)
**Fix:** Mark sessions as paid first, then delete

---

### Issue: Realtime subscriptions not working

**Cause:** Tables not in realtime publication
**Fix:** Verify and re-run Step 3.5:
```sql
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename LIKE 'trackpay_%';
-- Should show all 8 tables
```

---

## Rollback Plan

### Immediate Rollback (Back to Staging)

If something goes wrong in production:

**Step 1: Revert App Config**
```bash
# Update ios-app/.env
EXPO_PUBLIC_SUPABASE_URL=https://[STAGING-PROJECT-ID].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[STAGING-ANON-KEY]
```

**Step 2: Revert EAS Secrets**
```bash
cd ios-app
eas secret:create --scope project --name SUPABASE_URL \
  --value "[STAGING-URL]" --force
eas secret:create --scope project --name SUPABASE_ANON_KEY \
  --value "[STAGING-KEY]" --force
```

**Step 3: Redeploy**
```bash
npm run web  # Test locally first
# Then rebuild app if needed
```

### Database Rollback (Nuclear Option)

If production database is corrupted:

1. Delete production Supabase project
2. Create new production project
3. Re-run all migrations from scratch
4. Takes ~45 minutes but guarantees clean state

---

## Production Deployment

Once tested and verified:

```bash
cd ios-app

# Build for iOS
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios
```

The app will connect to production database with all features enabled.

---

## Success Criteria

Migration is successful when:

- ✅ All 8 TrackPay tables exist in production
- ✅ Both extensions installed (pgcrypto, pg_stat_statements)
- ✅ Realtime enabled on all tables
- ✅ `current_trackpay_user_id()` helper function exists
- ✅ Unique constraint on `auth_user_id` exists
- ✅ RLS enabled on all 8 tables
- ✅ ~18 RLS policies created with correct auth pattern
- ✅ ~14 performance indexes created
- ✅ FK constraints correct (RESTRICT for business data)
- ✅ Delete RPC function works
- ✅ App connects and shows data
- ✅ All user flows work (register, login, track time, payments)
- ✅ Audit logging active
- ✅ No console errors

---

## Ongoing Maintenance

### Weekly: Schema Drift Check

Run `040_manifest.sql` and compare output to baseline:
```bash
# Save baseline on first migration
psql $PROD_DB_URL -f scripts/prod-migrate/040_manifest.sql > baseline_manifest.txt

# Weekly check
psql $PROD_DB_URL -f scripts/prod-migrate/040_manifest.sql > current_manifest.txt
diff baseline_manifest.txt current_manifest.txt
# Investigate any differences
```

### Monthly: Performance Review

Check slow queries:
```sql
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
WHERE query LIKE '%trackpay_%'
ORDER BY total_exec_time DESC
LIMIT 20;
```

### As Needed: Key Rotation

After major changes, rotate staging keys:
```bash
# In Supabase → Settings → API → "Generate new anon key"
# Update staging .env but NOT production
```

---

## Support & References

**Migration Files:** `ios-app/scripts/prod-migrate/`
**Documentation:** `docs/prod-migrate/plan.md` (this file)
**Auth Pattern Analysis:** `ios-app/scripts/prod-migrate/CHATGPT_CORRECTIONS.md`
**Detailed Guide:** `ios-app/scripts/prod-migrate/PRODUCTION_SETUP_CLEAN.md`

**Supabase Documentation:**
- Database migrations: https://supabase.com/docs/guides/database/migrations
- RLS: https://supabase.com/docs/guides/auth/row-level-security
- Functions: https://supabase.com/docs/guides/database/functions

**Key Insight:** Always test RLS policies with actual authenticated users, not SQL Editor. The SQL Editor bypasses RLS, giving false confidence.

---

## Final Checklist

Before going live:

- [ ] All 10 migration files run successfully
- [ ] `040_manifest.sql` shows all objects present
- [ ] Health check passes
- [ ] All critical columns verified (auth_user_id, crew_size, etc.)
- [ ] RLS helper function tested
- [ ] App tested locally with production database
- [ ] Provider flow tested end-to-end
- [ ] Client flow tested end-to-end
- [ ] Delete client with blockers tested
- [ ] EAS secrets updated
- [ ] Production build created
- [ ] TestFlight build tested
- [ ] Rollback plan understood
- [ ] Baseline manifest saved

**When all checks pass: You're ready for production! 🚀**
