-- Add creator_real_name column to sessions table
ALTER TABLE sessions ADD COLUMN creator_real_name TEXT;

-- Backfill existing sessions with creator's real name from participants
UPDATE sessions s
SET creator_real_name = p.real_name
FROM participants p
WHERE s.id = p.session_id
  AND p.is_creator = true
  AND p.real_name IS NOT NULL;

-- Add index for performance
CREATE INDEX idx_sessions_creator_real_name ON sessions(creator_real_name);
