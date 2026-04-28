# Production Bug Fix Plan - Session Joining Issues
**Date:** 2026-04-27
**Total Bugs:** 22 (8 CRITICAL, 5 HIGH, 7 MEDIUM, 2 LOW)
**Already Fixed:** ~5 race conditions (per RACE_CONDITIONS_FIXED.md)
**Remaining:** ~17 bugs requiring fixes

---

## EXECUTIVE SUMMARY

**Deployment Blocker Count:** 5 P0 bugs
**Estimated Fix Time:** 16-20 hours (2-3 days sprint)
**Risk Level:** HIGH - Data corruption, security vulnerabilities, UX failures

**Fix Strategy:**
- Phase 1: P0 deployment blockers (1 day)
- Phase 2: P1 security/data integrity (1 day)
- Phase 3: P2 UX improvements (0.5 day)
- Phase 4: Testing & validation (0.5 day)

---

## ALREADY FIXED (From Archives)

### ✅ Race Conditions (RACE_CONDITIONS_FIXED.md)
1. ~~Concurrent joins exceed limit~~ - Fixed with FOR UPDATE lock
2. ~~Nickname claimed outside transaction~~ - Fixed with atomic claiming
3. ~~Invite lookup unreliable~~ - Fixed with direct FK
4. ~~Duplicate slot claims~~ - Fixed with dedup check
5. ~~Solo mode bypass~~ - Fixed with explicit mode check

### ✅ Deployment Issues (DEPLOYMENT-QUICK-FIX.md)
1. ~~CORS configuration~~ - Fixed with FRONTEND_URL env var
2. ~~Environment variables~~ - Documented in checklist

### ✅ Safety Issues (SAFETY_ENV_FIX.md)
1. ~~Production DB in .env~~ - Fixed, now points to test DB

**Conclusion:** Database race conditions mostly handled. Focus on invite system, token security, and database split coordination.

---

## PHASE 1: P0 DEPLOYMENT BLOCKERS (Day 1)

**Goal:** Fix bugs that cause data loss or complete feature failure
**Timeline:** 8 hours
**Tests Required:** Unit + integration tests for each fix

### BUG #11: Two-Phase Write Without Transaction (4 hours)

**Priority:** P0 - CRITICAL
**Impact:** Orphaned PostgreSQL sessions when Supabase insert fails

**Implementation:**
```javascript
// File: packages/shared/adapters/SessionsAdapter.js:44-200

// Option A: Compensating transaction (RECOMMENDED - 2 hours)
async createShoppingSession(options) {
  let sdkSession = null;

  try {
    // Step 1: SDK creates session
    sdkSession = await sdkCreateSession({...});

    // Step 2: Supabase insert
    const { data: minibagSession, error } = await supabase
      .from('sessions')
      .insert({ id: sdkSession.session.id, ... });

    if (error) {
      // COMPENSATE: Delete SDK session
      await deleteSession(sdkSession.session.sessionId, sdkSession.session.hostToken);
      throw new Error('Failed to sync session to Supabase');
    }

    // Step 3: Supabase participant insert
    const { data: participant, error: pError } = await supabase
      .from('participants')
      .insert({ id: sdkSession.participant.id, ... });

    if (pError) {
      // COMPENSATE: Delete both
      await supabase.from('sessions').delete().eq('id', sdkSession.session.id);
      await deleteSession(sdkSession.session.sessionId, sdkSession.session.hostToken);
      throw new Error('Failed to sync participant to Supabase');
    }

    return { session: minibagSession, participant, authToken };

  } catch (error) {
    // If we have SDK session, ensure cleanup
    if (sdkSession) {
      await deleteSession(sdkSession.session.sessionId, sdkSession.session.hostToken)
        .catch(err => console.error('Cleanup failed:', err));
    }
    throw error;
  }
}

// Option B: Idempotency key (ADDITIONAL - 1 hour)
// Accept client-generated UUID as idempotency key
// Check if session with key exists before creating
// Return existing session if key matches

// Testing (1 hour)
describe('BUG #11: Two-phase write compensating transaction', () => {
  it('rolls back SDK session when Supabase fails', async () => {
    // Mock Supabase to fail
    supabase.from = jest.fn().mockReturnValue({
      insert: jest.fn().mockRejectedValue(new Error('Timeout'))
    });

    await expect(createShoppingSession({...})).rejects.toThrow();

    // Verify SDK session was deleted (compensated)
    const sdkSession = await getSession(sessionId);
    expect(sdkSession).toBeNull();
  });
});
```

