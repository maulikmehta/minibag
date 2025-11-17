/**
 * Migration: Add 20-minute auto-timeout for invite links
 * Purpose: Track when expected participants timer starts and auto-expire links
 * Date: October 31, 2025
 *
 * Use case:
 * - Timer starts when host sets expected_participants to 1-3
 * - After 20 minutes, invite link becomes invalid (no new joins)
 * - Unfilled expected slots auto-count as "timed out" for checkpoint
 * - Checkpoint completes: (joined + notComing + timedOut) >= expected
 * - Shopping button enables once checkpoint completes
 */

-- Add timeout tracking field to sessions table
ALTER TABLE sessions
ADD COLUMN expected_participants_set_at TIMESTAMPTZ;

-- Add comment for sessions field
COMMENT ON COLUMN sessions.expected_participants_set_at IS 'Timestamp when host set expected_participants to 1-3 (starts 20min timeout timer). NULL when expected_participants is NULL or 0.';

-- Note: Backward compatible
-- Existing sessions will have expected_participants_set_at = NULL
-- This means no timeout for existing sessions unless host changes expected count
