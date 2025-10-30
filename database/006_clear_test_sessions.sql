-- Clear Test Session Data
-- Purpose: Remove all test sessions while preserving catalog items
-- Run this to clean up test data from development

-- =============================================================================
-- WHAT THIS CLEARS:
-- - All sessions (minibag, partybag, fitbag)
-- - All participants
-- - All payments
--
-- WHAT THIS PRESERVES:
-- - Catalog items (vegetables, party items, etc.)
-- - Catalog categories
-- - Nicknames pool
-- - User patterns
-- =============================================================================

-- Disable triggers temporarily
SET session_replication_role = 'replica';

-- Clear test data in correct order (respects foreign key constraints)
TRUNCATE TABLE payments CASCADE;
TRUNCATE TABLE participant_items CASCADE;
TRUNCATE TABLE participants CASCADE;
TRUNCATE TABLE sessions CASCADE;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Success message
DO $$
DECLARE
  sessions_cleared INTEGER;
  participants_cleared INTEGER;
  payments_cleared INTEGER;
BEGIN
  -- Get row counts (will be 0 after truncate, but showing for clarity)
  SELECT COUNT(*) INTO sessions_cleared FROM sessions;
  SELECT COUNT(*) INTO participants_cleared FROM participants;
  SELECT COUNT(*) INTO payments_cleared FROM payments;

  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Test session data cleared successfully!';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Sessions cleared: %', sessions_cleared;
  RAISE NOTICE 'Participants cleared: %', participants_cleared;
  RAISE NOTICE 'Payments cleared: %', payments_cleared;
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Catalog items preserved ✓';
  RAISE NOTICE 'Your admin dashboard should now show 0 sessions';
  RAISE NOTICE '==================================================';
END $$;
