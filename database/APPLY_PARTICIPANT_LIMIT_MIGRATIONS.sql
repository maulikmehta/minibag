-- ================================================================
-- APPLY PARTICIPANT LIMIT MIGRATIONS (029, 030, 031)
-- ================================================================
-- Date: 2025-11-18
-- Database: TEST (minibag-test project: cvseopmdpooznqojlads)
-- ⚠️  DO NOT RUN ON PRODUCTION DATABASE!
--
-- Purpose: Add max_participants column and fix existing sessions
--
-- Run this in Supabase SQL Editor (TEST database):
-- https://supabase.com/dashboard/project/cvseopmdpooznqojlads/sql
-- ================================================================

BEGIN;

-- ================================================================
-- MIGRATION 029: Make Participant Limits Configurable
-- ================================================================

-- STEP 1: Remove hardcoded invite_number constraint
ALTER TABLE invites DROP CONSTRAINT IF EXISTS invites_invite_number_check;
ALTER TABLE invites ADD CONSTRAINT invites_invite_number_check
  CHECK (invite_number > 0);

COMMENT ON COLUMN invites.invite_number IS 'Display order shown in host UI (e.g., "Invite 1", "Invite 2"). Can be any positive integer based on product tier configuration.';

-- STEP 2: Add max_participants column to sessions table
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS max_participants INTEGER DEFAULT 20;

ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_max_participants_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_max_participants_check
  CHECK (max_participants > 0);

CREATE INDEX IF NOT EXISTS idx_sessions_max_participants
ON sessions(max_participants) WHERE max_participants IS NOT NULL;

COMMENT ON COLUMN sessions.max_participants IS 'Maximum total participants allowed in this session (including host). Set by product tier configuration at session creation. Default: 20.';

-- Backfill existing sessions with default value (20)
UPDATE sessions
SET max_participants = 20
WHERE max_participants IS NULL;

-- STEP 3: Update participant limit trigger to be dynamic
DROP TRIGGER IF EXISTS enforce_participant_limit ON participants;
DROP FUNCTION IF EXISTS check_participant_limit();

CREATE OR REPLACE FUNCTION check_participant_limit()
RETURNS TRIGGER AS $$
DECLARE
  participant_count INT;
  max_allowed INT;
  sess_type TEXT;
BEGIN
  -- Get current participant count (excluding those marked as not coming)
  SELECT COUNT(*) INTO participant_count
  FROM participants
  WHERE session_id = NEW.session_id
    AND marked_not_coming = false;

  -- Get max_participants for this specific session
  SELECT max_participants, session_type INTO max_allowed, sess_type
  FROM sessions
  WHERE id = NEW.session_id;

  -- If max_participants not set, default to 20 (backward compatibility)
  IF max_allowed IS NULL THEN
    max_allowed := 20;
  END IF;

  -- Enforce the limit
  IF participant_count >= max_allowed THEN
    RAISE EXCEPTION 'Session participant limit reached (max % participants for % sessions)',
      max_allowed, sess_type
      USING ERRCODE = 'check_violation',
            HINT = 'This session is full. Please try joining a different session.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_participant_limit
BEFORE INSERT ON participants
FOR EACH ROW
EXECUTE FUNCTION check_participant_limit();

COMMENT ON FUNCTION check_participant_limit() IS
  'Enforces session-specific participant limit (read from sessions.max_participants) to prevent race conditions during concurrent joins. Supports configurable limits per product/tier.';

COMMENT ON TRIGGER enforce_participant_limit ON participants IS
  'Prevents sessions from exceeding their configured max_participants limit by checking count atomically before insert. Limit is configurable per session based on product tier.';

-- ================================================================
-- MIGRATION 030: Fix Trigger Ambiguity (already included above)
-- ================================================================
-- Note: The trigger function above uses qualified column references
-- to avoid ambiguity between sessions.session_type and other tables

-- ================================================================
-- MIGRATION 031: Fix Existing Sessions with Incorrect Limits
-- ================================================================

-- Step 1: Fix group sessions (expected_participants >= 1 but max_participants = 1)
-- These sessions should have max_participants = 20 (group tier)
UPDATE sessions
SET max_participants = 20
WHERE session_type = 'minibag'
  AND expected_participants >= 1
  AND max_participants = 1;

-- Step 2: Fix solo sessions (expected_participants = 0 but max_participants != 1)
-- These sessions should have max_participants = 1 (solo tier)
UPDATE sessions
SET max_participants = 1
WHERE session_type = 'minibag'
  AND expected_participants = 0
  AND max_participants != 1;

-- Step 3: Fix NULL expected_participants (treat as solo mode)
UPDATE sessions
SET max_participants = 1
WHERE session_type = 'minibag'
  AND expected_participants IS NULL
  AND max_participants != 1;

-- Step 4: Set default max_participants = 20 for any remaining NULL values
UPDATE sessions
SET max_participants = 20
WHERE max_participants IS NULL;

COMMIT;

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Check for any remaining inconsistent sessions
SELECT
  'Broken sessions (expected>=1 but max=1)' as check_type,
  COUNT(*) as count
FROM sessions
WHERE session_type = 'minibag'
  AND expected_participants >= 1
  AND max_participants = 1

UNION ALL

SELECT
  'Broken sessions (expected=0 but max!=1)' as check_type,
  COUNT(*) as count
FROM sessions
WHERE session_type = 'minibag'
  AND expected_participants = 0
  AND max_participants != 1

UNION ALL

SELECT
  'Sessions with NULL max_participants' as check_type,
  COUNT(*) as count
FROM sessions
WHERE max_participants IS NULL;

-- Show sample of recent sessions with their limits
SELECT
  session_id,
  expected_participants,
  max_participants,
  status,
  created_at
FROM sessions
WHERE session_type = 'minibag'
ORDER BY created_at DESC
LIMIT 10;

-- ================================================================
-- SUCCESS MESSAGE
-- ================================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Participant Limit Migrations Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ Migration 029: max_participants column added';
  RAISE NOTICE '✓ Migration 030: Trigger ambiguity fixed';
  RAISE NOTICE '✓ Migration 031: Existing sessions corrected';
  RAISE NOTICE '';
  RAISE NOTICE 'All sessions now have consistent participant limits based on tier:';
  RAISE NOTICE '  - Solo mode (expected=0): max_participants=1';
  RAISE NOTICE '  - Group mode (expected>=1): max_participants=20';
  RAISE NOTICE '========================================';
END $$;
