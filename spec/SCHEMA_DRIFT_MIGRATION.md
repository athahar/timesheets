# Schema Drift Migration - TrackPay Database

## 🚨 CRITICAL: Action Required

**Status**: Captured but NOT yet applied to production
**Priority**: High
**Risk Level**: Medium (contains DROP statements)
**Effort**: 2-4 hours for review and testing

---

## Overview

A comprehensive schema diff was captured from the staging database showing significant drift from the migration files. The original capture was **106KB** with many unrelated tables from other projects. After filtering to TrackPay tables only, the diff is **13KB** with approximately **1000 lines** of changes.

### What Happened

1. **Original Schema**: Defined in `supabase/migrations/20250120000000_initial_schema.sql`
2. **Manual Changes in Staging**: Developers made schema changes directly in Supabase SQL Editor
3. **No Migration Files Created**: Changes were never captured as migration files
4. **Production Created from Migrations**: Production database built from files, missing manual changes
5. **Result**: Staging and production have different schemas

---

## Files

### Migration Files

- **Filtered Migration**: `supabase/migrations/20251021064724_capture_staging_manual_changes.sql` (13KB, TrackPay only)
- **Original Backup**: `supabase/migrations/20251021064724_capture_staging_manual_changes.sql.BACKUP` (106KB, all tables)
- **Focused Email Fix**: `supabase/migrations/20251021064751_make_email_nullable_production_fix.sql` (APPLIED TO PRODUCTION)

### Status

✅ **Email nullable fix applied** - Production can now create clients without email
⚠️ **Remaining drift NOT applied** - 13KB of other changes still pending review

---

## Summary of Changes (TrackPay Tables Only)

### Dropped Policies (RLS)
- `tp_users_insert_self`, `tp_users_select_self`, `tp_users_update_self`
- `tp_sessions_*` policies (insert, select, update)
- `tp_payments_*` policies
- `tp_invites_*` policies
- `tp_requests_*` policies
- `tp_rels_*` policies (relationships)
- `tp_activities_select_party`
- `tp_rel_audit_select_provider`

### Dropped Constraints
- `trackpay_activities_user_id_fkey` (foreign key)
- `trackpay_users.claimed_status_check` (check constraint)
- `trackpay_users.trackpay_users_auth_user_id_key` (unique constraint)
- `trackpay_invites.trackpay_invites_status_check`
- `trackpay_requests.trackpay_requests_status_check`

### Dropped Function
- `current_trackpay_user_id()` - Helper function for RLS

### Dropped Indexes
- `trackpay_users_auth_user_id_key`
- `ux_trackpay_users_auth_user`

### Table: `trackpay_activities`
**Columns Dropped:**
- `activity_type` (TEXT)
- `description` (TEXT)
- `metadata` (JSONB)
- `user_id` (UUID with FK)

**Columns Added:**
- `data` (JSONB)
- `type` (TEXT NOT NULL)

**Columns Modified:**
- `created_at`: DROP NOT NULL

### Table: `trackpay_invites`
**Columns Dropped:**
- `client_email` (TEXT)
- `client_name` (TEXT)
- `hourly_rate` (DECIMAL)
- `updated_at` (TIMESTAMPTZ)

**Columns Modified:**
- `client_id`: SET NOT NULL
- `created_at`: DROP NOT NULL
- `invite_code`: Change to VARCHAR(8)
- `status`: Change to VARCHAR(20), DROP NOT NULL, SET DEFAULT 'pending'

**Row Level Security:**
- DISABLED (previously enabled)

### Table: `trackpay_payments`
**Columns Dropped:**
- `notes` (TEXT)
- `payment_date` (TIMESTAMPTZ)
- `payment_method` (TEXT)
- `updated_at` (TIMESTAMPTZ)

**Columns Added:**
- `method` (TEXT)
- `note` (TEXT)
- `status` (TEXT DEFAULT 'completed')

**Columns Modified:**
- `client_id`: DROP NOT NULL
- `created_at`: DROP NOT NULL
- `provider_id`: DROP NOT NULL
- `session_ids`: DROP DEFAULT, DROP NOT NULL

### Table: `trackpay_relationships`
**Columns Dropped:**
- `hourly_rate` (DECIMAL)
- `updated_at` (TIMESTAMPTZ)

**Columns Modified:**
- `client_id`: DROP NOT NULL
- `created_at`: DROP NOT NULL
- `provider_id`: DROP NOT NULL

### Table: `trackpay_requests`
**Columns Dropped:**
- `requested_at` (TIMESTAMPTZ)
- `responded_at` (TIMESTAMPTZ)

**Columns Modified:**
- `client_id`: DROP NOT NULL
- `created_at`: DROP NOT NULL
- `provider_id`: DROP NOT NULL
- `status`: DROP NOT NULL
- `updated_at`: DROP NOT NULL

