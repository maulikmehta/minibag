-- Clear Seed Data
-- Run this if you need to reset and reload seed data

-- Disable triggers temporarily to avoid issues
SET session_replication_role = 'replica';

-- Delete all seed data (preserves table structure)
-- Order matters due to foreign key constraints
TRUNCATE TABLE participant_items CASCADE;
TRUNCATE TABLE participants CASCADE;
TRUNCATE TABLE sessions CASCADE;
TRUNCATE TABLE catalog_items CASCADE;
TRUNCATE TABLE catalog_categories CASCADE;
TRUNCATE TABLE nicknames_pool CASCADE;
TRUNCATE TABLE user_patterns CASCADE;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Reset sequences if needed
-- (UUID generation doesn't use sequences, so not needed)

-- Success message
DO $$
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'All seed data cleared successfully!';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'You can now run 002_seed_data.sql to reload fresh data';
  RAISE NOTICE '==================================================';
END $$;
