# TrackPay Production Database Migration Checklist

**Created**: 2025-10-16
**Purpose**: Step-by-step guide to migrate TrackPay from staging to production database

---

## Tables Used in TrackPay (8 Total)

| Table | Purpose | Critical? |
|-------|---------|-----------|
| `trackpay_users` | Provider and client accounts | ✅ YES |
| `trackpay_relationships` | Provider-client connections | ✅ YES |
| `trackpay_sessions` | Work tracking sessions | ✅ YES |
| `trackpay_payments` | Payment records (financial) | ✅ YES |
| `trackpay_requests` | Payment request workflow | ✅ YES |
| `trackpay_activities` | Activity feed/audit trail | ⚠️ AUDIT |
| `trackpay_invites` | Client invitation system | 🔄 EPHEMERAL |
| `trackpay_relationship_audit` | Relationship deletion audit | 🔍 AUDIT |

---

## Pre-Migration Checklist

### 1. Verify Staging Database State

```sql
-- Run in Supabase SQL Editor (Staging)

-- Count records in each table
SELECT 'trackpay_users' as table_name, COUNT(*) as records FROM trackpay_users
UNION ALL SELECT 'trackpay_relationships', COUNT(*) FROM trackpay_relationships
UNION ALL SELECT 'trackpay_sessions', COUNT(*) FROM trackpay_sessions
UNION ALL SELECT 'trackpay_payments', COUNT(*) FROM trackpay_payments
UNION ALL SELECT 'trackpay_requests', COUNT(*) FROM trackpay_requests
UNION ALL SELECT 'trackpay_activities', COUNT(*) FROM trackpay_activities
UNION ALL SELECT 'trackpay_invites', COUNT(*) FROM trackpay_invites
UNION ALL SELECT 'trackpay_relationship_audit', COUNT(*) FROM trackpay_relationship_audit;
```

