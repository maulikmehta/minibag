# How to Apply Database Migrations

## Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of the migration file:
   - `018_add_session_pin.sql` (for PIN feature)
   - `023_add_subscriptions_table.sql` (for revenue tracking)
4. Paste and run the SQL

## Option 2: Using Supabase CLI

```bash
# First, link your project (one-time setup)
npx supabase link --project-ref your-project-ref

# Then apply migrations
npx supabase db push

# Or run specific migration
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" < database/018_add_session_pin.sql
```

## Option 3: Using psql directly

```bash
# Apply PIN migration
psql $DATABASE_URL < database/018_add_session_pin.sql

# Apply subscriptions migration
psql $DATABASE_URL < database/023_add_subscriptions_table.sql
```

## Pending Migrations

- ✅ `018_add_session_pin.sql` - Adds session PIN authentication
- ✅ `023_add_subscriptions_table.sql` - Adds subscriptions table for revenue tracking

Both migrations are **ready to apply** when you're ready to deploy these features.
