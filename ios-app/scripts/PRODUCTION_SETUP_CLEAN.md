# TrackPay Production Database Setup (Schema Only)

**Purpose**: Set up clean production database with correct schema, FK constraints, RLS, and functions.
**No data migration** - users will create fresh data in production.

---

## Quick Setup (5 Steps, ~45 minutes)

### Step 1: Create Production Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Name: `trackpay-production`
4. Choose region (closest to users)
5. Set strong database password
6. **Save these values:**
   - Project URL: `https://[PROJECT-ID].supabase.co`
   - Anon Key: Settings → API → `anon/public` key

---

### Step 2: Get Schema from Staging

**Option A: Use pg_dump (Recommended)**

```bash
# Get your staging database URL from Supabase → Settings → Database → Connection String
# Format: postgresql://postgres:[PASSWORD]@db.[PROJECT-ID].supabase.co:5432/postgres

pg_dump "postgresql://postgres:[PASSWORD]@[STAGING-HOST]:5432/postgres" \
  -t 'public.trackpay_*' \
  --schema-only \
  --no-owner \
  --no-acl \
  > trackpay_schema.sql
```

This creates `trackpay_schema.sql` with all 8 tables.

**Option B: Use Supabase Dashboard**

For each table in staging (trackpay_users, trackpay_relationships, trackpay_sessions, trackpay_payments, trackpay_requests, trackpay_activities, trackpay_invites):
1. Go to Table Editor
2. Click table → "..." menu → "Duplicate table"
3. Copy the SQL
4. Paste into a file: `trackpay_schema.sql`

---

### Step 3: Run Migrations in Production (IN ORDER)

Open Production SQL Editor and run these **one at a time** in this exact order:

#### 3.0 Install Extensions (CRITICAL - RUN FIRST!)
```bash
# Open: scripts/000_extensions.sql
# Run entire file
```

**What this does:**
- Installs `pgcrypto` (UUID generation)
- Installs `pg_stat_statements` (query monitoring)
- Required for table defaults and performance analysis

#### 3.1 Create Tables
```sql
-- Paste contents of trackpay_schema.sql here
-- This creates all 8 tables with basic structure
```

#### 3.2 Fix FK Constraints (CRITICAL!)
```bash
# Open: scripts/20251015_fix_fk_SAFE_SEQUENTIAL.sql
# Run EACH SECTION separately (1-12)
```

**What this does:**
- Changes FK delete rules from CASCADE → RESTRICT (protects financial data)
- Creates audit table for relationship deletions
- Removes direct DELETE access (forces RPC usage)

#### 3.3 Fix Session FK Constraints
```bash
# Open: scripts/20251015_fix_session_fk_cascades.sql
# Run entire file
```

