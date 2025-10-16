-- TrackPay: Production Schema Export Guide
-- Created: 2025-10-16
-- Purpose: Extract all TrackPay-related schema objects for production migration

-- ============================================================================
-- TABLES USED IN TRACKPAY PROJECT
-- ============================================================================
-- Core Tables (8 total):
-- 1. trackpay_users           - Provider and client accounts
-- 2. trackpay_relationships   - Provider-client connections
-- 3. trackpay_sessions        - Work tracking sessions
-- 4. trackpay_payments        - Payment records
-- 5. trackpay_requests        - Payment request workflow
-- 6. trackpay_activities      - Activity feed/audit trail
-- 7. trackpay_invites         - Client invitation system
-- 8. trackpay_relationship_audit - Relationship deletion audit log

-- ============================================================================
-- STEP 1: Export Table Schemas
-- ============================================================================
-- Run this in Supabase SQL Editor to get CREATE TABLE statements:

SELECT
  'CREATE TABLE ' || schemaname || '.' || tablename || ' (' || E'\n  ' ||
  string_agg(
    column_name || ' ' || data_type ||
    CASE WHEN character_maximum_length IS NOT NULL
      THEN '(' || character_maximum_length || ')'
      ELSE ''
    END ||
    CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
    CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
    E',\n  '
    ORDER BY ordinal_position
  ) || E'\n);' as create_statement
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name LIKE 'trackpay_%'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ============================================================================
-- STEP 2: Export Primary Keys
-- ============================================================================

SELECT
  'ALTER TABLE ' || tc.table_schema || '.' || tc.table_name ||
  ' ADD CONSTRAINT ' || tc.constraint_name ||
  ' PRIMARY KEY (' || string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) || ');' as pk_statement
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name LIKE 'trackpay_%'
GROUP BY tc.table_schema, tc.table_name, tc.constraint_name
ORDER BY tc.table_name;

-- ============================================================================
-- STEP 3: Export Foreign Keys
-- ============================================================================

SELECT
  'ALTER TABLE ' || tc.table_schema || '.' || tc.table_name ||
  ' ADD CONSTRAINT ' || tc.constraint_name ||
  ' FOREIGN KEY (' || kcu.column_name || ')' ||
  ' REFERENCES ' || ccu.table_schema || '.' || ccu.table_name ||
  ' (' || ccu.column_name || ')' ||
  ' ON DELETE ' ||
    CASE rc.delete_rule
      WHEN 'CASCADE' THEN 'CASCADE'
      WHEN 'SET NULL' THEN 'SET NULL'
      WHEN 'RESTRICT' THEN 'RESTRICT'
      WHEN 'NO ACTION' THEN 'NO ACTION'
      ELSE rc.delete_rule
    END || ';' as fk_statement
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name
  AND rc.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name LIKE 'trackpay_%'
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================================================
-- STEP 4: Export Indexes
-- ============================================================================

SELECT
  'CREATE INDEX ' || indexname ||
  ' ON ' || schemaname || '.' || tablename ||
  ' USING ' || indexdef || ';' as index_statement
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'trackpay_%'
  AND indexname NOT LIKE '%_pkey'  -- Exclude primary key indexes
ORDER BY tablename, indexname;

-- Better version that shows actual index definition:
SELECT indexname, indexdef || ';' as create_index_statement
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename LIKE 'trackpay_%'
  AND indexname NOT LIKE '%_pkey'
ORDER BY tablename, indexname;

-- ============================================================================
-- STEP 5: Export RLS Policies
-- ============================================================================

SELECT
  'CREATE POLICY ' || policyname ||
  ' ON ' || schemaname || '.' || tablename ||
  ' FOR ' || cmd ||
  CASE WHEN roles IS NOT NULL THEN ' TO ' || array_to_string(roles, ', ') ELSE '' END ||
  CASE WHEN qual IS NOT NULL THEN ' USING (' || qual || ')' ELSE '' END ||
  CASE WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || with_check || ')' ELSE '' END ||
  ';' as policy_statement
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename LIKE 'trackpay_%'
ORDER BY tablename, policyname;

-- Enable RLS:
SELECT
  'ALTER TABLE ' || schemaname || '.' || tablename || ' ENABLE ROW LEVEL SECURITY;' as enable_rls
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'trackpay_%'
  AND rowsecurity = true
ORDER BY tablename;

-- ============================================================================
-- STEP 6: Export Functions/RPCs
-- ============================================================================

SELECT
  pg_get_functiondef(p.oid) || ';' as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE '%trackpay%' OR p.proname LIKE '%client%'
ORDER BY p.proname;

-- Specific TrackPay RPC:
SELECT pg_get_functiondef(oid) || ';'
FROM pg_proc
WHERE proname = 'delete_client_relationship_safely';

-- ============================================================================
-- STEP 7: Export Triggers
-- ============================================================================

