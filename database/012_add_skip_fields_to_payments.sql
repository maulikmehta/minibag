-- Migration 012: Add skip fields to payments table
-- Purpose: Support skipping items during shopping
-- Date: November 1, 2025

-- Add skipped boolean flag (default FALSE)
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS skipped BOOLEAN DEFAULT FALSE NOT NULL;

-- Add skip reason text field with default message
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS skip_reason TEXT DEFAULT 'Item wasn''t good enough to buy';

-- Add index for efficient querying of skipped items
CREATE INDEX IF NOT EXISTS idx_payments_skipped ON payments(session_id, skipped);

-- Add comment for documentation
COMMENT ON COLUMN payments.skipped IS 'TRUE if item was skipped instead of purchased';
COMMENT ON COLUMN payments.skip_reason IS 'Reason why item was skipped (default: Item wasn''t good enough to buy)';

-- Validation: Ensure skipped items have zero amount
-- This will be enforced at application level in API
