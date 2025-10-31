-- Migration: Change expected_participants default from 0 to NULL
-- This forces host to explicitly choose between solo (0) or waiting for friends (1-3)
-- before they can proceed to shopping

-- Change the default value to NULL
ALTER TABLE sessions
ALTER COLUMN expected_participants DROP DEFAULT;

ALTER TABLE sessions
ALTER COLUMN expected_participants SET DEFAULT NULL;

-- Update the comment to reflect the new behavior
COMMENT ON COLUMN sessions.expected_participants IS 'Number of participants host expects to join. NULL = not set (forces choice), 0 = solo mode (no waiting), 1-3 = wait for N participants';

-- Note: We do NOT update existing sessions - they keep their current value of 0
-- This maintains backward compatibility for sessions created before this change
