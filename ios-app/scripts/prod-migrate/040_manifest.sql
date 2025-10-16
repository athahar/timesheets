-- 040_manifest.sql
-- Schema drift detection query
-- Run this periodically to verify production database matches expected state
--
-- Usage:
--   1. Run this query in production SQL editor
--   2. Save output as "prod_manifest_YYYY-MM-DD.json"
--   3. Compare with previous manifests to detect unexpected changes
--   4. If drift detected, investigate and resolve

-- ============================================================================
-- DATABASE OBJECT MANIFEST
-- ============================================================================

WITH object_manifest AS (
  -- Tables
  SELECT
    'table' AS object_type,
    tablename AS object_name,
    schemaname AS schema_name,
    NULL AS definition
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename LIKE 'trackpay_%'

  UNION ALL

  -- Indexes
  SELECT
    'index' AS object_type,
    indexname AS object_name,
    schemaname AS schema_name,
    indexdef AS definition
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename LIKE 'trackpay_%'

  UNION ALL

  -- Functions
  SELECT
    'function' AS object_type,
    proname::text AS object_name,
    'public' AS schema_name,
    pg_get_functiondef(pg_proc.oid) AS definition
  FROM pg_proc
  JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
  WHERE pg_namespace.nspname = 'public'
    AND (
      proname LIKE 'trackpay_%'
      OR proname LIKE '%_trackpay_%'
      OR proname = 'current_trackpay_user_id'
      OR proname = 'delete_client_relationship_safely'
    )

  UNION ALL

  -- RLS Policies
  SELECT
    'policy' AS object_type,
    policyname AS object_name,
    schemaname AS schema_name,
    qual::text AS definition
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename LIKE 'trackpay_%'

  UNION ALL

  -- Foreign Key Constraints
  SELECT
    'constraint' AS object_type,
    conname AS object_name,
    'public' AS schema_name,
    CASE confdeltype
      WHEN 'r' THEN 'RESTRICT'
      WHEN 'c' THEN 'CASCADE'
      WHEN 'n' THEN 'SET NULL'
      WHEN 'a' THEN 'NO ACTION'
    END AS definition
  FROM pg_constraint
  WHERE conname LIKE '%trackpay_%_fkey'
    AND contype = 'f'

  UNION ALL

  -- Extensions
  SELECT
    'extension' AS object_type,
    extname AS object_name,
    'public' AS schema_name,
    extversion AS definition
  FROM pg_extension
  WHERE extname IN ('pgcrypto', 'pg_stat_statements')
)
SELECT
  object_type,
  object_name,
  schema_name,
  LEFT(definition, 100) AS definition_preview
FROM object_manifest
ORDER BY object_type, object_name;

-- ============================================================================
-- EXPECTED OBJECT COUNTS
-- Run this to quickly verify all expected objects exist
-- ============================================================================

WITH expected_counts AS (
  SELECT 'tables' AS category, 8 AS expected_count
  UNION ALL SELECT 'indexes', 15  -- Approximate, includes auto-created indexes
  UNION ALL SELECT 'functions', 2  -- current_trackpay_user_id, delete_client_relationship_safely
  UNION ALL SELECT 'policies', 18  -- Approximate
  UNION ALL SELECT 'constraints', 15  -- Approximate foreign keys
  UNION ALL SELECT 'extensions', 2  -- pgcrypto, pg_stat_statements
),
actual_counts AS (
  SELECT 'tables' AS category, COUNT(*) AS actual_count
  FROM pg_tables
  WHERE schemaname = 'public' AND tablename LIKE 'trackpay_%'

  UNION ALL
  SELECT 'indexes', COUNT(*)
  FROM pg_indexes
  WHERE schemaname = 'public' AND tablename LIKE 'trackpay_%'

  UNION ALL
  SELECT 'functions', COUNT(*)
  FROM pg_proc
  JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
  WHERE pg_namespace.nspname = 'public'
    AND (proname = 'current_trackpay_user_id' OR proname = 'delete_client_relationship_safely')

  UNION ALL
  SELECT 'policies', COUNT(*)
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename LIKE 'trackpay_%'

  UNION ALL
  SELECT 'constraints', COUNT(*)
  FROM pg_constraint
  WHERE conname LIKE '%trackpay_%_fkey' AND contype = 'f'

  UNION ALL
  SELECT 'extensions', COUNT(*)
  FROM pg_extension
  WHERE extname IN ('pgcrypto', 'pg_stat_statements')
)
SELECT
  e.category,
  e.expected_count,
  COALESCE(a.actual_count, 0) AS actual_count,
  CASE
    WHEN COALESCE(a.actual_count, 0) >= e.expected_count THEN '✅ OK'
    ELSE '❌ MISSING'
  END AS status
FROM expected_counts e
LEFT JOIN actual_counts a ON e.category = a.category
ORDER BY e.category;

-- ============================================================================
-- CRITICAL OBJECT VERIFICATION
-- Verify the most important objects exist
-- ============================================================================

DO $$
DECLARE
  missing_objects text[] := ARRAY[]::text[];
BEGIN
  -- Check critical tables
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'trackpay_users') THEN
    missing_objects := array_append(missing_objects, 'table: trackpay_users');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'trackpay_relationships') THEN
    missing_objects := array_append(missing_objects, 'table: trackpay_relationships');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'trackpay_sessions') THEN
    missing_objects := array_append(missing_objects, 'table: trackpay_sessions');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'trackpay_payments') THEN
    missing_objects := array_append(missing_objects, 'table: trackpay_payments');
  END IF;

  -- Check critical functions
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_trackpay_user_id') THEN
    missing_objects := array_append(missing_objects, 'function: current_trackpay_user_id');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'delete_client_relationship_safely') THEN
    missing_objects := array_append(missing_objects, 'function: delete_client_relationship_safely');
  END IF;

  -- Check critical extensions
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    missing_objects := array_append(missing_objects, 'extension: pgcrypto');
  END IF;

  -- Check unique constraint on auth_user_id
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ux_trackpay_users_auth_user') THEN
    missing_objects := array_append(missing_objects, 'index: ux_trackpay_users_auth_user (CRITICAL!)');
  END IF;

  -- Report results
  IF array_length(missing_objects, 1) > 0 THEN
    RAISE EXCEPTION 'CRITICAL: Missing objects: %', array_to_string(missing_objects, ', ');
  ELSE
    RAISE NOTICE '✅ All critical objects present';
  END IF;
END $$;