### Table: `trackpay_sessions`
**Columns Dropped:**
- `notes` (TEXT)

**Columns Modified:**
- `client_id`: DROP NOT NULL
- `created_at`: DROP NOT NULL
- `provider_id`: DROP NOT NULL
- `status`: DROP NOT NULL
- `updated_at`: DROP NOT NULL

### Table: `trackpay_users`
**Columns Dropped:**
- `phone` (TEXT)

**Columns Modified:**
- ✅ `email`: DROP NOT NULL (APPLIED VIA FOCUSED MIGRATION)
- `created_at`: DROP NOT NULL
- `updated_at`: DROP NOT NULL

### New Indexes
- `idx_trackpay_users_auth_user_id`
- `idx_trackpay_users_email`

### New Triggers
- `trigger_set_display_name_from_email` (on trackpay_users)
- `update_trackpay_*_updated_at` triggers on multiple tables

---

## Risk Assessment

### 🔴 High Risk Changes
- **DROP POLICY statements** - Could expose data if RLS was protecting it
- **DROP CONSTRAINT checks** - Could allow invalid data
- **Disabling RLS** on trackpay_invites - Security risk

### 🟡 Medium Risk Changes
- **DROP COLUMN statements** - Potential data loss if columns have data
- **DROP NOT NULL** on FK columns - Could create orphaned records
- **Column type changes** - Might fail if data doesn't fit new type

### 🟢 Low Risk Changes
- **ADD COLUMN** statements - Safe, just new fields
- **CREATE INDEX** - Performance improvement, no data risk
- **CREATE TRIGGER** - New functionality, shouldn't break existing

---

## Recommended Action Plan

### Phase 1: Immediate (DONE ✅)
- [x] Apply focused email nullable fix to production
- [x] Test client creation in production
- [x] Document remaining drift in this spec

### Phase 2: Review (Next 1-2 weeks)
- [ ] **Review each DROP POLICY** - Understand why it was removed
- [ ] **Review RLS disablement** on trackpay_invites - Is this intentional?
- [ ] **Check DROP COLUMN changes** - Is data in those columns? Do we need it?
- [ ] **Review DROP NOT NULL changes** - Why were constraints removed?
- [ ] **Test column renames** - Ensure app code still works

### Phase 3: Create Incremental Migrations (Week 3-4)
Instead of applying the full 13KB migration, break it into smaller, safer migrations:

1. **Migration 1**: RLS policy updates
2. **Migration 2**: trackpay_activities schema changes
3. **Migration 3**: trackpay_invites changes
4. **Migration 4**: trackpay_payments changes
5. **Migration 5**: Other table changes
6. **Migration 6**: New indexes and triggers

### Phase 4: Testing (Week 4-5)
- [ ] Apply migrations to local Supabase instance
- [ ] Run full app test suite
- [ ] Test all user flows (provider + client)
- [ ] Verify data integrity

### Phase 5: Production Deployment (Week 5-6)
- [ ] Apply migrations to staging first
- [ ] Monitor for 1 week
- [ ] Apply to production during low-traffic window
- [ ] Monitor closely for 24-48 hours

---

## Questions to Answer

Before applying the full migration, research these questions:

1. **Why was RLS disabled on trackpay_invites?** Security concern?
2. **Why were so many NOT NULL constraints removed?** Data quality impact?
3. **Why was `trackpay_activities` restructured?** Breaking change for app?
4. **Why were `phone`, `notes`, etc. columns removed?** Is data there?
5. **Why was `current_trackpay_user_id()` dropped?** Used by RLS policies?

---

## How to Apply (When Ready)

### Option A: Apply Full Migration (RISKY)
```bash
# NOT RECOMMENDED - too many changes at once
supabase link --project-ref ddxggihlncanqdypzsnn
supabase db push --linked
```

### Option B: Apply Incrementally (RECOMMENDED)
```bash
# Create separate migrations for each logical group
supabase migration new update_rls_policies
supabase migration new restructure_activities_table
# etc...

# Test each one
supabase db reset --local
# If tests pass, push to production one at a time
```

---

## Prevention Strategy

**✅ IMPLEMENTED**: Git hooks and workflow now prevent future schema drift

See `docs/deploy/DATABASE_WORKFLOW.md` for the new migration-first workflow.

---

## Timeline

- **Oct 20, 2025**: Schema drift discovered during client creation error investigation
- **Oct 20, 2025**: Full diff captured (106KB), filtered to TrackPay only (13KB)
- **Oct 20, 2025**: Focused email migration created and applied to production ✅
- **Oct 20, 2025**: This spec created for remaining drift
- **TBD**: Review and incremental migration plan

---

## Contact

For questions about this migration, contact the developer who made the manual changes in staging, or review the Supabase SQL Editor history.

**Last Updated**: October 20, 2025
**Author**: Claude (AI Assistant)
**Reviewers**: Pending
