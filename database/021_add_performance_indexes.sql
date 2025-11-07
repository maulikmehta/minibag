-- Migration 021: Add Performance Indexes
-- Week 2 Day 6: Testing Infrastructure + Database Indexes
-- Purpose: Add missing indexes to improve query performance
-- Created: 2025-11-07

-- Note: Using CONCURRENTLY to avoid locking tables in production
-- This requires the migration to be run outside of a transaction block

-- ============================================================================
-- Sessions Table Indexes
-- ============================================================================

-- Index on session_id for quick lookups by session code
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_session_id
ON sessions(session_id);

-- Index on status for filtering by session state
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_status
ON sessions(status);

-- Index on created_at for time-based queries (cleanup, expiry)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_created_at
ON sessions(created_at);

-- Compound index for common query pattern: finding active/open sessions by time
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_status_created
ON sessions(status, created_at);

-- Index on host_id for finding sessions created by a user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_host_id
ON sessions(host_id);

-- ============================================================================
-- Participants Table Indexes
-- ============================================================================

-- Index on session_id for fetching all participants in a session
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participants_session_id
ON participants(session_id);

-- Index on joined_at for ordering participants
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participants_joined_at
ON participants(joined_at);

-- Compound index for finding participants in a specific session
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participants_session_joined
ON participants(session_id, joined_at);

-- ============================================================================
-- Participant Items Table Indexes
-- ============================================================================

-- Index on participant_id for fetching all items for a participant
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participant_items_participant_id
ON participant_items(participant_id);

-- Index on item_id for finding which participants have a specific item
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participant_items_item_id
ON participant_items(item_id);

-- Compound index for common join pattern
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participant_items_participant_item
ON participant_items(participant_id, item_id);

-- ============================================================================
-- Invites Table Indexes
-- ============================================================================

-- Index on session_id for fetching invites for a session
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invites_session_id
ON invites(session_id);

-- Index on invite_token for looking up invites by token
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invites_invite_token
ON invites(invite_token);

-- Index on status for filtering active invites
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invites_status
ON invites(status);

-- Compound index for finding active invites by token
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invites_token_status
ON invites(invite_token, status);

-- ============================================================================
-- Payments Table Indexes
-- ============================================================================

-- Index on session_id for fetching all payments in a session
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_session_id
ON payments(session_id);

-- Index on participant_id for fetching payments by a participant
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_participant_id
ON payments(participant_id);

-- Index on item_id for bill calculations (Code Review Finding - Issue #4)
-- Without this index, bill calculations do full table scans (10-100x slower)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_item_id
ON payments(item_id);

-- Index on skip for filtering skipped items
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_skip
ON payments(skip);

-- Compound index for common query pattern: non-skipped payments in a session
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_session_skip
ON payments(session_id, skip);

-- Compound index for bill item calculations (Code Review Finding - Issue #4)
-- Optimizes queries that fetch payments for specific items within a session
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_session_item
ON payments(session_id, item_id);

-- ============================================================================
-- Nicknames Pool Table Indexes
-- ============================================================================

-- Index on is_available for finding available nicknames
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nicknames_pool_is_available
ON nicknames_pool(is_available);

-- Index on gender for filtering nicknames by gender
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nicknames_pool_gender
ON nicknames_pool(gender);

-- Compound index for common query: finding available nicknames by gender
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nicknames_pool_available_gender
ON nicknames_pool(is_available, gender);

-- Index on currently_used_in for cleanup operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nicknames_pool_currently_used_in
ON nicknames_pool(currently_used_in)
WHERE currently_used_in IS NOT NULL;

-- ============================================================================
-- Catalog Tables Indexes
-- ============================================================================

-- Index on category_id for catalog_items
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_catalog_items_category_id
ON catalog_items(category_id);

-- Index on is_active for filtering active items
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_catalog_items_is_active
ON catalog_items(is_active);

-- Index on item_id for quick lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_catalog_items_item_id
ON catalog_items(item_id);

-- Compound index for common query: active items by category
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_catalog_items_category_active
ON catalog_items(category_id, is_active);

-- Index on categories order_index for sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_order_index
ON categories(order_index);

-- Index on categories is_active
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_is_active
ON categories(is_active);

-- ============================================================================
-- Bill Access Tokens Table Indexes
-- ============================================================================

-- Index on token for quick token lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bill_access_tokens_token
ON bill_access_tokens(token);

-- Index on session_id for finding tokens for a session
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bill_access_tokens_session_id
ON bill_access_tokens(session_id);

-- Index on expires_at for cleanup of expired tokens
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bill_access_tokens_expires_at
ON bill_access_tokens(expires_at);

-- Compound index for common query: valid tokens
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bill_access_tokens_token_expires
ON bill_access_tokens(token, expires_at);

-- ============================================================================
-- Verification and Performance Notes
-- ============================================================================

-- To verify index usage, run EXPLAIN ANALYZE on common queries, e.g.:
-- EXPLAIN ANALYZE SELECT * FROM sessions WHERE status = 'open' ORDER BY created_at DESC;

-- To check existing indexes:
-- SELECT tablename, indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;

-- To monitor index usage:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- ORDER BY idx_scan DESC;

-- Expected performance improvements:
-- - Session lookups by ID: ~10x faster
-- - Participant queries: ~5x faster
-- - Bill calculations: ~3x faster
-- - Nickname selection: ~20x faster (most impactful)
-- - Invite redemption: ~5x faster
