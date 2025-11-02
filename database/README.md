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
- `015_replace_images_with_emojis.sql` - Removes thumbnail URLs for better performance (use emojis only)
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

#### Row-Level Security (RLS) Overview
- **Status:** RLS enabled on all tables
- **Backend Access:** Backend uses **service role key** (bypasses RLS)
- **Defense-in-Depth:** RLS policies protect against accidental anon key usage

#### Current RLS Model
**Backend (Service Role - Bypasses RLS):**
- All API operations use `supabase` client with service role key
- Full database access without RLS restrictions
- Secure because service key is never exposed to clients

**Frontend (Anon Key - Respects RLS - NOT CURRENTLY USED):**
- `supabaseClient` with anon key available but unused
- If used in future, RLS policies would be enforced
- Current policies allow guest-mode access

#### RLS Policies Summary

**Sessions:**
- ✅ Anyone can view active sessions (guest mode)
- ✅ Anyone can create sessions (guest mode)
- ⚠️ Creators can update their sessions

**Participants:**
- ✅ Session members can view participants
- ✅ Anyone can join sessions (guest mode)
- ✅ Users can update own participant records

**Payments:**
- ⚠️ **OVERLY PERMISSIVE** - Anyone can view/insert/update/delete
- **Risk:** Low (service role bypasses RLS)
- **Mitigation:** Backend validation enforces rules
- **Future:** Should tighten if direct client access is added

**Catalog:**
- ✅ Anyone can view active items and categories (public catalog)

#### Security Considerations

**Current Security Model:**
1. Backend uses service role (bypasses RLS)
2. Frontend makes API calls to backend
3. Backend enforces business logic and authorization
4. RLS acts as defense-in-depth only

**If Direct Client Access Added (Future):**
1. Would need to use anon key
2. RLS policies would be enforced
3. Must tighten payment delete policies
4. Consider session-scoped access patterns

**Recommended RLS Improvements (If Needed):**
- Restrict payment deletes to session hosts only
- Add session PIN validation in RLS policies
- Implement time-based access (expired sessions)
- Add audit logging for sensitive operations

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

## Database Backup & Recovery

### Supabase Automatic Backups

**Status:** Included in Supabase free tier

**Backup Schedule:**
- **Frequency:** Daily automatic backups
- **Retention:** 7 days (free tier)
- **Type:** Full database snapshots
- **Location:** Supabase infrastructure (automatic)

**Accessing Backups:**
1. Go to Supabase Dashboard
2. Navigate to **Database** → **Backups** section
3. View available backup points (last 7 days)
4. Click **Restore** to restore to a specific point

### Manual Backup Procedures

#### Option 1: SQL Dump (Recommended)
```bash
# Full database dump
pg_dump "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres" > backup_$(date +%Y%m%d).sql

# Schema only
pg_dump --schema-only "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres" > schema_$(date +%Y%m%d).sql

# Data only
pg_dump --data-only "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres" > data_$(date +%Y%m%d).sql
```

#### Option 2: Supabase CLI
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref [YOUR-PROJECT-REF]

# Generate migration from current database
supabase db dump -f backup.sql
```

#### Option 3: Supabase Dashboard Export
1. Dashboard → **Database** → **Backups**
2. Click **Download** on desired backup
3. Saves as .tar.gz file

### Backup Best Practices

**Before Critical Operations:**
- ✅ Always backup before running migrations
- ✅ Backup before bulk data operations
- ✅ Test restore procedure in development first

**Regular Backups:**
- ✅ Weekly manual backups (in addition to automatic)
- ✅ Store backups in multiple locations
- ✅ Test restore quarterly

**What to Backup:**
1. **Full database** - Complete snapshot
2. **Migration history** - Track schema changes
3. **Environment variables** - Secure copy of .env.example
4. **Application code** - Git repository

### Restore Procedures

#### Restore from Supabase Automatic Backup
1. Go to **Database** → **Backups**
2. Select backup point
3. Click **Restore**
4. Confirm (⚠️ This will overwrite current data)
5. Wait for completion (typically 1-5 minutes)

#### Restore from SQL Dump
```bash
# Restore full dump
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres" < backup_20251102.sql

# Or use pg_restore for custom format
pg_restore -d "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres" backup.dump
```

#### Restore Specific Table
```sql
-- Export single table
COPY sessions TO '/tmp/sessions_backup.csv' CSV HEADER;

-- Import single table
COPY sessions FROM '/tmp/sessions_backup.csv' CSV HEADER;
```

### Disaster Recovery Plan

**If Database is Corrupted:**
1. **Immediate:** Stop all write operations
2. **Assess:** Check Supabase status page
3. **Restore:** Use most recent backup (within 7 days)
4. **Verify:** Run verification queries
5. **Resume:** Restart services

**If Data is Accidentally Deleted:**
1. **Stop:** Immediately stop the application
2. **Check:** Verify deletion scope
3. **Restore:** If within 7 days, use point-in-time restore
4. **Audit:** Review what caused the deletion
5. **Prevent:** Update RLS policies or add safeguards

**If Migration Fails:**
1. **Don't panic** - Automatic backups are available
2. **Restore** to pre-migration state
3. **Fix** the migration SQL
4. **Test** in development
5. **Re-apply** the corrected migration

### Verification Queries

After restore, verify data integrity:

```sql
-- Check table row counts
SELECT
  schemaname,
  tablename,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;

-- Verify recent sessions
SELECT COUNT(*) as recent_sessions
FROM sessions
WHERE created_at > NOW() - INTERVAL '7 days';

-- Check data consistency
SELECT
  s.session_id,
  s.participant_count,
  COUNT(DISTINCT p.id) as actual_participants
FROM sessions s
LEFT JOIN participants p ON p.session_id = s.id
GROUP BY s.id, s.session_id, s.participant_count
HAVING s.participant_count != COUNT(DISTINCT p.id);

-- Verify RLS policies are enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Backup Schedule Recommendation

**Development Environment:**
- Manual backups before major changes
- Git commit before migrations

**Production Environment:**
- **Automatic:** Supabase daily backups (7 day retention)
- **Manual Weekly:** Full SQL dump stored off-site
- **Before Deploys:** Snapshot before each production deployment
- **Monthly Archive:** Long-term storage of monthly snapshots

### Off-Site Backup Storage

**Recommended Services (Free Tiers Available):**
- **GitHub:** Store SQL dumps in private repo
- **Google Drive:** Manual backup uploads
- **Dropbox:** Automated backup sync
- **AWS S3:** Glacier for long-term archives

**Backup Retention:**
- Daily: 7 days (Supabase automatic)
- Weekly: 4 weeks (manual)
- Monthly: 12 months (archive)
- Yearly: Indefinite (compliance)

### Security Notes

⚠️ **Backup Files Contain Sensitive Data:**
- Encrypt backups at rest
- Use secure transfer protocols (HTTPS, SCP)
- Never commit backups to git
- Limit access to authorized personnel only
- Include session PINs and participant data

**Encryption Example:**
```bash
# Encrypt backup
gpg --symmetric --cipher-algo AES256 backup_20251102.sql

# Decrypt backup
gpg backup_20251102.sql.gpg
```

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
