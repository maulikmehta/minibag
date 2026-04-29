-- Quick fix for session 36ad2e35d6e7
-- Minimal columns only

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
WHERE s.session_id = '36ad2e35d6e7'
  AND NOT EXISTS (
    SELECT 1 FROM invites i
    WHERE i.session_id = s.id
    AND i.is_constant_link = true
  );

-- Verify
SELECT * FROM invites WHERE session_id = (SELECT id FROM sessions WHERE session_id = '36ad2e35d6e7');