**Files to Change:**
- `packages/shared/adapters/SessionsAdapter.js` (createShoppingSession)
- `packages/shared/adapters/SessionsAdapter.js` (claimSlotViaConstantLink)

---

### BUG #12: Participant Sync Failure (2 hours)

**Priority:** P0 - CRITICAL
**Impact:** Invisible participants, slot claimed but not visible to frontend

**Implementation:**
```javascript
// File: packages/shared/adapters/SessionsAdapter.js:288-354

async claimSlotViaConstantLink(options) {
  try {
    // SDK claims slot
    const sdkResult = await claimNextAvailableSlot(...);

    // CRITICAL: Sync to Supabase with UPSERT (idempotent)
    const { data, error } = await supabase
      .from('participants')
      .upsert({ // Changed from insert to upsert
        id: participant.id,
        session_id: participant.sessionId,
        nickname: participant.nickname,
        ...
      }, {
        onConflict: 'id', // If participant exists, update instead of error
        ignoreDuplicates: false // Update existing record
      })
      .select()
      .single();

    if (error && error.code !== '23505') { // Ignore duplicate key (already exists)
      // Retry once after 500ms
      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: retryData, error: retryError } = await supabase
        .from('participants')
        .upsert({ id: participant.id, ... })
        .select()
        .single();

      if (retryError) {
        console.error('Failed to sync participant after retry:', retryError);
        // DON'T throw - participant exists in SDK, that's what matters
        // Frontend will eventually sync via polling
      }
    }

    return { slotNumber, participant, authToken };
  } catch (error) {
    throw error;
  }
}

// Testing (30 min)
describe('BUG #12: Participant sync with retry', () => {
  it('uses upsert to handle duplicate participants', async () => {
    // Simulate duplicate participant scenario
    await createParticipantInSDK(participantId);

    // Should not throw on duplicate
    const result = await claimSlotViaConstantLink({...});
    expect(result.participant).toBeDefined();
  });
});
```

---

### BUG #1: Named Invite Decline Broken (3 hours)

**Priority:** P0 - CRITICAL
**Impact:** Users cannot decline invites, checkpoint logic broken

**Implementation:**
```javascript
// File: packages/sessions-core/src/invites/crud.ts

// Add new function (1.5 hours)
export async function declineNamedInvite(
  inviteId: string,
  reason?: string
): Promise<ApiResponse<Invite>> {
  try {
    const invite = await prisma.invite.findUnique({
      where: { id: inviteId }
    });

    if (!invite) {
      throw new Error('Invite not found');
    }

    if (invite.status === 'claimed') {
      throw new Error('Invite already claimed');
    }

    if (invite.status === 'declined') {
      return { data: invite, error: null }; // Idempotent
    }

    // Update invite status
    const updated = await prisma.invite.update({
      where: { id: inviteId },
      data: {
        status: 'declined',
        declinedAt: new Date(),
        declineReason: reason || null
      }
    });

    return { data: updated, error: null };
  } catch (error) {
    return {
      data: null,
      error: new SessionError(
        SessionErrorCode.TRANSACTION_FAILED,
        error instanceof Error ? error.message : 'Failed to decline invite'
      )
    };
  }
}

// File: packages/shared/api/sessions.js (1 hour)
// Add endpoint: POST /api/sessions/:sessionId/invites/:inviteId/decline

// File: packages/minibag/src/screens/JoinSessionScreen/index.jsx (30 min)
// Update handleDecline to call decline endpoint instead of joinSession
const handleDecline = async () => {
  try {
    // OLD (BUG):
    // await joinSession(sessionId, [], { marked_not_coming: true, invite_token });

    // NEW (FIX):
    const response = await fetch(
      `${API_BASE_URL}/api/sessions/${sessionId}/invites/${inviteId}/decline`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'User declined' })
      }
    );

    if (!response.ok) throw new Error('Failed to decline');

    notify.info("You've declined the invitation. The host has been notified.");
    onNavigateToHome();
  } catch (error) {
    notify.error('Failed to decline invitation. Please try again.');
  }
};

// Testing (30 min)
describe('BUG #1: Named invite decline', () => {
  it('marks invite as declined without creating participant', async () => {
    const invite = await createNamedInvite(sessionId, 1);

    await declineNamedInvite(invite.id, 'Cannot make it');

    const updated = await getInvite(invite.id);
    expect(updated.status).toBe('declined');
    expect(updated.declinedAt).toBeDefined();

    // Should NOT create participant
    const participants = await getParticipants(sessionId);
    expect(participants.length).toBe(1); // Only host
  });
});
```

