# Corrections to ChatGPT's Production Migration Recommendations

## Summary
ChatGPT's recommendations are 90% correct but have **critical auth pattern mismatch** that would break all RLS policies.

---

## ✅ What ChatGPT Got Right

1. **Extensions** - Need `pgcrypto` and `pg_stat_statements`
2. **Realtime Publication** - Need to add tables to `supabase_realtime`
3. **Transaction Guards** - `SET LOCAL lock_timeout/statement_timeout`
4. **Manifest** - Document expected objects for drift detection
5. **Key Rotation** - Rotate staging keys after cutover
6. **Backups** - Enable PITR on production
7. **Smoke Tests** - Verify activity after cutover

---

## ❌ What ChatGPT Got WRONG

### 1. RLS Policies (CRITICAL!)

**ChatGPT's assumption:**
```sql
-- This is WRONG for our schema!
USING (provider_id = auth.uid())
```

**Our actual auth pattern:**
```
auth.users.id (Supabase auth UUID)
    ↓ links via
trackpay_users.auth_user_id
    ↓ our internal ID
trackpay_users.id (different UUID!)
    ↓ used in all FKs
provider_id, client_id in all tables
```

**Why it fails:**
- `auth.uid()` returns `auth.users.id`
- Our FKs use `trackpay_users.id`
- **These are different UUIDs!**

**Correct pattern:**
```sql
-- Must use subquery to look up trackpay_users.id
USING (
  provider_id IN (
    SELECT id FROM trackpay_users
    WHERE auth_user_id = auth.uid() AND role = 'provider'
  )
)
```

**Evidence:**
From `20251016_fix_delete_rpc_provider_lookup.sql`:
```sql
v_auth_id uuid := auth.uid();  -- Get auth ID

-- Look up trackpay_users.id (the fix!)
SELECT id INTO v_provider
FROM trackpay_users
WHERE auth_user_id = v_auth_id AND role = 'provider';
```

### 2. Missing Columns in Schema

**ChatGPT assumed these don't exist (but they DO):**
- `trackpay_users.auth_user_id` (critical link!)
- `trackpay_users.claimed_status` (for invite system)
- `trackpay_users.display_name` (optional)
- `trackpay_sessions.crew_size` (multi-person feature)
- `trackpay_sessions.person_hours` (crew * duration)
- `trackpay_payments.session_ids` (array - multiple sessions per payment)
- `trackpay_invites.expires_at, claimed_at, claimed_by` (invite lifecycle)

### 3. Index Recommendations Need Adjustment

**ChatGPT suggested:**
```sql
idx_sessions_provider_client_status
idx_requests_provider_client_status
```

**What we actually need (based on query analysis):**
```sql
-- Blocker checks (delete client)
CREATE INDEX idx_sessions_provider_client_status
  ON trackpay_sessions(provider_id, client_id, status);

CREATE INDEX idx_requests_provider_client_status
  ON trackpay_requests(provider_id, client_id, status);

-- Client history (most common query)
CREATE INDEX idx_sessions_client_created
  ON trackpay_sessions(client_id, start_time DESC);

-- Activity feed
CREATE INDEX idx_activities_created
  ON trackpay_activities(created_at DESC);

-- Relationship audit (already created in FK migration)
idx_relationship_audit_provider_created (exists)
idx_relationship_audit_client_created (exists)

-- Invites by provider
CREATE INDEX idx_invites_provider_status
  ON trackpay_invites(provider_id, status);
```

---

## 🔧 Required Fixes

### Fix #1: Create RLS Helper Function

```sql
-- Helper function to get trackpay_users.id from auth.uid()
CREATE OR REPLACE FUNCTION public.current_trackpay_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM public.trackpay_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Now policies can use: provider_id = current_trackpay_user_id()
```

### Fix #2: Correct RLS Policies

Use helper function OR subquery in every policy:

**Option A (Cleaner):**
```sql
USING (provider_id = current_trackpay_user_id())
```

**Option B (No function needed):**
```sql
USING (
  provider_id IN (
    SELECT id FROM trackpay_users WHERE auth_user_id = auth.uid()
  )
)
```

### Fix #3: Complete Index List

See index list in section 3 above.

---

## 📋 Corrected Migration Plan

### 000_extensions.sql ✅
```sql
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
COMMIT;
```

### 010_realtime.sql ✅
```sql
BEGIN;
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.trackpay_users,
  public.trackpay_relationships,
  public.trackpay_sessions,
  public.trackpay_requests,
  public.trackpay_payments,
  public.trackpay_activities,
  public.trackpay_invites,
  public.trackpay_relationship_audit;
COMMIT;
```

### 015_rls_helper.sql ⚠️ NEW
```sql
BEGIN;

CREATE OR REPLACE FUNCTION public.current_trackpay_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT id FROM public.trackpay_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

ALTER FUNCTION public.current_trackpay_user_id() SET search_path = public;
GRANT EXECUTE ON FUNCTION public.current_trackpay_user_id() TO authenticated;

COMMIT;
```

### 020_rls_policies.sql ⚠️ FIXED
```sql
-- Use helper function in all policies
-- See detailed policies below
```

### 030_indexes.sql ⚠️ EXPANDED
```sql
-- All performance indexes based on actual queries
-- See index list in Fix #3
```

### 040_manifest.sql ✅
```sql
-- Same as ChatGPT's version
```

---

## ✅ Verified Correct Policies (Examples)

### trackpay_users
```sql
-- Read own profile
CREATE POLICY tp_users_select_self ON trackpay_users
  FOR SELECT TO authenticated
  USING (id = current_trackpay_user_id());

-- Update own profile
CREATE POLICY tp_users_update_self ON trackpay_users
  FOR UPDATE TO authenticated
  USING (id = current_trackpay_user_id())
  WITH CHECK (id = current_trackpay_user_id());
```

### trackpay_relationships
```sql
-- View relationships where I'm involved
CREATE POLICY tp_rels_select_party ON trackpay_relationships
  FOR SELECT TO authenticated
  USING (
    provider_id = current_trackpay_user_id() OR
    client_id = current_trackpay_user_id()
  );

-- Provider can create relationships
CREATE POLICY tp_rels_insert_provider ON trackpay_relationships
  FOR INSERT TO authenticated
  WITH CHECK (provider_id = current_trackpay_user_id());

-- NO DELETE POLICY (RPC only)
REVOKE DELETE ON trackpay_relationships FROM authenticated;
```

### trackpay_sessions
```sql
-- View sessions where I'm involved
CREATE POLICY tp_sessions_select_party ON trackpay_sessions
  FOR SELECT TO authenticated
  USING (
    provider_id = current_trackpay_user_id() OR
    client_id = current_trackpay_user_id()
  );

-- Provider owns session
CREATE POLICY tp_sessions_insert_provider ON trackpay_sessions
  FOR INSERT TO authenticated
  WITH CHECK (provider_id = current_trackpay_user_id());

CREATE POLICY tp_sessions_update_provider ON trackpay_sessions
  FOR UPDATE TO authenticated
  USING (provider_id = current_trackpay_user_id())
  WITH CHECK (provider_id = current_trackpay_user_id());
```

---

## 🎯 Bottom Line

**What to keep from ChatGPT:**
- Extensions, Realtime, Transaction guards, Manifest, Key rotation, Backups

**What to fix:**
1. Add RLS helper function (`current_trackpay_user_id()`)
2. Rewrite ALL RLS policies to use helper or subquery
3. Expand index list based on actual queries
4. Verify all column names match our schema

**Result:**
Production-ready migration that actually works with our auth pattern!
