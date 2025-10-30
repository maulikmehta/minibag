# Database Setup - Quick Start

## Status Check ✓

- [x] Supabase project created
- [x] Credentials configured in `.env`
- [ ] **Database tables created** ← YOU ARE HERE
- [ ] Seed data loaded
- [ ] Connection verified

## Next Step: Create Database Tables

### Option 1: Via Supabase Dashboard (Recommended)

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard
   - Select project: `drbocrbecchxbzcfljol`
   - Click **SQL Editor** in left sidebar

2. **Run Schema Migration**
   - Click **New Query**
   - Open file: `database/001_initial_schema.sql`
   - Copy ALL contents (Cmd+A, Cmd+C)
   - Paste into SQL Editor
   - Click **Run** (or Cmd+Enter)
   - Wait 5-10 seconds
   - Check for success message at bottom

3. **Run Seed Data**
   - Click **New Query** again
   - Open file: `database/002_seed_data.sql`
   - Copy ALL contents
   - Paste into SQL Editor
   - Click **Run**
   - You should see output showing counts:
     ```
     Nicknames Pool: 50 nicknames
     Categories: 5 categories
     Catalog Items: 40 items
     ```

4. **Verify Setup**
   ```bash
   cd packages/shared
   node test-db.js
   ```

   You should see:
   ```
   ✓ Database connection successful
   Database Statistics:
     - Categories: 5
     - Catalog Items: 40+
     - Nicknames Pool: 50+
     - Sessions: 0
   ```

### Option 2: Via Command Line (Advanced)

If you have `psql` installed:

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Run migrations
cd database
supabase db push

# Or use psql directly
psql "postgresql://postgres:[YOUR-PASSWORD]@db.drbocrbecchxbzcfljol.supabase.co:5432/postgres" < 001_initial_schema.sql
psql "postgresql://postgres:[YOUR-PASSWORD]@db.drbocrbecchxbzcfljol.supabase.co:5432/postgres" < 002_seed_data.sql
```

## After Setup

Once tables are created, run:

```bash
# Test database connection
cd packages/shared
node test-db.js

# If successful, start dev servers
cd ../..
npm run dev
```

## Troubleshooting

### Error: "permission denied"
- Make sure you're logged into Supabase dashboard
- Check you're using the correct project

### Error: "syntax error at or near..."
- Make sure you copied the ENTIRE SQL file
- Check for any truncation in copy/paste

### Error: "relation already exists"
- Tables already created! Run test:
  ```bash
  cd packages/shared && node test-db.js
  ```

### Still having issues?
- Check Supabase logs in dashboard
- Verify project is active (not paused)
- Ensure you have the correct credentials in `.env`

---

**Need Help?** Check `database/README.md` for detailed instructions.