---

### BUG #3: No Invite Resolution Check (2 hours)

**Priority:** P0 - CRITICAL
**Impact:** Can start shopping with pending invites, missing participants

**Implementation:**
```javascript
// File: packages/sessions-core/src/invites/crud.ts (1 hour)

export async function areAllInvitesResolved(
  sessionId: string
): Promise<ApiResponse<{ resolved: boolean; pending: Invite[] }>> {
  try {
    const session = await prisma.session.findUnique({
      where: { sessionId },
      include: {
        invites: {
          where: {
            status: 'pending' // Only get pending invites
          }
        }
      }
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Check if any invites are still pending
    const pending = session.invites.filter(inv => {
      // Consider expired invites as resolved
      if (inv.expiresAt && new Date() > inv.expiresAt) {
        return false;
      }
      return inv.status === 'pending';
    });

    return {
      data: {
        resolved: pending.length === 0,
        pending
      },
      error: null
    };
  } catch (error) {
    return {
      data: null,
      error: new SessionError(
        SessionErrorCode.TRANSACTION_FAILED,
        error instanceof Error ? error.message : 'Failed to check invite status'
      )
    };
  }
}

// File: packages/shared/api/sessions.js (30 min)
// Add endpoint: GET /api/sessions/:sessionId/invites/resolved

// File: packages/minibag/src/hooks/useExpectedParticipants.js (30 min)
// Update checkpoint logic
const { expectedCount, setExpectedCount, checkpointComplete } = useExpectedParticipants(session, participants);

// Add invite resolution check
const [invitesResolved, setInvitesResolved] = useState(false);

useEffect(() => {
  const checkInvites = async () => {
    if (!session?.session_id || expectedCount <= 0) {
      setInvitesResolved(true);
      return;
    }

    const response = await fetch(`/api/sessions/${session.session_id}/invites/resolved`);
    const data = await response.json();
    setInvitesResolved(data.resolved);
  };

  checkInvites();
  const interval = setInterval(checkInvites, 3000);
  return () => clearInterval(interval);
}, [session?.session_id, expectedCount]);

// Modify checkpoint complete logic
const finalCheckpointComplete = checkpointComplete && invitesResolved;

// Testing (30 min)
describe('BUG #3: Invite resolution check', () => {
  it('blocks transition when invites pending', async () => {
    const { session, invites } = await createSessionWithInvites(3);

    // 2 claimed, 1 pending
    await claimInvite(invites[0].token);
    await claimInvite(invites[1].token);

    const { resolved } = await areAllInvitesResolved(session.sessionId);
    expect(resolved).toBe(false);

    // Now decline the 3rd
    await declineInvite(invites[2].id);

    const { resolved: nowResolved } = await areAllInvitesResolved(session.sessionId);
    expect(nowResolved).toBe(true);
  });
});
```

---

### BUG #16: Admin Delete Doesn't Release Nicknames (1 hour)

**Priority:** P0 - CRITICAL (test session cleanup)
**Impact:** Nickname pool depletion after multiple test sessions

