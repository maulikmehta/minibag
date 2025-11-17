/**
 * Migration: Add checkpoint-related fields for participant tracking
 * Purpose: Support hard blocking until all expected participants respond
 * Date: October 31, 2025
 *
 * Use case:
 * - Host sets expected_participants count during session creation
 * - Shopping cannot start until: joined + marked_not_coming >= expected_participants
 * - Host can manually mark participants as "not coming"
 * - checkpoint_complete flag tracks readiness state
 */

-- Add checkpoint fields to sessions table
ALTER TABLE sessions
ADD COLUMN expected_participants INTEGER DEFAULT 0,
ADD COLUMN checkpoint_complete BOOLEAN DEFAULT false;

-- Add comments for sessions fields
COMMENT ON COLUMN sessions.expected_participants IS 'Number of participants host expects to join (0 = no waiting required)';
COMMENT ON COLUMN sessions.checkpoint_complete IS 'Whether participant checkpoint is complete (computed or manually set)';

-- Add "not coming" tracking fields to participants table
ALTER TABLE participants
ADD COLUMN marked_not_coming BOOLEAN DEFAULT false,
ADD COLUMN marked_not_coming_at TIMESTAMPTZ;

-- Add comments for participants fields
COMMENT ON COLUMN participants.marked_not_coming IS 'Whether host marked this participant as not coming';
COMMENT ON COLUMN participants.marked_not_coming_at IS 'Timestamp when participant was marked as not coming';

-- Note: All fields are backward compatible
-- Existing sessions will have expected_participants = 0 (no checkpoint)
-- Existing participants will have marked_not_coming = false (active)
