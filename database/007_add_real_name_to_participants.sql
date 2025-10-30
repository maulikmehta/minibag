/**
 * Migration: Add real_name to participants table
 * Purpose: Store user's actual name separately from their selected nickname
 * Date: October 26, 2025
 *
 * Use case:
 * - real_name: What user types (e.g., "Maulik Patel")
 * - nickname: What they select from 2 options (e.g., "RAJ" or "RIA")
 */

-- Add real_name column to participants
ALTER TABLE participants
ADD COLUMN real_name TEXT;

-- Add comment
COMMENT ON COLUMN participants.real_name IS 'User actual name (private) - separate from public nickname';

-- Note: real_name is nullable to support existing records and anonymous mode
-- New records should ideally have real_name populated
