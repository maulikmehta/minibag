-- Add payments table for Minibag payment tracking
-- Version: 1.1.0
-- Created: October 2025

-- =============================================================================
-- TABLE: payments
-- Purpose: Track actual payments made during shopping
-- =============================================================================
CREATE TABLE IF NOT EXISTS payments (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Session reference
  session_id TEXT NOT NULL,

  -- Item reference (string ID like 'tomato', 'onion')
  item_id TEXT NOT NULL,

  -- Payment details
  amount DECIMAL NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL CHECK (method IN ('upi', 'cash')),

  -- Who recorded this payment
  recorded_by TEXT,  -- participant nickname or ID

  -- Optional vendor info
  vendor_name TEXT,

  -- Status
  status TEXT DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'refunded')),

  -- Timestamp
  recorded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Prevent duplicate payments for same item in same session
  UNIQUE(session_id, item_id)
);

-- Indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_session ON payments(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_item ON payments(item_id);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(method);
CREATE INDEX IF NOT EXISTS idx_payments_recorded_at ON payments(recorded_at DESC);

-- =============================================================================
-- ROW-LEVEL SECURITY
-- =============================================================================

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Anyone can view payments for active sessions
CREATE POLICY "Anyone can view session payments"
ON payments FOR SELECT
USING (true);

-- Anyone can record payments (guest mode)
CREATE POLICY "Anyone can record payments"
ON payments FOR INSERT
WITH CHECK (true);

-- Anyone can update payments
CREATE POLICY "Anyone can update payments"
ON payments FOR UPDATE
USING (true);

-- Anyone can delete payments
CREATE POLICY "Anyone can delete payments"
ON payments FOR DELETE
USING (true);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE payments IS 'Payment records for items purchased during shopping sessions';
COMMENT ON COLUMN payments.session_id IS 'Session ID (string format like "abc123")';
COMMENT ON COLUMN payments.item_id IS 'Item ID (string format like "tomato", "onion")';
COMMENT ON COLUMN payments.method IS 'Payment method: upi or cash';
COMMENT ON COLUMN payments.recorded_by IS 'Participant who recorded the payment';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Payments table created successfully!';
  RAISE NOTICE 'You can now record payments for shopping sessions.';
END $$;
