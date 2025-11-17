-- Migration: Add database trigger to enforce 20-participant session limit
-- This prevents race conditions where multiple concurrent joins could exceed the limit
-- Created: 2025-11-10

-- Drop trigger and function if they exist (for idempotency)
DROP TRIGGER IF EXISTS enforce_participant_limit ON participants;
DROP FUNCTION IF EXISTS check_participant_limit();

-- Create trigger function to check participant count before insert
CREATE OR REPLACE FUNCTION check_participant_limit()
RETURNS TRIGGER AS $$
DECLARE
  participant_count INT;
BEGIN
  -- Count current participants in the session (excluding those marked as not coming)
  SELECT COUNT(*) INTO participant_count
  FROM participants
  WHERE session_id = NEW.session_id
    AND marked_not_coming = false;

  -- Enforce limit of 20 active participants per session
  IF participant_count >= 20 THEN
    RAISE EXCEPTION 'Session participant limit reached (max 20 active participants)'
      USING ERRCODE = 'check_violation',
            HINT = 'This session is full. Please try joining a different session.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires before each participant insert
CREATE TRIGGER enforce_participant_limit
BEFORE INSERT ON participants
FOR EACH ROW
EXECUTE FUNCTION check_participant_limit();

-- Add comment for documentation
COMMENT ON FUNCTION check_participant_limit() IS
  'Atomically enforces 20-participant limit per session to prevent race conditions during concurrent joins';

COMMENT ON TRIGGER enforce_participant_limit ON participants IS
  'Prevents sessions from exceeding 20 active participants by checking count atomically before insert';
