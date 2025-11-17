# Database Maintenance Guide

This guide covers manual database cleanup operations for the minibag application.

## Automated Cleanup (Already Running)

The application includes **opportunistic cleanup** that runs automatically when new sessions are created:
- Deletes sessions in 'open' status that are older than 24 hours
- Located in: `packages/shared/api/sessions.js` (lines 214-219)
- **No action required** - this runs automatically

## Manual Cleanup Function

### What It Does

The `cleanup_expired_sessions()` function performs the following cleanup operations:

1. **Deletes old open sessions**
   - Removes sessions with `status = 'open'` that are older than 24 hours
   - This catches sessions where participants never joined or host abandoned

2. **Archives completed sessions**
   - Updates sessions with `status = 'completed'` or `'cancelled'` to `status = 'expired'`
   - Archives sessions older than 30 days
   - Sessions are not deleted, just marked as expired

3. **Releases nicknames**
   - Returns nicknames from deleted/archived sessions back to the available pool
   - Makes them available for future sessions

### When to Run Manual Cleanup

You should run manual cleanup in these scenarios:

- **After prolonged periods of no session creation** (no new sessions for 24+ hours)
- **Before database maintenance or backups** (to reduce data size)
- **When investigating session issues** (to clean up test/abandoned sessions)
- **Monthly maintenance** (optional, for good housekeeping)

### How to Run Manual Cleanup

#### Option 1: Via Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run this query:

```sql
SELECT * FROM cleanup_expired_sessions();
```

The function will return statistics about what was cleaned up.

#### Option 2: Via Node.js Script

The repository includes a cleanup script at `packages/shared/clean-db.js`:

```bash
cd packages/shared
node clean-db.js
```

#### Option 3: Via psql

If you have direct database access:

```bash
psql <your-database-connection-string> -c "SELECT * FROM cleanup_expired_sessions();"
```

### Understanding the Results

The cleanup function returns information about:
- Number of old open sessions deleted
- Number of completed sessions archived
- Number of nicknames released back to the pool

Example output:
```
 cleanup_expired_sessions
--------------------------
 Cleanup completed
(1 row)
```

## Session Lifecycle & Timeouts

### Session Expiry Rules

| Event | Timeout | Enforcement |
|-------|---------|-------------|
| Participant response timeout | 20 minutes after `expected_participants_set_at` | Automatic (invite links expire) |
| Session total duration | 2 hours after `scheduled_time` | Enforced via `expires_at` field |
| Open session cleanup | 24 hours after creation | Manual or opportunistic cleanup |
| Completed session archive | 30 days after creation | Manual cleanup only |

### Session States

```
open → active → shopping → completed
   ↓      ↓         ↓          ↓
   └──────┴─────────┴──────→ expired
```

- **open**: Waiting for participants to join
- **active**: Participants joined, building lists
- **shopping**: Host started shopping (consolidated view)
- **completed**: Session finished successfully
- **expired**: Session timed out or was archived

## Automated Cleanup (pg_cron - Optional)

For automated daily cleanup, you can enable pg_cron (requires Supabase Pro):

### Setup pg_cron

The code is already in the database migration file but commented out. To enable:

1. Verify pg_cron extension is available:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

2. Schedule the cleanup job (runs daily at 2:00 AM):
```sql
SELECT cron.schedule(
  'cleanup-expired-sessions',
  '0 2 * * *',
  'SELECT cleanup_expired_sessions()'
);
```

3. Verify the job is scheduled:
```sql
SELECT * FROM cron.job;
```

### Managing pg_cron Jobs

List all scheduled jobs:
```sql
SELECT * FROM cron.job;
```

Remove the cleanup job:
```sql
SELECT cron.unschedule('cleanup-expired-sessions');
```

View job run history:
```sql
SELECT * FROM cron.job_run_details
WHERE jobname = 'cleanup-expired-sessions'
ORDER BY start_time DESC
LIMIT 10;
```

## Troubleshooting

### "Function does not exist" Error

If you get an error that `cleanup_expired_sessions()` doesn't exist:

1. Check if the function is defined:
```sql
SELECT proname FROM pg_proc WHERE proname = 'cleanup_expired_sessions';
```

2. If missing, run the migration file:
```bash
cat database/database-migration-phase1-security.sql | npx supabase db execute
```

### Sessions Not Being Cleaned Up

Check the session timestamps:
```sql
-- View old open sessions
SELECT session_id, created_at, status
FROM sessions
WHERE status = 'open'
AND created_at < NOW() - INTERVAL '24 hours';

-- View old completed sessions
SELECT session_id, created_at, status
FROM sessions
WHERE status IN ('completed', 'cancelled')
AND created_at < NOW() - INTERVAL '30 days';
```

### Nickname Pool Issues

Check if nicknames are stuck:
```sql
-- View nicknames that are unavailable but not in active sessions
SELECT n.*
FROM nicknames_pool n
LEFT JOIN sessions s ON n.currently_used_in = s.id
WHERE n.is_available = false
AND (s.id IS NULL OR s.status IN ('completed', 'cancelled', 'expired'));
```

If nicknames are stuck, release them manually:
```sql
-- Release nicknames from completed/expired sessions
UPDATE nicknames_pool
SET is_available = true, currently_used_in = null
WHERE currently_used_in IN (
  SELECT id FROM sessions
  WHERE status IN ('completed', 'cancelled', 'expired')
);
```

## Database File Locations

- **Cleanup Function**: `database/database-migration-phase1-security.sql` (lines 95-130)
- **Opportunistic Cleanup**: `packages/shared/api/sessions.js` (lines 214-219)
- **Manual Cleanup Script**: `packages/shared/clean-db.js`
- **Session Expiry Logic**: `packages/shared/api/sessions/create.js` (line 31)

## Best Practices

1. **Monitor session counts** regularly to detect issues early
2. **Run manual cleanup** at least once a month
3. **Check nickname pool** periodically to ensure nicknames aren't stuck
4. **Review completed sessions** before archiving (if you need analytics)
5. **Consider pg_cron** if you have Supabase Pro for hands-off maintenance
6. **Test cleanup** in staging before running in production

## Support

For issues with database maintenance:
- Check Supabase logs for errors
- Review session states with `SELECT * FROM sessions ORDER BY created_at DESC LIMIT 50;`
- Contact the development team if sessions are not expiring correctly
