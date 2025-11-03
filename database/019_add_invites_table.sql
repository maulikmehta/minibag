-- Migration: Add Invites Table for Trackable Participant Invitations
-- Version: 019
-- Date: 2025-11-03
-- Purpose: Enable individual invite link tracking to identify who joined/declined even anonymously

-- =============================================================================
-- TABLE: invites
-- Purpose: Track individual invitation links for sessions
-- =============================================================================
CREATE TABLE invites (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

  -- Invite details
  invite_token TEXT UNIQUE NOT NULL,
  invite_number INTEGER NOT NULL, -- 1, 2, or 3 (position in UI)

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending', -- pending, claimed, declined, expired
  claimed_by UUID REFERENCES participants(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(session_id, invite_number),
  CHECK (invite_number BETWEEN 1 AND 3),
  CHECK (status IN ('pending', 'claimed', 'declined', 'expired'))
);

-- Indexes for invites
CREATE INDEX idx_invites_session ON invites(session_id);
CREATE INDEX idx_invites_token ON invites(invite_token);
CREATE INDEX idx_invites_status ON invites(status) WHERE status = 'pending';

-- Add comments
COMMENT ON TABLE invites IS 'Individual invitation links for tracking participant responses';
COMMENT ON COLUMN invites.invite_token IS 'Unique token used in invite URL query parameter (e.g., ?inv=abc123)';
COMMENT ON COLUMN invites.invite_number IS 'Display order (1-3) shown in host UI as "Invite 1", "Invite 2", etc';
COMMENT ON COLUMN invites.status IS 'pending: awaiting response, claimed: participant joined, declined: participant declined, expired: 20min timeout';

-- =============================================================================
-- ALTER: participants table
-- Add reference to claimed invite
-- =============================================================================
ALTER TABLE participants
ADD COLUMN claimed_invite_id UUID REFERENCES invites(id) ON DELETE SET NULL;

-- Index for reverse lookup
CREATE INDEX idx_participants_invite ON participants(claimed_invite_id) WHERE claimed_invite_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN participants.claimed_invite_id IS 'Which invite link was used to join/decline this session. NULL for legacy participants.';

-- =============================================================================
-- ALTER: sessions table
-- Add flag to lock invite mode after first response
-- =============================================================================
ALTER TABLE sessions
ADD COLUMN invites_locked BOOLEAN DEFAULT false;

-- Add comment
COMMENT ON COLUMN sessions.invites_locked IS 'True if tabs should be locked (participant already responded). Prevents changing expected count mid-session.';
