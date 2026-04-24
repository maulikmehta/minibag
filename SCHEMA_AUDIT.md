# Schema Audit: Local vs Production

**Date**: 2026-04-24
**Local DB**: `sessions_test` (PostgreSQL.app)
**Production DB**: `hqatleibipplqlwwjvwp.supabase.co`

---

## Executive Summary

**Status**: ⚠️ **SCHEMA MISMATCH** - Production has hybrid schema (old Minibag + Sessions SDK)

**Critical Findings**:
1. ✅ Core tables exist in both environments
2. ⚠️ Production `sessions` has 32 columns (local has 17) - **merged schema**
3. ⚠️ Production `participants` missing `auth_token`, has `participant_token` instead
4. ✅ FK `participants_claimed_invite_id_fkey` exists in production (fix deployed)
5. ⚠️ Production `invites` table empty - new table or not in use

**Risk Level**: MEDIUM - App works but using subset of production columns

---

## Table-by-Table Comparison

### 1. `sessions` Table

| Column | Local (Sessions SDK) | Production | Status |
|--------|---------------------|------------|--------|
| **Core Identity** |
| `id` | ✅ uuid | ✅ uuid | ✅ Match |
| `session_id` | ✅ text | ✅ text | ✅ Match |
| `host_token` | ✅ text | ✅ text | ✅ Match |
| **Creator Info** |
| `creator_nickname` | ✅ text | ✅ text | ✅ Match |
| `creator_real_name` | ✅ text | ✅ text | ✅ Match |
| `creator_id` | ❌ | ✅ uuid | ⚠️ Extra in prod |
| **Session Mode** |
| `mode` | ✅ text | ❌ | ⚠️ Missing in prod |
| `session_type` | ❌ | ✅ text | ⚠️ Extra in prod |
| **Participants** |
| `max_participants` | ✅ integer | ✅ integer | ✅ Match |
| `expected_participants` | ✅ integer | ✅ integer | ✅ Match |
| `expected_participants_set_at` | ✅ timestamptz | ✅ timestamptz | ✅ Match |
| `checkpoint_complete` | ✅ boolean | ✅ boolean | ✅ Match |
| `participant_count` | ❌ | ✅ integer | ⚠️ Extra in prod |
| **Invites** |
| `constant_invite_token` | ✅ text | ❌ | ⚠️ Missing in prod |
| `session_pin` | ✅ text | ✅ text | ✅ Match |
| `invites_locked` | ❌ | ✅ boolean | ⚠️ Extra in prod |
| **Status** |
| `status` | ✅ text | ✅ text | ✅ Match |
| `created_at` | ✅ timestamptz | ✅ timestamptz | ✅ Match |
| `completed_at` | ✅ timestamptz | ✅ timestamptz | ✅ Match |
| `cancelled_at` | ✅ timestamptz | ✅ timestamptz | ✅ Match |
| `expires_at` | ✅ timestamptz | ✅ timestamptz | ✅ Match |
| **Old Minibag Schema (prod only)** |
| `location_text` | ❌ | ✅ text | 🔴 Old schema |
| `neighborhood` | ❌ | ✅ text | 🔴 Old schema |
| `scheduled_time` | ❌ | ✅ timestamptz | 🔴 Old schema |
| `title` | ❌ | ✅ text | 🔴 Old schema |
| `description` | ❌ | ✅ text | 🔴 Old schema |
| `total_demand_value` | ❌ | ✅ decimal | 🔴 Old schema |
| `is_pro` | ❌ | ✅ boolean | 🔴 Old schema |
| `guaranteed_arrival` | ❌ | ✅ boolean | 🔴 Old schema |
| `vendor_confirmed` | ❌ | ✅ boolean | 🔴 Old schema |
| `vendor_id` | ❌ | ✅ uuid | 🔴 Old schema |
| `vendor_confirmed_at` | ❌ | ✅ timestamptz | 🔴 Old schema |
| `financially_settled_at` | ❌ | ✅ timestamptz | 🔴 Old schema |
| `items_confirmed_at` | ❌ | ✅ timestamptz | 🔴 Old schema |
| `payments_confirmed_at` | ❌ | ✅ timestamptz | 🔴 Old schema |