**Implementation:**
```javascript
// File: packages/sessions-core/src/sessions/crud.ts (30 min)

// Add helper function
async function releaseSessionNicknames(sessionUuid: string): Promise<void> {
  try {
    const result = await prisma.nicknamesPool.updateMany({
      where: { currentlyUsedIn: sessionUuid },
      data: {
        isAvailable: true,
        currentlyUsedIn: null,
        reservedUntil: null,
        reservedBySession: null,
        lastUsed: new Date() // Track when freed
      }
    });

    if (result.count > 0) {
      console.log(`✅ Released ${result.count} nicknames for session ${sessionUuid}`);
    }
  } catch (error) {
    console.error('Failed to release nicknames:', error);
    // Don't throw - session deletion should still succeed
  }
}

// Hook into updateSession (line 281-370)
export async function updateSession(sessionId, hostToken, updates) {
  // ... existing validation

  // Release nicknames when session terminates
  if (updates.status && ['cancelled', 'completed', 'expired'].includes(updates.status)) {
    // Get session UUID before update
    const session = await prisma.session.findUnique({
      where: { sessionId },
      select: { id: true }
    });

    if (session) {
      await releaseSessionNicknames(session.id);
    }
  }

  // ... rest of update logic
}

// File: packages/sessions-core/src/sessions/cleanup.ts (15 min)
// Hook nickname release into expireOverdueSessions
export async function expireOverdueSessions() {
  const sessions = await prisma.session.findMany({
    where: {
      expiresAt: { lt: new Date() },
      status: { in: ['open', 'active'] }
    },
    select: { id: true, sessionId: true }
  });

  // Release nicknames for each session before marking expired
  for (const session of sessions) {
    await releaseSessionNicknames(session.id);
  }

  // Then update status
  await prisma.session.updateMany({
    where: { id: { in: sessions.map(s => s.id) } },
    data: { status: 'expired', completedAt: new Date() }
  });
}

// Testing (15 min)
describe('BUG #16: Admin delete releases nicknames', () => {
  it('releases nicknames immediately on delete', async () => {
    const { session, participant } = await createSession();
    const nicknameId = participant.nicknameId;

    // Verify nickname in use
    const before = await getNickname(nicknameId);
    expect(before.isAvailable).toBe(false);

    // Delete session
    await deleteSession(session.sessionId, session.hostToken);

    // Verify nickname released immediately
    const after = await getNickname(nicknameId);
    expect(after.isAvailable).toBe(true);
    expect(after.currentlyUsedIn).toBeNull();
  });
});
```

---

## PHASE 2: P1 SECURITY & DATA INTEGRITY (Day 2)

**Goal:** Fix security vulnerabilities and data corruption risks
**Timeline:** 8 hours

### BUG #7: Auth Tokens Never Expire (3 hours)

**Implementation:**
```javascript
// File: packages/sessions-core/prisma/schema.prisma (30 min)
model Participant {
  // ... existing fields
  authToken         String   @map("auth_token")
  authTokenExpiresAt DateTime? @map("auth_token_expires_at") // NEW
}

// Migration
npx prisma migrate dev --name add_auth_token_expiry

// File: packages/sessions-core/src/participants/lifecycle.ts (1.5 hours)
export async function verifyParticipant(participantId, authToken) {
  const participant = await prisma.participant.findFirst({
    where: {
      id: participantId,
      authToken,
      leftAt: null
    },
    include: { session: true } // Include session for status check
  });

  if (!participant) {
    return { data: null, error: new Error('Invalid credentials') };
  }

  // NEW: Check token expiration
  if (participant.authTokenExpiresAt && new Date() > participant.authTokenExpiresAt) {
    return { data: null, error: new Error('TOKEN_EXPIRED') };
  }

  // NEW: Check session status
  if (!['open', 'active'].includes(participant.session.status)) {
    return { data: null, error: new Error('SESSION_ENDED') };
  }

  // NEW: Check session expiration
  if (participant.session.expiresAt && new Date() > participant.session.expiresAt) {
    return { data: null, error: new Error('SESSION_EXPIRED') };
  }

  return { data: participant, error: null };
}

// File: packages/sessions-core/src/participants/lifecycle.ts (joinSession)
// Set token expiry to 24 hours on creation
const participant = await tx.participant.create({
  data: {
    // ... existing fields
    authToken: generateToken(),
    authTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  }
});

// Testing (1 hour)
describe('BUG #7: Token expiration', () => {
  it('rejects expired tokens', async () => {
    const { authToken, participantId } = await createParticipant();

    // Mock time 25 hours later
    jest.setSystemTime(Date.now() + 25 * 60 * 60 * 1000);

    const result = await verifyParticipant(participantId, authToken);
    expect(result.error.message).toBe('TOKEN_EXPIRED');
  });

  it('rejects tokens for completed sessions', async () => {
    const { session, authToken, participantId } = await createSession();

    // Complete session
    await completeSession(session.sessionId, session.hostToken);

    // Token should be rejected
    const result = await verifyParticipant(participantId, authToken);
    expect(result.error.message).toBe('SESSION_ENDED');
  });
});
```

---

