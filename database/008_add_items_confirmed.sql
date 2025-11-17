/**
 * Migration: Add items_confirmed to participants table
 * Purpose: Track whether a participant has confirmed their items before shopping starts
 * Date: October 31, 2025
 *
 * Use case:
 * - items_confirmed: FALSE by default when participant joins
 * - Set to TRUE when participant finalizes their list
 * - Used for checkpoint logic to ensure all participants are ready
 */

-- Add items_confirmed column to participants
ALTER TABLE participants
ADD COLUMN items_confirmed BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN participants.items_confirmed IS 'Whether participant has confirmed their items list before shopping starts';

-- Note: Defaults to false for new and existing participants
-- Participants must explicitly confirm to set to true
