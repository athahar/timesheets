-- TrackPay: Fix Session-Related FK Cascades
-- Created: 2025-10-15
-- Purpose: Prevent financial/audit data loss from session deletions

-- ============================================================================
-- Context: Additional CASCADE Issues Found
-- ============================================================================
-- During delete client feature work, we discovered that payments, requests,
-- and activities CASCADE delete when their related session is deleted.
-- This violates data integrity for financial records and audit trails.

-- ============================================================================
-- SECTION 1: Fix Payments Session FK (CRITICAL - Financial Data)
-- ============================================================================
-- Current: CASCADE - deleting session deletes payments
-- Target: RESTRICT - can't delete session if payments exist
BEGIN;

ALTER TABLE public.trackpay_payments
  DROP CONSTRAINT IF EXISTS trackpay_payments_session_id_fkey;

-- Payments are financial records - sessions cannot be deleted if payments exist
ALTER TABLE public.trackpay_payments
  ADD CONSTRAINT trackpay_payments_session_id_fkey
    FOREIGN KEY (session_id)
    REFERENCES public.trackpay_sessions(id)
    ON DELETE RESTRICT;

COMMIT;

-- ============================================================================
-- SECTION 2: Fix Payment Requests Session FK (Financial Audit Trail)
-- ============================================================================
-- Current: CASCADE - deleting session deletes payment requests
-- Target: SET NULL - keep request, null the session reference
BEGIN;

ALTER TABLE public.trackpay_requests
  DROP CONSTRAINT IF EXISTS trackpay_requests_session_id_fkey;

-- Payment requests should survive session deletion for audit trail
-- NULL the session_id but keep the request record
ALTER TABLE public.trackpay_requests
  ADD CONSTRAINT trackpay_requests_session_id_fkey
    FOREIGN KEY (session_id)
    REFERENCES public.trackpay_sessions(id)
    ON DELETE SET NULL;

COMMIT;

-- ============================================================================
-- SECTION 3: Fix Activities Session FK (Audit Trail)
-- ============================================================================
-- Current: CASCADE - deleting session deletes activities
-- Target: SET NULL - keep activity, null the session reference
BEGIN;

ALTER TABLE public.trackpay_activities
  DROP CONSTRAINT IF EXISTS trackpay_activities_session_id_fkey;

-- Activities are audit logs - should survive session deletion
-- NULL the session_id but keep the activity record
ALTER TABLE public.trackpay_activities
  ADD CONSTRAINT trackpay_activities_session_id_fkey
    FOREIGN KEY (session_id)
    REFERENCES public.trackpay_sessions(id)
    ON DELETE SET NULL;

COMMIT;

-- ============================================================================
-- OPTIONAL: Fix trackpay_users → auth.users FK
-- ============================================================================
-- Current: CASCADE - deleting auth user cascades to trackpay_users
-- Consider: RESTRICT - require explicit cleanup workflow
--
-- Uncomment if you want stricter control over account deletion:
--
-- BEGIN;
--
-- ALTER TABLE public.trackpay_users
--   DROP CONSTRAINT IF EXISTS trackpay_users_auth_user_id_fkey;
--
-- ALTER TABLE public.trackpay_users
--   ADD CONSTRAINT trackpay_users_auth_user_id_fkey
--     FOREIGN KEY (auth_user_id)
--     REFERENCES auth.users(id)
--     ON DELETE RESTRICT;
--
-- COMMIT;
--
-- Note: This prevents auth.users deletion if trackpay_users exists
-- Requires explicit workflow: delete trackpay_users first, then auth user

-- ============================================================================
-- Verification
-- ============================================================================
-- Run this to verify session-related constraints are fixed:
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
WHERE (conname LIKE '%session_id_fkey' OR conname LIKE '%auth_user_id_fkey')
  AND contype = 'f'
ORDER BY table_name, conname;

-- Expected:
-- trackpay_payments.session_id → RESTRICT ✅ (financial records protected)
-- trackpay_requests.session_id → SET NULL ✅ (audit trail preserved)
-- trackpay_activities.session_id → SET NULL ✅ (audit trail preserved)
-- trackpay_users.auth_user_id → CASCADE ⚠️ (optional to change)

-- ============================================================================
-- Business Logic Impact
-- ============================================================================

-- BEFORE (Dangerous):
-- 1. Delete session → payments gone, requests gone, activities gone
-- 2. Result: Financial data loss, no audit trail

-- AFTER (Safe):
-- 1. Try to delete session with payments → BLOCKED by RESTRICT
-- 2. Try to delete session with requests → Request survives, session_id = NULL
-- 3. Try to delete session with activities → Activity survives, session_id = NULL
-- 4. Result: Financial data protected, audit trail preserved

-- ============================================================================
-- When Can You Delete a Session?
-- ============================================================================

-- You can delete a session if:
-- - No payments reference it (RESTRICT blocks)
-- - Requests reference it (they survive with NULL session_id)
-- - Activities reference it (they survive with NULL session_id)

-- Typical safe flow:
-- 1. Create session
-- 2. End session
-- 3. Request payment (creates request with session_id)
-- 4. Mark paid (creates payment with session_id)
-- 5. Now session is "locked" - cannot delete due to payment FK

-- ============================================================================
-- Migration Complete
-- ============================================================================