### BUG #9: PIN Rate Limiting in Memory (2 hours)

**Implementation:**
```javascript
// File: packages/sessions-core/prisma/schema.prisma (30 min)
model SessionPinAttempt {
  id          String   @id @default(uuid())
  sessionId   String   @map("session_id")
  ipAddress   String?  @map("ip_address")
  attemptedAt DateTime @default(now()) @map("attempted_at")
  success     Boolean  @default(false)

  session     Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@map("session_pin_attempts")
  @@index([sessionId, attemptedAt])
}

// Migration
npx prisma migrate dev --name add_pin_rate_limiting

// File: packages/sessions-core/src/sessions/crud.ts (1 hour)
const MAX_PIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

async function checkPinRateLimit(sessionId: string): Promise<boolean> {
  const since = new Date(Date.now() - LOCKOUT_DURATION_MS);

  const attempts = await prisma.sessionPinAttempt.count({
    where: {
      sessionId,
      attemptedAt: { gte: since },
      success: false
    }
  });

  return attempts < MAX_PIN_ATTEMPTS;
}

async function recordPinAttempt(sessionId: string, success: boolean, ipAddress?: string) {
  await prisma.sessionPinAttempt.create({
    data: {
      sessionId,
      ipAddress,
      success,
      attemptedAt: new Date()
    }
  });
}

// Update validatePin function
export async function validatePin(sessionId: string, pin: string, ipAddress?: string) {
  // Check rate limit
  const allowed = await checkPinRateLimit(sessionId);
  if (!allowed) {
    return {
      data: null,
      error: new SessionError(
        SessionErrorCode.RATE_LIMITED,
        'Too many failed attempts. Try again in 15 minutes.'
      )
    };
  }

  const session = await getSession(sessionId);
  const success = session.sessionPin === pin;

  // Record attempt
  await recordPinAttempt(sessionId, success, ipAddress);

  if (!success) {
    return { data: null, error: new Error('Invalid PIN') };
  }

  return { data: { valid: true }, error: null };
}

// Testing (30 min)
describe('BUG #9: PIN rate limiting persists', () => {
  it('blocks after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await validatePin(sessionId, 'wrong-pin');
    }

    // 6th attempt should be blocked
    const result = await validatePin(sessionId, 'any-pin');
    expect(result.error.code).toBe('RATE_LIMITED');
  });

  it('rate limit survives server restart', async () => {
    // Fail 5 times
    for (let i = 0; i < 5; i++) {
      await validatePin(sessionId, 'wrong-pin');
    }

    // Simulate restart (disconnect/reconnect Prisma)
    await prisma.$disconnect();
    await prisma.$connect();

    // Should still be blocked
    const result = await validatePin(sessionId, 'any-pin');
    expect(result.error.code).toBe('RATE_LIMITED');
  });
});
```

---

### BUG #13: Named Invites Not in SDK (2 hours)

**Implementation:**
```javascript
// File: packages/sessions-core/src/invites/crud.ts (1.5 hours)

// Update generateInvites to support named invites
export async function generateNamedInvites(
  sessionId: string,
  count: number
): Promise<ApiResponse<Invite[]>> {
  try {
    const session = await prisma.session.findUnique({
      where: { sessionId }
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Delete existing named invites
    await prisma.invite.deleteMany({
      where: {
        sessionId: session.id,
        isConstantLink: false
      }
    });

    // Generate named invites
    const invites = [];
    for (let i = 1; i <= count; i++) {
      invites.push({
        sessionId: session.id,
        inviteToken: generateInviteToken(),
        inviteNumber: i,
        isConstantLink: false,
        status: 'pending',
        expiresAt: session.expiresAt
      });
    }

    const created = await prisma.invite.createMany({
      data: invites
    });

    // Fetch created invites
    const result = await prisma.invite.findMany({
      where: {
        sessionId: session.id,
        isConstantLink: false
      },
      orderBy: { inviteNumber: 'asc' }
    });

    return { data: result, error: null };
  } catch (error) {
    return {
      data: null,
      error: new SessionError(
        SessionErrorCode.TRANSACTION_FAILED,
        error instanceof Error ? error.message : 'Failed to generate invites'
      )
    };
  }
}

// File: packages/shared/api/sessions.js (30 min)
// Update setExpectedParticipants to use SDK
async function setExpectedParticipants(sessionId, count) {
  // OLD: Created in Supabase (BUG #13)
  // await supabase.from('invites').insert(invites);

  // NEW: Create in SDK
  const { data, error } = await sdkGenerateNamedInvites(sessionId, count);

  if (error) throw error;

  // Sync to Supabase for frontend display (read-only)
  await supabase.from('invites').upsert(
    data.map(inv => ({
      id: inv.id,
      session_id: inv.sessionId,
      invite_token: inv.inviteToken,
      invite_number: inv.inviteNumber,
      status: inv.status
    }))
  );

  return data;
}
```

