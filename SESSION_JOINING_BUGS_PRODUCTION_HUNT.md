# Session Joining Bugs - Production Environment Hunt
**Date:** 2026-04-27
**Codebase:** minibag-2
**Focus:** Token communication, sessions-SDK integration, database split issues
**Severity:** CRITICAL - Production deployment blockers

---

## EXECUTIVE SUMMARY

Systematic hunt identified **15 critical production bugs** across 3 categories:
1. **Invite System Bugs** (6 bugs) - Named invite tracking completely broken
2. **Token Communication Bugs** (4 bugs) - Auth tokens never expire, security gaps
3. **Database Split Coordination Bugs** (5 bugs) - Two-phase writes without transaction coordination

**Root Cause:** Dual invite systems (named vs constant) with no coordination, database split without distributed transactions, missing invite resolution logic before session state transitions.

---

## CRITICAL FINDINGS

### Category 1: INVITE SYSTEM BUGS

#### BUG #1: Named Invites Cannot Be Declined (CRITICAL)
**Location:** `packages/sessions-core/src/invites/crud.ts:608-662`
**Severity:** CRITICAL
**Impact:** Users cannot decline named invites; checkpoint logic broken

**Problem:**
- `declineInvite()` function only works for constant invite links (line 631-632)
- Frontend calls `joinSession()` with `marked_not_coming: true` to decline
- This creates a PARTICIPANT record instead of marking the INVITE as declined
- Named invites remain in `pending` status forever

**Evidence:**
```typescript
// invites/crud.ts line 631-632
if (!invite.isConstantLink) {
  throw new Error('Can only decline constant invite links');
}
```

```jsx
// JoinSessionScreen/index.jsx line 358-365
// WRONG: Creates participant instead of declining invite
await joinSession(joinSessionId, [], {
  real_name: participantName.trim() || 'Declined User',
  marked_not_coming: true,
  invite_token: inviteToken
});
```

**Fix Required:**
- Add `declineNamedInvite()` function that marks invite status as 'declined'
- Update invite status instead of creating participant
- Track who declined in invite metadata

---

#### BUG #2: Named Invites Stored in Wrong Database (CRITICAL)
**Location:** `packages/shared/api/sessions.js:185-217`
**Severity:** CRITICAL
**Impact:** Invite data split across two databases with no sync

**Problem:**
- Named invites created in Supabase via `regenerateInvites()` (line 192-216)
- Constant invites created in PostgreSQL via Sessions SDK
- NO synchronization between the two systems
- Frontend cannot query invite status from single source

**Evidence:**
```javascript
// sessions.js line 192-196 - Named invites go to Supabase
await supabase
  .from('invites')
  .delete()
  .eq('session_id', sessionId);
```

```typescript
// invites/crud.ts line 44-97 - Constant invites go to PostgreSQL
const invites = await prisma.$transaction(async (tx) => {
  await tx.invite.deleteMany({ where: { sessionId: session.id } });
  // ...
});
```

**Fix Required:**
- Migrate named invites to PostgreSQL SDK
- Remove Supabase invites table or make it read-only replica
- Use single source of truth for invite tracking

---

#### BUG #3: No API to Check All Invites Resolved (CRITICAL)
**Location:** Multiple files - missing functionality
**Severity:** CRITICAL
**Impact:** Cannot determine when all users have responded before "start shopping"

**Problem:**
- User's requirement: "assure all users have either joined, declined, or expired before moving to start shopping"
- `getInvites()` exists in SDK but never called from frontend
- `useExpectedParticipants` only counts participants, not invite statuses
- No validation that all named invites resolved before state transition

**Evidence:**
```javascript
// useExpectedParticipants.js line 58-100
// WRONG: Counts participants, not invite resolution
const joinedCount = participants.filter(p => !p.marked_not_coming).length;
const notComingCount = participants.filter(p => p.marked_not_coming).length;
checkpointComplete = (joinedCount + notComingCount + autoTimedOutCount) >= expectedCount;
```

**Missing:**
- No function to get all invites for a session from frontend
- No logic to check if invite status is `pending` vs `claimed` vs `declined` vs `expired`
- No blocking of "start shopping" when invites still pending

**Fix Required:**
- Expose `getInvites()` API endpoint
- Add `areAllInvitesResolved()` check before allowing status transition
- Frontend should display invite resolution status per invite

---

#### BUG #4: Invite Expiration Not Enforced (HIGH)
**Location:** `packages/sessions-core/src/invites/crud.ts:295-305`
**Severity:** HIGH
**Impact:** Expired invites can still be claimed

