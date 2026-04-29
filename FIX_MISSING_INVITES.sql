-- Fix Missing Constant Invites in Supabase
-- Run this in Supabase SQL Editor to fix existing broken sessions

-- Problem: Sessions created before invite sync fix have missing invite rows
-- This causes "Invite link has expired" errors on valid constant links

-- Solution: Create missing invite rows for all active group sessions

BEGIN;

-- Insert missing constant invites
INSERT INTO invites (
  session_id,
  invite_token,
  invite_type,
  is_constant_link,
  status,
  expires_at,
  slot_assignments,
  declined_by,
  created_at,
  updated_at
)
SELECT
  s.id AS session_id,
  s.constant_invite_token AS invite_token,
  'constant' AS invite_type,
  true AS is_constant_link,
  'active' AS status,
  null AS expires_at,
  '[]'::jsonb AS slot_assignments,
  '[]'::jsonb AS declined_by,
  s.created_at,
  NOW() AS updated_at
FROM sessions s
WHERE s.mode = 'group'                          -- Only group sessions
  AND s.constant_invite_token IS NOT NULL       -- Must have token
  AND s.status IN ('open', 'active')            -- Active sessions only
  AND NOT EXISTS (                              -- Missing invite row
    SELECT 1
    FROM invites i
    WHERE i.session_id = s.id
      AND i.is_constant_link = true
  );

-- Show what was fixed
SELECT
  s.session_id,
  s.constant_invite_token,
  s.created_at as session_created,
  'FIXED' as status
FROM sessions s
WHERE s.mode = 'group'
  AND s.constant_invite_token IS NOT NULL
  AND s.status IN ('open', 'active')
  AND EXISTS (
    SELECT 1
    FROM invites i
    WHERE i.session_id = s.id
      AND i.is_constant_link = true
      AND i.updated_at > NOW() - INTERVAL '1 minute'
  );

COMMIT;

-- Verify all active group sessions now have invites
SELECT
  COUNT(*) FILTER (WHERE has_invite = true) as sessions_with_invites,
  COUNT(*) FILTER (WHERE has_invite = false) as sessions_missing_invites,
  COUNT(*) as total_active_group_sessions
FROM (
  SELECT
    s.session_id,
    EXISTS(
      SELECT 1
      FROM invites i
      WHERE i.session_id = s.id
        AND i.is_constant_link = true
    ) as has_invite
  FROM sessions s
  WHERE s.mode = 'group'
    AND s.constant_invite_token IS NOT NULL
    AND s.status IN ('open', 'active')
) AS session_check;
