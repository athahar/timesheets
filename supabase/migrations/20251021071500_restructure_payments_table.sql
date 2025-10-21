-- Production Fix: Restructure trackpay_payments to match staging schema
-- Issue: Payment tracking code expects new column names but production has old schema
-- Root Cause: Manual schema changes in staging never captured as migration
--
-- This migration restructures the payments table:
-- - Renames payment_method → method, notes → note
-- - Adds status column for payment state tracking
-- - Removes payment_date and updated_at (redundant with created_at)
-- - Makes foreign keys nullable for flexibility

-- Drop old columns that are being renamed or removed
ALTER TABLE trackpay_payments DROP COLUMN IF EXISTS notes;
ALTER TABLE trackpay_payments DROP COLUMN IF EXISTS payment_date;
ALTER TABLE trackpay_payments DROP COLUMN IF EXISTS payment_method;
ALTER TABLE trackpay_payments DROP COLUMN IF EXISTS updated_at;

-- Add new columns
ALTER TABLE trackpay_payments ADD COLUMN IF NOT EXISTS method TEXT;
ALTER TABLE trackpay_payments ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE trackpay_payments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';

-- Make foreign keys nullable for flexibility
ALTER TABLE trackpay_payments ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE trackpay_payments ALTER COLUMN provider_id DROP NOT NULL;
ALTER TABLE trackpay_payments ALTER COLUMN created_at DROP NOT NULL;

-- Make session_ids nullable and ensure correct type
ALTER TABLE trackpay_payments ALTER COLUMN session_ids DROP DEFAULT;
ALTER TABLE trackpay_payments ALTER COLUMN session_ids DROP NOT NULL;
ALTER TABLE trackpay_payments ALTER COLUMN session_ids SET DATA TYPE TEXT[]
  USING session_ids::TEXT[];

-- Add check constraint for valid payment methods
ALTER TABLE trackpay_payments ADD CONSTRAINT trackpay_payments_method_check
  CHECK (method = ANY (ARRAY['cash'::text, 'zelle'::text, 'paypal'::text, 'bank_transfer'::text, 'other'::text]));

-- Add comments explaining the new structure
COMMENT ON TABLE trackpay_payments IS
'Payment records for TrackPay. Tracks payments from clients to service providers for completed work sessions.';

COMMENT ON COLUMN trackpay_payments.method IS
'Payment method used: cash, zelle, paypal, bank_transfer, or other.';

COMMENT ON COLUMN trackpay_payments.note IS
'Optional note about the payment (e.g., transaction ID, check number, notes from client).';

COMMENT ON COLUMN trackpay_payments.status IS
'Payment status: completed, pending, or failed. Defaults to completed for backwards compatibility.';

COMMENT ON COLUMN trackpay_payments.session_ids IS
'Array of session UUIDs that this payment covers. Can be empty for bulk payments not tied to specific sessions.';
