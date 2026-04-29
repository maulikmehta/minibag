-- Fix session 7261f426832c - missing invite row
-- Created before invite sync fix was deployed
-- Session has constant_invite_token but no invite row in Supabase

INSERT INTO invites (
  id,
  session_id,
  invite_token,
  invite_type,
  is_constant_link,
  status,
  slot_assignments,
  declined_by
)
SELECT
  gen_random_uuid(),
  s.id,
  s.constant_invite_token,
  'constant',
  true,
  'active',
  '[]'::jsonb,
  '[]'::jsonb
FROM sessions s
WHERE s.session_id = '7261f426832c'
  AND NOT EXISTS (
    SELECT 1 FROM invites i
    WHERE i.session_id = s.id
    AND i.is_constant_link = true
  );

-- Verify
SELECT
  s.session_id,
  s.mode,
  s.status,
  s.constant_invite_token,
  i.id as invite_id,
  i.invite_token,
  i.status as invite_status,
  i.is_constant_link
FROM sessions s
LEFT JOIN invites i ON i.session_id = s.id AND i.is_constant_link = true
WHERE s.session_id = '7261f426832c';