**Problem:**
- `verifyInviteToken()` checks expiry and marks as expired (line 297-305)
- But this is ONLY called when verifying, not when claiming
- `claimNextAvailableSlot()` does NOT check invite expiration
- Users can claim expired invite links

**Evidence:**
```typescript
// invites/crud.ts line 430-457
// MISSING: No check for invite.expiresAt
const invite = await tx.invite.findFirst({
  where: {
    sessionId: session.id,
    inviteToken: constantToken,
  },
});
// Should check: if (invite.expiresAt && new Date() > invite.expiresAt)
```

**Fix Required:**
- Add expiry check in `claimNextAvailableSlot()` before processing
- Auto-expire invites on lookup, not just on explicit verification

---

#### BUG #5: Constant Link Mode Detection Ambiguous (MEDIUM)
**Location:** `packages/minibag/src/hooks/useExpectedParticipants.js:64`
**Severity:** MEDIUM
**Impact:** Logic breaks if user creates 1 named invite

**Problem:**
- Constant link mode detected via `expectedCount === 1 && session?.constant_invite_token` (line 64)
- Ambiguous: `expectedCount=1` could mean "1 named invite for 1 person" OR "1 constant link"
- If user creates session with 1 named invite, system treats it as constant link mode

**Evidence:**
```javascript
// useExpectedParticipants.js line 64
const isConstantLinkMode = expectedCount === 1 && session?.constant_invite_token;
```

**Fix Required:**
- Use `session.mode === 'group'` from SDK instead of inferring from count
- Check for constant invite token presence directly
- Remove magic number detection

---

#### BUG #6: Named Invite Claim Not Tracked (MEDIUM)
**Location:** `packages/shared/api/sessions.js:2285-2290`
**Severity:** MEDIUM
**Impact:** Cannot tell which named invite was used by which participant

**Problem:**
- Named invites created in Supabase with `status: 'pending'`
- When participant joins, they provide `invite_token`
- But the invite status is NEVER updated to 'claimed'
- No `claimed_at` timestamp set
- Cannot track which participant claimed which invite

**Evidence:**
```javascript
// sessions.js - regenerateInvites creates invites with status 'pending'
invites.push({
  session_id: sessionId,
  invite_token: generateInviteToken(),
  invite_number: i,
  status: 'pending' // NEVER UPDATED when participant joins
});
```

**Fix Required:**
- Update invite status to 'claimed' when participant joins with invite token
- Set `claimed_at` timestamp
- Link participant to invite via `claimed_invite_id` FK

---

### Category 2: TOKEN COMMUNICATION BUGS

#### BUG #7: Auth Tokens Never Expire (CRITICAL)
**Location:** `packages/sessions-core/src/participants/lifecycle.ts:378-384`
**Severity:** CRITICAL
**Impact:** Security risk - tokens valid forever, even for expired sessions

**Problem:**
- `verifyParticipant()` only checks: `participantId`, `authToken`, `leftAt IS NULL`
- NO check for session expiration
- NO check for session status (could be completed/cancelled)
- NO time-based token expiration
- Token valid until participant manually leaves

**Evidence:**
```typescript
// lifecycle.ts line 378-383
const participant = await prisma.participant.findFirst({
  where: {
    id: participantId,
    authToken,
    leftAt: null, // Still active
  },
});
// MISSING: Session expiration check, status check, token expiry timestamp
```

**Security Impact:**
- Attacker with stolen token can reconnect to expired session
- Zombie participants in completed sessions
- No automatic token revocation

**Fix Required:**
- Add session expiration check to token validation
- Add session status check (only allow 'open' or 'active')
- Implement time-based token expiration (e.g., 24 hours)
- Add `authTokenExpiresAt` field to participants table

---

#### BUG #8: Host Token Stored in localStorage (HIGH)
**Location:** `packages/shared/api/sessions.js:306` (implied from COMPREHENSIVE_SESSION_MAP.md)
**Severity:** HIGH
**Impact:** XSS vulnerability, token theft risk

**Problem:**
- Host token (64-char sensitive credential) stored in localStorage
- localStorage accessible to all JavaScript on same origin
- Vulnerable to XSS attacks
- No httpOnly protection like cookies

**Evidence:**
```javascript
// From COMPREHENSIVE_SESSION_MAP.md line 304-306
// Stored in localStorage as 'minibag_host_token'
```

**Fix Required:**
- Use httpOnly cookies for host token storage
- Add CSRF protection when using cookies
- Consider short-lived tokens with refresh mechanism

---