SELECT
  'CREATE TRIGGER ' || trigger_name ||
  ' ' || action_timing || ' ' || event_manipulation ||
  ' ON ' || event_object_schema || '.' || event_object_table ||
  ' FOR EACH ' || action_orientation ||
  ' EXECUTE FUNCTION ' || action_statement || ';' as trigger_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table LIKE 'trackpay_%'
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- STEP 8: Export Table Permissions/Grants
-- ============================================================================

SELECT
  'GRANT ' || privilege_type ||
  ' ON ' || table_schema || '.' || table_name ||
  ' TO ' || grantee || ';' as grant_statement
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name LIKE 'trackpay_%'
ORDER BY table_name, grantee, privilege_type;

-- ============================================================================
-- STEP 9: Complete Schema Dump (Recommended Approach)
-- ============================================================================
-- Use pg_dump from command line for complete schema export:
--
-- Option A: Export only TrackPay tables (schema + data):
-- pg_dump -h db.xxx.supabase.co -U postgres -d postgres \
--   -t 'public.trackpay_*' \
--   -s > trackpay_schema.sql
--
-- Option B: Export schema only (no data):
-- pg_dump -h db.xxx.supabase.co -U postgres -d postgres \
--   -t 'public.trackpay_*' \
--   --schema-only > trackpay_schema_only.sql
--
-- Option C: Export data only:
-- pg_dump -h db.xxx.supabase.co -U postgres -d postgres \
--   -t 'public.trackpay_*' \
--   --data-only > trackpay_data_only.sql

-- ============================================================================
-- STEP 10: Verify What Will Be Exported
-- ============================================================================

-- Count of all TrackPay objects:
SELECT
  'Tables' as object_type,
  COUNT(*) as count
FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'trackpay_%'
UNION ALL
SELECT
  'Indexes',
  COUNT(*)
FROM pg_indexes
WHERE schemaname = 'public' AND tablename LIKE 'trackpay_%'
UNION ALL
SELECT
  'RLS Policies',
  COUNT(*)
FROM pg_policies
WHERE schemaname = 'public' AND tablename LIKE 'trackpay_%'
UNION ALL
SELECT
  'Functions',
  COUNT(*)
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname LIKE '%trackpay%'
UNION ALL
SELECT
  'Foreign Keys',
  COUNT(*)
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
  AND table_schema = 'public'
  AND table_name LIKE 'trackpay_%';

-- List all TrackPay tables:
SELECT tablename,
       pg_size_pretty(pg_total_relation_size('public.' || tablename)) as size
FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'trackpay_%'
ORDER BY tablename;

-- ============================================================================
-- RECOMMENDED MIGRATION WORKFLOW
-- ============================================================================
--
-- 1. CREATE PRODUCTION DATABASE IN SUPABASE
--    - Create new project in Supabase dashboard
--    - Note connection string and anon key
--
-- 2. EXPORT SCHEMA FROM STAGING
--    Method A (Recommended): Use Supabase Dashboard
--    - Go to Table Editor
--    - Select each trackpay_* table
--    - Click "..." menu → "Export Schema"
--
--    Method B: Use pg_dump (more complete)
--    - Get database URL from Supabase project settings
--    - Run: pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
--           -t 'public.trackpay_*' -s > trackpay_schema.sql
--
-- 3. RUN MIGRATIONS IN ORDER
--    a. Create tables (from export)
--    b. Run: scripts/20251015_fix_fk_SAFE_SEQUENTIAL.sql
--    c. Run: scripts/20251015_fix_session_fk_cascades.sql
--    d. Run: scripts/20251015_delete_client_relationship.sql
--    e. Run: scripts/20251016_fix_delete_rpc_provider_lookup.sql
--
-- 4. VERIFY PRODUCTION DATABASE
--    - Run Step 10 queries above
--    - Check FK constraints are RESTRICT (not CASCADE)
--    - Test RPC: SELECT delete_client_relationship_safely('test-uuid')
--    - Verify RLS policies are enabled
--
-- 5. MIGRATE DATA (Optional)
--    - Export from staging: pg_dump ... --data-only
--    - Import to production: psql ... < data.sql
--    - Or use Supabase migration tools
--
-- 6. UPDATE APP ENVIRONMENT VARIABLES
--    - Update EXPO_PUBLIC_SUPABASE_URL
--    - Update EXPO_PUBLIC_SUPABASE_ANON_KEY
--    - Update EAS secrets for builds

-- ============================================================================
-- CLEANUP UNRELATED TABLES (Staging Only)
-- ============================================================================
-- After successful production migration, you can clean up staging:
--
-- List all non-TrackPay tables:
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'trackpay_%'
  AND tablename NOT IN ('schema_migrations')  -- Keep migration tracking
ORDER BY tablename;
--
-- Drop unrelated tables (BE CAREFUL!):
-- DROP TABLE IF EXISTS unrelated_table_1 CASCADE;
-- DROP TABLE IF EXISTS unrelated_table_2 CASCADE;
