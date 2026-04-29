-- Debug FRESH session 96b182f8271a
-- Still showing "expired" error

SELECT
  s.session_id,
  s.mode,
  s.status,
  s.constant_invite_token,
  s.created_at,
  s.expires_at,
  (s.expires_at > NOW()) as expires_at_valid,
  (NOW() - s.created_at) as age,
  i.id as invite_id,
  i.invite_token,
  i.status as invite_status,
  i.is_constant_link,
  i.expires_at as invite_expires_at
FROM sessions s
LEFT JOIN invites i ON i.session_id = s.id AND i.is_constant_link = true
WHERE s.session_id = '96b182f8271a';