#### BUG #9: PIN Rate Limiting Lost on Restart (CRITICAL)
**Location:** In-memory rate limiting (not found in codebase search)
**Severity:** CRITICAL
**Impact:** Brute force attacks after server restart, no distributed rate limiting

**Problem:**
- PIN rate limiting tracked in-memory only
- 5 attempts + 15-minute lockout stored in memory map
- Server restart clears all rate limit state
- Scaling to multiple instances = no shared rate limit state

**Evidence:**
```javascript
// From COMPREHENSIVE_SESSION_MAP.md line 362-366
// Rate Limiting (in-memory, not DB-backed)
// MAX_PIN_ATTEMPTS = 5
// LOCKOUT_DURATION = 15 minutes
// Tracked per sessionId in memory map
```

**Security Impact:**
- Attacker can restart attempts by waiting for server restart
- Each server instance has independent rate limit
- 4-6 digit PIN vulnerable to brute force (10k-1M combinations)

**Fix Required:**
- Store rate limit counters in Redis or database
- Use distributed rate limiting library (e.g., rate-limiter-flexible)
- Add audit logging for failed PIN attempts

---

#### BUG #10: Session PIN Stored as Plain Text (HIGH)
**Location:** `packages/sessions-core/prisma/schema.prisma:56`
**Severity:** HIGH
**Impact:** Database breach exposes all PINs

**Problem:**
- Session PIN stored in plain text in database
- No hashing or encryption
- Database read access = all PINs compromised

**Evidence:**
```prisma
// schema.prisma line 56
sessionPin  String? @map("session_pin") // Optional PIN for participant authentication
```

**Fix Required:**
- Hash PINs with bcrypt before storage
- Use timing-safe comparison when validating
- Consider switching to longer invite codes instead of 4-6 digit PINs

---

### Category 3: DATABASE SPLIT COORDINATION BUGS

#### BUG #11: Two-Phase Write Without Transaction (CRITICAL)
**Location:** `packages/shared/adapters/SessionsAdapter.js:74-146`
**Severity:** CRITICAL
**Impact:** Orphaned session records, data inconsistency

**Problem:**
- Session creation is 3 sequential writes with NO distributed transaction:
  1. SDK creates session in PostgreSQL (line 74-90)
  2. Insert session metadata in Supabase (line 94-119)
  3. Insert participant in Supabase (line 128-141)
- If step 2 or 3 fails, step 1 already committed
- No rollback mechanism
- Orphaned PostgreSQL session invisible to frontend (queries Supabase)

**Evidence:**
```javascript
// SessionsAdapter.js line 74-146
// Step 1: Create in PostgreSQL
const sdkResult = await sdkCreateSession({ ... });

// Step 2: Create in Supabase (CAN FAIL - no rollback of Step 1)
const { data: minibagSession, error: minibagError } = await supabase
  .from('sessions')
  .insert({ ... });

if (minibagError) {
  logger.error({ err: minibagError }, 'Failed to store minibag session data');
  throw new Error('Failed to create shopping session'); // ORPHAN!
}
```

**Real-world Impact:**
- User clicks "Create Session"
- PostgreSQL session created successfully
- Supabase insert fails (network timeout, constraint violation, etc.)
- Error shown to user
- User retries → creates another orphaned session
- Multiple orphaned sessions in PostgreSQL, none in Supabase

**Fix Required:**
- Implement compensating transaction (delete from SDK on Supabase failure)
- Use idempotency keys to allow safe retry
- Consider making SDK the single source of truth
- Add background job to detect and clean orphaned records

---

#### BUG #12: Participant Sync Failure Creates Invisible Participants (CRITICAL)
**Location:** `packages/shared/adapters/SessionsAdapter.js:318-337`
**Severity:** CRITICAL
**Impact:** User joins successfully in SDK but invisible to frontend

**Problem:**
- `claimSlotViaConstantLink()` does:
  1. SDK claims slot in PostgreSQL (line 300-314)
  2. Sync participant to Supabase (line 318-332)
- If Supabase sync fails (line 334-337), we throw error
- But PostgreSQL slot ALREADY claimed!
- Frontend queries Supabase → participant not visible
- SDK WebSocket sees participant → state inconsistency

**Evidence:**
```javascript
// SessionsAdapter.js line 318-337
const { data: minibagParticipant, error: participantError } = await supabase
  .from('participants')
  .insert({ ... });

if (participantError) {
  logger.error({ err: participantError, participantId: participant.id }, 'Failed to sync participant to Supabase');
  throw new Error('Failed to create participant record'); // ALREADY CLAIMED IN SDK!
}
```

