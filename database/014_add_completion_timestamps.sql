-- Migration 014: Add completion timestamps to sessions table
-- Purpose: Track session completion and financial settlement events for LocalLoops analytics
-- Date: 2025-11-02

-- Add completion timestamp (when status changes to 'completed')
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add financial settlement timestamp (when all items are paid or skipped)
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS financially_settled_at TIMESTAMPTZ;

-- Add index for efficient querying of completed sessions
CREATE INDEX IF NOT EXISTS idx_sessions_completed_at
ON sessions(completed_at) WHERE completed_at IS NOT NULL;

-- Add index for efficient querying of financially settled sessions
CREATE INDEX IF NOT EXISTS idx_sessions_financially_settled_at
ON sessions(financially_settled_at) WHERE financially_settled_at IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN sessions.completed_at IS 'Timestamp when session status changed to completed (host reached PaymentSplitScreen)';
COMMENT ON COLUMN sessions.financially_settled_at IS 'Timestamp when all items in session were either paid or skipped';
