-- Migration: Add bill_access_tokens table for time-limited bill page access
-- Created: 2025-11-05
-- Purpose: Generate secure, time-limited URLs for bill viewing and downloading

-- Create bill_access_tokens table
CREATE TABLE IF NOT EXISTS bill_access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    accessed_at TIMESTAMPTZ,
    access_count INTEGER DEFAULT 0,
    CONSTRAINT unique_session_participant UNIQUE(session_id, participant_id)
);

-- Create index for fast token lookup
CREATE INDEX idx_bill_access_tokens_token ON bill_access_tokens(access_token);
CREATE INDEX idx_bill_access_tokens_session ON bill_access_tokens(session_id);
CREATE INDEX idx_bill_access_tokens_expires ON bill_access_tokens(expires_at);

-- Add RLS policies
ALTER TABLE bill_access_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to read with valid token (public access for bill viewing)
CREATE POLICY "Allow public access with valid token"
    ON bill_access_tokens
    FOR SELECT
    USING (expires_at > NOW());

-- Policy: Allow service role to insert/update tokens
CREATE POLICY "Allow service role full access"
    ON bill_access_tokens
    FOR ALL
    USING (true);

-- Add comment
COMMENT ON TABLE bill_access_tokens IS 'Stores time-limited access tokens for bill page viewing. Tokens expire after 30 minutes and can be used by both host and participants.';
COMMENT ON COLUMN bill_access_tokens.participant_id IS 'NULL for solo mode/host bills, references participant for group mode individual bills';
COMMENT ON COLUMN bill_access_tokens.access_token IS 'Unique UUID token used in bill page URL';
COMMENT ON COLUMN bill_access_tokens.expires_at IS 'Token expiration timestamp (typically 30 minutes from creation)';
COMMENT ON COLUMN bill_access_tokens.accessed_at IS 'First access timestamp for analytics';
COMMENT ON COLUMN bill_access_tokens.access_count IS 'Number of times the bill page was accessed';
