# Production Schema Migration Guide

## Problem
Production Supabase database missing Phase 2 Week 6 columns for group mode functionality. SDK code expects these columns but they don't exist, causing INSERT failures.

## Missing Columns

**sessions table:**
- `mode` - TEXT (solo/group)
- `max_participants` - INTEGER (tier limit)
- `constant_invite_token` - TEXT UNIQUE (shareable link)

**invites table:**
- `invite_type` - TEXT (constant/named)
- `is_constant_link` - BOOLEAN
- `slot_assignments` - JSONB (dynamic tracking)
- `declined_by` - JSONB (decline tracking)

## Migration Steps

### 1. Access Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project: **minibag** (or production project)
3. Click **SQL Editor** in left sidebar
4. Click **New Query**

### 2. Run Migration SQL

Copy the entire SQL from `/tmp/production_schema_migration.sql` and paste into SQL Editor.

Or run this command to copy to clipboard:

```bash
cat /tmp/production_schema_migration.sql | pbcopy
```

Then **click "Run"** in Supabase SQL Editor.

### 3. Verify Migration

The SQL includes verification queries at the end. Check output shows:

**Sessions columns added:**
```
column_name           | data_type | is_nullable | column_default
----------------------+-----------+-------------+---------------
constant_invite_token | text      | YES         |
max_participants      | integer   | YES         |
mode                  | text      | YES         |
```

**Invites columns added:**
```
column_name      | data_type | is_nullable | column_default
-----------------+-----------+-------------+---------------
declined_by      | jsonb     | YES         |
invite_type      | text      | YES         | 'named'
is_constant_link | boolean   | YES         | false
slot_assignments | jsonb     | YES         |
```

### 4. Test New Session Creation

After migration:

1. Create new session from frontend
2. Check session creates with `constant_invite_token` (for group mode)
3. Verify invite created with `is_constant_link = true`, `status = 'active'`, `expires_at = NULL`
4. Test join link - should work now

### 5. Rollback (if needed)

If something breaks, rollback with:

```sql
-- Remove added columns (ONLY if migration fails)
ALTER TABLE sessions DROP COLUMN IF EXISTS mode;
ALTER TABLE sessions DROP COLUMN IF EXISTS max_participants;
ALTER TABLE sessions DROP COLUMN IF EXISTS constant_invite_token;

ALTER TABLE invites DROP COLUMN IF EXISTS invite_type;
ALTER TABLE invites DROP COLUMN IF EXISTS is_constant_link;
ALTER TABLE invites DROP COLUMN IF EXISTS slot_assignments;
ALTER TABLE invites DROP COLUMN IF EXISTS declined_by;
```

## Safety Features

- Uses `IF NOT EXISTS` - safe to run multiple times
- Won't break existing data
- Adds columns with NULL/default values
- No data deletion

## Post-Migration

After successful migration:

1. All new sessions will have group mode columns
2. Constant invite links will work correctly
3. Expiry fix (commits 4b60730, 3968dd6) will work
4. Old sessions without these columns remain functional (columns nullable)

## Files

- Migration SQL: `/tmp/production_schema_migration.sql`
- Original Prisma migration: `packages/sessions-core/prisma/migrations/20251117102257_init/migration.sql`

## Troubleshooting

**Error: column already exists**
- Safe to ignore, `IF NOT EXISTS` prevents duplicates

**Error: permission denied**
- Need Supabase project owner/admin access
- Or use database connection string with superuser

**Columns don't appear in verification**
- Check you're connected to production database
- Refresh SQL Editor connection
- Try running verification queries separately