---

### BUG #10: PIN Stored as Plain Text (1 hour)

**Implementation:**
```javascript
// File: packages/sessions-core/src/sessions/crud.ts (30 min)
import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 10;

// Update createSession
export async function createSession(options) {
  let hashedPin = null;

  if (options.sessionPin) {
    hashedPin = await bcrypt.hash(options.sessionPin, BCRYPT_ROUNDS);
  } else if (options.generatePin) {
    const pin = generatePin();
    hashedPin = await bcrypt.hash(pin, BCRYPT_ROUNDS);
    // Return plain PIN to user (only time it's visible)
    options._generatedPin = pin;
  }

  const session = await prisma.session.create({
    data: {
      // ... other fields
      sessionPin: hashedPin // Store hash, not plain text
    }
  });

  return {
    session,
    sessionPin: options._generatedPin || options.sessionPin // Return plain PIN once
  };
}

// Update validatePin
export async function validatePin(sessionId, pin, ipAddress?) {
  const session = await getSession(sessionId);

  // Use timing-safe comparison
  const success = await bcrypt.compare(pin, session.sessionPin);

  await recordPinAttempt(sessionId, success, ipAddress);

  if (!success) {
    return { data: null, error: new Error('Invalid PIN') };
  }

  return { data: { valid: true }, error: null };
}

// Testing (30 min)
describe('BUG #10: PIN hashing', () => {
  it('stores PIN as hash', async () => {
    const { session } = await createSession({ sessionPin: '1234' });

    const dbSession = await prisma.session.findUnique({
      where: { id: session.id }
    });

    // Should be bcrypt hash, not plain text
    expect(dbSession.sessionPin).not.toBe('1234');
    expect(dbSession.sessionPin).toMatch(/^\$2[aby]\$\d+\$/);
  });

  it('validates PIN with timing-safe comparison', async () => {
    const { session } = await createSession({ sessionPin: '1234' });

    const valid = await validatePin(session.sessionId, '1234');
    expect(valid.data.valid).toBe(true);

    const invalid = await validatePin(session.sessionId, '9999');
    expect(invalid.error).toBeDefined();
  });
});
```

---

## PHASE 3: P2 UX IMPROVEMENTS (Day 3 Morning)

**Goal:** Fix user-facing UI bugs
**Timeline:** 4 hours

### BUG #19: WebSocket Reconnect Re-sync (1.5 hours)

