-- Fix session 36ad2e35d6e7 expiry time
-- Session created before expiry fix deployment
-- Has wrong expires_at (calculated from scheduledTime, not NOW)

-- Update expires_at to NOW + 24 hours
UPDATE sessions
SET expires_at = NOW() + INTERVAL '24 hours'
WHERE session_id = '36ad2e35d6e7'
  AND status IN ('open', 'active');

-- Verify
SELECT
  session_id,
  status,
  created_at,
  expires_at,
  (expires_at > NOW()) as is_valid
FROM sessions
WHERE session_id = '36ad2e35d6e7';
