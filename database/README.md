# LocalLoops Database Setup

## Quick Setup Guide

### Step 1: Access Supabase SQL Editor

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: `drbocrbecchxbzcfljol`
3. Click on the **SQL Editor** in the left sidebar (icon: `</>`)

### Step 2: Run Schema Migration

1. Click **New Query** button
2. Copy the entire contents of `001_initial_schema.sql`
3. Paste into the SQL editor
4. Click **Run** (or press Cmd/Ctrl + Enter)
5. Wait for completion (should take 5-10 seconds)
6. You should see success messages in the results panel

### Step 3: Run Seed Data

1. Click **New Query** button again
2. Copy the entire contents of `002_seed_data.sql`
3. Paste into the SQL editor
4. Click **Run**
5. Wait for completion (should take 3-5 seconds)
6. You should see a summary of loaded data

### Step 4: Verify Setup

Run this query to verify all tables were created:

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Expected tables:
- catalog_categories
- catalog_items
- nicknames_pool
- participant_items
- participants
- sessions
- user_patterns

### Step 5: Check Data

Run these queries to verify seed data:

```sql
-- Check nicknames (should have ~50 nicknames)
SELECT COUNT(*) as nickname_count FROM nicknames_pool;

-- Check categories (should have 5 categories)
SELECT * FROM catalog_categories ORDER BY sort_order;

-- Check items (should have ~40 items)
SELECT
  cc.name as category,
  COUNT(ci.id) as item_count
FROM catalog_categories cc
LEFT JOIN catalog_items ci ON ci.category_id = cc.id
GROUP BY cc.name, cc.sort_order
ORDER BY cc.sort_order;

-- View sample vegetables
SELECT item_id, name, name_hi, name_gu, emoji, base_price, unit
FROM catalog_items
WHERE item_id LIKE 'v%'
ORDER BY sort_order
LIMIT 10;
```

## Database Files

- `001_initial_schema.sql` - Creates all tables, indexes, RLS policies, triggers
- `002_seed_data.sql` - Loads initial nicknames and Minibag catalog items
- `README.md` - This file

## What Was Created

### Tables (7)
1. **sessions** - Shopping sessions
2. **participants** - Session participants
3. **participant_items** - Items selected by participants
4. **catalog_items** - Product catalog (40 items)
5. **catalog_categories** - Categories (5)
6. **nicknames_pool** - Anonymous nicknames (50+)
7. **user_patterns** - User behavior patterns

### Security
- Row-Level Security (RLS) enabled on all tables
- Public read access for active sessions and catalog
- User-specific access for participant data
- Guest mode support (no authentication required)

### Data Loaded
- **50+ nicknames** with emojis (Hindi, Gujarati, English)
- **5 categories**: Vegetables, Fruits, Dairy, Staples, Snacks
- **40+ items** with:
  - English, Hindi, Gujarati names
  - Emojis
  - Base and bulk pricing
  - Popular items marked

### Features Enabled
- Automatic participant counting
- Timestamp tracking
- Session expiry
- Price history tracking
- Anonymous participation

## Troubleshooting

### Error: "uuid-ossp extension not found"
This shouldn't happen on Supabase, but if it does:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Error: "permission denied"
Make sure you're running as the project owner in Supabase SQL Editor.

### Need to Reset?
To drop all tables and start fresh:
```sql
DROP TABLE IF EXISTS participant_items CASCADE;
DROP TABLE IF EXISTS participants CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS catalog_items CASCADE;
DROP TABLE IF EXISTS catalog_categories CASCADE;
DROP TABLE IF EXISTS nicknames_pool CASCADE;
DROP TABLE IF EXISTS user_patterns CASCADE;
```

Then re-run the migration files.

## Next Steps

After database setup is complete:

1. Test database connection from backend
2. Create API endpoints to fetch catalog
3. Implement session creation
4. Build participant joining flow
5. Develop real-time updates

## Support

If you encounter issues:
1. Check Supabase logs in the dashboard
2. Verify RLS policies are not blocking queries
3. Check the Results panel for specific error messages
4. Ensure your Supabase project is active

---

**Database Status**: Ready for Development
**Version**: 1.0.0
**Last Updated**: October 2025
