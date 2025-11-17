-- Migration: Add Session PIN for participant authentication
-- Version: 018
-- Date: 2025-11-02
-- Purpose: Add optional PIN/password protection for sessions to prevent unauthorized joining

-- Add session_pin column to sessions table
ALTER TABLE sessions
ADD COLUMN session_pin TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN sessions.session_pin IS 'Optional 4-6 digit PIN for participant authentication. If set, participants must provide correct PIN to join.';

-- Create index for PIN lookups (used during join validation)
CREATE INDEX idx_sessions_pin ON sessions(session_pin) WHERE session_pin IS NOT NULL;

-- Update RLS policy for sessions to allow reading sessions with correct PIN
-- Note: This is a placeholder - actual PIN validation happens in application layer for security
-- We don't expose PIN in SELECT queries to prevent leakage

-- Add migration note
INSERT INTO migration_log (version, name, applied_at, description)
VALUES (
  '018',
  'add_session_pin',
  NOW(),
  'Added optional session_pin column for participant authentication. Host can set PIN when creating session, participants must provide PIN to join.'
)
ON CONFLICT DO NOTHING;
