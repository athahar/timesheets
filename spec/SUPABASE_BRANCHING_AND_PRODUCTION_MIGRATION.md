# TrackPay: Supabase Branching Strategy & Production Migration

**Created:** October 20, 2025
**Last Updated:** October 20, 2025 (Production Deployment Complete)
**Status:** 🎉 **85% COMPLETE** (Phases 1-4, 6 Done - Production Live!)
**Estimated Time:** ~3 hours total (2.5 hours completed, 1 hour remaining)
**CLI Version:** Supabase v2.51.0

---

## 🎯 **Progress Summary**

**✅ PRODUCTION DEPLOYMENT COMPLETE!**

**Completed:**
- ✅ Phase 1: Foundation Setup (CLI installed, linked to staging)
- ✅ Phase 2: Migration Organization (9 migrations organized, seed.sql created)
- ✅ Phase 3: Production Environment Setup (prod-db created, credentials configured)
- ✅ Phase 4: Local Development (Supabase running locally, all migrations applied)
- ✅ **Phase 6: Production Deployment (10 migrations deployed to prod-db)** 🚀

**Pending:**
- 📋 Phase 5: Document Branching Workflow (~30 min)
- 📋 Phase 7: Team Documentation (~30 min)

**Production Status:** 🟢 **LIVE** - Ready for iOS app builds!
**Next Step:** Optional documentation (Phase 5 & 7) or proceed with TestFlight deployment

---

## Table of Contents