**Implementation:**
```javascript
// File: packages/minibag/src/services/socket.js (1 hour)
this.socket.on('connect', () => {
  this.connected = true;

  if (this.currentSessionId) {
    // Rejoin room
    this.joinSessionRoom(this.currentSessionId);

    // NEW: Trigger re-sync event
    this.emit('reconnected', {
      sessionId: this.currentSessionId,
      reconnectedAt: new Date().toISOString()
    });
  }
});

// File: packages/minibag/src/hooks/useParticipantSync.js (30 min)
useEffect(() => {
  const handleReconnect = async () => {
    console.log('🔄 WebSocket reconnected - re-syncing participants');

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/sessions/${session.session_id}/participants`
      );
      const data = await response.json();

      if (data.success) {
        onUpdateParticipants(data.participants);
        console.log('✅ Participants re-synced after reconnect');
      }
    } catch (error) {
      console.error('Failed to re-sync participants:', error);
    }
  };

  socketService.on('reconnected', handleReconnect);
  return () => socketService.off('reconnected', handleReconnect);
}, [session?.session_id, onUpdateParticipants]);
```

---

### BUG #17: Real-Time Tab Updates (1 hour)

**Implementation:**
```javascript
// File: packages/minibag/src/components/session/InviteTabsSelector.jsx
useEffect(() => {
  if (!sessionId) return;

  const handleParticipantJoined = (participant) => {
    if (participant.claimedInviteId) {
      // Update invite state immediately
      setInvites(prev => prev.map(inv =>
        inv.id === participant.claimedInviteId
          ? { ...inv, status: 'claimed', participant }
          : inv
      ));
    }
  };

  socketService.onParticipantJoined(handleParticipantJoined);
  return () => socketService.off('participant-joined', handleParticipantJoined);
}, [sessionId]);
```

---

### BUG #18: Notification Timer Cleanup (1 hour)

**Implementation:**
```javascript
// File: packages/minibag/src/contexts/NotificationContext.jsx
setNotifications(prev => {
  const updated = [...prev, notification];

  // Clear timer for dropped notification
  if (updated.length > MAX_NOTIFICATIONS) {
    const dropped = updated.shift();
    const timer = timersRef.current.toasts.get(dropped.id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.toasts.delete(dropped.id);
    }
  }

  return updated;
});
```

---

### BUG #21: Declined Visual Feedback (30 min)

**Implementation:**
```jsx
// File: packages/minibag/src/components/session/InviteCard.jsx
{invite.participant?.marked_not_coming && (
  <div className="absolute top-2 right-2 bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">
    ❌ Declined
  </div>
)}
```

---

## PHASE 4: TESTING & VALIDATION (Day 3 Afternoon)

**Goal:** Verify all fixes work in production-like environment
**Timeline:** 4 hours

### Integration Test Suite (2 hours)

```javascript
// File: packages/sessions-core/tests/integration/session-joining.test.ts

describe('Production Bug Fixes - Integration Tests', () => {
  describe('P0 Deployment Blockers', () => {
    it('BUG #11: Handles Supabase failure without orphans', async () => {
      // Test compensating transaction
    });

    it('BUG #12: Participant sync uses upsert', async () => {
      // Test idempotent sync
    });

    it('BUG #1: Named invites can be declined', async () => {
      // Test decline flow
    });

    it('BUG #3: Blocks shopping with pending invites', async () => {
      // Test resolution check
    });

    it('BUG #16: Deleting session releases nicknames', async () => {
      // Test resource cleanup
    });
  });

  describe('P1 Security & Data Integrity', () => {
    it('BUG #7: Tokens expire after 24 hours', async () => {
      // Test token expiration
    });

    it('BUG #9: PIN rate limit persists across restart', async () => {
      // Test database-backed rate limiting
    });

    it('BUG #13: Named invites stored in SDK', async () => {
      // Test SDK invite creation
    });

    it('BUG #10: PINs stored as bcrypt hash', async () => {
      // Test PIN hashing
    });
  });
});
```

---

### Manual Testing Checklist (1 hour)

**P0 Fixes:**
- [ ] Create session → Kill Supabase → Session creation fails cleanly (no orphan)
- [ ] Join session → Kill Supabase → Retry works (upsert handles duplicate)
- [ ] Receive invite → Click decline → Invite marked declined (not participant)
- [ ] Send 3 invites → 2 join, 1 pending → "Start Shopping" blocked
- [ ] Create 10 test sessions → Delete all in dashboard → Nicknames released

**P1 Fixes:**
- [ ] Join session → Wait 25 hours → Token rejected on reconnect
- [ ] Enter wrong PIN 5 times → Blocked for 15 min → Restart server → Still blocked
- [ ] Create session with named invites → Check PostgreSQL (should exist in SDK)
- [ ] Set PIN "1234" → Check DB (should be bcrypt hash, not plain text)

**P2 Fixes:**
- [ ] Open host screen → Disconnect WiFi → Participant joins → Reconnect WiFi → Participant appears
- [ ] Open host screen → Participant joins → Tab highlights immediately (no 3s lag)
- [ ] 6 participants join rapidly → All 6 notifications visible (none dropped)
- [ ] Send invite → User declines → Tab shows "Declined ❌"

---

### Production Deployment (1 hour)

**Pre-deploy checklist:**
- [ ] All tests passing (unit + integration)
- [ ] Manual testing complete
- [ ] Database migrations ready
- [ ] Environment variables documented
- [ ] Rollback plan documented

**Deploy order:**
1. Run database migrations on production PostgreSQL
2. Deploy backend (Render)
3. Verify backend health checks
4. Deploy frontend (Vercel)
5. Smoke test critical flows

**Smoke tests (5 min each):**
- [ ] Create session (solo mode)
- [ ] Create session (group mode with 2 invites)
- [ ] Join session via invite link
- [ ] Decline invite
- [ ] Delete test session in dashboard
- [ ] Verify nickname pool count unchanged

---

## RISK MITIGATION

### Database Migrations

**Before production deploy:**
```sql
-- Add auth_token_expires_at column
ALTER TABLE participants ADD COLUMN auth_token_expires_at TIMESTAMP;