**Analysis**: Production has **merged schema** - old Minibag columns + Sessions SDK additions. Code only uses Sessions SDK subset.

---

### 2. `participants` Table

| Column | Local (Sessions SDK) | Production | Status |
|--------|---------------------|------------|--------|
| **Core** |
| `id` | ✅ uuid | ✅ uuid | ✅ Match |
| `session_id` | ✅ uuid | ✅ uuid | ✅ Match |
| `nickname` | ✅ text | ✅ text | ✅ Match |
| `avatar_emoji` | ✅ text | ✅ text | ✅ Match |
| `real_name` | ✅ text | ✅ text | ✅ Match |
| `is_creator` | ✅ boolean | ✅ boolean | ✅ Match |
| **Authentication** |
| `auth_token` | ✅ text | ❌ | ⚠️ Missing in prod |
| `participant_token` | ❌ | ✅ text | ⚠️ Extra in prod |
| `user_id` | ❌ | ✅ uuid | ⚠️ Extra in prod |
| **Invites** |
| `claimed_invite_id` | ✅ uuid | ✅ uuid | ✅ Match |
| **Status** |
| `items_confirmed` | ✅ boolean | ✅ boolean | ✅ Match |
| `marked_not_coming` | ✅ boolean | ✅ boolean | ✅ Match |
| `marked_not_coming_at` | ✅ timestamptz | ✅ timestamptz | ✅ Match |
| `joined_at` | ✅ timestamptz | ✅ timestamptz | ✅ Match |
| `left_at` | ✅ timestamptz | ❌ | ⚠️ Missing in prod |
| **Old Schema** |
| `locked` | ❌ | ✅ boolean | 🔴 Old schema |
| `locked_at` | ❌ | ✅ timestamptz | 🔴 Old schema |
| `timed_out_at` | ❌ | ✅ timestamptz | 🔴 Old schema |

**Analysis**: Production missing `auth_token` but has `participant_token` - likely different auth mechanism.

---

### 3. `invites` Table

| Column | Local (Sessions SDK) | Production | Status |
|--------|---------------------|------------|--------|
| **Core** |
| `id` | ✅ uuid | ✅ (empty) | ⚠️ Exists but empty |
| `session_id` | ✅ uuid | ✅ (empty) | ⚠️ Exists but empty |
| `invite_token` | ✅ text | ✅ (empty) | ⚠️ Exists but empty |
| `invite_number` | ✅ integer | ✅ (empty) | ⚠️ Exists but empty |
| `status` | ✅ text | ✅ (empty) | ⚠️ Exists but empty |
| **Type** |
| `invite_type` | ✅ text | ? | ⚠️ Unknown |
| `is_constant_link` | ✅ boolean | ? | ⚠️ Unknown |
| `slot_assignments` | ✅ jsonb | ? | ⚠️ Unknown |
| `declined_by` | ✅ jsonb | ? | ⚠️ Unknown |
| **Timestamps** |
| `claimed_at` | ✅ timestamptz | ? | ⚠️ Unknown |
| `created_at` | ✅ timestamptz | ? | ⚠️ Unknown |
| `expires_at` | ✅ timestamptz | ? | ⚠️ Unknown |

**Analysis**: Production table exists but empty. Cannot verify full column set without data.

---

### 4. `nicknames_pool` Table