1. [Overview](#overview)
2. [Current State](#current-state)
3. [Goals](#goals)
4. [Phase 1: Foundation Setup](#phase-1-foundation-setup-30-min)
5. [Phase 2: Migration File Organization](#phase-2-migration-file-organization-45-min)
6. [Phase 3: Create Production Project](#phase-3-create-production-project-20-min)
7. [Phase 4: Local Development Workflow](#phase-4-local-development-workflow-15-min)
8. [Phase 5: Branching Workflow Setup](#phase-5-branching-workflow-setup-30-min)
9. [Phase 6: Deploy to Production](#phase-6-deploy-to-production-30-min)
10. [Phase 7: Team Documentation](#phase-7-team-documentation-30-min)
11. [Success Criteria](#success-criteria)
12. [Rollback Procedures](#rollback-procedures)
13. [Ongoing Workflow](#ongoing-workflow)

---

## Overview

### Purpose

Implement proper Supabase CLI-based branching workflow with production migration for TrackPay. This follows Supabase best practices for schema-driven development with local migrations and safe deployment processes.

### What This Achieves

1. **Local Development Environment** - Run Supabase locally, test changes without touching staging/production
2. **Production Database** - Clean production Supabase project with proper schema, RLS, and indexes
3. **Professional Workflow** - Git-like migrations with versioning, testing, and rollback capabilities
4. **Team Collaboration** - Clear processes for schema changes, testing, and deployment

### Key Technologies

- **Supabase CLI v2.51.0** - Local development, migrations, branching
- **PostgreSQL** - Database engine (via Supabase)
- **Git** - Version control for migration files
- **Expo/React Native** - TrackPay iOS app

---

## Current State

### Existing Infrastructure

**Staging Supabase Project:**
- Project Ref: `qpoqeqasefatyrjeronp`
- URL: `https://qpoqeqasefatyrjeronp.supabase.co`
- Database: 8 TrackPay tables with data
- Status: Active, used for development

**Database Schema (8 Tables):**
```
trackpay_users              - Providers and clients with auth mapping
trackpay_relationships      - Provider-client associations
trackpay_sessions           - Work tracking (duration in minutes)
trackpay_payments           - Payment records (financial data)
trackpay_requests           - Payment request workflow
trackpay_activities         - Activity feed/audit trail
trackpay_invites            - Client invitation system
trackpay_relationship_audit - Relationship deletion audit
```

**Migration Files (in `origin/prod-ready` branch):**
```
scripts/prod-migrate/
├── 000_extensions.sql                           # PostgreSQL extensions
├── 010_realtime.sql                             # Realtime subscriptions
├── 015_rls_helper.sql                           # Critical auth helper function
├── 020_rls_policies.sql                         # Row Level Security policies
├── 030_indexes.sql                              # 14 performance indexes
├── 040_manifest.sql                             # Schema drift detection
├── 20251015_fix_fk_SAFE_SEQUENTIAL.sql          # FK constraint fixes
├── 20251015_fix_session_fk_cascades.sql         # Session FK fixes
└── 20251016_fix_delete_rpc_provider_lookup.sql  # Client deletion RPC
```

### What's Missing

- ❌ No Supabase CLI project structure (`supabase/` directory)
- ❌ No local development environment
- ❌ No production Supabase project
- ❌ No migration versioning system
- ❌ No documented branching workflow
- ❌ Manual SQL deployment (error-prone)

---

## Goals

### Primary Objectives

1. **Set up Supabase CLI workflow** with local development environment
2. **Organize migration files** into proper versioned structure
3. **Create production Supabase project** with clean schema deployment
4. **Establish branching workflow** for safe schema changes
5. **Document processes** for team collaboration

### Success Metrics

- ✅ Local Supabase runs with `supabase start`
- ✅ All migrations apply cleanly locally and in production
- ✅ Production database has complete schema with RLS + indexes
- ✅ iOS app connects successfully to production
- ✅ Team understands and can execute workflow

---

## Phase 1: Foundation Setup (30 min)

**Status:** ✅ **COMPLETED** (October 20, 2025)

**What was accomplished:**
- ✅ Installed Supabase CLI v2.51.0 via Homebrew
- ✅ Initialized Supabase project structure (`supabase/` directory created)
- ✅ Linked CLI to staging project (qpoqeqasefatyrjeronp)
- ✅ Fixed Postgres version mismatch (updated config.toml to v15)

**Time taken:** ~30 minutes

---

### 1.1 Install Supabase CLI

**Command:**
```bash
brew install supabase/tap/supabase
```

**Verification:**
```bash
supabase --version
# Expected: 2.51.0 or higher
```

**Status:** ✅ Completed - v2.51.0 installed (October 20, 2025 15:12 PST)

---

### 1.2 Initialize Supabase Project Structure

**Command:**
```bash
cd /Users/athahar/work/claude-apps/timesheets
supabase init
```

**What This Creates:**
```
timesheets/
└── supabase/
    ├── config.toml           # Supabase project configuration
    ├── seed.sql              # Test data for preview branches
    └── migrations/           # Versioned SQL migration files
```

**Configuration Options:**
- Port settings for local development
- Database settings (Postgres version)
- Studio settings (web UI)

**Status:** Pending

---

### 1.3 Link to Current Staging Project

**Command:**
```bash
supabase login
# Opens browser for authentication

supabase link --project-ref qpoqeqasefatyrjeronp
```

**What This Does:**
- Connects CLI to your existing staging project
- Enables `supabase db pull` to capture current schema
- Allows pushing migrations to staging

**Credentials Required:**
- Supabase account access
- Project ref: `qpoqeqasefatyrjeronp`

**Status:** Pending

---

### 1.4 Generate Initial Migration from Existing Database

**Command:**
```bash
supabase db pull
```

**What This Creates:**
```
supabase/migrations/20250120140000_remote_schema.sql
```

**What This Captures:**
- All 8 TrackPay tables with columns, types, constraints
- Foreign key relationships
- Indexes
- RLS policies (if enabled)
- Functions and triggers

**Why This Matters:**
This becomes your "source of truth" for the current database state. All future migrations will build on top of this.

**Status:** Pending

---

### Phase 1 Deliverables

- [x] Supabase CLI v2.51.0 installed
- [x] `supabase/` directory structure created
- [x] CLI linked to staging project (qpoqeqasefatyrjeronp)
- [x] Postgres version aligned with staging (v15)
- [x] `.gitignore` updated to exclude temporary files

---

## Phase 2: Migration File Organization (45 min)

**Status:** ✅ **COMPLETED** (October 20, 2025)

**What was accomplished:**
- ✅ Created initial schema migration with 8 TrackPay tables
- ✅ Copied 8 production-ready migrations from `origin/prod-ready` branch
- ✅ Fixed 3 schema conflicts between migrations
- ✅ Created seed.sql with test data (3 users, 2 sessions, 3 activities)
- ✅ Updated .gitignore for Supabase temp files

**Issues resolved:**
- Fixed `trackpay_relationship_audit` table schema mismatch (deleted_at vs created_at)
- Added missing `session_id` column to `trackpay_payments` table
- Aligned index definitions with actual table schemas

**Time taken:** ~45 minutes

---

### 2.1 Reorganize Migrations into Versioned Structure

**Goal:** Move production-ready migration scripts from `origin/prod-ready` branch into Supabase CLI structure with proper versioning.

**Status:** ✅ Completed

**Migration Mapping:**

| Source (prod-ready branch) | Destination (supabase/migrations/) | Purpose |
|----------------------------|-----------------------------------|---------|
| Initial db pull | `20250120000000_initial_schema.sql` | Base tables from staging |
| `000_extensions.sql` | `20250120000001_extensions.sql` | pgcrypto, pg_stat_statements |
| `015_rls_helper.sql` | `20250120000002_rls_helper.sql` | **CRITICAL** Auth helper function |
| `020_rls_policies.sql` | `20250120000003_rls_policies.sql` | Row Level Security policies |
| `030_indexes.sql` | `20250120000004_indexes.sql` | 14 performance indexes |
| `010_realtime.sql` | `20250120000005_realtime.sql` | Realtime subscriptions |
| `20251015_fix_fk_SAFE_SEQUENTIAL.sql` | `20250120000006_fk_constraints_fix.sql` | Foreign key constraint fixes |
| `20251015_fix_session_fk_cascades.sql` | `20250120000007_session_fk_cascades.sql` | Session FK cascades |
| `20251016_fix_delete_rpc_provider_lookup.sql` | `20250120000008_delete_client_rpc.sql` | Safe client deletion RPC |

**Process:**
1. Checkout `origin/prod-ready` branch temporarily
2. Copy migration files to `supabase/migrations/` with new timestamps
3. Review each file for conflicts with initial schema
4. Test migrations locally with `supabase db reset`
5. Return to `main` branch
6. Commit organized migration files

**Critical Considerations:**

**⚠️ RLS Helper Function (015_rls_helper.sql):**
```sql
-- This is CRITICAL for production RLS policies
CREATE FUNCTION current_trackpay_user_id() RETURNS uuid AS $$
  SELECT id FROM trackpay_users
  WHERE auth_user_id = auth.uid()
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER;

-- Without this, RLS policies will FAIL because:
-- auth.uid() returns auth.users.id (Supabase auth table)
-- Our FKs use trackpay_users.id (different UUID!)
```

**Why This Matters:**
- Original ChatGPT assumption: `USING (provider_id = auth.uid())`
- Our schema: `USING (provider_id = current_trackpay_user_id())`
- Without helper function, **users get locked out of their own data**

---

### 2.2 Create Seed Data File (Optional but Recommended)

**File:** `supabase/seed.sql`

**Purpose:** Populate preview branches with test data for development

**Example Seed Data:**
```sql
-- Test provider account
INSERT INTO trackpay_users (id, auth_user_id, email, role, name, created_at)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  NULL, -- Will be populated after auth signup
  'test-provider@trackpay.test',
  'provider',
  'Test Provider',
  NOW()
);

-- Test client account
INSERT INTO trackpay_users (id, auth_user_id, email, role, name, created_at)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d480',
  NULL,
  'test-client@trackpay.test',
  'client',
  'Test Client',
  NOW()
);

-- Test relationship
INSERT INTO trackpay_relationships (provider_id, client_id, created_at)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'f47ac10b-58cc-4372-a567-0e02b2c3d480',
  NOW()
);
```

**When This Runs:**
- Automatically on `supabase db reset` (local development)
- Optionally on preview branches (if configured)
- **Never on production** (production starts empty)

---

### 2.3 Update .gitignore

**Add to root `.gitignore`:**
```gitignore
# Supabase
supabase/.branches
supabase/.temp
supabase/.env.local
.supabase/
```

**Why:**
- `.branches/` - Local branch metadata
- `.temp/` - Temporary CLI files
- `.env.local` - Local development credentials
- `.supabase/` - Local Docker containers

---

### Phase 2 Deliverables

- [x] 9 migration files organized in `supabase/migrations/`
- [x] Migration timestamps in correct order
- [x] `seed.sql` created with test accounts (3 users, 2 sessions)
- [x] `.gitignore` updated for Supabase temp files
- [x] All migrations tested locally (`supabase start` succeeds with no errors)

---

## Phase 3: Create Production Project (20 min)

### 3.1 Create Production Supabase Project

**Process (via Supabase Dashboard):**

1. **Navigate to Dashboard**
   - Go to: https://supabase.com/dashboard
   - Click: "New Project"

2. **Project Configuration**
   - **Name:** `trackpay-production`
   - **Organization:** (select your organization)
   - **Database Password:** Generate strong password (save in password manager)
   - **Region:** `us-west-1` (same as staging for consistency)
   - **Pricing Plan:** Free tier (upgrade later if needed)

3. **Wait for Provisioning**
   - Typically takes 2-3 minutes
   - Database initialization
   - API endpoint setup

4. **Save Project Details**
   - Project Reference ID (e.g., `abcdefghijklmnop`)
   - Project URL: `https://[PROJECT-REF].supabase.co`
   - Database password (stored securely)

---

### 3.2 Save Production Credentials

**Create:** `ios-app/.env.production` (**DO NOT COMMIT**)

```bash
# TrackPay Production Configuration
EXPO_PUBLIC_SUPABASE_URL=https://[PROD-PROJECT-REF].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[PROD-ANON-KEY-FROM-DASHBOARD]
EXPO_SERVICE_ROLE_KEY=[PROD-SERVICE-ROLE-KEY]

# App Configuration
EXPO_PUBLIC_APP_NAME=TrackPay
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_USE_PHONE_AUTH=false
```

**How to Get Credentials:**
1. Go to Production Project Dashboard
2. Navigate to: Settings → API
3. Copy:
   - Project URL → `EXPO_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `EXPO_SERVICE_ROLE_KEY` (keep secret!)

**Verify .gitignore:**
```gitignore
# Ensure this exists in ios-app/.gitignore
.env.production
.env.local
```

---

### 3.3 Document Production Project

**Create:** `docs/environments.md`

```markdown
# TrackPay Environment Configuration

## Staging
- **Project Ref:** qpoqeqasefatyrjeronp
- **URL:** https://qpoqeqasefatyrjeronp.supabase.co
- **Purpose:** Development and testing
- **Data:** Test accounts and sample data

## Production
- **Project Ref:** [SAVED-IN-PASSWORD-MANAGER]
- **URL:** [SAVED-IN-PASSWORD-MANAGER]
- **Purpose:** Live user data
- **Data:** Production user data only

## Local Development
- **URL:** http://localhost:54321
- **Purpose:** Local testing with Supabase CLI
- **Data:** Seeded test data
```

---

### Phase 3 Deliverables

- [ ] Production Supabase project created
- [ ] `.env.production` file created with credentials (gitignored)
- [ ] Production project ref documented securely
- [ ] `docs/environments.md` created

---

## Phase 4: Local Development Workflow (15 min)

**Status:** ✅ **COMPLETED** (October 20, 2025)

**What was accomplished:**
- ✅ Started Docker Desktop successfully
- ✅ Downloaded all required Supabase Docker images
- ✅ Started local Supabase with all services running
- ✅ Applied all 9 migrations successfully (no errors)
- ✅ Loaded seed.sql data (3 users, 2 relationships, 2 sessions, 3 activities)
- ✅ Verified all 8 tables created with proper schema
- ✅ Confirmed RLS enabled with 18 policies
- ✅ Verified 13 performance indexes created
- ✅ Confirmed realtime subscriptions active

**Local URLs:**
- API: http://127.0.0.1:54321
- Studio: http://127.0.0.1:54323
- Database: postgresql://postgres:postgres@127.0.0.1:54322/postgres
- Mailpit: http://127.0.0.1:54324

**API Keys (Local):**
- Publishable: `sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH`
- Secret: `sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz`

**Time taken:** ~1 hour (including troubleshooting Docker and fixing migration conflicts)

---

### 4.1 Start Local Supabase

**Command:**
```bash
cd /Users/athahar/work/claude-apps/timesheets
supabase start
```

**Status:** ✅ Completed (October 20, 2025 15:40 PST)

**What This Does:**
- Starts local PostgreSQL database (Docker container)
- Runs all migrations in `supabase/migrations/`
- Executes `seed.sql` to populate test data
- Starts Supabase Studio web UI
- Starts GoTrue auth server
- Starts PostgREST API server

**Expected Output:**
```
Started supabase local development setup.

         API URL: http://localhost:54321
     GraphQL URL: http://localhost:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Verify Services:**
- Open http://localhost:54323 (Supabase Studio)
- Check "Table Editor" - should see 8 TrackPay tables
- Check "Authentication" - ready for test signups

---

### 4.2 Create Local Environment Configuration

**Create:** `ios-app/.env.local`

```bash
# TrackPay Local Development Configuration
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=[COPY-FROM-SUPABASE-START-OUTPUT]

# App Configuration
EXPO_PUBLIC_APP_NAME=TrackPay
EXPO_PUBLIC_ENV=local
EXPO_PUBLIC_USE_PHONE_AUTH=false
```

**Copy anon key from:** `supabase start` output

---

### 4.3 Test App Against Local Supabase

**Process:**

1. **Switch to local environment:**
   ```bash
   cd ios-app
   cp .env.local .env
   ```

2. **Start app:**
   ```bash
   npm run web
   ```

3. **Test critical paths:**
   - [ ] Register new provider account
   - [ ] Login with test account
   - [ ] Create client
   - [ ] Start/stop session
   - [ ] View activity feed

4. **Verify in Supabase Studio (http://localhost:54323):**
   - [ ] `trackpay_users` table has new records
   - [ ] `trackpay_relationships` created
   - [ ] `trackpay_sessions` recorded
   - [ ] `trackpay_activities` logged

5. **Switch back to staging:**
   ```bash
   cp .env.staging .env  # or however you want to manage this
   ```

---

### 4.4 Database Reset Command

**When to use:**
```bash
supabase db reset
```

**What this does:**
- Drops all tables
- Re-runs all migrations
- Re-seeds with `seed.sql`
- Fresh database state

**Use cases:**
- Testing new migrations
- Corrupted local data
- Want clean slate for testing

---

### Phase 4 Deliverables

- [x] Local Supabase running successfully
- [x] All 8 tables created via migrations
- [x] Test accounts from `seed.sql` loaded (3 users, 2 sessions, 3 activities)
- [x] Studio accessible at http://127.0.0.1:54323
- [x] API accessible at http://127.0.0.1:54321
- [x] RLS enabled with 18 policies
- [x] 13 performance indexes created
- [x] Realtime subscriptions active
- [ ] `.env.local` configured for iOS app (optional - pending app testing)
- [ ] App successfully connects to local Supabase (optional - pending app testing)

---

## Phase 5: Branching Workflow Setup (30 min)

### 5.1 Create Feature Branch Workflow

**Example: Adding a new feature**

```bash
# 1. Create git branch
git checkout -b feature/add-crew-notes

# 2. Create new migration
supabase migration new add_crew_notes_to_sessions

# This creates:
# supabase/migrations/20250120153045_add_crew_notes_to_sessions.sql

# 3. Edit migration file
code supabase/migrations/20250120153045_add_crew_notes_to_sessions.sql
```

**Example migration content:**
```sql
-- Add crew notes column to sessions table
ALTER TABLE trackpay_sessions
ADD COLUMN crew_notes TEXT;

-- Create index for text search (optional)
CREATE INDEX idx_sessions_crew_notes_search
ON trackpay_sessions USING gin(to_tsvector('english', crew_notes));
```

```bash
# 4. Test locally
supabase db reset
# Applies all migrations including your new one

# 5. Test in app
cd ios-app
npm run web
# Verify new column works

# 6. Commit
git add supabase/migrations/
git commit -m "feat(sessions): add crew notes field for session documentation"

# 7. Push to staging (when ready)
supabase db push
# Applies only new migrations to staging

# 8. Create PR and merge to main
gh pr create --title "Add crew notes to sessions"
```

---

### 5.2 Document Branching Workflow

**Create:** `docs/workflows/supabase-branching.md`

```markdown
# Supabase Branching Workflow

## Daily Development

### Local Development
1. Start local Supabase: `supabase start`
2. Make schema changes via migrations (NEVER directly in database)
3. Test thoroughly locally
4. Commit migration files to git

### Creating New Migrations

**For New Features:**
\`\`\`bash
# 1. Create git branch
git checkout -b feature/feature-name

# 2. Create migration
supabase migration new descriptive_name

# 3. Edit the generated SQL file
# 4. Test locally: supabase db reset
# 5. Test app functionality
# 6. Commit migration file
\`\`\`

**For Bug Fixes:**
\`\`\`bash
# 1. Create migration with fix
supabase migration new fix_issue_description

# 2. Test fix locally
# 3. Push to staging: supabase db push
# 4. After verification, deploy to production
\`\`\`

## Deployment Workflow

### Deploy to Staging
\`\`\`bash
# Link to staging
supabase link --project-ref qpoqeqasefatyrjeronp

# Check what will be deployed
supabase db diff

# Push new migrations
supabase db push
\`\`\`

### Deploy to Production
\`\`\`bash
# Link to production
supabase link --project-ref [PROD-REF]

# Dry run - check differences
supabase db diff

# Review carefully!
# Ask: "Will this break existing data?"
# Ask: "Are there any destructive changes?"

# Deploy
supabase db push

# Verify in dashboard
# Smoke test critical paths
\`\`\`

## Best Practices

### DO:
- ✅ Always create migrations for schema changes
- ✅ Test locally before pushing to staging
- ✅ Use descriptive migration names
- ✅ Add comments in SQL for complex changes
- ✅ Test rollback scenarios

### DON'T:
- ❌ Never edit database directly via Studio in production
- ❌ Don't skip local testing
- ❌ Don't create migrations that drop data without backup
- ❌ Don't push directly to production without staging verification
- ❌ Don't edit old migration files (create new ones instead)

## Migration Naming Conventions

**Format:** `YYYYMMDDHHMMSS_descriptive_name.sql`

**Good names:**
- \`20250120150000_add_crew_notes_to_sessions.sql\`
- \`20250120160000_create_invoices_table.sql\`
- \`20250120170000_fix_cascade_delete_sessions.sql\`

**Bad names:**
- \`update.sql\`
- \`migration.sql\`
- \`changes.sql\`

## Troubleshooting

### Migration Failed
\`\`\`bash
# Check error message
# Fix migration file
# Reset local: supabase db reset
# Retry
\`\`\`

### Need to Rollback Production
See: docs/workflows/rollback-procedures.md
```

---

### Phase 5 Deliverables

- [ ] `docs/workflows/supabase-branching.md` created
- [ ] Example migration created and tested
- [ ] Team understands migration workflow
- [ ] Migration naming conventions documented

---

## Phase 6: Deploy to Production (30 min)

### 6.1 Pre-Deployment Checklist

**⚠️ CRITICAL - Complete ALL items before deploying**

- [ ] **All migrations tested locally** (`supabase db reset` succeeds)
- [ ] **Staging tested** (all migrations applied successfully)
- [ ] **App tested against staging** (no breaking changes)
- [ ] **Production project created** (Phase 3 completed)
- [ ] **Production credentials saved** (`.env.production` exists)
- [ ] **Backup plan ready** (know how to rollback)
- [ ] **Team notified** (coordinate deployment window)

---

### 6.2 Link to Production Project

**Command:**
```bash
supabase link --project-ref [PRODUCTION-PROJECT-REF]
```

**Verify link:**
```bash
supabase status
# Should show production project details
```

---

### 6.3 Dry Run - Review Changes

**Command:**
```bash
supabase db diff
```

**What this shows:**
- All SQL statements that will run
- Tables to be created
- Indexes to be added
- Functions to be created
- RLS policies to be enabled

**Review checklist:**
- [ ] No unexpected table drops
- [ ] No destructive data changes
- [ ] All 8 TrackPay tables included
- [ ] RLS helper function present (CRITICAL)
- [ ] All indexes present

**If anything looks wrong:** STOP and investigate before proceeding

---

### 6.4 Deploy Migrations to Production

**Command:**
```bash
supabase db push
```

**Expected output:**
```
Applying migration 20250120000000_initial_schema.sql...
Applying migration 20250120000001_extensions.sql...
Applying migration 20250120000002_rls_helper.sql...
Applying migration 20250120000003_rls_policies.sql...
Applying migration 20250120000004_indexes.sql...
Applying migration 20250120000005_realtime.sql...
Applying migration 20250120000006_fk_constraints_fix.sql...
Applying migration 20250120000007_session_fk_cascades.sql...
Applying migration 20250120000008_delete_client_rpc.sql...

Finished supabase db push.
```

**If errors occur:**
- Read error message carefully
- Check migration file for syntax errors
- Fix and re-run
- **DO NOT** force push or skip migrations

---

### 6.5 Verify Production Database

**Via Supabase Dashboard:**

1. **Navigate to Production Project**
   - https://supabase.com/dashboard/project/[PROD-REF]

2. **Verify Tables (Table Editor)**
   - [ ] `trackpay_users` exists with correct columns
   - [ ] `trackpay_relationships` exists
   - [ ] `trackpay_sessions` exists
   - [ ] `trackpay_payments` exists
   - [ ] `trackpay_requests` exists
   - [ ] `trackpay_activities` exists
   - [ ] `trackpay_invites` exists
   - [ ] `trackpay_relationship_audit` exists

3. **Verify RLS (Authentication → Policies)**
   - [ ] Policies exist for each table
   - [ ] `current_trackpay_user_id()` function visible
   - [ ] RLS enabled on all tables

4. **Verify Indexes (Database → Indexes)**
   - [ ] All 14 performance indexes created
   - [ ] No missing indexes

5. **Verify Functions (Database → Functions)**
   - [ ] `current_trackpay_user_id()` function exists
   - [ ] `delete_client()` RPC exists (from migration 008)

**SQL Verification:**
```sql
-- Run in SQL Editor

-- Count tables
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'trackpay_%';
-- Expected: 8

-- Check RLS enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'trackpay_%';
-- All should show: rowsecurity = true

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename LIKE 'trackpay_%';
-- Expected: 14+ indexes
```

---

### 6.6 Update iOS App Configuration

**Update EAS Secrets (for production builds):**

```bash
cd ios-app

# Create EAS secrets for production
eas secret:create --scope project --name SUPABASE_URL_PROD --value "https://[PROD-REF].supabase.co"

eas secret:create --scope project --name SUPABASE_ANON_KEY_PROD --value "[PROD-ANON-KEY]"

# Verify secrets
eas secret:list
```

**Update `ios-app/eas.json`:**
```json
{
  "build": {
    "production": {
      "ios": {
        "resourceClass": "m1-medium"
      },
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "$SUPABASE_URL_PROD",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "$SUPABASE_ANON_KEY_PROD",
        "EXPO_PUBLIC_APP_NAME": "TrackPay",
        "EXPO_PUBLIC_ENV": "production"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "resourceClass": "m1-medium"
      },
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://qpoqeqasefatyrjeronp.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "[STAGING-ANON-KEY]",
        "EXPO_PUBLIC_APP_NAME": "TrackPay",
        "EXPO_PUBLIC_ENV": "staging"
      }
    }
  }
}
```

---

### 6.7 Smoke Test Production

**Test Locally Against Production:**

```bash
cd ios-app

# Temporarily point to production
cp .env.production .env

# Start app
npm run web
```

**Critical Path Testing:**

**As Provider:**
- [ ] Register new provider account
- [ ] Login successfully
- [ ] Create client
- [ ] Start work session
- [ ] Stop work session (verify amount calculated)
- [ ] Request payment
- [ ] View activity feed (all events logged)

**As Client:**
- [ ] Claim invite code (from provider)
- [ ] Login successfully
- [ ] View service providers
- [ ] View work sessions
- [ ] Mark payment as sent
- [ ] View activity timeline

**Database Verification:**
```bash
# Open Supabase Studio for production
# Check Table Editor:

# trackpay_users - should have 2 test accounts
# trackpay_relationships - should have 1 relationship
# trackpay_sessions - should have 1 completed session
# trackpay_payments - should have 1 payment record
# trackpay_activities - should have 5+ activity entries
```

**If any test fails:**
- Document the issue
- Check browser console for errors
- Check Supabase logs (Dashboard → Logs)
- Do NOT proceed to app deployment until fixed

---

### 6.8 Test Production iOS Build (Optional)

**Build TestFlight version with production credentials:**

```bash
cd ios-app

# Increment build number
# Edit app.json: "buildNumber": "7" (or next number)

# Build for TestFlight
eas build --platform ios --profile production

# After build completes, test on real device
# Verify all features work with production database
```

---

### Phase 6 Deliverables

- [ ] Production database fully migrated
- [ ] All 8 tables with correct schema
- [ ] RLS policies active and tested
- [ ] All indexes created
- [ ] Helper functions deployed
- [ ] iOS app successfully connects to production
- [ ] Smoke tests passed (provider + client flows)
- [ ] EAS secrets configured for production builds
- [ ] Test accounts created in production

---

## Phase 7: Team Documentation (30 min)

### 7.1 Create Team Workflow Document

**Create:** `docs/workflows/team-workflow.md`

```markdown
# TrackPay Team Development Workflow

## Overview

This document describes how the team collaborates on TrackPay development with proper Supabase branching and migration workflow.

## Daily Development Workflow

### 1. Start Your Day

\`\`\`bash
# Pull latest changes
git pull origin main

# Start local Supabase
supabase start

# Start development
cd ios-app
npm run web
\`\`\`

### 2. Working on Features

**For schema changes:**
\`\`\`bash
# Create feature branch
git checkout -b feature/your-feature

# Create migration
supabase migration new your_feature_name

# Edit migration file
# Test locally: supabase db reset
# Test app functionality
# Commit
git add supabase/migrations/
git commit -m "feat: add your feature"
\`\`\`

**For app-only changes (no schema):**
\`\`\`bash
# Create feature branch
git checkout -b feature/ui-improvement

# Make changes in ios-app/
# Test against local Supabase
# Commit and push
\`\`\`

### 3. Code Review & Merging

**Creating PR:**
\`\`\`bash
git push origin feature/your-feature
gh pr create --title "Add your feature" --body "Description"
\`\`\`

**Reviewer checklist:**
- [ ] Migration files are well-structured
- [ ] Migrations tested locally (reviewer should test)
- [ ] No destructive changes without backup plan
- [ ] App code works with schema changes
- [ ] RLS policies updated if needed

**After PR approved:**
\`\`\`bash
# Merge to main
gh pr merge

# Deployer pushes to staging
git checkout main
git pull
supabase link --project-ref qpoqeqasefatyrjeronp
supabase db push
\`\`\`

### 4. Deploying to Production

**Deployment Lead Only:**

\`\`\`bash
# Verify staging is stable
# Get team sign-off

# Deploy to production
supabase link --project-ref [PROD-REF]
supabase db diff  # Review carefully!
supabase db push

# Smoke test production
# Notify team: "Production updated"
\`\`\`

## Environment Management

### Local Development
- **When:** Always during development
- **Command:** \`supabase start\`
- **Database:** Fresh local Postgres
- **Data:** Seeded test data

### Staging
- **When:** Testing before production
- **Project Ref:** qpoqeqasefatyrjeronp
- **Database:** Shared staging database
- **Data:** Test accounts + sample data

### Production
- **When:** Live user data
- **Project Ref:** [SECURE - See password manager]
- **Database:** Production database
- **Data:** Real user data only

## Communication

### Slack Channels (when you have team)
- **#dev-trackpay** - General development discussion
- **#deploy-trackpay** - Deployment notifications
- **#bugs-trackpay** - Bug reports

### Deployment Notifications

**Template:**
\`\`\`
🚀 **Production Deployment**

**What:** Migration 20250120153045_add_crew_notes
**When:** 2025-01-20 3:30 PM PST
**Impact:** New feature available - crew notes on sessions
**Downtime:** None expected
**Rollback plan:** Revert migration if issues arise

Smoke tested ✅
All tests passing ✅
\`\`\`

## Troubleshooting

### Local Supabase Won't Start
\`\`\`bash
supabase stop
docker system prune -a  # Careful - removes all Docker data
supabase start
\`\`\`

### Migration Failed Locally
\`\`\`bash
# Fix the migration file
supabase db reset  # Retry all migrations
\`\`\`

### Migration Failed on Staging/Production
See: docs/workflows/rollback-procedures.md

### Can't Connect to Database
- Check .env file has correct credentials
- Verify Supabase project is not paused
- Check network connection
```

---

### 7.2 Create Rollback Procedures

**Create:** `docs/workflows/rollback-procedures.md`

```markdown
# TrackPay Rollback Procedures

## When to Rollback

**Rollback immediately if:**
- ❌ Production database migration fails
- ❌ App can't connect after deployment
- ❌ Critical feature broken for users
- ❌ Data corruption detected
- ❌ Security vulnerability introduced

**Don't rollback for:**
- ✅ Minor UI bugs (fix forward)
- ✅ Non-critical features broken
- ✅ Cosmetic issues

## Rollback Methods

### Method 1: Create Reverse Migration (Preferred)

**When:** Migration applied but causing issues

\`\`\`bash
# Create new migration to reverse changes
supabase migration new rollback_feature_name

# Example: Rolling back adding a column
-- Migration: 20250120150000_add_crew_notes.sql added column
-- Rollback: 20250120160000_rollback_crew_notes.sql

-- In rollback migration:
ALTER TABLE trackpay_sessions DROP COLUMN crew_notes;

# Test locally
supabase db reset

# Deploy to production
supabase db push
\`\`\`

**Pros:**
- Maintains migration history
- Auditable
- Can rollback later if needed

**Cons:**
- Takes time to write reverse migration
- May not work for complex changes

---

### Method 2: Restore from Supabase Backup

**When:** Database is corrupted or multiple migrations failed

**Steps:**

1. **Go to Supabase Dashboard**
   - Navigate to: Project → Database → Backups
   - Supabase auto-backs up daily

2. **Select Backup**
   - Choose latest backup before bad deployment
   - Example: "2025-01-20 2:00 PM" (before 3:30 PM deploy)

3. **Restore Backup**
   - Click "Restore"
   - **WARNING:** This creates a NEW project
   - Original project is preserved

4. **Update App Configuration**
   \`\`\`bash
   # Update .env.production with new project ref
   EXPO_PUBLIC_SUPABASE_URL=https://[NEW-PROJECT-REF].supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=[NEW-ANON-KEY]

   # Update EAS secrets
   eas secret:delete --name SUPABASE_URL_PROD
   eas secret:create --name SUPABASE_URL_PROD --value "https://[NEW-REF].supabase.co"
   \`\`\`

5. **Re-deploy App**
   \`\`\`bash
   # Build new version pointing to restored database
   eas build --platform ios --profile production
   eas submit --platform ios
   \`\`\`

**Pros:**
- Fast recovery
- Guaranteed good state

**Cons:**
- Data loss (everything after backup time is lost)
- New project ref (requires app redeployment)
- Downtime during transition

---

### Method 3: Manual SQL Fixes

**When:** Small isolated issue, not worth full rollback

\`\`\`bash
# Example: RLS policy too restrictive

# Create hotfix migration
supabase migration new hotfix_rls_policy

-- Fix the policy
DROP POLICY "Users can view their own data" ON trackpay_users;
CREATE POLICY "Users can view their own data" ON trackpay_users
  FOR SELECT USING (id = current_trackpay_user_id());

# Deploy immediately
supabase db push
\`\`\`

---

## Rollback Checklist

### Before Rollback
- [ ] **Assess impact** - How many users affected?
- [ ] **Notify team** - Slack/Discord announcement
- [ ] **Document issue** - What went wrong?
- [ ] **Choose method** - Reverse migration vs backup restore
- [ ] **Test rollback locally** - Does reverse migration work?

### During Rollback
- [ ] **Announce downtime** (if needed)
- [ ] **Execute rollback** - Follow chosen method
- [ ] **Verify database** - Check critical tables
- [ ] **Test app** - Smoke test critical paths

### After Rollback
- [ ] **Verify production working** - All features functional
- [ ] **Notify users** (if affected)
- [ ] **Document lessons learned**
- [ ] **Fix underlying issue**
- [ ] **Plan re-deployment** (with fix)

---

## Emergency Contacts

**Database Issues:**
- **Owner:** [Your Name]
- **Backup:** [Team Lead]

**App Deployment:**
- **iOS Lead:** [Your Name]
- **Android Lead:** [If applicable]

**Supabase Support:**
- Dashboard: https://supabase.com/dashboard/support
- Discord: https://discord.supabase.com
- Email: support@supabase.com

---

## Example Scenarios

### Scenario 1: Added column breaks app

**Problem:** Added \`crew_size\` column as NOT NULL, existing rows fail

**Solution:**
\`\`\`sql
-- Hotfix migration
ALTER TABLE trackpay_sessions
ALTER COLUMN crew_size SET DEFAULT 1;

-- Backfill existing rows
UPDATE trackpay_sessions
SET crew_size = 1
WHERE crew_size IS NULL;
\`\`\`

### Scenario 2: RLS policy locks users out

**Problem:** RLS policy too restrictive, users can't see their data

**Solution:**
\`\`\`sql
-- Temporarily disable RLS (ONLY in emergency)
ALTER TABLE trackpay_sessions DISABLE ROW LEVEL SECURITY;

-- Fix policy
DROP POLICY "problematic_policy" ON trackpay_sessions;
CREATE POLICY "fixed_policy" ON trackpay_sessions
  FOR ALL USING (provider_id = current_trackpay_user_id());

-- Re-enable RLS
ALTER TABLE trackpay_sessions ENABLE ROW LEVEL SECURITY;
\`\`\`

### Scenario 3: Complete database corruption

**Problem:** Multiple tables corrupted, unknown cause

**Solution:**
- Restore from backup (Method 2)
- Investigate corruption cause
- Re-apply good migrations
- Re-deploy app
```

---

### 7.3 Create Onboarding Guide

**Create:** `docs/ONBOARDING.md`

```markdown
# TrackPay Developer Onboarding

Welcome to the TrackPay team! This guide will get you set up for development.

## Prerequisites

- macOS (for iOS development)
- Homebrew installed
- Node.js 18+ installed
- Git configured
- Supabase account

## Setup Steps (45 minutes)

### 1. Clone Repository
\`\`\`bash
git clone https://github.com/your-org/timesheets.git
cd timesheets
\`\`\`

### 2. Install Supabase CLI
\`\`\`bash
brew install supabase/tap/supabase
supabase --version  # Should be 2.51.0+
\`\`\`

### 3. Install Dependencies
\`\`\`bash
cd ios-app
npm install
\`\`\`

### 4. Start Local Supabase
\`\`\`bash
cd ..  # Back to repo root
supabase start
\`\`\`

**Copy anon key from output:**
\`\`\`
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
\`\`\`

### 5. Configure Environment
\`\`\`bash
cd ios-app
cp .env.sample .env.local
\`\`\`

**Edit \`.env.local\`:**
\`\`\`bash
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=[PASTE-ANON-KEY-FROM-STEP-4]
EXPO_PUBLIC_APP_NAME=TrackPay
EXPO_PUBLIC_ENV=local
\`\`\`

### 6. Start App
\`\`\`bash
cp .env.local .env
npm run web
\`\`\`

**Open:** http://localhost:8081

### 7. Verify Setup

**Test accounts (from seed.sql):**
- Provider: test-provider@trackpay.test
- Client: test-client@trackpay.test

**Verify:**
- [ ] App loads without errors
- [ ] Can register new account
- [ ] Can create client
- [ ] Can start/stop session
- [ ] Supabase Studio shows data: http://localhost:54323

### 8. Join Team Communication

- Slack: [Invite link]
- GitHub: Add yourself to team
- Calendar: Subscribe to deployment calendar

## Daily Workflow

\`\`\`bash
# Morning routine
git pull origin main
supabase start
cd ios-app && npm run web

# Make changes
# Test locally
# Create PR

# End of day
supabase stop
\`\`\`

## Resources

- **Architecture Overview:** docs/ARCHITECTURE_OVERVIEW.md
- **Branching Workflow:** docs/workflows/supabase-branching.md
- **Team Workflow:** docs/workflows/team-workflow.md
- **Rollback Procedures:** docs/workflows/rollback-procedures.md
- **iOS Deployment:** docs/deploy/ios.md

## Getting Help

- Ask in #dev-trackpay Slack channel
- Tag @tech-lead for urgent issues
- Check docs/workflows/ for procedures

## Your First Task

Try adding a simple migration:

\`\`\`bash
git checkout -b onboarding/add-your-name
supabase migration new add_developer_comments

# In the migration file:
COMMENT ON TABLE trackpay_users IS 'User accounts managed by [YOUR NAME]';

supabase db reset
git add supabase/migrations/
git commit -m "docs: add developer comment for onboarding"
gh pr create
\`\`\`

Welcome aboard! 🚀
```

---

### Phase 7 Deliverables

- [ ] `docs/workflows/team-workflow.md` created
- [ ] `docs/workflows/rollback-procedures.md` created
- [ ] `docs/ONBOARDING.md` created
- [ ] All documentation reviewed and accurate
- [ ] Team trained on workflows

---

## Success Criteria

### Technical Success

✅ **Local Development:**
- Local Supabase runs with `supabase start`
- All migrations apply cleanly
- App connects and works locally
- Seed data populates correctly

✅ **Production:**
- Production project has complete schema
- All 8 TrackPay tables exist
- RLS policies active and tested
- 14 performance indexes created
- Helper functions deployed
- App successfully connects to production

✅ **Workflow:**
- Team understands migration workflow
- Documentation exists for all scenarios
- Rollback plan tested and documented
- Safe to make schema changes

✅ **App Functionality:**
- Provider flow works (register → create client → track time → request payment)
- Client flow works (claim invite → view sessions → mark paid)
- Real-time updates working
- Activity feed logging correctly

### Process Success

✅ **Documentation:**
- All phases documented
- Team workflows written
- Rollback procedures clear
- Onboarding guide complete

✅ **Team Readiness:**
- Developers can run local Supabase
- Team understands branching strategy
- Deployment process documented
- Emergency procedures in place

---

## Rollback Procedures

### If Production Migration Fails

**Option 1: Reverse Migration (Preferred)**
1. Create new migration that undoes changes
2. Test locally: `supabase db reset`
3. Deploy: `supabase db push`

**Option 2: Restore from Backup**
1. Go to Supabase Dashboard → Database → Backups
2. Select latest backup before failed migration
3. Restore (creates new project)
4. Update app credentials
5. Re-deploy app

### If App Can't Connect After Deployment

**Check:**
- [ ] Credentials correct in `.env.production`
- [ ] RLS policies not too restrictive
- [ ] `current_trackpay_user_id()` function exists
- [ ] Auth users can be created

**Quick Fix:**
```sql
-- Temporarily relax RLS for debugging (DEVELOPMENT ONLY)
ALTER TABLE trackpay_users DISABLE ROW LEVEL SECURITY;
-- Test if app works
-- If yes, problem is RLS policies
-- Fix policies and re-enable
```

---

## Ongoing Workflow

### For New Features

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Create migration (if schema changes)
supabase migration new new_feature

# 3. Develop locally
# Edit migration, test app, iterate

# 4. Test thoroughly
supabase db reset
cd ios-app && npm run web

# 5. Push to staging
supabase link --project-ref qpoqeqasefatyrjeronp
supabase db push

# 6. Create PR and get review
gh pr create

# 7. After merge, deploy to production
supabase link --project-ref [PROD-REF]
supabase db diff  # Review!
supabase db push
```

### For Hotfixes

```bash
# 1. Create hotfix migration
git checkout -b hotfix/issue-description
supabase migration new fix_issue

# 2. Test fix locally
supabase db reset

# 3. Push directly to staging (after quick review)
supabase db push

# 4. If verified, push to production
supabase link --project-ref [PROD-REF]
supabase db push
```

### Regular Maintenance

**Weekly:**
- Review Supabase logs for errors
- Check database performance metrics
- Update dependencies: `npm outdated`

**Monthly:**
- Review and optimize slow queries
- Check database size and backup status
- Update documentation with learnings

**Quarterly:**
- Review and update RLS policies
- Audit user permissions
- Performance optimization pass

---

## Timeline & Estimates

### Total Time: ~3 hours

| Phase | Tasks | Time | Status |
|-------|-------|------|--------|
| **Phase 1** | Foundation Setup | 30 min | In Progress |
| | Install CLI | 5 min | ✅ Complete |
| | Initialize project | 10 min | Pending |
| | Link staging | 5 min | Pending |
| | Pull schema | 10 min | Pending |
| **Phase 2** | Migration Organization | 45 min | Pending |
| | Copy migration files | 20 min | Pending |
| | Create seed data | 15 min | Pending |
| | Test locally | 10 min | Pending |
| **Phase 3** | Create Production | 20 min | Pending |
| | Create project | 5 min | Pending |
| | Save credentials | 5 min | Pending |
| | Document setup | 10 min | Pending |
| **Phase 4** | Local Development | 15 min | Pending |
| | Start local Supabase | 5 min | Pending |
| | Configure .env.local | 5 min | Pending |
| | Test app locally | 5 min | Pending |
| **Phase 5** | Branching Workflow | 30 min | Pending |
| | Document workflow | 20 min | Pending |
| | Create example | 10 min | Pending |
| **Phase 6** | Deploy Production | 30 min | Pending |
| | Link production | 5 min | Pending |
| | Review changes | 5 min | Pending |
| | Deploy migrations | 10 min | Pending |
| | Smoke test | 10 min | Pending |
| **Phase 7** | Documentation | 30 min | Pending |
| | Team workflow | 10 min | Pending |
| | Rollback procedures | 10 min | Pending |
| | Onboarding guide | 10 min | Pending |

---

## Appendix

### Useful Commands Reference

```bash
# Supabase CLI
supabase init                    # Initialize project
supabase start                   # Start local environment
supabase stop                    # Stop local environment
supabase status                  # Check running services
supabase db reset                # Reset local database
supabase db push                 # Push migrations to linked project
supabase db pull                 # Pull remote schema
supabase migration new <name>    # Create new migration
supabase link --project-ref X    # Link to project
supabase unlink                  # Unlink current project

# Local URLs
http://localhost:54321          # API endpoint
http://localhost:54323          # Supabase Studio
http://localhost:54324          # Inbucket (email testing)

# Git workflow
git checkout -b feature/x       # Create branch
git add supabase/migrations/    # Stage migrations
git commit -m "feat: description"
gh pr create                    # Create PR
```

### Environment Variables Summary

**Local (.env.local):**
```bash
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=[from-supabase-start]
EXPO_PUBLIC_ENV=local
```

**Staging (.env):**
```bash
EXPO_PUBLIC_SUPABASE_URL=https://qpoqeqasefatyrjeronp.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[staging-anon-key]
EXPO_PUBLIC_ENV=staging
```

**Production (.env.production):**
```bash
EXPO_PUBLIC_SUPABASE_URL=https://[PROD-REF].supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=[prod-anon-key]
EXPO_PUBLIC_ENV=production
```

### Project References

- **Staging:** qpoqeqasefatyrjeronp
- **Production:** [To be created in Phase 3]
- **Local:** localhost:54321

---

## 📊 **Completion Status Summary**

### ✅ Completed Phases (60%)

**Phase 1: Foundation Setup** ✅
- Time: 30 minutes
- Supabase CLI installed and configured
- Linked to staging project
- Postgres version aligned

**Phase 2: Migration Organization** ✅
- Time: 45 minutes
- 9 migrations organized from prod-ready branch
- Schema conflicts resolved
- seed.sql created with test data

**Phase 4: Local Development** ✅
- Time: 1 hour (including troubleshooting)
- Local Supabase running successfully
- All migrations applied (8 tables, RLS, indexes, realtime)
- Test data loaded and verified

### ⏳ Pending Phases (40%)

**Phase 3: Create Production Project** ⏳
- Status: Awaiting manual user action
- Action required: Create production project in Supabase dashboard
- Estimated time: 20 minutes

**Phase 5: Document Branching Workflow** 📋
- Status: Not started
- Deliverables: Workflow guides, team documentation
- Estimated time: 30 minutes

**Phase 6: Deploy to Production** 📋
- Status: Blocked by Phase 3
- Dependencies: Production project must exist
- Estimated time: 30 minutes

**Phase 7: Team Documentation** 📋
- Status: Not started
- Deliverables: Rollback procedures, onboarding guide
- Estimated time: 30 minutes

### 📈 Overall Progress

```
Total Time:      ~3.5 hours
Completed:       ~2 hours (60%)
Remaining:       ~1.5 hours (40%)
```

**Files Created:**
- `supabase/config.toml` - Supabase configuration
- `supabase/migrations/*.sql` - 9 migration files
- `supabase/seed.sql` - Test data
- `SUPABASE_MIGRATION_PROGRESS.md` - Detailed progress report
- This spec document (updated with progress)

**Next Action:**
User needs to create production Supabase project via dashboard, then deployment can proceed.

---

**Last Updated:** October 20, 2025 (15:45 PST)
**Next Review:** After Phase 3 completion
**Maintained By:** TrackPay Dev Team
