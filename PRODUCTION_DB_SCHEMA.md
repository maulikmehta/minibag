# Production Database Schema Requirements

**Source**: Local `sessions_test` database (Sessions SDK integration)
**Target**: Production Supabase (hqatleibipplqlwwjvwp)
**Last Verified**: 2026-04-24

---

## Required Tables

### 1. sessions
```sql
CREATE TABLE sessions (
  id uuid PRIMARY KEY,
  session_id text UNIQUE NOT NULL,
  creator_nickname text NOT NULL,
  creator_real_name text,
  status text NOT NULL DEFAULT 'open',
  host_token text NOT NULL,
  session_pin text,
  mode text,
  max_participants integer,
  constant_invite_token text UNIQUE,
  expected_participants integer,
  expected_participants_set_at timestamp(6) with time zone,
  checkpoint_complete boolean NOT NULL DEFAULT false,
  created_at timestamp(6) with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at timestamp(6) with time zone,
  cancelled_at timestamp(6) with time zone,
  expires_at timestamp(6) with time zone
);
```

**Key Indexes:**
- `sessions_session_id_key` (UNIQUE)
- `sessions_constant_invite_token_key` (UNIQUE)
- `idx_sessions_status_created` (status, created_at DESC)

---

### 2. invites

```sql
CREATE TABLE invites (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  invite_token text NOT NULL,
  invite_number integer,
  status text NOT NULL DEFAULT 'pending',
  invite_type text NOT NULL DEFAULT 'named',
  is_constant_link boolean NOT NULL DEFAULT false,
  slot_assignments jsonb,
  declined_by jsonb,
  claimed_at timestamp(6) with time zone,
  created_at timestamp(6) with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at timestamp(6) with time zone,

  UNIQUE(session_id, invite_number),
  UNIQUE(session_id, invite_token)
);
```

**Important**:
- ❌ NO `claimed_by` column
- ✅ Relationship is REVERSE via participants.claimed_invite_id

**Key Indexes:**
- `invites_session_id_invite_token_key` (UNIQUE)
- `idx_invites_status` (status, claimed_at DESC)
- `idx_invites_token` (session_id, invite_token)

---

### 3. participants

```sql
CREATE TABLE participants (
  id uuid PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  avatar_emoji text NOT NULL,
  real_name text,
  is_creator boolean NOT NULL DEFAULT false,
  auth_token text,
  claimed_invite_id uuid REFERENCES invites(id) ON DELETE SET NULL,
  items_confirmed boolean NOT NULL DEFAULT false,
  marked_not_coming boolean NOT NULL DEFAULT false,
  marked_not_coming_at timestamp(6) with time zone,
  joined_at timestamp(6) with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  left_at timestamp(6) with time zone
);
```

**Important**:
- ✅ HAS `claimed_invite_id` → invites.id
- This creates FK: `participants_claimed_invite_id_fkey`

**Key Indexes:**
- `idx_participants_session_active` (session_id) WHERE marked_not_coming = false
- `participants_claimed_invite_id_idx` (claimed_invite_id)

**Triggers:**
- `enforce_participant_limit` - checks max_participants before INSERT

---

### 4. nicknames_pool

```sql
CREATE TABLE nicknames_pool (
  id uuid PRIMARY KEY,
  nickname text UNIQUE NOT NULL,
  avatar_emoji text NOT NULL,
  gender text,
  language_origin text,
  is_available boolean NOT NULL DEFAULT true,
  currently_used_in uuid REFERENCES sessions(id),
  times_used integer DEFAULT 0,
  last_used timestamp(6) with time zone,
  created_at timestamp(6) with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Key Indexes:**
- `nicknames_pool_nickname_key` (UNIQUE)
- Index on `is_available` for fast lookups

---

## Foreign Key Relationships

```
sessions (id)
  ↓
  ├─→ invites.session_id (invites_session_id_fkey)
  ├─→ participants.session_id (participants_session_id_fkey)
  └─→ nicknames_pool.currently_used_in

invites (id)
  ↓
  └─→ participants.claimed_invite_id (participants_claimed_invite_id_fkey)
```

**CRITICAL**: The invite → participant relationship is REVERSE:
- Query must use: `participants!participants_claimed_invite_id_fkey`
- NOT: `participants!invites_claimed_by_fkey` (doesn't exist)

---

## API Query Examples

### Get Session Invites with Participants

```javascript
const { data: invites } = await supabase
  .from('invites')
  .select(`
    *,
    participant:participants!participants_claimed_invite_id_fkey(
      id,
      nickname,
      real_name,
      marked_not_coming,
      items_confirmed
    )
  `)
  .eq('session_id', sessionUuid)
  .order('invite_number');
```

### Get Session with Participants

```javascript
const { data: session } = await supabase
  .from('sessions')
  .select(`
    *,
    participants(
      id,
      nickname,
      real_name,
      items_confirmed,
      claimed_invite:invites(invite_token, invite_number)
    )
  `)
  .eq('session_id', sessionId)
  .single();
```

---

## Migration Status

**Local Dev (sessions_test)**: ✅ Complete
**Production (hqatleibipplqlwwjvwp)**: ❓ Unknown

**Verification Needed:**
1. Check if invites table has correct schema (no `claimed_by` column)
2. Verify FK `participants_claimed_invite_id_fkey` exists
3. Test invite queries with production data

**If Schema Mismatch:**
- Run Sessions SDK Prisma migrations
- Or apply schema from `packages/sessions-core/prisma/schema.prisma`