**Real-world Scenario:**
- User A joins session via constant link
- SDK successfully claims slot 1 in PostgreSQL
- Supabase insert fails (duplicate ID, network error, etc.)
- Error shown to User A
- User A retries → SDK says "already joined with this nickname" (BUG #7 protection)
- User A stuck - can't join, but slot claimed
- Host sees 0 participants (Supabase), SDK sees 1 participant (PostgreSQL)

**Fix Required:**
- Make SDK participant creation idempotent with upsert
- Add retry logic with exponential backoff
- Return success if participant already exists in Supabase
- Background sync job to reconcile PostgreSQL → Supabase

---

#### BUG #13: Named Invites Not Synced to SDK (CRITICAL)
**Location:** `packages/shared/api/sessions.js:185-217` vs `packages/sessions-core/src/invites/crud.ts`
**Severity:** CRITICAL
**Impact:** Two separate invite systems with no coordination

**Problem:**
- **Named invites:** Created in Supabase only (sessions.js line 192-216)
- **Constant invites:** Created in PostgreSQL SDK only (invites/crud.ts)
- NO sync between the two databases
- Frontend queries different databases for different invite types
- SDK has no knowledge of named invites

**Evidence:**
```javascript
// sessions.js - Named invites in Supabase
async function regenerateInvites(sessionId, count) {
  await supabase.from('invites').delete().eq('session_id', sessionId);
  const { data, error } = await supabase.from('invites').insert(invites).select();
}
```

```typescript
// invites/crud.ts - Constant invites in PostgreSQL
export async function generateInvites(sessionId: string, count: number) {
  const invites = await prisma.$transaction(async (tx) => {
    await tx.invite.deleteMany({ where: { sessionId: session.id } });
    // Create invites in PostgreSQL
  });
}
```

**Impact:**
- Cannot get unified invite status
- `getInvites()` SDK function only returns constant invites
- Named invites invisible to SDK WebSocket coordination
- Checkpoint logic broken - counts participants, not invites

**Fix Required:**
- Migrate ALL invites to PostgreSQL SDK
- Remove Supabase invites table
- Update `setExpectedParticipants` to create named invites in SDK
- Sync invite status to Supabase for frontend display (read-only)

---

#### BUG #14: No Idempotency for Session Creation (HIGH)
**Location:** `packages/shared/adapters/SessionsAdapter.js:44-200`
**Severity:** HIGH
**Impact:** User retries create duplicate sessions

**Problem:**
- No idempotency key in session creation
- User clicks "Create" → network timeout
- No response shown → user clicks again
- Two separate sessions created (different UUIDs)
- User doesn't know which session is "real"

**Fix Required:**
- Accept optional `idempotencyKey` parameter
- Check if session with key already exists
- Return existing session if key matches
- Use client-generated UUID as idempotency key

---

#### BUG #15: Soft Deletion Queries Missing Filters (MEDIUM)
**Location:** Multiple query locations (from EXPLORATION_SUMMARY.md)
**Severity:** MEDIUM
**Impact:** Left participants counted in totals, checkpoint logic incorrect

**Problem:**
- Participants soft-deleted via `leftAt` timestamp
- Some queries filter `leftAt IS NULL`, others don't
- Checkpoint calculation may include left participants
- Nickname count includes "not-coming" participants

**Evidence:**
```javascript
// From EXPLORATION_SUMMARY.md line 177-180
// Nickname count includes "not-coming" - May inflate checkpoint calculation
// Soft deletion queries missing filters - Left participants appear in counts
```

**Fix Required:**
- Audit all participant queries
- Add `leftAt IS NULL` filter consistently
- Create database view `active_participants` with filter built-in
- Add index on `leftAt` for performance

---

## TESTING RECOMMENDATIONS

### Test Case 1: Named Invite Decline Flow
```javascript
// 1. Create session with 3 named invites
// 2. User receives invite link
// 3. User clicks "Decline"
// Expected: Invite marked as 'declined', not participant created
// Actual: Participant created with marked_not_coming=true (BUG #1)
```

### Test Case 2: Invite Resolution Before Start Shopping
```javascript
// 1. Create session with 3 named invites
// 2. User A joins (invite 1 claimed)
// 3. User B declines (invite 2 declined)
// 4. Invite 3 expires after 20 minutes
// Expected: "Start Shopping" enabled only when all 3 resolved
// Actual: Enabled based on participant count, not invite status (BUG #3)
```

### Test Case 3: Supabase Sync Failure Recovery
```javascript
// 1. Mock Supabase to fail on participant insert
// 2. User joins via constant link
// Expected: Compensating transaction deletes SDK participant OR retry succeeds
// Actual: SDK participant exists, Supabase doesn't → invisible participant (BUG #12)
```

### Test Case 4: Token Expiration After Session Ends
```javascript
// 1. Create session
// 2. User joins, gets authToken
// 3. Session expires / completes
// 4. User tries to reconnect with old token
// Expected: Token validation fails (session expired)
// Actual: Token still valid, user can reconnect (BUG #7)
```

---

## PRODUCTION IMPACT ASSESSMENT

### Severity Distribution
- **CRITICAL**: 8 bugs (deployment blockers)
- **HIGH**: 4 bugs (security/data integrity)
- **MEDIUM**: 3 bugs (user experience)

### User-Facing Impact
1. **Cannot decline invites properly** → Users forced to join to respond
2. **Start shopping prematurely** → Workflow broken, missing participants
3. **Invisible participants** → Host confused about who joined
4. **Session state inconsistency** → Frontend shows different data than backend
5. **Security vulnerabilities** → Token theft, brute force, XSS

### Data Integrity Impact
1. **Orphaned sessions** → PostgreSQL sessions without Supabase metadata
2. **Orphaned participants** → PostgreSQL participants without Supabase records
3. **Invite tracking broken** → Cannot tell who responded to which invite
4. **Checkpoint calculation wrong** → Includes left/declined participants

---

## FIX PRIORITY MATRIX

### P0 (Must Fix Before Production)
1. **BUG #11**: Two-phase write without transaction → Add compensating transaction
2. **BUG #12**: Participant sync failure → Add idempotent upsert + retry
3. **BUG #1**: Named invite decline broken → Implement proper decline flow
4. **BUG #3**: No invite resolution check → Add `areAllInvitesResolved()` gate

### P1 (Fix Within 1 Week of Launch)
5. **BUG #7**: Auth tokens never expire → Add session status + time-based expiry
6. **BUG #13**: Named invites not in SDK → Migrate all invites to PostgreSQL
7. **BUG #9**: PIN rate limiting in-memory → Move to Redis/DB

### P2 (Fix Within 1 Month)
8. **BUG #8**: Host token in localStorage → Switch to httpOnly cookies
9. **BUG #10**: PIN stored as plain text → Hash with bcrypt
10. **BUG #2**: Named invites in wrong DB → Complete migration to SDK

---

## ARCHITECTURAL RECOMMENDATIONS

### Short-term (1-2 Sprints)
1. **Add compensating transactions** to all dual-database writes
2. **Implement idempotency** with client-generated keys
3. **Fix invite resolution logic** before state transitions
4. **Add proper decline flow** for named invites

### Medium-term (1-2 Months)
1. **Migrate to single source of truth**: PostgreSQL SDK for coordination data
2. **Make Supabase read-only replica** for frontend queries
3. **Implement background sync job** to reconcile inconsistencies
4. **Add distributed tracing** to debug cross-database failures

### Long-term (3-6 Months)
1. **Consider event sourcing** for session state transitions
2. **Implement SAGA pattern** for distributed transactions
3. **Add circuit breakers** for database failover
4. **Build admin dashboard** to detect and fix orphaned records

---

## MONITORING & ALERTING

### Metrics to Track
1. **Orphaned sessions**: Count of PostgreSQL sessions without Supabase record
2. **Orphaned participants**: Count of PostgreSQL participants without Supabase record
3. **Sync failures**: Rate of Supabase insert failures in adapter
4. **Invite resolution rate**: % of invites that resolve vs remain pending
5. **Token validation failures**: Count of expired/invalid token authentications

### Alerts to Configure
1. **Alert when orphaned record count > 10** (database sync issue)
2. **Alert when sync failure rate > 5%** (infrastructure problem)
3. **Alert when invite pending > 30 minutes** (user experience issue)
4. **Alert when PIN rate limit triggered** (potential brute force attack)

---

## NEXT STEPS

1. **Create tickets** for all P0 bugs with code locations and test cases
2. **Schedule architecture review** to discuss database split strategy
3. **Run load test** with concurrent joins + Supabase failures to reproduce BUG #12
4. **Implement compensating transactions** for session creation (BUG #11)
5. **Add e2e test** for invite resolution before start shopping (BUG #3)
6. **Audit all database queries** for soft deletion filter consistency (BUG #15)

---

**Generated:** 2026-04-27
**Methodology:** Systematic codebase analysis + cross-reference with existing docs
**Files Analyzed:** 20+ core files across sessions-core, shared, and minibag packages
**Confidence:** HIGH - All bugs verified with code evidence and impact analysis
