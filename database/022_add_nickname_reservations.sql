/**
 * Migration 022: Add Nickname Reservation System
 *
 * Purpose: Prevent race conditions in nickname assignment
 *
 * Problem: Multiple users can fetch the same available nicknames simultaneously,
 * leading to conflicts when they try to claim them.
 *
 * Solution: Add optimistic reservation with TTL (5 minutes)
 * - When nicknames are fetched, they're immediately reserved
 * - Reservation expires after 5 minutes if not confirmed
 * - Cleanup job periodically releases expired reservations
 *
 * Date: 2025-11-08
 */

-- Add reservation columns to nicknames_pool table
ALTER TABLE nicknames_pool
  ADD COLUMN reserved_until TIMESTAMPTZ,
  ADD COLUMN reserved_by_session UUID REFERENCES sessions(id) ON DELETE SET NULL;

-- Add index for efficient reservation queries
CREATE INDEX IF NOT EXISTS idx_nicknames_pool_reserved
  ON nicknames_pool(is_available, reserved_until)
  WHERE reserved_until IS NULL;

-- Add comment for clarity
COMMENT ON COLUMN nicknames_pool.reserved_until IS 'Temporary reservation expiry timestamp (5 min TTL)';
COMMENT ON COLUMN nicknames_pool.reserved_by_session IS 'Session that has reserved this nickname';

-- Create function to cleanup expired reservations
CREATE OR REPLACE FUNCTION cleanup_expired_nickname_reservations()
RETURNS INTEGER AS $$
DECLARE
  released_count INTEGER;
BEGIN
  UPDATE nicknames_pool
  SET
    reserved_until = NULL,
    reserved_by_session = NULL
  WHERE
    reserved_until IS NOT NULL
    AND reserved_until < NOW();

  GET DIAGNOSTICS released_count = ROW_COUNT;

  RETURN released_count;
END;
$$ LANGUAGE plpgsql;

-- Add comment to function
COMMENT ON FUNCTION cleanup_expired_nickname_reservations() IS 'Releases nicknames with expired reservations (called by cleanup job every 5 minutes)';