- [ ] **Record row counts** (you'll verify these after migration)
- [ ] **Export critical data** as backup (payments, sessions)

### 2. Verify FK Constraints Are Correct

```sql
-- Check foreign key delete rules
SELECT
  conname,
  conrelid::regclass AS table_name,
  CASE confdeltype
    WHEN 'r' THEN 'RESTRICT ✅'
    WHEN 'c' THEN 'CASCADE ⚠️'
    WHEN 'n' THEN 'SET NULL ✅'
    WHEN 'a' THEN 'NO ACTION'
  END AS delete_action
FROM pg_constraint
WHERE conname LIKE '%trackpay_%_fkey'
  AND contype = 'f'
ORDER BY table_name, conname;
```

**Expected FK Constraints:**
- [ ] `trackpay_sessions` → `trackpay_users` (client_id, provider_id): **RESTRICT** ✅
- [ ] `trackpay_relationships` → `trackpay_users`: **RESTRICT** ✅
- [ ] `trackpay_payments` → `trackpay_users`: **RESTRICT** ✅
- [ ] `trackpay_payments` → `trackpay_sessions`: **RESTRICT** ✅
- [ ] `trackpay_requests` → `trackpay_users`: **RESTRICT** ✅
- [ ] `trackpay_requests` → `trackpay_sessions`: **SET NULL** ✅
- [ ] `trackpay_activities` → `trackpay_sessions`: **SET NULL** ✅
- [ ] `trackpay_invites` → `trackpay_users` (client_id, provider_id): **CASCADE** ⚠️ (intentional)
- [ ] `trackpay_invites` → `trackpay_users` (claimed_by): **SET NULL** ✅

---

## Migration Steps

### Step 1: Create Production Supabase Project

1. **Create New Project**
   - [ ] Go to https://supabase.com/dashboard
   - [ ] Click "New Project"
   - [ ] Name: `trackpay-production` (or your preferred name)
   - [ ] Region: Choose closest to your users
   - [ ] Database Password: **Save this securely!**

2. **Save Connection Details**
   - [ ] Project URL: `https://[PROJECT-ID].supabase.co`
   - [ ] Anon/Public Key: Copy from Settings → API
   - [ ] Database URL: Copy from Settings → Database → Connection String

### Step 2: Export Schema from Staging

**Method A: Use Supabase Dashboard (Easiest)**

For each table:
- [ ] `trackpay_users`
- [ ] `trackpay_relationships`
- [ ] `trackpay_sessions`
- [ ] `trackpay_payments`
- [ ] `trackpay_requests`
- [ ] `trackpay_activities`
- [ ] `trackpay_invites`
- [ ] `trackpay_relationship_audit`

Steps:
1. Go to Table Editor in staging project
2. Select table
3. Click "..." menu → "Clone table"
4. Copy the generated SQL
5. Save to a file: `schema_export.sql`

**Method B: Use pg_dump (More Complete)**

```bash
# Get your staging database URL from Supabase → Settings → Database
# Format: postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres

pg_dump "[STAGING_DATABASE_URL]" \
  -t 'public.trackpay_*' \
  --schema-only \
  --no-owner \
  --no-acl \
  > trackpay_schema.sql
```

- [ ] Run pg_dump command
- [ ] Verify file created: `trackpay_schema.sql`

### Step 3: Run Schema in Production

1. **Open Production SQL Editor**
   - [ ] Go to production project → SQL Editor

2. **Create Tables** (from export)
   - [ ] Paste `trackpay_schema.sql` content
   - [ ] Run query
   - [ ] Verify 8 tables created

3. **Verify Table Structure**
   ```sql
   -- List all TrackPay tables
   SELECT tablename FROM pg_tables
   WHERE schemaname = 'public' AND tablename LIKE 'trackpay_%'
   ORDER BY tablename;
   ```
   - [ ] Should show 8 tables

### Step 4: Run FK Constraint Fixes

Run these migrations **in order**:

1. **Fix User FK Constraints**
   ```bash
   # Open: scripts/20251015_fix_fk_SAFE_SEQUENTIAL.sql
   # Run SECTIONS 1-12 one at a time in Production SQL Editor
   ```
   - [ ] Section 1: `trackpay_sessions.client_id` → RESTRICT
   - [ ] Section 2: `trackpay_sessions.provider_id` → RESTRICT
   - [ ] Section 3: `trackpay_relationships.client_id` → RESTRICT
   - [ ] Section 4: `trackpay_relationships.provider_id` → RESTRICT
   - [ ] Section 5: `trackpay_payments` → RESTRICT
   - [ ] Section 6: `trackpay_requests` → RESTRICT
   - [ ] Section 7: `trackpay_activities` → RESTRICT
   - [ ] Section 8: `trackpay_invites` → CASCADE (correct)
   - [ ] Section 9: Remove DELETE policy on relationships
   - [ ] Section 10: Create audit table
   - [ ] Section 11: Create RPC function
   - [ ] Section 12: Verify constraints

2. **Fix Session FK Constraints**
   ```bash
   # Open: scripts/20251015_fix_session_fk_cascades.sql
   # Run all sections
   ```
   - [ ] `trackpay_payments.session_id` → RESTRICT
   - [ ] `trackpay_requests.session_id` → SET NULL
   - [ ] `trackpay_activities.session_id` → SET NULL

3. **Create Delete RPC**
   ```bash
   # Open: scripts/20251016_fix_delete_rpc_provider_lookup.sql
   # Run entire file
   ```
   - [ ] Function created: `delete_client_relationship_safely()`
   - [ ] Permissions granted to `authenticated` role

### Step 5: Enable RLS Policies

```sql
-- Enable RLS on all tables
ALTER TABLE trackpay_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trackpay_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE trackpay_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trackpay_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE trackpay_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE trackpay_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE trackpay_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE trackpay_relationship_audit ENABLE ROW LEVEL SECURITY;
```

**Create Basic RLS Policies** (customize as needed):

```sql
-- Example: Users can read their own data
CREATE POLICY users_select_own
  ON trackpay_users FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

-- Relationships: providers can manage their relationships
CREATE POLICY rel_select_by_provider
  ON trackpay_relationships FOR SELECT
  TO authenticated
  USING (provider_id IN (
    SELECT id FROM trackpay_users WHERE auth_user_id = auth.uid()
  ));

-- Sessions: users can see sessions they're involved in
CREATE POLICY sessions_select_involved
  ON trackpay_sessions FOR SELECT
  TO authenticated
  USING (
    provider_id IN (SELECT id FROM trackpay_users WHERE auth_user_id = auth.uid())
    OR client_id IN (SELECT id FROM trackpay_users WHERE auth_user_id = auth.uid())
  );

-- Add more policies as needed...
```

- [ ] RLS enabled on all 8 tables
- [ ] Basic policies created
- [ ] Test policies work

### Step 6: Verify Production Schema

Run verification queries:

```sql
-- 1. Check FK constraints
SELECT
  conname,
  conrelid::regclass AS table_name,
  CASE confdeltype
    WHEN 'r' THEN 'RESTRICT ✅'
    WHEN 'c' THEN 'CASCADE ⚠️'
    WHEN 'n' THEN 'SET NULL ✅'
  END AS delete_action
FROM pg_constraint
WHERE conname LIKE '%trackpay_%_fkey'
ORDER BY table_name;
```

- [ ] All constraints match expected values (see Pre-Migration section)

```sql
-- 2. Check RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'trackpay_%';
```

- [ ] All tables show `rowsecurity = true`

```sql
-- 3. Check RPC exists
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'delete_client_relationship_safely';
```

- [ ] Function exists and shows correct code

```sql
-- 4. Check indexes
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public' AND tablename LIKE 'trackpay_%'
ORDER BY tablename;
```

- [ ] Expected indexes exist (composite indexes on relationships, sessions, etc.)

### Step 7: Migrate Data (Optional)

**If starting fresh:** Skip this step, let users create new data.

**If migrating existing users:**

```bash
# Export data from staging
pg_dump "[STAGING_DATABASE_URL]" \
  -t 'public.trackpay_*' \
  --data-only \
  --no-owner \
  --no-acl \
  > trackpay_data.sql

# Import to production
psql "[PRODUCTION_DATABASE_URL]" < trackpay_data.sql
```

- [ ] Data exported from staging
- [ ] Data imported to production
- [ ] Verify row counts match staging

### Step 8: Update App Configuration

1. **Update Environment Variables**

   Edit `ios-app/.env`:
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=https://[PRODUCTION-PROJECT-ID].supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=[PRODUCTION-ANON-KEY]
   ```
   - [ ] `.env` file updated
   - [ ] Test in local development

2. **Update EAS Secrets** (for production builds)
   ```bash
   cd ios-app

   # Update production URL
   eas secret:create --scope project --name SUPABASE_URL \
     --value "https://[PRODUCTION-PROJECT-ID].supabase.co" \
     --force

   # Update production anon key
   eas secret:create --scope project --name SUPABASE_ANON_KEY \
     --value "[PRODUCTION-ANON-KEY]" \
     --force
   ```
   - [ ] EAS secrets updated
   - [ ] Secrets verified: `eas secret:list`

3. **Update `eas.json`** (if hardcoded)
   - [ ] Check no hardcoded staging URLs
   - [ ] Verify using `$SUPABASE_URL` variable

### Step 9: Test Production Database

1. **Test App Locally**
   ```bash
   cd ios-app
   npm run web
   ```

   Test flows:
   - [ ] User registration works
   - [ ] User login works
   - [ ] Add client works
   - [ ] Start/stop session works
   - [ ] Mark paid works
   - [ ] Delete client works
   - [ ] Activity feed loads
   - [ ] No console errors

2. **Test Delete RPC** (in Production SQL Editor)
   ```sql
   -- This should fail with "Not authenticated" (correct behavior)
   SELECT delete_client_relationship_safely('00000000-0000-0000-0000-000000000000');
   ```
   - [ ] Returns expected error (RPC working)

3. **Check Audit Log**
   ```sql
   SELECT * FROM trackpay_relationship_audit ORDER BY created_at DESC LIMIT 10;
   ```
   - [ ] Audit logs being created

### Step 10: Deploy to Production

1. **Build Production App**
   ```bash
   cd ios-app

   # iOS TestFlight build
   eas build --platform ios --profile production

   # Submit to App Store
   eas submit --platform ios
   ```
   - [ ] Build completes successfully
   - [ ] No environment variable errors
   - [ ] App submitted to TestFlight/App Store

2. **Test Production Build**
   - [ ] Download from TestFlight
   - [ ] Test all critical flows
   - [ ] Verify connects to production database
   - [ ] No crashes or errors

---

## Post-Migration

### Cleanup Staging Database (Optional)

After successful production migration:

1. **List Unrelated Tables**
   ```sql
   SELECT tablename
   FROM pg_tables
   WHERE schemaname = 'public'
     AND tablename NOT LIKE 'trackpay_%'
   ORDER BY tablename;
   ```

2. **Drop Unrelated Tables** (BE CAREFUL!)
   ```sql
   -- Review list above first!
   DROP TABLE IF EXISTS unrelated_table_1 CASCADE;
   DROP TABLE IF EXISTS unrelated_table_2 CASCADE;
   ```

### Monitor Production

- [ ] Set up Supabase monitoring/alerts
- [ ] Monitor error logs
- [ ] Check database size growth
- [ ] Review RLS policy effectiveness

---

## Rollback Plan

If something goes wrong:

1. **Immediate Rollback**
   - [ ] Revert `.env` to staging values
   - [ ] Revert EAS secrets: `eas secret:create --force`
   - [ ] Redeploy app with staging config

2. **Database Issues**
   - [ ] Check Supabase logs
   - [ ] Verify RLS policies
   - [ ] Test RPC functions manually
   - [ ] Check FK constraints

---

## Success Criteria

Migration is successful when:

- [ ] All 8 TrackPay tables exist in production
- [ ] FK constraints are correct (RESTRICT for business data)
- [ ] RLS policies are active and working
- [ ] RPC function `delete_client_relationship_safely()` works
- [ ] App connects to production database
- [ ] All critical user flows work (register, login, track time, payments)
- [ ] No data loss
- [ ] Audit logging active

---

## Support

**Supabase Documentation:**
- Database migrations: https://supabase.com/docs/guides/database/migrations
- RLS: https://supabase.com/docs/guides/auth/row-level-security
- Functions: https://supabase.com/docs/guides/database/functions

**TrackPay Scripts:**
- `PRODUCTION_SCHEMA_EXPORT.sql` - Export queries
- `20251015_fix_fk_SAFE_SEQUENTIAL.sql` - FK constraint fixes
- `20251015_fix_session_fk_cascades.sql` - Session FK fixes
- `20251016_fix_delete_rpc_provider_lookup.sql` - Delete RPC