| Column | Local (Sessions SDK) | Production | Status |
|--------|---------------------|------------|--------|
| **Core** |
| `id` | ✅ uuid | ✅ uuid | ✅ Match |
| `nickname` | ✅ text (unique) | ✅ text | ✅ Match |
| `avatar_emoji` | ✅ text | ✅ text | ✅ Match |
| **Availability** |
| `is_available` | ✅ boolean | ✅ boolean | ✅ Match |
| `currently_used_in` | ✅ uuid | ✅ uuid | ✅ Match |
| `reserved_until` | ✅ timestamptz | ✅ timestamptz | ✅ Match |
| `reserved_by_session` | ✅ uuid | ✅ uuid | ✅ Match |
| **Stats** |
| `times_used` | ✅ integer | ✅ integer | ✅ Match |
| `last_used` | ✅ timestamptz | ✅ timestamptz | ✅ Match |
| **Metadata** |
| `gender` | ✅ text | ✅ text | ✅ Match |
| `language_origin` | ✅ text | ✅ text | ✅ Match |
| `difficulty_level` | ❌ | ✅ text | ⚠️ Extra in prod |
| `version` | ❌ | ✅ integer | ⚠️ Extra in prod |
| `created_at` | ✅ timestamptz | ✅ timestamptz | ✅ Match |

**Analysis**: Production has extra versioning columns. Likely OK.

---

## Foreign Key Verification

| FK Constraint | Local | Production | Status |
|---------------|-------|------------|--------|
| `invites_session_id_fkey` | ✅ | ✅ | ✅ Match |
| `participants_session_id_fkey` | ✅ | ✅ | ✅ Match |
| `participants_claimed_invite_id_fkey` | ✅ | ✅ | ✅ **FIXED** |

**Note**: The FK `participants_claimed_invite_id_fkey` was the bug we just fixed. It exists in both now.

---

## Critical Issues

### 🔴 HIGH PRIORITY

**1. Sessions table has hybrid schema**
- **Impact**: Code uses Sessions SDK columns only
- **Risk**: Old columns (`location_text`, `neighborhood`, etc.) ignored
- **Action**: Decide - keep hybrid or migrate fully to Sessions SDK

**2. Auth token mismatch**
- **Local**: `auth_token`
- **Production**: `participant_token`
- **Risk**: Auth may break if code expects `auth_token`
- **Action**: Verify which token field is actually used in production

**3. Invites table empty**
- **Impact**: Cannot verify production schema matches local
- **Risk**: May break when invites start being created
- **Action**: Create test invite and verify columns

---

## Recommended Actions

### Immediate (Today)

1. **Test auth flow in production**
   ```javascript
   // Check if code uses auth_token or participant_token
   grep -r "auth_token\|participant_token" packages/
   ```

2. **Create test invite in production**
   - Select group mode
   - Verify invite columns populated correctly
   - Check if `invite_type`, `is_constant_link` exist

3. **Document actual production columns**
   - Export one session from production
   - Compare JSON structure with code expectations

### This Week

4. **Decide on schema strategy**
   - Option A: Keep hybrid, code ignores old columns
   - Option B: Clean migration - drop old columns, full Sessions SDK
   - Option C: Add adapter layer for backward compatibility

5. **Align authentication**
   - If `participant_token` is standard, update local schema
   - If `auth_token` is correct, migrate production

6. **Lock schema source of truth**
   - Pick: Prisma migrations OR SQL files
   - Delete the other
   - Update DEPLOYMENT.md

---

## Migration Path (If Needed)

**If full Sessions SDK migration chosen:**

```sql
-- Backup first!
BEGIN;

-- Drop old Minibag columns
ALTER TABLE sessions DROP COLUMN location_text;
ALTER TABLE sessions DROP COLUMN neighborhood;
ALTER TABLE sessions DROP COLUMN scheduled_time;
-- ... etc

-- Rename auth token (if needed)
ALTER TABLE participants RENAME COLUMN participant_token TO auth_token;

-- Add missing Sessions SDK columns
ALTER TABLE sessions ADD COLUMN mode text;
ALTER TABLE sessions ADD COLUMN constant_invite_token text UNIQUE;

COMMIT;
```

**DO NOT RUN YET** - Need to verify which columns are actually used in prod.

---

## Files for Reference

- Local schema: `local_schema_dump.txt`
- Production schema: `production_schema_dump.txt`
- Sessions SDK Prisma: `packages/sessions-core/prisma/schema.prisma`
