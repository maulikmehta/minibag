-- Fix Missing Constant Invites in Supabase (CORRECTED VERSION)
-- Run this in Supabase SQL Editor

-- BUGFIX: Added id column with uuid_generate_v4()

INSERT INTO invites (
  id,                    -- ADDED: Primary key
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
  gen_random_uuid() AS id,                     -- FIXED: Generate UUID
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
WHERE s.mode = 'group'
  AND s.constant_invite_token IS NOT NULL
  AND s.status IN ('open', 'active')
  AND NOT EXISTS (
    SELECT 1
    FROM invites i
    WHERE i.session_id = s.id
      AND i.is_constant_link = true
  );

-- Verify
SELECT
  s.session_id,
  i.id as invite_id,
  i.invite_token,
  i.status,
  'FIXED' as result
FROM sessions s
JOIN invites i ON i.session_id = s.id
WHERE s.session_id = '36ad2e35d6e7'
  AND i.is_constant_link = true;
