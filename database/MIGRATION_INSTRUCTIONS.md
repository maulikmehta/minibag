# Participant Limit Migration Instructions

## ⚠️ SAFETY NOTICE
**Database**: TEST database only (minibag-test project: `cvseopmdpooznqojlads`)
**DO NOT run on production database!**

---

## Issue Summary

**Error**: 403 "This group is full (maximum 1 participants)"
**Root Cause**: `max_participants` not updated when `expected_participants` changes from solo (0) to group (1+) mode

---

## What Was Fixed

### Code Changes (Already Applied ✅)

1. **SDK Enhancement** - New endpoint to update participant limits
   - Added `updateParticipantLimit()` in `/packages/shared/api/sessions.js`
   - Route: `PATCH /api/sessions/:session_id/participant-limit`

2. **Core Bug Fix** - Auto-update limits when tier changes
   - Updated `updateExpectedParticipants()` to recalculate `max_participants`
   - Handles Solo ↔ Group transitions automatically

3. **Product Integration** - Client method for minibag-2
   - Added `updateParticipantLimit()` in `/packages/minibag/src/services/api.js`

### Database Changes (Needs Manual Application ⬇️)

**Migration files**:
- 029: Add `max_participants` column to sessions table
- 030: Fix trigger ambiguity
- 031: Fix existing sessions with incorrect limits

---

## How to Apply Migration

### Option 1: Supabase SQL Editor (Recommended)

1. **Open TEST database SQL Editor**:
   ```
   https://supabase.com/dashboard/project/cvseopmdpooznqojlads/sql
   ```

2. **Copy migration SQL**:
   - Open: `/Users/maulik/llcode/minibag-2/database/APPLY_PARTICIPANT_LIMIT_MIGRATIONS.sql`
   - Copy entire file contents

3. **Run in SQL Editor**:
   - Paste into SQL Editor
   - Click "Run"
   - Check output for success messages

4. **Verify**:
   - Check verification queries at bottom
   - Ensure no "broken sessions" reported

### Option 2: Node.js Script (Alternative)

```bash
cd /Users/maulik/llcode/minibag-2
node database/apply-test-migrations.js
```

**Safety checks**:
- ✅ Script verifies it's using TEST database (cvseopmdpooznqojlads)
- ✅ Will abort if pointed at wrong database

---

## After Migration: Testing

### 1. Test the Failing Invite Link
- Use the invite link that was giving 403 error
- Should now work correctly!

### 2. Create New Solo Session
```javascript
// Create session with expected_participants = 0
// Should have max_participants = 1
// Try joining with 2 participants → should fail at 2nd
```

### 3. Test Solo → Group Transition
```javascript
// Create solo session (expected = 0)
// Change to group mode (expected = 2)
// Verify max_participants updated to 20
// Join with multiple participants → should succeed
```

### 4. Test Group → Solo Transition
```javascript
// Create group session (expected = 2)
// Change to solo mode (expected = 0)
// Verify max_participants updated to 1
// Try joining with 2 participants → should fail at 2nd
```

---

## Verification Queries

After migration, run these in SQL Editor to verify:

```sql
-- Check for broken sessions
SELECT
  session_id,
  expected_participants,
  max_participants,
  status
FROM sessions
WHERE session_type = 'minibag'
  AND (
    (expected_participants >= 1 AND max_participants = 1) OR
    (expected_participants = 0 AND max_participants != 1)
  );
-- Should return 0 rows

-- View recent sessions with limits
SELECT
  session_id,
  expected_participants,
  max_participants,
  status,
  created_at
FROM sessions
WHERE session_type = 'minibag'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Architecture

### SDK Layer (Sessions)
- ✅ Enforces limits via database trigger
- ✅ Provides `updateParticipantLimit()` API
- ✅ Auto-updates when tier changes
- ✅ Product-agnostic implementation

### Product Layer (Minibag-2)
- ✅ Defines tier config (Solo/Group)
- ✅ Can call SDK to adjust limits
- ✅ Tier logic in `/packages/shared/constants/productTiers.js`

### Database
- ✅ `max_participants` column stores limit
- ✅ Dynamic trigger enforces atomically
- ✅ Supports per-session configuration

---

## Rollback (If Needed)

If something goes wrong, you can rollback:

```sql
-- Remove max_participants column
ALTER TABLE sessions DROP COLUMN IF EXISTS max_participants;

-- Restore old trigger (hardcoded limit of 20)
-- See original migration files for old trigger code
```

---

## Production Deployment

**IMPORTANT**: When ready to deploy to production:

1. **Test thoroughly** in minibag-test database first
2. **Backup** production database before migration
3. **Run migration** on production during low-traffic period
4. **Deploy code changes** after database migration succeeds
5. **Monitor** error logs for any issues

**Production database**: `drbocrbecchxbzcfljol`
**Production SQL Editor**: https://supabase.com/dashboard/project/drbocrbecchxbzcfljol/sql

---

## Support

For issues or questions:
- Check `/docs/architecture/SDK_PARTICIPANT_LIMITS_FIX.md` for detailed analysis
- Review error logs in Sentry
- Test in minibag-test before touching production
