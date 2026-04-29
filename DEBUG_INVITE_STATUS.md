# Debug: Invite Status Issue

## Problem

Session `faddb3c68de4` - constant invite link shows "expired" even for NEW session.

## Error From Logs

```
SessionError: Invite link has expired
at claimNextAvailableSlot (invites/crud.ts:529)
```

## Code Check

`packages/sessions-core/src/invites/crud.ts:526-530`:
```typescript
if (invite.status !== 'active') {
  throw new SessionError(
    SessionErrorCode.SESSION_EXPIRED,
    'Invite link has expired'
  );
}
```

## Expected Creation

`packages/sessions-core/src/sessions/crud.ts:144-158`:
```typescript
if (mode === 'group' && constantInviteToken) {
  const invite = await tx.invite.create({
    data: {
      sessionId: session.id,
      inviteToken: constantInviteToken,
      inviteType: 'constant',
      isConstantLink: true,
      status: 'active',  // ← Should be 'active'
      expiresAt: null,
      slotAssignments: [],
      declinedBy: [],
    },
  });
}
```

## Possible Causes

1. **Invite not created** - mode != 'group' or constantInviteToken is null
2. **Wrong status value** - created with different status
3. **Schema mismatch** - Supabase vs PostgreSQL column difference
4. **Status changed** - something updates invite after creation

## SQL Diagnostics

Run in Supabase SQL Editor:

```sql
-- Check session details
SELECT
  s.session_id,
  s.mode,
  s.status as session_status,
  s.constant_invite_token,
  s.created_at,
  s.expires_at
FROM sessions s
WHERE s.session_id = 'faddb3c68de4';

-- Check invite details
SELECT
  i.id,
  i.invite_token,
  i.invite_type,
  i.is_constant_link,
  i.status as invite_status,
  i.created_at,
  i.expires_at,
  LENGTH(i.invite_token) as token_length
FROM invites i
JOIN sessions s ON i.session_id = s.id
WHERE s.session_id = 'faddb3c68de4';

-- Check if invite exists at all
SELECT COUNT(*) as invite_count
FROM invites i
JOIN sessions s ON i.session_id = s.id
WHERE s.session_id = 'faddb3c68de4';
```

## Expected Results

**Session should show:**
- `mode` = 'group'
- `status` = 'open'
- `constant_invite_token` = 16-char string (not null)

**Invite should show:**
- `invite_token` = same as session.constant_invite_token
- `invite_type` = 'constant'
- `is_constant_link` = true
- `status` = 'active' ← **CRITICAL**
- `expires_at` = null
- `token_length` = 16

## If Invite Missing

Invite not created. Check:
1. Session mode = 'solo' (bug in frontend)
2. constantInviteToken generation failed
3. Transaction rolled back

## If Invite Has Wrong Status

Status is one of: 'pending', 'expired', 'claimed'

**Fix:**
```sql
UPDATE invites
SET status = 'active'
WHERE id IN (
  SELECT i.id
  FROM invites i
  JOIN sessions s ON i.session_id = s.id
  WHERE s.session_id = 'faddb3c68de4'
    AND i.is_constant_link = true
);
```

## If Schema Mismatch

PostgreSQL (SDK) has invite, but Supabase doesn't:
- Check `USE_SESSIONS_SDK` env var
- Check SDK logs for invite creation
- Check Supabase sync in SessionsAdapter

## Action Items

1. **Run SQL diagnostics** (paste above in Supabase)
2. **Check session creation logs** (look for "[DEBUG] Session creation")
3. **Verify env vars** (USE_SESSIONS_SDK, ENABLE_GROUP_MODE)
4. **Test with new session** after config fix deployed

---

**Next:** Run SQL in Supabase → Report findings