**What this does:**
- Payments → sessions: RESTRICT (can't delete session with payments)
- Requests → sessions: SET NULL (preserve audit trail)
- Activities → sessions: SET NULL (preserve audit trail)

#### 3.4 Create Delete Client RPC
```bash
# Open: scripts/20251016_fix_delete_rpc_provider_lookup.sql
# Run entire file
```

**What this does:**
- Creates `delete_client_relationship_safely()` function
- Includes provider ID lookup fix
- Adds blocker checks and audit logging

#### 3.5 Enable Realtime
```bash
# Open: scripts/010_realtime.sql
# Run entire file
```

**What this does:**
- Adds all 8 TrackPay tables to `supabase_realtime` publication
- Enables real-time subscriptions for live updates in app

#### 3.6 Create RLS Helper Function (CRITICAL!)
```bash
# Open: scripts/015_rls_helper.sql
# Run entire file
```

**What this does:**
- Creates `current_trackpay_user_id()` helper function
- Maps `auth.uid()` → `trackpay_users.id` (required for RLS)
- Adds unique constraint on `auth_user_id` (prevents ghost users)

**Why this is critical:**
- Auth pattern: `auth.uid()` returns `auth.users.id`
- Our FKs use `trackpay_users.id` (different UUID!)
- Helper bridges the gap for RLS policies

#### 3.7 Enable RLS Policies
```bash
# Open: scripts/020_rls_policies.sql
# Run entire file
```

**What this does:**
- Enables Row Level Security on all 8 tables
- Creates policies using `current_trackpay_user_id()` helper
- Providers can only see/modify their own data
- Clients can view sessions/payments involving them
- Prevents unauthorized data access

#### 3.8 Create Performance Indexes
```bash
# Open: scripts/030_indexes.sql
# Run entire file
```

**What this does:**
- Creates indexes for blocker checks (delete operations)
- Indexes for history screens (client/provider views)
- Activity feed indexes
- Invite management indexes
- ~14 total indexes for optimal query performance

---

### Step 4: Verify Production Schema

Run these verification queries in Production SQL Editor:

#### 4.1 Check Tables Exist
```sql
SELECT tablename,
       pg_size_pretty(pg_total_relation_size('public.' || tablename)) as size
FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'trackpay_%'
ORDER BY tablename;
```

**Expected: 8 tables**
- trackpay_activities
- trackpay_invites
- trackpay_payments
- trackpay_relationship_audit
- trackpay_relationships
- trackpay_requests
- trackpay_sessions
- trackpay_users

#### 4.2 Check Extensions Installed
```sql
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('pgcrypto', 'pg_stat_statements');
```

**Expected:**
- pgcrypto (version 1.3+)
- pg_stat_statements (version 1.7+)

#### 4.3 Check Realtime Publication
```sql
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename LIKE 'trackpay_%'
ORDER BY tablename;
```

**Expected: All 8 TrackPay tables in realtime publication**

#### 4.4 Check RLS Helper Function
```sql
SELECT proname, prosecdef as is_security_definer
FROM pg_proc
WHERE proname IN ('current_trackpay_user_id', 'delete_client_relationship_safely');
```

**Expected:**
- `current_trackpay_user_id` - `is_security_definer = true`
- `delete_client_relationship_safely` - `is_security_definer = true`

#### 4.5 Check Unique Constraint on auth_user_id
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE indexname = 'ux_trackpay_users_auth_user';
```

**Expected:**
- Index exists with UNIQUE constraint on `auth_user_id`
- **Critical:** Prevents ghost user bugs

#### 4.6 Check RLS Enabled
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'trackpay_%';
```

**Expected: All 8 tables show `rowsecurity = true`**

#### 4.7 Check RLS Policies
```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'trackpay_%'
ORDER BY tablename, policyname;
```

**Expected: ~18 policies across all tables**
- Each table should have SELECT policy
- Most tables have INSERT/UPDATE policies
- DELETE policies removed (use RPC instead)

#### 4.8 Check Performance Indexes
```sql
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'trackpay_%'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

**Expected: ~14 custom indexes**
- Blocker check indexes (sessions, requests)
- History screen indexes
- Activity feed indexes
- Invite management indexes

#### 4.9 Check FK Constraints
```sql
SELECT
  conrelid::regclass AS table_name,
  conname,
  CASE confdeltype
    WHEN 'r' THEN 'RESTRICT ✅'
    WHEN 'c' THEN 'CASCADE ⚠️'
    WHEN 'n' THEN 'SET NULL ✅'
  END AS delete_action
FROM pg_constraint
WHERE conname LIKE '%trackpay_%_fkey'
  AND contype = 'f'
ORDER BY table_name, conname;
```

**Expected constraints:**

| Table | Column | Delete Action | Why |
|-------|--------|---------------|-----|
| trackpay_sessions | client_id, provider_id | RESTRICT ✅ | Protect work history |
| trackpay_relationships | client_id, provider_id | RESTRICT ✅ | Protect connections |
| trackpay_payments | client_id, provider_id, session_id | RESTRICT ✅ | **Financial data - never cascade!** |
| trackpay_requests | client_id, provider_id | RESTRICT ✅ | Protect payment requests |
| trackpay_requests | session_id | SET NULL ✅ | Preserve audit trail |
| trackpay_activities | client_id, provider_id | RESTRICT ✅ | Protect audit log |
| trackpay_activities | session_id | SET NULL ✅ | Preserve audit trail |
| trackpay_invites | client_id, provider_id | CASCADE ⚠️ | Ephemeral - cleanup OK |
| trackpay_invites | claimed_by | SET NULL ✅ | Preserve invite record |

#### 4.10 Run Complete Manifest Check
```bash
# Open: scripts/040_manifest.sql
# Run entire file
```

**What this does:**
- Generates complete object inventory (tables, indexes, functions, policies, constraints)
- Shows expected vs actual object counts
- Verifies all critical objects exist
- **Save output for drift detection**

#### 4.11 Test RPC (Should Fail - Correct Behavior)
```sql
-- This should fail with "Not authenticated" - that's correct!
SELECT delete_client_relationship_safely('00000000-0000-0000-0000-000000000000');
```

**Expected Error:** `P0001: Not authenticated.`
(This proves the RPC is working - it only works from authenticated app, not SQL editor)

---

### Step 5: Update App Configuration

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

# Verify
eas secret:list
```

---

## Testing Checklist

Test these flows in the app (connected to production):

- [ ] **User Registration** - Create provider account
- [ ] **User Login** - Login works
- [ ] **Add Client** - Create client relationship
- [ ] **Start Session** - Track time
- [ ] **Stop Session** - End session, calculate amount
- [ ] **Request Payment** - Create payment request
- [ ] **Mark Paid** - Record payment
- [ ] **Delete Client** - Remove relationship (with blockers working)
- [ ] **Activity Feed** - Shows all actions
- [ ] **Invite Client** - Generate invite code
- [ ] **Claim Invite** - Client registers via invite

---

## What You Should See

### On First Login (Empty Database)
- Welcome screen with "Add Client" button
- No data (fresh start)
- All features work as expected

### After Using App
- Tables populate with real data
- FK constraints prevent accidental deletions
- Delete client blocked if unpaid work exists
- Audit logs track relationship deletions

---

## Common Issues & Fixes

### Issue: "relation 'trackpay_users' does not exist"
**Cause:** Tables not created in production
**Fix:** Run Step 3.1 (create tables)

### Issue: App crashes when deleting client
**Cause:** FK constraints still CASCADE
**Fix:** Run Step 3.2 (fix FK constraints)

### Issue: "function delete_client_relationship_safely does not exist"
**Cause:** RPC not created
**Fix:** Run Step 3.4 (create RPC)

### Issue: Delete succeeds but client still shows in list
**Cause:** Old RPC version (provider ID mismatch)
**Fix:** Re-run Step 3.4 with latest version

### Issue: "Cannot delete. Active or unpaid sessions exist"
**Cause:** Blockers working correctly!
**Fix:** Mark sessions as paid first, then delete

---

## Rollback to Staging

If you need to switch back:

```bash
# Update .env
EXPO_PUBLIC_SUPABASE_URL=https://[STAGING-PROJECT-ID].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[STAGING-ANON-KEY]

# Update EAS secrets
eas secret:create --scope project --name SUPABASE_URL --value "[STAGING-URL]" --force
eas secret:create --scope project --name SUPABASE_ANON_KEY --value "[STAGING-KEY]" --force
```

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

The app will connect to production database with:
- ✅ Clean schema
- ✅ Correct FK constraints
- ✅ Secure delete function
- ✅ Audit logging
- ✅ Fresh data (no staging baggage)

---

## Files You Need

All in `ios-app/scripts/`:

**Production Hardening Migrations (NEW):**
1. `000_extensions.sql` - PostgreSQL extensions (pgcrypto, pg_stat_statements)
2. `010_realtime.sql` - Realtime publication setup
3. `015_rls_helper.sql` - RLS helper function + auth_user_id unique constraint
4. `020_rls_policies.sql` - Row Level Security policies
5. `030_indexes.sql` - Performance indexes
6. `040_manifest.sql` - Schema drift detection queries

**Original Migrations:**
7. `20251015_fix_fk_SAFE_SEQUENTIAL.sql` - FK constraint fixes
8. `20251015_fix_session_fk_cascades.sql` - Session FK fixes
9. `20251016_fix_delete_rpc_provider_lookup.sql` - Delete RPC

**Schema Export (You'll Create):**
10. `trackpay_schema.sql` - Table definitions (created via pg_dump)

---

## Summary

**Time Required:** ~45 minutes

**Steps:**
1. Create production project (5 min)
2. Export schema from staging (2 min)
3. Run 10 migrations in production (20 min)
   - Extensions
   - Tables
   - FK fixes (3 files)
   - Realtime
   - RLS helper
   - RLS policies
   - Indexes
4. Verify schema (10 min - comprehensive checks)
5. Update app config (5 min)
6. Test (3 min)

**Result:** Production-ready database with:
- ✅ Clean schema
- ✅ Correct FK constraints
- ✅ Row Level Security enabled
- ✅ Performance indexes
- ✅ Realtime subscriptions
- ✅ Secure delete function
- ✅ Audit logging
- ✅ Fresh data (no staging baggage)
