# Database Seed Scripts

This directory contains database seeding scripts for the Sessions SDK.

## Available Scripts

### seed-4letter-nicknames.js

Populates the `nicknames_pool` table with 90 4-letter Indian names (44 male, 46 female).

**Features:**
- Inserts 4-letter names for better gender identification
- Assigns appropriate avatar emojis (👨 for male, 👩 for female)
- Handles duplicates gracefully (skips existing names)
- Provides detailed progress output
- Verifies database state after seeding

**Usage:**

```bash
# From the core package directory
cd packages/core

# Run the seed script
node scripts/seed-4letter-nicknames.js
```

**What it does:**
1. Connects to your configured database (via Prisma)
2. Inserts 44 male nicknames with 👨 emoji
3. Inserts 46 female nicknames with 👩 emoji
4. Skips any names that already exist (duplicate-safe)
5. Shows summary statistics
6. Verifies the final database state

**Output:**
- `.` = nickname inserted successfully
- `s` = nickname skipped (already exists)
- Summary showing inserted/skipped/error counts
- Database verification with total counts

**Safety:**
- Idempotent: Can be run multiple times safely
- Does not delete or modify existing nicknames
- Only inserts new names that don't exist yet

## Database Requirements

Ensure your database connection is configured in:
- `DATABASE_URL` environment variable, or
- `.env` file in the core package directory

The script uses the existing Prisma client configuration.
