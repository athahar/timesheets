-- 000_extensions.sql
-- Install required PostgreSQL extensions for TrackPay production database
-- Run this FIRST before any other migrations

BEGIN;

SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '30s';

-- pgcrypto: UUID generation and cryptographic functions
-- Used for: gen_random_uuid() in table defaults
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- pg_stat_statements: Query performance monitoring
-- Used for: Production query analysis and optimization
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

COMMIT;

-- Verification
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
    RAISE EXCEPTION 'pgcrypto extension not installed';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
    RAISE EXCEPTION 'pg_stat_statements extension not installed';
  END IF;

  RAISE NOTICE '✅ Extensions installed successfully';
END $$;
