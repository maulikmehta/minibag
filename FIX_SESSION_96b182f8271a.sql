-- Fix session 96b182f8271a - missing invite row
-- Backend deployment not picked up invite sync code

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
WHERE s.session_id = '96b182f8271a'
  AND NOT EXISTS (
    SELECT 1 FROM invites i
    WHERE i.session_id = s.id
    AND i.is_constant_link = true
  );

-- Verify
SELECT
  s.session_id,
  s.constant_invite_token,
  i.invite_token,
  i.status
FROM sessions s
LEFT JOIN invites i ON i.session_id = s.id AND i.is_constant_link = true
WHERE s.session_id = '96b182f8271a';
