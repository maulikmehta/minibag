-- Migration 013: Update payments table constraints to support skip items
-- Purpose: Allow method='skip' and amount=0 for skipped items
-- Date: November 2, 2025
-- Relates to: Migration 012 (add_skip_fields_to_payments)

-- Step 1: Drop existing constraints
ALTER TABLE payments
DROP CONSTRAINT IF EXISTS payments_amount_check;

ALTER TABLE payments
DROP CONSTRAINT IF EXISTS payments_method_check;

ALTER TABLE payments
DROP CONSTRAINT IF EXISTS payments_status_check;

-- Step 2: Add updated constraints
-- Allow amount >= 0 (was amount > 0) to support skipped items with 0 amount
ALTER TABLE payments
ADD CONSTRAINT payments_amount_check CHECK (amount >= 0);

-- Allow method='skip' in addition to 'upi' and 'cash'
ALTER TABLE payments
ADD CONSTRAINT payments_method_check CHECK (method IN ('upi', 'cash', 'skip'));

-- Add 'skipped' to status values
ALTER TABLE payments
ADD CONSTRAINT payments_status_check CHECK (status IN ('paid', 'pending', 'refunded', 'skipped'));

-- Update comment to reflect new method option
COMMENT ON COLUMN payments.method IS 'Payment method: upi, cash, or skip (for skipped items)';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Payments table constraints updated successfully!';
  RAISE NOTICE 'Skip items feature is now fully supported:';
  RAISE NOTICE '  - amount can be 0 for skipped items';
  RAISE NOTICE '  - method can be ''skip'' for skipped items';
  RAISE NOTICE '  - status can be ''skipped'' for skipped items';
END $$;
