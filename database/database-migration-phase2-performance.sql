-- ================================================================
-- PHASE 2 PERFORMANCE IMPROVEMENTS - DATABASE MIGRATION
-- Run this in Supabase SQL Editor
-- ================================================================
-- Date: October 30, 2025
-- Purpose: Add performance indexes for catalog and query optimization
-- Changes:
--   1. Add missing performance indexes
--   2. Optimize common query patterns
--   3. Add query analysis helpers
-- ================================================================

-- ================================================================
-- STEP 1: VERIFY EXISTING INDEXES
-- ================================================================
-- First, let's check what we already have

DO $$
BEGIN
  RAISE NOTICE '=== CHECKING EXISTING INDEXES ===';
  RAISE NOTICE 'Run the verification queries at the end to see details';
END $$;


-- ================================================================
-- STEP 2: ADD MISSING PERFORMANCE INDEXES
-- ================================================================

-- Add trigram extension FIRST (for fuzzy text search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Catalog Items - Add index on name for search queries
-- This supports: SELECT * FROM catalog_items WHERE name ILIKE '%search%'
CREATE INDEX IF NOT EXISTS idx_catalog_items_name
ON catalog_items(name);

-- Catalog Items - Add text search index for multi-language search
-- This supports searching across name, name_hi, name_gu
CREATE INDEX IF NOT EXISTS idx_catalog_items_name_trgm
ON catalog_items USING gin(name gin_trgm_ops);

-- Catalog Items - Composite index for category + active filtering
-- This supports: SELECT * FROM catalog_items WHERE category_id = ? AND is_active = true
CREATE INDEX IF NOT EXISTS idx_catalog_items_category_active
ON catalog_items(category_id, is_active)
WHERE is_active = true;

-- Catalog Items - Composite index for sorting
-- This supports: SELECT * FROM catalog_items ORDER BY sort_order, name
CREATE INDEX IF NOT EXISTS idx_catalog_items_sort
ON catalog_items(sort_order, name);

-- Payments - Check if participant_id exists, if so add composite index
-- Note: Current schema has 'recorded_by' TEXT instead of participant_id UUID
-- Adding index on recorded_by for filtering
CREATE INDEX IF NOT EXISTS idx_payments_recorded_by
ON payments(recorded_by);

-- Payments - Composite index for session + status queries
-- This supports: SELECT * FROM payments WHERE session_id = ? AND status = ?
CREATE INDEX IF NOT EXISTS idx_payments_session_status
ON payments(session_id, status);

-- Participant Items - Add indexes for shopping queries
CREATE INDEX IF NOT EXISTS idx_participant_items_participant
ON participant_items(participant_id);

CREATE INDEX IF NOT EXISTS idx_participant_items_item
ON participant_items(item_id);

-- Composite index for common join pattern
CREATE INDEX IF NOT EXISTS idx_participant_items_participant_item
ON participant_items(participant_id, item_id);


-- ================================================================
-- STEP 3: ANALYZE TABLES FOR QUERY PLANNER
-- ================================================================
-- Update statistics so PostgreSQL can optimize queries better

ANALYZE catalog_categories;
ANALYZE catalog_items;
ANALYZE sessions;
ANALYZE participants;
ANALYZE participant_items;
ANALYZE payments;
ANALYZE nicknames_pool;


-- ================================================================
-- STEP 4: CREATE QUERY ANALYSIS HELPER VIEWS
-- ================================================================

-- View to see most queried catalog items
CREATE OR REPLACE VIEW catalog_item_usage AS
SELECT
  ci.item_id,
  ci.name,
  ci.name_hi,
  ci.name_gu,
  COUNT(DISTINCT pi.participant_id) as unique_participants,
  COUNT(pi.id) as total_orders,
  SUM(pi.quantity) as total_quantity
FROM catalog_items ci
LEFT JOIN participant_items pi ON ci.id = pi.item_id
GROUP BY ci.id, ci.item_id, ci.name, ci.name_hi, ci.name_gu
ORDER BY total_orders DESC;

-- View to see payment patterns
CREATE OR REPLACE VIEW payment_summary AS
SELECT
  session_id,
  COUNT(*) as payment_count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount,
  COUNT(DISTINCT item_id) as unique_items,
  MIN(recorded_at) as first_payment,
  MAX(recorded_at) as last_payment
FROM payments
GROUP BY session_id;


-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================
-- Run these to verify the migration succeeded

-- 1. List all indexes on catalog_items table
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'catalog_items'
ORDER BY indexname;

-- 2. List all indexes on payments table
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'payments'
ORDER BY indexname;

-- 3. List all indexes on participant_items table
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'participant_items'
ORDER BY indexname;

-- 4. Check table statistics
SELECT
  schemaname,
  tablename,
  n_live_tup as row_count,
  n_dead_tup as dead_rows,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 5. Check index usage statistics
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as times_used,
  idx_tup_read as rows_read,
  idx_tup_fetch as rows_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;


-- ================================================================
-- STEP 5: COMMON QUERY PATTERNS WITH EXPLAIN ANALYZE
-- ================================================================
-- Use these to test query performance after migration

-- Query 1: Get all items in a category
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM catalog_items
WHERE category_id = (SELECT id FROM catalog_categories WHERE category_id = 'vegetables' LIMIT 1)
  AND is_active = true
ORDER BY sort_order, name;

-- Query 2: Search items by name
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM catalog_items
WHERE name ILIKE '%tomato%'
  AND is_active = true;

-- Query 3: Get session with participants and items
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  s.*,
  p.id as participant_id,
  p.nickname,
  p.avatar_emoji,
  pi.item_id,
  pi.quantity,
  ci.name as item_name
FROM sessions s
LEFT JOIN participants p ON s.id = p.session_id
LEFT JOIN participant_items pi ON p.id = pi.participant_id
LEFT JOIN catalog_items ci ON pi.item_id = ci.id
WHERE s.session_id = 'test123';

-- Query 4: Get payments for a session
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT
  p.*,
  ci.name as item_name
FROM payments p
LEFT JOIN catalog_items ci ON p.item_id = ci.item_id
WHERE p.session_id = 'test123'
ORDER BY p.recorded_at DESC;

-- Query 5: Get popular items
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT *
FROM catalog_items
WHERE popular = true
  AND is_active = true
ORDER BY sort_order;


-- ================================================================
-- STEP 6: PERFORMANCE RECOMMENDATIONS
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '=== PHASE 2 MIGRATION COMPLETE ===';
  RAISE NOTICE '';
  RAISE NOTICE 'New indexes added:';
  RAISE NOTICE '  - idx_catalog_items_name (text search)';
  RAISE NOTICE '  - idx_catalog_items_name_trgm (fuzzy search)';
  RAISE NOTICE '  - idx_catalog_items_category_active (filtering)';
  RAISE NOTICE '  - idx_catalog_items_sort (ordering)';
  RAISE NOTICE '  - idx_payments_recorded_by';
  RAISE NOTICE '  - idx_payments_session_status';
  RAISE NOTICE '  - idx_participant_items_* (shopping queries)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Run the verification queries above';
  RAISE NOTICE '  2. Run EXPLAIN ANALYZE on your common queries';
  RAISE NOTICE '  3. Monitor query performance with /metrics endpoint';
  RAISE NOTICE '  4. Check pg_stat_user_indexes after 24 hours to see index usage';
END $$;


-- ================================================================
-- ROLLBACK (Use with caution!)
-- ================================================================
-- If you need to undo these changes, uncomment and run:

/*
-- Remove new indexes
DROP INDEX IF EXISTS idx_catalog_items_name;
DROP INDEX IF EXISTS idx_catalog_items_name_trgm;
DROP INDEX IF EXISTS idx_catalog_items_category_active;
DROP INDEX IF EXISTS idx_catalog_items_sort;
DROP INDEX IF EXISTS idx_payments_recorded_by;
DROP INDEX IF EXISTS idx_payments_session_status;
DROP INDEX IF EXISTS idx_participant_items_participant;
DROP INDEX IF EXISTS idx_participant_items_item;
DROP INDEX IF EXISTS idx_participant_items_participant_item;

-- Remove views
DROP VIEW IF EXISTS catalog_item_usage;
DROP VIEW IF EXISTS payment_summary;
*/
