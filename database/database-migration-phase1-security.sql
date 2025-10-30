-- ================================================================
-- PHASE 1 SECURITY IMPROVEMENTS - DATABASE MIGRATION
-- Run this in Supabase SQL Editor
-- ================================================================
-- Date: October 30, 2025
-- Purpose: Add security features for session management
-- Changes:
--   1. Add host_token column for creator authentication
--   2. Add performance indexes
--   3. Add participant count constraints (optional)
--   4. Add cleanup functions
-- ================================================================

-- Step 1: Add host_token column to sessions table
-- ================================================================
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS host_token VARCHAR(64) UNIQUE;

-- For existing sessions without host_token, generate one
-- (Only needed if you have existing sessions)
UPDATE sessions
SET host_token = encode(gen_random_bytes(32), 'hex')
WHERE host_token IS NULL;

-- Optional: Make host_token NOT NULL for new sessions
-- (Only uncomment after all existing sessions have tokens)
-- ALTER TABLE sessions ALTER COLUMN host_token SET NOT NULL;


-- Step 2: Add indexes for performance
-- ================================================================

-- Index for host token lookups (authentication)
CREATE INDEX IF NOT EXISTS idx_sessions_host_token
ON sessions(host_token);

-- Index for session status queries
CREATE INDEX IF NOT EXISTS idx_sessions_status
ON sessions(status);

-- Index for created_at queries (cleanup)
CREATE INDEX IF NOT EXISTS idx_sessions_created_at
ON sessions(created_at DESC);

-- Composite index for status + created_at (efficient cleanup queries)
CREATE INDEX IF NOT EXISTS idx_sessions_status_created
ON sessions(status, created_at DESC);

-- Index for participant lookups by session
CREATE INDEX IF NOT EXISTS idx_participants_session
ON participants(session_id);

-- Composite index for duplicate nickname checks
CREATE INDEX IF NOT EXISTS idx_participants_session_nickname
ON participants(session_id, nickname);

-- Index for nickname pool availability lookups
CREATE INDEX IF NOT EXISTS idx_nicknames_available_gender
ON nicknames_pool(is_available, gender)
WHERE is_available = true;

-- Index for finding nicknames used in a session
CREATE INDEX IF NOT EXISTS idx_nicknames_currently_used
ON nicknames_pool(currently_used_in)
WHERE currently_used_in IS NOT NULL;


-- Step 3: Add participant count constraint (OPTIONAL)
-- ================================================================
-- WARNING: This enforces at database level that no session can have >20 participants
-- Uncomment if you want database-level enforcement (in addition to API-level checks)

/*
CREATE OR REPLACE FUNCTION check_participant_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM participants WHERE session_id = NEW.session_id) >= 20 THEN
    RAISE EXCEPTION 'Session participant limit (20) exceeded';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_participant_limit
BEFORE INSERT ON participants
FOR EACH ROW
EXECUTE FUNCTION check_participant_limit();
*/


-- Step 4: Session cleanup function
-- ================================================================
-- This function can be called manually or scheduled via cron

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS TABLE(deleted_pending INTEGER, archived_completed INTEGER, released_nicknames INTEGER) AS $$
DECLARE
  deleted_count INTEGER := 0;
  archived_count INTEGER := 0;
  nickname_count INTEGER := 0;
BEGIN
  -- Delete 'open' sessions older than 24 hours
  DELETE FROM sessions
  WHERE status = 'open'
  AND created_at < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Archive completed sessions older than 30 days
  UPDATE sessions
  SET status = 'expired'
  WHERE status IN ('completed', 'cancelled')
  AND created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS archived_count = ROW_COUNT;

  -- Release nicknames from deleted/archived sessions
  UPDATE nicknames_pool
  SET is_available = true, currently_used_in = null
  WHERE currently_used_in IN (
    SELECT id FROM sessions
    WHERE status IN ('expired', 'cancelled')
    OR (status = 'open' AND created_at < NOW() - INTERVAL '24 hours')
  );

  GET DIAGNOSTICS nickname_count = ROW_COUNT;

  RETURN QUERY SELECT deleted_count, archived_count, nickname_count;
END;
$$ LANGUAGE plpgsql;

-- To manually run cleanup:
-- SELECT * FROM cleanup_expired_sessions();


-- Step 5: Optional - Schedule automatic cleanup with pg_cron
-- ================================================================
-- Requires pg_cron extension (available in Supabase Pro tier)
-- Uncomment to enable daily cleanup at 2 AM

/*
-- Enable pg_cron extension (run once)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup job (runs daily at 2:00 AM)
SELECT cron.schedule(
  'cleanup-expired-sessions',
  '0 2 * * *',
  'SELECT cleanup_expired_sessions()'
);

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To remove the scheduled job:
-- SELECT cron.unschedule('cleanup-expired-sessions');
*/


-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================
-- Run these to verify the migration succeeded

-- 1. Check if host_token column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sessions' AND column_name = 'host_token';

-- 2. List all indexes on sessions table
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'sessions'
ORDER BY indexname;

-- 3. List all indexes on participants table
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'participants'
ORDER BY indexname;

-- 4. List all indexes on nicknames_pool table
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'nicknames_pool'
ORDER BY indexname;

-- 5. Check if cleanup function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'cleanup_expired_sessions';


-- ================================================================
-- ROLLBACK (Use with caution!)
-- ================================================================
-- If you need to undo these changes, uncomment and run:

/*
-- Remove indexes
DROP INDEX IF EXISTS idx_sessions_host_token;
DROP INDEX IF EXISTS idx_sessions_status;
DROP INDEX IF EXISTS idx_sessions_created_at;
DROP INDEX IF EXISTS idx_sessions_status_created;
DROP INDEX IF EXISTS idx_participants_session;
DROP INDEX IF EXISTS idx_participants_session_nickname;
DROP INDEX IF EXISTS idx_nicknames_available_gender;
DROP INDEX IF EXISTS idx_nicknames_currently_used;

-- Remove constraint and trigger (if you enabled them)
DROP TRIGGER IF EXISTS enforce_participant_limit ON participants;
DROP FUNCTION IF EXISTS check_participant_limit();

-- Remove cleanup function
DROP FUNCTION IF EXISTS cleanup_expired_sessions();

-- Remove host_token column (WARNING: This will delete all host tokens!)
ALTER TABLE sessions DROP COLUMN IF EXISTS host_token;
*/


-- ================================================================
-- NOTES FOR ADMINISTRATOR
-- ================================================================
-- 1. Backup your database before running this migration
-- 2. Test in development environment first
-- 3. The host_token column will be empty for existing sessions
--    - Existing sessions won't have host authentication
--    - New sessions will automatically get host tokens
-- 4. Run cleanup function manually first time: SELECT * FROM cleanup_expired_sessions();
-- 5. Monitor index usage with: SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public';
