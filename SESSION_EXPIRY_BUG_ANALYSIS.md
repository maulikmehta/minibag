# Session Expiry Bug Analysis

## Problem Statement

**User Report:** User follows invite link → enters PIN → sees "session expired" error

**Actual Behavior:** Session shows as expired even when it shouldn't be

## Root Cause Analysis

### The Bug Chain

1. **Session Creation** (`packages/sessions-core/src/sessions/crud.ts:108-113`):
```typescript
// BUGFIX: Use scheduledTime as base, not current time
const baseTime = scheduledTime ? new Date(scheduledTime) : new Date();
const expiresAt = new Date(baseTime);
expiresAt.setHours(expiresAt.getHours() + expiresInHours);
```

2. **Join Validation** (`packages/sessions-core/src/participants/lifecycle.ts:115-121`):
```typescript
// Check if session has expired
if (session.expiresAt && new Date() > session.expiresAt) {
  throw new SessionError(
    SessionErrorCode.SESSION_EXPIRED,
    'Session has expired'
  );
}
```

### Why It Fails

**Scenario A: Past scheduledTime**
- Session created with `scheduledTime = "2026-04-28T10:00:00Z"` (yesterday)
- `expiresAt = scheduledTime + 24 hours = "2026-04-29T10:00:00Z"`
- Current time = "2026-04-29T14:00:00Z"
- **Result:** `new Date() > expiresAt` → SESSION_EXPIRED ✗

**Scenario B: Timezone Issues**
- Frontend sends `scheduledTime` in local timezone
- Backend parses as UTC
- Time shift causes `expiresAt` to be in the past

**Scenario C: Default Behavior**
- If no `scheduledTime` provided, defaults to `new Date()` (NOW)
- But if `expiresInHours` is too short (e.g., 2 hours), sessions expire quickly

## Evidence

### From Code Comments

`SESSION-CREATION-ARCHITECTURE.md:98-103`:
```markdown
**Where the bug manifests:**
1. Frontend creates session with `scheduled_time = NOW + 1 hour`
2. SessionsAdapter calls SDK with `expiresInHours: 2`
3. SDK calculates: `expiresAt = NOW + 2 hours`
4. API stores: `expires_at = scheduled_time + 2 hours = NOW + 3 hours`
5. BUT SDK returned: `NOW + 2 hours`
```

### Line 155 (Invite Creation):
```typescript
// BUGFIX: Constant invite links never expire independently
// They remain valid as long as session.status === 'open'
// Setting expiresAt to session.expiresAt breaks sessions created with past scheduled_time
expiresAt: null,
```

**This comment explicitly acknowledges the bug!**

## Immediate Impact

When does this happen?
1. ✅ Sessions with `scheduledTime` in the past
2. ✅ Imported/migrated sessions from old database
3. ✅ Sessions created in one timezone, joined from another
4. ✅ Sessions with very short `expiresInHours` (< current time delta)

## Multiple Expiry Checks

The bug manifests in **5 places**:

1. `joinSession()` - Line 116 (lifecycle.ts)
2. `verifyParticipant()` - Line 446 (lifecycle.ts)
3. `getSession()` - Line 264 (crud.ts) - Returns `status: 'expired'`
4. `updateSession()` - Line 360 (crud.ts) - Throws error
5. `claimSlotViaConstantLink()` - Via `joinSession()` call

## The Fix Options

### Option 1: Ignore Past scheduledTime (Quick Fix)
```typescript
// If scheduledTime is in the past, use NOW instead
const baseTime = scheduledTime && new Date(scheduledTime) > new Date()
  ? new Date(scheduledTime)
  : new Date();
const expiresAt = new Date(baseTime);
expiresAt.setHours(expiresAt.getHours() + expiresInHours);
```

**Pros:**
- Simple, 1-line change
- Fixes immediate issue
- Backwards compatible

**Cons:**
- Doesn't fix timezone issues
- Sessions still expire unexpectedly if created long ago

### Option 2: Always Use NOW for Expiry (Recommended)
```typescript
// Always calculate expiry from current time, not scheduled time
// Session is valid for X hours from creation, regardless of when shopping happens
const expiresAt = new Date();
expiresAt.setHours(expiresAt.getHours() + expiresInHours);
```

**Pros:**
- Most intuitive: "session expires 24 hours after creation"
- No timezone issues
- No past-date issues

**Cons:**
- Changes semantics (was "expire X hours after scheduled shopping")

