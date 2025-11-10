-- Performance Optimization: Add indexes for session creation queries
-- Migration: 025_add_performance_indexes.sql
-- Purpose: Optimize duplicate session check and improve query performance

-- Index for duplicate session check query
-- Used in: packages/shared/api/sessions.js (duplicate session check)
-- Query pattern: WHERE creator_nickname = ? AND status = 'open' AND created_at >= ?
CREATE INDEX IF NOT EXISTS idx_sessions_duplicate_check
ON sessions(creator_nickname, status, created_at DESC)
WHERE status = 'open';

-- Partial index saves space by only indexing open sessions
-- Compound index supports exact match on creator_nickname, filter on status, and range scan on created_at

-- Analyze table to update query planner statistics
ANALYZE sessions;
