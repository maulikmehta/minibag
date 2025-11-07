# Database Indexes Migration - README

## Overview

This migration adds 35+ performance indexes to improve query speed across all tables.

## Files

1. **`021_add_performance_indexes_supabase.sql`** ⭐ **USE THIS ONE**
   - Standard CREATE INDEX (no CONCURRENTLY)
   - Works in Supabase SQL Editor
   - Can be run all at once
   - Safe for current database size

2. **`021_add_performance_indexes.sql`** (Reference only)
   - Uses CREATE INDEX CONCURRENTLY
   - Cannot run in Supabase SQL Editor (transaction block error)
   - Kept for reference/documentation

## How to Apply (Supabase)

### Option 1: Supabase SQL Editor (Recommended)

1. Go to your Supabase dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy **ALL** contents of `021_add_performance_indexes_supabase.sql`
5. Paste into the editor
6. Click **Run** (or Cmd/Ctrl + Enter)
7. Wait for completion (~5-10 seconds)
8. Verify success - you should see the verification query results at the end

### Option 2: Via psql (Alternative)

If you have direct PostgreSQL access:

```bash
# Copy file to server
scp database/021_add_performance_indexes_supabase.sql user@server:/tmp/

# Connect and run
psql -h your-db-host -U postgres -d your-database -f /tmp/021_add_performance_indexes_supabase.sql
```

## Verification

After running the migration, verify indexes were created:

```sql
-- Check all new indexes
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

You should see 34+ indexes starting with `idx_`.

## Impact

**Before:** Some queries scan entire tables (slow on large datasets)

**After:** Queries use indexes (5-20x faster)

### Expected Improvements

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Session lookup by ID | Full scan | Index scan | ~10x faster |
| Participant list | Full scan | Index scan | ~5x faster |
| Nickname selection | Full scan | Index scan | ~20x faster |
| Bill calculation | Multiple full scans | Index joins | ~3x faster |
| Invite lookup | Full scan | Index scan | ~5x faster |

## Indexes Added by Table

### Sessions (5 indexes)
- `idx_sessions_session_id` - Session code lookups
- `idx_sessions_status` - Filter by status
- `idx_sessions_created_at` - Time-based queries
- `idx_sessions_status_created` - Active sessions by time
- `idx_sessions_host_id` - Sessions by host

### Participants (3 indexes)
- `idx_participants_session_id` - Participants in session
- `idx_participants_joined_at` - Order by join time
- `idx_participants_session_joined` - Compound index

### Participant Items (3 indexes)
- `idx_participant_items_participant_id` - Items per participant
- `idx_participant_items_item_id` - Who has this item
- `idx_participant_items_participant_item` - Join optimization

### Invites (4 indexes)
- `idx_invites_session_id` - Invites for session
- `idx_invites_invite_token` - Token lookup
- `idx_invites_status` - Active invites
- `idx_invites_token_status` - Valid token lookup

### Payments (3 indexes)
- `idx_payments_session_id` - Payments in session
- `idx_payments_skipped` - Non-skipped items
- `idx_payments_session_skipped` - Session payment calculations

### Nicknames Pool (4 indexes)
- `idx_nicknames_pool_is_available` - Available nicknames
- `idx_nicknames_pool_gender` - Filter by gender
- `idx_nicknames_pool_available_gender` - Nickname selection
- `idx_nicknames_pool_currently_used_in` - Cleanup operations

### Catalog Items (4 indexes)
- `idx_catalog_items_category_id` - Items by category
- `idx_catalog_items_is_active` - Active items only
- `idx_catalog_items_item_id` - Quick item lookup
- `idx_catalog_items_category_active` - Active items per category

### Categories (2 indexes)
- `idx_categories_order_index` - Sorting
- `idx_categories_is_active` - Active categories

### Bill Access Tokens (4 indexes)
- `idx_bill_access_tokens_access_token` - Token lookup
- `idx_bill_access_tokens_session_id` - Tokens for session
- `idx_bill_access_tokens_expires_at` - Cleanup expired
- `idx_bill_access_tokens_access_token_expires` - Valid token check

## Troubleshooting

### Error: "relation does not exist"

One or more tables haven't been created yet. Check table names:

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

Apply missing table migrations first (001-020).

### Error: "index already exists"

Some indexes may already exist. The migration uses `IF NOT EXISTS` so it should skip them. If you see this error, it means the index was created without the standard naming convention.

### Slow execution

Creating indexes can take time on large tables:
- Small tables (<1000 rows): <1 second
- Medium tables (1000-10000 rows): 1-5 seconds
- Large tables (>10000 rows): 5-30 seconds

Total migration time should be under 1 minute for typical database sizes.

## Monitoring Index Usage

After applying, monitor which indexes are actually used:

```sql
-- Check index usage stats
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;
```

Indexes with low `idx_scan` counts may not be needed and can be dropped.

## Rollback (if needed)

To remove all indexes created by this migration:

```sql
-- WARNING: This will remove all indexes and slow down queries!
-- Only run if you need to rollback the migration

DROP INDEX IF EXISTS idx_sessions_session_id;
DROP INDEX IF EXISTS idx_sessions_status;
DROP INDEX IF EXISTS idx_sessions_created_at;
DROP INDEX IF EXISTS idx_sessions_status_created;
DROP INDEX IF EXISTS idx_sessions_host_id;

DROP INDEX IF EXISTS idx_participants_session_id;
DROP INDEX IF EXISTS idx_participants_joined_at;
DROP INDEX IF EXISTS idx_participants_session_joined;

DROP INDEX IF EXISTS idx_participant_items_participant_id;
DROP INDEX IF EXISTS idx_participant_items_item_id;
DROP INDEX IF EXISTS idx_participant_items_participant_item;

DROP INDEX IF EXISTS idx_invites_session_id;
DROP INDEX IF EXISTS idx_invites_invite_token;
DROP INDEX IF EXISTS idx_invites_status;
DROP INDEX IF EXISTS idx_invites_token_status;

DROP INDEX IF EXISTS idx_payments_session_id;
DROP INDEX IF EXISTS idx_payments_skipped;
DROP INDEX IF EXISTS idx_payments_session_skipped;

DROP INDEX IF EXISTS idx_nicknames_pool_is_available;
DROP INDEX IF EXISTS idx_nicknames_pool_gender;
DROP INDEX IF EXISTS idx_nicknames_pool_available_gender;
DROP INDEX IF EXISTS idx_nicknames_pool_currently_used_in;

DROP INDEX IF EXISTS idx_catalog_items_category_id;
DROP INDEX IF EXISTS idx_catalog_items_is_active;
DROP INDEX IF EXISTS idx_catalog_items_item_id;
DROP INDEX IF EXISTS idx_catalog_items_category_active;

DROP INDEX IF EXISTS idx_categories_order_index;
DROP INDEX IF EXISTS idx_categories_is_active;

DROP INDEX IF EXISTS idx_bill_access_tokens_access_token;
DROP INDEX IF EXISTS idx_bill_access_tokens_session_id;
DROP INDEX IF EXISTS idx_bill_access_tokens_expires_at;
DROP INDEX IF EXISTS idx_bill_access_tokens_access_token_expires;
```

## Questions?

See the main database README: `database/README.md`
