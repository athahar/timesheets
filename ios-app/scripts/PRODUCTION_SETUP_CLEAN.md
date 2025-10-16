# TrackPay Production Database Setup (Schema Only)

**Purpose**: Set up clean production database with correct schema, FK constraints, RLS, and functions.
**No data migration** - users will create fresh data in production.

---

## Quick Setup (5 Steps)

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

Open Production SQL Editor and run these **one at a time**:

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

#### 4.2 Check FK Constraints
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

#### 4.3 Check RPC Function
```sql
SELECT proname, prosecdef as is_security_definer
FROM pg_proc
WHERE proname = 'delete_client_relationship_safely';
```

**Expected:**
- Function exists
- `is_security_definer = true`

#### 4.4 Test RPC (Should Fail - Correct Behavior)
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
1. `20251015_fix_fk_SAFE_SEQUENTIAL.sql` - FK constraint fixes
2. `20251015_fix_session_fk_cascades.sql` - Session FK fixes
3. `20251016_fix_delete_rpc_provider_lookup.sql` - Delete RPC
4. `trackpay_schema.sql` - Table definitions (you'll create this)

---

## Summary

**Time Required:** ~30 minutes

**Steps:**
1. Create production project (5 min)
2. Export schema from staging (2 min)
3. Run 4 migrations in production (10 min)
4. Verify schema (5 min)
5. Update app config (5 min)
6. Test (3 min)

**Result:** Production-ready database with correct schema, no data migration needed!