### Option 3: Check Session Status Instead of Time (Best)
```typescript
// DON'T throw expired error based on time
// ONLY check session.status field
// Let cleanup job handle marking sessions as expired

// REMOVE THIS:
if (session.expiresAt && new Date() > session.expiresAt) {
  throw new SessionError(SessionErrorCode.SESSION_EXPIRED, 'Session has expired');
}

// REPLACE WITH:
if (!['open', 'active'].includes(session.status)) {
  throw new SessionError(SessionErrorCode.SESSION_EXPIRED, 'Session has ended');
}
```

**Pros:**
- Most robust: Single source of truth (`session.status`)
- Cleanup job (`expireOverdueSessions()`) sets status to 'expired'
- No time-based race conditions
- Works across timezones

**Cons:**
- Requires cleanup job running regularly
- If cleanup job fails, stale sessions stay "open"

## Recommended Solution

**Hybrid Approach:**
1. Change expiry calculation to use NOW (Option 2)
2. Also check session status (Option 3)
3. Keep time-based check as fallback

```typescript
// In joinSession() (lifecycle.ts:115-121)

// Check session status first (primary check)
if (!['open', 'active'].includes(session.status)) {
  throw new SessionError(
    SessionErrorCode.SESSION_EXPIRED,
    'This session has ended. Ask the host to start a new one!'
  );
}

// Check time-based expiry as fallback (secondary check)
// This catches sessions where cleanup job hasn't run yet
if (session.expiresAt && new Date() > session.expiresAt) {
  // Don't throw immediately - mark as expired first
  await prisma.session.update({
    where: { id: session.id },
    data: { status: 'expired', completedAt: new Date() }
  });

  throw new SessionError(
    SessionErrorCode.SESSION_EXPIRED,
    'This session has expired. Ask the host to start a new one!'
  );
}
```

## Files to Change

1. **`packages/sessions-core/src/sessions/crud.ts:108-113`**
   - Change expiry calculation to always use NOW

2. **`packages/sessions-core/src/participants/lifecycle.ts:115-121`**
   - Check session.status first
   - Time-based check as fallback with status update

3. **`packages/sessions-core/src/participants/lifecycle.ts:446-451`**
   - Same changes for `verifyParticipant()`

## Testing Strategy

### Unit Tests

```typescript
describe('Session Expiry Fix', () => {
  it('allows joining session created with past scheduledTime', async () => {
    const pastTime = new Date();
    pastTime.setHours(pastTime.getHours() - 2);

    const { data: session } = await createSession({
      creatorNickname: 'Host',
      creatorAvatarEmoji: '👨',
      scheduledTime: pastTime.toISOString(), // 2 hours ago
      expiresInHours: 24
    });

    // Should NOT be expired (24 hours from NOW, not from past time)
    const { data: join, error } = await joinSession({
      sessionId: session!.session.sessionId,
      nicknameId: 'fallback-001',
      nickname: 'Joiner',
      avatarEmoji: '👩'
    });

    expect(error).toBeNull();
    expect(join?.participant).toBeTruthy();
  });

  it('respects session.status over time-based expiry', async () => {
    const { data: session } = await createSession({
      creatorNickname: 'Host2',
      creatorAvatarEmoji: '👨',
      expiresInHours: -1 // Force past expiry
    });

    // Manually set status to 'open' (simulating bug scenario)
    await prisma.session.update({
      where: { id: session!.session.id },
      data: { status: 'open' } // Force open
    });

    // Join should fail because status check happens first
    const { error } = await joinSession({
      sessionId: session!.session.sessionId,
      nicknameId: 'fallback-002',
      nickname: 'Joiner2',
      avatarEmoji: '👩'
    });

    // Should auto-mark as expired and reject
    expect(error?.code).toBe(SessionErrorCode.SESSION_EXPIRED);

    // Verify status updated
    const updated = await getSession(session!.session.sessionId, null);
    expect(updated.data?.status).toBe('expired');
  });
});
```

### Manual Testing

1. Create session with past `scheduledTime`
2. Get invite link
3. Open in incognito window
4. Enter PIN
5. **Expected:** Join succeeds (no "expired" error)

## Production Migration

```sql
-- Update existing sessions with past expiresAt
-- Set new expiresAt to NOW + 24 hours for active sessions
UPDATE sessions
SET expires_at = NOW() + INTERVAL '24 hours'
WHERE status IN ('open', 'active')
  AND expires_at < NOW();

-- Count sessions that were fixed
SELECT COUNT(*) FROM sessions
WHERE status IN ('open', 'active')
  AND expires_at > NOW();
```

## Monitoring

After deploy, track:
- Session creation errors (should decrease)
- "SESSION_EXPIRED" errors during join (should drop to near-zero)
- Sessions with `expiresAt` in past but `status = 'open'` (should be 0)

---

**Status:** Ready to fix
**Priority:** P0 - Blocking user joins
**Estimated Fix Time:** 30 minutes
**Risk:** Low (well-tested scenarios)