-- Add session_pin_attempts table
CREATE TABLE session_pin_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  ip_address VARCHAR(45),
  attempted_at TIMESTAMP NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_pin_attempts_session_time ON session_pin_attempts(session_id, attempted_at);

-- Backfill auth token expiry for existing participants
UPDATE participants
SET auth_token_expires_at = created_at + INTERVAL '24 hours'
WHERE auth_token_expires_at IS NULL AND left_at IS NULL;
```

**Rollback plan:**
```sql
-- If deployment fails, rollback schema changes
ALTER TABLE participants DROP COLUMN auth_token_expires_at;
DROP TABLE session_pin_attempts;
```

---

### Feature Flags

**Gradual rollout:**
```javascript
// .env
ENABLE_TOKEN_EXPIRY=true  // Enable for new sessions only
ENABLE_DB_RATE_LIMIT=true // Enable PIN rate limiting
ENABLE_INVITE_RESOLUTION_CHECK=true // Require all invites resolved
```

**Monitor for 24 hours before fully enabling.**

---

## MONITORING & ALERTS

### Metrics to Track

**Success metrics:**
```
- orphaned_sessions_count = 0
- invisible_participants_count = 0
- invite_decline_success_rate > 95%
- nickname_leak_rate < 1%
- token_expiry_rejections (should see after 24h)
```

**Error rates:**
```
- compensating_transaction_failures < 1%
- participant_sync_retry_rate < 5%
- invite_resolution_check_failures < 1%
```

### Alerts

**Set up alerts for:**
- Orphaned PostgreSQL sessions detected (count > 0)
- Nickname pool below 1000 available
- Invite decline API error rate > 5%
- Token validation failure spike (could indicate attack)

---

## SUCCESS CRITERIA

**Phase 1 (P0) Complete When:**
- [ ] Zero orphaned sessions in 48 hours
- [ ] Zero invisible participants
- [ ] All invite declines work
- [ ] No shopping starts with pending invites
- [ ] Nickname pool stable after 100 test sessions

**Phase 2 (P1) Complete When:**
- [ ] No expired tokens accepted
- [ ] PIN rate limit survives restarts
- [ ] All named invites in PostgreSQL SDK
- [ ] All PINs stored as bcrypt hashes

**Phase 3 (P2) Complete When:**
- [ ] Reconnect re-syncs participants
- [ ] Tab updates < 500ms lag
- [ ] All rapid notifications visible
- [ ] Declined invites show visual feedback

---

## TIMELINE SUMMARY

| Phase | Duration | Priority | Tasks |
|-------|----------|----------|-------|
| Phase 1 | 8 hours | P0 | 5 deployment blockers |
| Phase 2 | 8 hours | P1 | 4 security/data bugs |
| Phase 3 | 4 hours | P2 | 4 UX improvements |
| Phase 4 | 4 hours | Testing | Integration + manual tests |
| **Total** | **24 hours** | **3 days** | **13 bugs fixed** |

**Remaining bugs (defer to Phase 5):**
- BUG #2, #4, #5, #6, #8, #14, #15, #20, #22 (9 bugs - MEDIUM/LOW priority)

---

## NEXT STEPS

1. **Review this plan** - Confirm priorities and timeline
2. **Set up test environment** - Production-like Docker setup
3. **Create feature branch** - `fix/production-bugs-phase-1-p0`
4. **Start Phase 1** - Fix P0 deployment blockers
5. **Daily standups** - Review progress, adjust timeline

**Questions before starting:**
- Database migration timing? (off-hours vs. maintenance window)
- Feature flag strategy? (gradual rollout vs. all-at-once)
- Rollback trigger? (what error rate triggers rollback)

---

**Author:** Claude Code
**Date:** 2026-04-27
**Status:** READY FOR REVIEW
**Estimated Completion:** 2026-04-30 (3 days from now)
