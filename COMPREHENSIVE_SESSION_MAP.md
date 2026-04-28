# Minibag-2 Session Joining Flow - Comprehensive Analysis Map

**Date:** 2026-04-27  
**Focus:** Production environment concerns - connection handling, token lifecycle, session state management, database coordination  
**Status:** VERY THOROUGH EXPLORATION - All critical paths mapped

---

## TABLE OF CONTENTS

1. [Session Joining Flow Diagram](#session-joining-flow-diagram)
2. [Token Communication Touchpoints](#token-communication-touchpoints)
3. [Sessions-SDK Integration Points](#sessions-sdk-integration-points)
4. [Database Split Architecture](#database-split-architecture)
5. [Potential Bug Hotspots](#potential-bug-hotspots)
6. [Error Handling & Gaps](#error-handling--gaps)
7. [Race Conditions & State Management](#race-conditions--state-management)

---

## Session Joining Flow Diagram

### HIGH-LEVEL END-TO-END FLOW

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      BROWSER (Vercel Frontend)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. User navigates to /join/{sessionId}?token={constantInviteToken}   │
│  2. UI Component: JoinSessionScreen renders                           │
│  3. User selects nickname (getTwoNicknameOptions call)               │
│     ↓ nicknames reserved for 5 minutes via nicknamesPool            │
│  4. User selects avatar emoji                                        │
│  5. User clicks "Join"                                               │
│     ↓                                                                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ POST /api/sessions/{sessionId}/join
                                    │ Body: {items, real_name, nickname, avatar, invite_token}
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                  API LAYER (Vercel Functions / Express)                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  packages/shared/api/sessions.js :: joinSession()                     │
│  ├─ [1] Extract & validate request data                              │
│  ├─ [2] Query Supabase: Session lookup by sessionId                 │
│  ├─ [3] Check session status (open, expired, full)                  │
│  ├─ [4] Validate PIN (if required)                                 │
│  │   └─ Rate limiting: max 5 attempts, 15-min lockout             │
│  ├─ [5] Route to SDK or Legacy path:                              │
│  │   ├─ IF USE_SESSIONS_SDK=true:                                 │
│  │   │  └─ Call: createSessionWithSDK()                           │
│  │   │     └─ Route to: SessionsAdapter.joinShoppingSession()     │
│  │   └─ ELSE:                                                     │
│  │      └─ Legacy joinSession() logic                             │
│  └─ [6] Return response with:                                      │
│      ├─ participant (id, nickname, avatar, authToken)             │
│      ├─ session (id, sessionId, status, participants)             │
│      └─ authToken (for WebSocket auth)                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ↓ SDK Path                      ↓ Legacy Path
┌──────────────────────────────────┐    ┌──────────────────────────────┐
│  SessionsAdapter                 │    │  Legacy joinSession()        │
│  .joinShoppingSession()          │    │  (Supabase only)            │
│  ├─ claimNextAvailableSlot()    │    │  ├─ Supabase transaction    │
│  │ (Sessions SDK)              │    │  │  ├─ Create participant  │
│  │ ├─ [CRITICAL-3] Tx START   │    │  │  ├─ Update items       │
│  │ ├─ Lock session row (FOR    │    │  │  └─ Return data        │
│  │ │  UPDATE)                  │    │  └─ Limited validation     │
│  │ ├─ Count participants       │    └──────────────────────────────┘
│  │ ├─ Check maxParticipants    │
│  │ ├─ Claim nickname (atomic)  │
│  │ ├─ Create participant       │
│  │ └─ [CRITICAL-3] Tx COMMIT   │
│  ├─ Insert minibag session     │
│  └─ Return authToken           │
└──────────────────────────────────┘
       │
       ↓ SDK Response: {session, participant, authToken}
       │
       └──→ Minibag Shopping Session created
           ├─ PostgreSQL (Sessions SDK): Session + Participant
           └─ Supabase: Shopping metadata (location, items, etc.)
```

### DETAILED SDK PATH (claimNextAvailableSlot)

**File:** `packages/sessions-core/src/invites/crud.ts` lines 386-520

```
claimNextAvailableSlot({sessionId, inviteToken, nicknameId, nickname, avatar})
│
├─ [1] Validate inputs
│   └─ sessionId (UUID), inviteToken (string), nickname pool ID
│
├─ [2] Get invite by token
│   └─ Query: invites WHERE sessionId AND inviteToken
│      └─ CRITICAL-BUG-FIX #6: Direct FK lookup, not nested relation
│
├─ [3] SELECT FOR UPDATE (row-level lock)
│   └─ CRITICAL-BUG-FIX #1: Lock session to serialize concurrent joins
│      └─ Prevents: Multiple joins exceeding maxParticipants
│
├─ [4] Check participant limit
│   ├─ Query: COUNT participants WHERE sessionId AND leftAt IS NULL
│   ├─ Compare: currentCount vs maxParticipants
│   └─ CRITICAL-BUG-FIX: Limit check inside transaction guarantees atomicity
│
├─ [5] Calculate dynamic slot number
│   └─ slotNumber = currentCount + 1
│
├─ [6] Claim nickname (ATOMIC within transaction)
│   ├─ CRITICAL-BUG-FIX #2: Inline within transaction (not separate call)
│   ├─ UPDATE nicknamesPool:
│   │  ├─ WHERE: id=nicknameId AND isAvailable=true AND (reservedUntil < now OR null)
│   │  ├─ SET: isAvailable=false, currentlyUsedIn=sessionId, timesUsed++
│   │  └─ Error: "Nickname already claimed" (TOCTOU race condition fixed)
│   └─ If nicknameId starts with "fallback-": skip DB claim
│
├─ [7] Create participant
│   ├─ INSERT INTO participants:
│   │  ├─ sessionId, nickname, avatarEmoji, realName
│   │  ├─ authToken (token-based WebSocket auth - CRITICAL-1 fix)
│   │  ├─ isCreator=false
│   │  ├─ claimedInviteId (link to invite for tracking)
│   │  └─ joinedAt=NOW()
│   └─ CRITICAL-BUG-FIX #7: Check for existing participant with same nickname
│       └─ Prevents: User retrying & claiming multiple slots
│
├─ [8] Update invite with slot assignment
│   ├─ UPDATE invites:
│   │  ├─ SET slotAssignments = [{slotNumber, participantId, nickname, claimedAt}]
│   │  └─ Status = 'claimed' (if all slots filled)
│   └─ For group mode: tracks who claimed which invite
│
└─ [9] TRANSACTION COMMIT
    └─ ALL-OR-NOTHING: Nickname + Participant + Invite all succeed or all rollback
```

### WEBSOCKET AUTHENTICATION & ROOM JOIN

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    BROWSER (Socket.IO Client)                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. API response received: {authToken, participantId}                 │
│  2. Socket connection established via socket.js                       │
│     └─ io(SOCKET_URL, {reconnection, transports})                   │
│  3. Wait for socket 'connect' event                                  │
│  4. Emit 'authenticate' event:                                       │
│     {                                                                 │
│       participantId: "uuid",                                         │
│       authToken: "64-hex-string"                                    │
│     }                                                                 │
│  5. Wait for 'authenticated' response (or 'authentication-error')   │
│  6. Socket.data.authenticated = true (token stored on server)       │
│  7. Emit 'join-session' event:                                      │
│     {                                                                 │
│       sessionId: "abc123"  // SHORT session ID, not UUID             │
│     }                                                                 │
│  8. Wait for 'joined-session' confirmation (5 sec timeout)          │
│     └─ Response: {sessionId, participantCount}                      │
│  9. Socket successfully joined room (broadcasts)                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                 WEBSOCKET SERVER (Socket.IO - Render)                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  packages/sessions-core/src/websocket/handlers.ts :: setupSocketHandlers
│                                                                         │
│  AUTHENTICATE Event:                                                   │
│  ├─ Call: authenticateSocket({participantId, authToken})             │
│  │  ├─ Verify participant auth token (CRITICAL-2 fix)               │
│  │  ├─ Query DB: SELECT * FROM participants                         │
│  │  │  WHERE id=participantId AND authToken=token AND leftAt IS NULL
│  │  └─ Return: {participantId, sessionId, nickname}                 │
│  ├─ Emit: 'authenticated' → {participantId, sessionId}              │
│  └─ socket.data.authenticated = true                                │
│     socket.data.participantId = participantId                       │
│     socket.data.sessionId = sessionId                               │
│                                                                         │
│  JOIN-SESSION Event:                                                   │
│  ├─ Extract sessionId from payload                                   │
│  ├─ socket.join(sessionId) - add socket to room                     │
│  ├─ Get room size: io.sockets.adapter.rooms.get(sessionId)         │
│  ├─ Emit: 'joined-session' → {sessionId, participantCount}         │
│  └─ Broadcast 'user-joined' to room                                │
│                                                                         │
│  PARTICIPANT-JOINED Event (from client):                             │
│  ├─ Payload: {sessionId, participant}                              │
│  ├─ Broadcast to room: io.to(sessionId).emit()                     │
│  └─ All clients in room receive update (real-time)                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ WebSocket broadcasts
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│               ALL CONNECTED CLIENTS (Real-Time Updates)                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  socketService.onParticipantJoined((participant) => {               │
│    setParticipants(prev => [...prev, participant])                 │
│  })                                                                   │
│                                                                         │
│  UI updates in real-time:                                            │
│  ├─ Participant list grows                                          │
│  ├─ Checkpoint calculation updates                                  │
│  └─ "All participants joined" trigger (if applicable)              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Token Communication Touchpoints

### 1. AUTH TOKEN GENERATION (Participant)

**Location:** `packages/sessions-core/src/utils/generators.ts` lines 32-40

```typescript
generateAuthToken(): string {
  // 32 bytes = 64 hex chars
  // Cryptographically secure via crypto.randomBytes()
  // Used for WebSocket authentication (CRITICAL-1 fix: replaces cookies)
}
```

**Generation timing:** When participant joins session
**Lifecycle:**
- Created: `joinSession()` or `createSession()` in lifecycle.ts
- Stored: `authToken` column in `participants` table
- Transmitted: API response → browser localStorage (optional)
- Used: WebSocket 'authenticate' event
- Verified: `verifyParticipant()` - checks participantId + authToken match in DB
- Invalidated: When participant leaves (leftAt timestamp set)

**Storage locations:**
- Database: PostgreSQL `participants.auth_token`
- Client: JavaScript memory (socket connection)
- localStorage: Optional (for cross-domain auth fallback)

**Communication paths:**
```
1. API Response (POST /api/sessions/{sessionId}/join)
   └─ HTTP 200 OK
      └─ {participant: {id, authToken, ...}, ...}
      └─ Browser stores in memory

2. WebSocket Emit (client)
   └─ socket.emit('authenticate', {participantId, authToken})
   └─ Unencrypted (relies on WSS/TLS)

3. Database Query (server)
   └─ SELECT authToken FROM participants WHERE id = {participantId}
```

**Security concerns:**
- Token length: 64 chars (256 bits) - sufficient
- Transmission: Over HTTPS/WSS (encrypted)
- Storage: Memory + DB only (no cookies needed)
- Validation: Server-side only (CRITICAL-2 fix)
- No expiration: Token valid until participant leaves

---

### 2. HOST TOKEN (Session Host Authentication)

**Location:** `packages/sessions-core/src/utils/generators.ts` lines 22-30

```typescript
generateHostToken(): string {
  // 32 bytes = 64 hex chars
  // Used to authenticate host for session status updates
}
```

**Generation timing:** When session is created
**Lifecycle:**
- Created: `createSession()` in sessions/crud.ts
- Stored: `hostToken` column in `sessions` table
- Transmitted: API response + localStorage
- Used: HTTP requests for host-only actions
  - `PUT /api/sessions/{sessionId}/status` - requires Bearer token
  - `DELETE /api/sessions/{sessionId}` - requires Bearer token
- Invalidated: Never (valid for lifetime of session)

**Communication paths:**
```
1. API Response (POST /api/sessions/create)
   └─ {session: {id, hostToken, ...}, ...}
   └─ Stored in localStorage as 'minibag_host_token'

2. API Requests (subsequent)
   └─ Authorization: Bearer {hostToken}
   └─ Header injection in apiFetch()
   └─ OR credentials: 'include' (httpOnly cookie for same-domain)

3. Database Query (server)
   └─ SELECT hostToken FROM sessions WHERE sessionId = {sessionId}
   └─ Compare with request header/cookie
```

**Security concerns:**
- Token length: 64 chars (256 bits) - sufficient
- Transmission: Over HTTPS only
- Storage: localStorage (XSS vulnerable) + cookie (httpOnly preferred)
- Validation: String comparison (no cryptographic verification)
- Cross-domain: localStorage fallback for Vercel→Render requests
- No refresh: Token doesn't expire (session expiry is time-based)

---

### 3. SESSION PIN (Optional Participant Authentication)

**Location:** `packages/sessions-core/src/utils/generators.ts` lines 43-61

```typescript
generateSessionPin(length = 4): string {
  // 4-6 digits (10^4 to 10^6 combinations)
  // Cryptographically secure via crypto.randomInt()
  // Used for participant PIN-based access control
}
```

**Generation timing:** Optional, at session creation
**Lifecycle:**
- Created: Optional parameter in createSession()
- Stored: `sessionPin` column in `sessions` table (plain text)
- Transmitted: User shares via messaging/QR code (out-of-band)
- Used: `POST /api/sessions/{sessionId}/join` requires PIN in body
- Validated: String comparison (rate-limited: 5 attempts, 15-min lockout)
- Invalidated: When session expires

**Communication paths:**
```
1. User receives PIN (out-of-band)
   └─ SMS, QR code scan, verbal share

2. API Request (POST /api/sessions/{sessionId}/join)
   └─ Body: {session_pin: "1234", ...}
   └─ Sent over HTTPS

3. Database Query (server)
   └─ SELECT session_pin FROM sessions WHERE sessionId = {sessionId}
   └─ Timing-safe comparison needed (but currently string compare)

4. Rate Limiting (in-memory, not DB-backed)
   └─ MAX_PIN_ATTEMPTS = 5
   └─ LOCKOUT_DURATION = 15 minutes
   └─ Tracked per sessionId in memory map
```

**Security concerns:**
- Strength: 4-6 digits = weak (10,000 to 1 million combinations)
  - Vulnerable to brute force (5 attempts + 15 min lockout helps)
- Transmission: Over HTTPS (encrypted)
- Storage: Plain text in DB (no hashing)
- Validation: String comparison (vulnerable to timing attacks)
- Rate limiting: In-memory (lost on server restart, no distributed tracking)
- No audit: Failed/successful attempts not logged

---

### 4. CONSTANT INVITE TOKEN (Group Mode Shareable Link)

**Location:** `packages/sessions-core/src/utils/generators.ts` lines 94-107

```typescript
generateConstantInviteToken(): string {
  // 16 hex chars (8 bytes = 2^64 combinations)
  // Different from named invites (8 chars) to distinguish link type
  // Used for shareable group mode invite links
}
```

**Generation timing:** Only in group mode at session creation
**Lifecycle:**
- Created: In `createSession()` when mode='group'
- Stored: `constantInviteToken` in `sessions` table (unique constraint)
- Stored: `inviteToken` in `invites` table with `inviteType='constant'`
- Transmitted: URL parameter `/join/{sessionId}?token={constantInviteToken}`
- Used: `claimNextAvailableSlot()` to validate invite is valid
- Validated: Lookup by token → find sessionId → verify session exists
- Invalidated: When session expires

**Communication paths:**
```
1. Host creates group session
   └─ API response includes constantInviteToken

2. Host generates shareable link
   └─ Construct: https://minibag.app/join/{sessionId}?token={constantInviteToken}

3. User receives link (via messaging app, QR code, etc.)
   └─ URL parameter passed to frontend

4. User clicks join
   └─ API Request: POST /api/sessions/{sessionId}/join
     └─ Body: {invite_token: constantInviteToken, ...}
     └─ Server validates token matches session

5. Database Query (server)
   └─ SELECT * FROM invites 
      WHERE sessionId=UUID(sessionId) AND inviteToken=token
   └─ CRITICAL-BUG-FIX #6: Direct FK lookup (not nested relation)
```

**Security concerns:**
- Strength: 16 hex chars (2^64 combinations) - moderate
- Brute force: Possible but impractical (16 trillion tries)
- Transmission: URL parameter (logged in browser history, referrer header)
- Sharing: Publicly shareable (by design)
- Expiration: Tied to session expiration (24 hours default)
- Replay: Token reusable until session expires (allows multiple joins)
- No audit: Who claimed which token not tracked in invite record

---

## Sessions-SDK Integration Points

### ARCHITECTURE: Dual-Database Split

```
┌─────────────────────────────────────────────────────────────────┐
│                    SESSIONS SDK (PostgreSQL)                   │
│  - Coordination: sessions, participants, invites, nicknames    │
│  - Real-time: WebSocket state management                       │
│  - Independent: Works without Minibag                          │
│                                                                 │
│  Tables:                                                         │
│  ├─ sessions (id UUID, sessionId text, hostToken, mode)       │
│  ├─ participants (id, sessionId FK, authToken, leftAt)        │
│  ├─ invites (id, sessionId FK, inviteToken, slotAssignments) │
│  ├─ nicknames_pool (id, nickname, isAvailable, reserved*)   │
│  └─ [No shopping-specific tables]                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
       ↑                                                     ↑
       │ Adapter calls                        SDK functions │
       │ (SessionsAdapter.js)                   (TypeScript) │
       │                                                     │
       │                                 packages/sessions-core/src/
       │                                 ├─ sessions/crud.ts
       │                                 ├─ participants/lifecycle.ts
       │                                 ├─ invites/crud.ts
       │                                 ├─ nicknames/*.ts
       │                                 ├─ websocket/*.ts
       │                                 └─ validation/*.ts
       │
┌──────┴──────────────────────────────────────────────────────────┐
│                  MINIBAG (Supabase PostgreSQL)                  │
│  - Shopping: items, payments, bills, catalog                    │
│  - Session metadata: location, schedule, shopping items        │
│  - Separate from SDK coordination                              │
│                                                                 │
│  Tables:                                                         │
│  ├─ sessions (id UUID, session_id text, location, schedule)   │
│  ├─ participants (id, session_id FK, items JSON)              │
│  ├─ items (id, session_id, name, quantity)                    │
│  ├─ payments (id, session_id, amount, method)                 │
│  ├─ catalog (id, name, category, unit_price)                 │
│  └─ [Shopping-specific tables]                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### SESSIONS-SDK FUNCTIONS CALLED BY MINIBAG

**File:** `packages/shared/adapters/SessionsAdapter.js`

```typescript
// 1. CREATE SESSION
sdkCreateSession({
  mode,              // 'solo' | 'group'
  maxParticipants,   // 1 | 4 | 10+ (tier-based)
  creatorNickname,
  creatorAvatarEmoji,
  creatorRealName,
  nicknameId,        // From nickname pool
  expiresInHours,    // Default: 2
  sessionPin,        // Optional
  generatePin        // Auto-generate
})
// Returns: {session, participant, authToken, constantInviteToken, sessionPin}
// Location: packages/sessions-core/src/sessions/crud.ts lines 40-208

// 2. JOIN SESSION (Legacy path - being phased out)
joinSession({
  sessionId: string,    // Short session ID
  nicknameId: string,   // From nickname pool
  nickname: string,
  avatarEmoji: string,
  realName?: string,
  sessionPin?: string   // If required
})
// Returns: {participant, authToken}
// Location: packages/sessions-core/src/participants/lifecycle.ts lines 43-161

// 3. CLAIM NEXT AVAILABLE SLOT (Group mode - NEW SDK path)
claimNextAvailableSlot({
  sessionId: string,     // SHORT session ID
  inviteToken: string,   // Constant or named invite token
  nicknameId: string,    // From nickname pool
  nickname: string,
  avatarEmoji: string,
  realName?: string
})
// Returns: {participant, authToken, slotNumber}
// Location: packages/sessions-core/src/invites/crud.ts lines 386-520
// CRITICAL-BUG-FIXES: #1 (locking), #2 (atomic nickname), #6 (lookup), #7 (dedup)

// 4. GET NICKNAME OPTIONS
getTwoNicknameOptions(
  firstLetter?: string,  // For personalization
  sessionId?: string     // For reservation
)
// Returns: [{id, nickname, avatar_emoji, gender}]
// Location: packages/sessions-core/src/nicknames/reserve.ts lines 90-273
// Features: 5-minute reservation, fallback names, gender matching

// 5. DECLINE INVITE (Group mode - Phase 2 Week 6)
declineInvite({
  sessionId: string,
  inviteToken: string,
  nickname: string,
  avatarEmoji: string
})
// Returns: {success, reason}
// Tracks declined-by in invite.declinedBy JSON array

// 6. LEAVE SESSION
leaveSession(participantId: string)
// Returns: {success, sessionAutoCompleted}
// Soft delete: sets participant.leftAt
// Auto-completes session if all participants left
// Location: packages/sessions-core/src/participants/lifecycle.ts lines 171-248
```

### FEATURE FLAG CONTROL

**File:** `packages/shared/config/features.js`

```javascript
export const USE_SESSIONS_SDK = process.env.USE_SESSIONS_SDK === 'true';
export const DUAL_WRITE_MODE = process.env.DUAL_WRITE_MODE === 'true';
```

**Current flow (production):**
```
POST /api/sessions/{sessionId}/join
  ↓
IF USE_SESSIONS_SDK === true:
  ├─ Call: createSessionWithSDK()
  │  └─ Route to: claimNextAvailableSlot() (group mode)
  │  └─ Route to: joinSession() (solo mode)
  └─ Then: Insert Minibag metadata into Supabase
ELSE:
  └─ Legacy joinSession() (Supabase only, no SDK)
```

### ERROR HANDLING IN SDK INTEGRATION

**Location:** `packages/shared/adapters/SessionsAdapter.js` lines 85-180

```javascript
// After SDK returns result:
if (sdkResult.error) {
  logger.error('SDK error:', sdkResult.error);
  // Should NOT insert minibag session if SDK failed
  // But current code may have timing issues
  return {success: false, error: sdkResult.error}
}

// After minibag insert:
if (minibagError) {
  logger.error('Minibag insert failed:', minibagError);
  // CRITICAL BUG: SDK session created but minibag metadata missing
  // Session exists in PostgreSQL but not in Supabase
  // Frontend thinks session doesn't exist
  // Data corruption: orphaned SDK session
  return {success: false, error: minibagError}
}
```

---

## Database Split Architecture

### POSTGRESQL (Sessions SDK) - Render Backend

**Database:** PostgreSQL (Supabase or managed instance)

**Primary Purpose:** Coordination & real-time state

**Schema:**
```sql
-- Nickname pool (global, shared across all sessions)
CREATE TABLE nicknames_pool (
  id UUID PRIMARY KEY,
  nickname TEXT UNIQUE NOT NULL,
  avatar_emoji TEXT NOT NULL,
  is_available BOOLEAN DEFAULT true,
  
  -- Race condition prevention
  currently_used_in UUID,           -- Session claiming this nickname
  reserved_until TIMESTAMP,         -- 5-minute reservation window
  reserved_by_session UUID,         -- Which session reserved it
  
  -- Analytics
  times_used INT DEFAULT 0,
  last_used TIMESTAMP,
  
  -- Categorization
  gender TEXT,                      -- 'male' | 'female'
  language_origin TEXT,             -- For personalization
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes for query performance
  INDEX(is_available),
  INDEX(reserved_until),
  INDEX(gender)
);

-- Sessions (coordination hub)
CREATE TABLE sessions (
  id UUID PRIMARY KEY,              -- PostgreSQL UUID (internal)
  session_id TEXT UNIQUE NOT NULL,  -- Short readable ID (abc123)
  
  -- Creator info
  creator_nickname TEXT NOT NULL,
  creator_real_name TEXT,
  
  -- Status
  status TEXT DEFAULT 'open',       -- open | active | completed | cancelled | expired
  
  -- Authentication
  host_token TEXT NOT NULL,         -- 64-char token
  session_pin TEXT,                 -- 4-6 digit PIN (plain text - BUG)
  
  -- Group mode (NEW: Phase 2 Week 6)
  mode TEXT,                        -- 'solo' | 'group'
  max_participants INT,             -- Tier-based: 1 (solo), 4 (free group), 10+ (paid)
  constant_invite_token TEXT UNIQUE, -- Shareable invite link token
  
  -- Coordination
  expected_participants INT,
  expected_participants_set_at TIMESTAMP,
  checkpoint_complete BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  expires_at TIMESTAMP,
  
  -- Indexes
  INDEX(session_id),
  INDEX(status),
  INDEX(created_at),
  INDEX(mode),
  INDEX(constant_invite_token)
);

-- Participants (membership)
CREATE TABLE participants (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL,
  
  -- Identity
  nickname TEXT NOT NULL,
  avatar_emoji TEXT NOT NULL,
  real_name TEXT,
  
  -- Role
  is_creator BOOLEAN DEFAULT false,
  
  -- WebSocket authentication (CRITICAL-1 fix)
  auth_token TEXT,                  -- 64-char token for WebSocket
  
  -- Invite tracking
  claimed_invite_id UUID,           -- Which invite did they claim?
  
  -- Workflow state
  items_confirmed BOOLEAN DEFAULT false,
  marked_not_coming BOOLEAN DEFAULT false,
  marked_not_coming_at TIMESTAMP,
  
  -- Soft deletion
  joined_at TIMESTAMP DEFAULT NOW(),
  left_at TIMESTAMP,                -- NULL = active, set = left session
  
  -- Indexes
  INDEX(session_id),
  INDEX(auth_token),                -- For WebSocket auth lookup
  INDEX(left_at),                   -- For filtering active participants
  INDEX(claimed_invite_id),
  
  FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Invites (group mode tracking)
CREATE TABLE invites (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL,
  
  -- Token
  invite_token TEXT NOT NULL,       -- 8 chars (named) | 16 chars (constant)
  invite_number INT,                -- 1, 2, or 3 (NULL for constant)
  status TEXT DEFAULT 'pending',    -- pending | claimed | expired | active
  
  -- Type (NEW: Phase 2 Week 6)
  invite_type TEXT DEFAULT 'named', -- 'named' | 'constant'
  is_constant_link BOOLEAN DEFAULT false,
  
  -- Dynamic slot tracking (NEW: Phase 2 Week 6)
  slot_assignments JSON,            -- [{slotNumber, participantId, nickname, claimedAt}]
  declined_by JSON,                 -- [{participantId, nickname, declinedAt, reason}]
  
  -- Claim tracking
  claimed_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  
  -- Constraints
  UNIQUE(session_id, invite_number),
  UNIQUE(session_id, invite_token),
  
  -- Indexes
  INDEX(invite_token),
  INDEX(status),
  INDEX(invite_type),
  INDEX(is_constant_link),
  
  FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
);
```

### SUPABASE (Minibag) - Shopping-Specific Data

**Database:** PostgreSQL (managed by Supabase)

**Primary Purpose:** Shopping coordination, items, payments, bills

**Schema:**
```sql
-- Sessions (metadata for shopping, mirrored from SDK)
CREATE TABLE sessions (
  id UUID PRIMARY KEY,              -- Same UUID as SDK sessions.id
  session_id TEXT UNIQUE NOT NULL,  -- Same short ID as SDK
  
  -- Minibag-specific metadata
  location_text TEXT NOT NULL,      -- Shopping location (store name)
  neighborhood TEXT,
  scheduled_time TIMESTAMP,
  title TEXT,
  description TEXT,
  
  -- User info (mirrored from SDK)
  creator_nickname TEXT,
  creator_avatar_emoji TEXT,
  creator_real_name TEXT,
  
  -- Authentication (copied from SDK)
  host_token TEXT,
  session_pin TEXT,
  
  -- Shopping status
  status TEXT DEFAULT 'open',       -- open | active | shopping | completed | cancelled
  
  -- Coordination (mirrored from SDK)
  expected_participants INT,
  checkpoint_complete BOOLEAN DEFAULT false,
  
  -- Group mode (NEW: Phase 2 Week 6)
  mode TEXT,
  max_participants INT,
  constant_invite_token TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  expires_at TIMESTAMP
);

-- Items (shopping list)
CREATE TABLE items (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL,
  catalog_item_id UUID,             -- Reference to catalog
  
  -- Item details
  name TEXT,
  category TEXT,
  unit_price NUMERIC,
  
  -- Aggregation (set by frontend or backend)
  aggregated_quantity NUMERIC,
  aggregated_unit TEXT DEFAULT 'kg',
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- Participants (shopping-specific, mirrors SDK)
CREATE TABLE participants (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL,
  
  -- User identity (mirrored from SDK)
  nickname TEXT,
  avatar_emoji TEXT,
  real_name TEXT,
  
  -- Role
  is_creator BOOLEAN DEFAULT false,
  
  -- Items they're responsible for (JSON)
  items JSON DEFAULT '{}',          -- {item_id: quantity, ...}
  items_confirmed BOOLEAN DEFAULT false,
  
  -- Workflow
  marked_not_coming BOOLEAN DEFAULT false,
  
  -- Status
  joined_at TIMESTAMP,
  left_at TIMESTAMP,                -- NULL = active
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payments (bill tracking)
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL,
  item_id UUID,
  
  -- Payment details
  amount NUMERIC NOT NULL,
  method TEXT,                      -- 'upi' | 'cash' | 'card'
  
  -- Who paid / who recorded
  recorded_by UUID,                 -- participant_id
  
  -- Metadata
  vendor_name TEXT,
  receipt_url TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);
```

### SYNCHRONIZATION STRATEGY

**Current approach:** Manual mirroring

```
Minibag creates session:
├─ SDK call: createSession() → PostgreSQL
│  └─ Returns: {session UUID, sessionId, hostToken, authToken, constantInviteToken}
└─ Minibag call: INSERT into Supabase sessions
   └─ Copies: id, sessionId, hostToken, sessionPin, mode, maxParticipants, etc.

Participant joins:
├─ SDK call: claimNextAvailableSlot() → PostgreSQL
│  └─ Creates: participant + authToken
└─ API call: INSERT into Supabase participants
   └─ Copies: id, nickname, avatar, items, status

CRITICAL ISSUE: Two-phase commit without coordination
└─ If SDK succeeds but Supabase fails → orphaned SDK data
└─ If Supabase succeeds but SDK fails → frontend sees session, but no coordination
```

### DATA CONSISTENCY ISSUES

**Issue #1: Orphaned SDK Sessions**

```
Scenario:
1. SDK creates session → PostgreSQL (success)
2. Minibag INSERT fails → Supabase (network error)
3. Response sent: {error: "Database error"}

Result:
- Session exists in PostgreSQL (fully functional)
- Session doesn't exist in Supabase (appears missing to frontend)
- User sees "Session not found" but SDK has the data
- Data corruption: inconsistent state
```

**Fix needed:**
- Wrap both operations in a distributed transaction
- Or: Use SDK-first approach (SDK is source of truth)
- Or: Add retry/reconciliation logic

**Issue #2: Stale Minibag Metadata**

```
Scenario:
1. Frontend updates participant items in Supabase
2. SDK participant state unchanged
3. Frontend reads from both sources (race condition)

Result:
- Supabase has updated items
- PostgreSQL still has old state
- Merge logic in useSession.js tries to reconcile
- May lose updates if WebSocket is delayed
```

---

## Potential Bug Hotspots

### CRITICAL HOTSPOTS

#### 1. Two-Database Synchronization (Sessions-Supabase)

**Location:** `packages/shared/adapters/SessionsAdapter.js` lines 73-180

**Risk:** Data corruption, orphaned records

```javascript
// BUGGY PATTERN:
const sdkResult = await sdkCreateSession(...);
if (sdkResult.error) return error; // OK

const minibagResult = await supabase.from('sessions').insert(...);
if (minibagResult.error) {
  // BUG: SDK session created but not in Supabase
  // Frontend queries Supabase, gets 404
  // But SDK has the data!
  return error;
}
```

**Fix options:**
1. Use distributed transaction (PostgreSQL + Supabase XA)
2. Reverse order: Supabase first, SDK second
3. Add recovery logic: if Supabase fails, clean up SDK
4. Async reconciliation: queue failed writes for retry

**Monitoring:**
- Log every cross-database operation pair
- Alert if SDK and Supabase diverge
- Dashboard: "Orphaned sessions" count

---

#### 2. Race Condition: Concurrent Joins with Nickname Claiming

**Location:** `packages/sessions-core/src/invites/crud.ts` lines 386-520 (FIXED)

**Current status:** FIXED with FOR UPDATE lock

**Original issue:** Multiple concurrent join requests could:
1. Both pass maxParticipants check
2. Both successfully claim nicknames
3. Both create participants (exceeds limit)

**Fix applied:** Row-level locking
```sql
SELECT * FROM sessions WHERE id = {sessionId} FOR UPDATE;
```

**Remaining risk:** Session-level locking blocks other requests
- **Impact:** Concurrent joins to same session are now serial
- **UX:** Each join takes 50-500ms (acceptable)
- **Load:** Max ~20 concurrent sessions = 20 parallel locks

---

#### 3. Token Lifecycle & Invalidation

**Location:** Multiple files
- Generate: `generators.ts` lines 32-40, 28-30
- Store: `lifecycle.ts` lines 131
- Verify: `lifecycle.ts` lines 369-407
- Invalidate: `lifecycle.ts` lines 199 (no explicit invalidation!)

**Bug:** Auth tokens never expire
```typescript
// MISSING: Token expiration logic
async function verifyParticipant(participantId, authToken) {
  const participant = await prisma.participant.findFirst({
    where: {
      id: participantId,
      authToken,      // No expiration check!
      leftAt: null
    }
  });
  // If participant left, we rely on leftAt check
  // But old tokens for deleted participants remain in DB
}
```

**Issue:** 
- User leaves session → leftAt set, but authToken still in DB
- User can authenticate with old token after leaving
- Potential to re-join sessions or access stale data

**Fix needed:**
- Add `authTokenExpiresAt` column
- Check expiration in verifyParticipant()
- Clear authToken when participant leaves

---

#### 4. WebSocket Connection Failure During Join

**Location:** `packages/minibag/src/hooks/useSession.js` lines 299-310

**Flow:**
```javascript
// API call succeeds, participant created
const result = await joinSession(id, items, nicknameData);

// Now join WebSocket room
await socketService.joinSessionRoom(id);
// 5-second timeout (line 86-87 of socket.js)

// If timeout: join failed, but participant already created
// Optimistic UI shows participant joined
// But no real-time updates received
```

**Bug:** WebSocket failure after API success leaves inconsistent state

```typescript
// In socket.js, joinSessionRoom():
return new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    reject(new Error('Join session timeout - no confirmation received'));
  }, 5000); // 5 second timeout

  this.socket.once('joined-session', (data) => {
    clearTimeout(timeout);
    resolve(data);
  });

  this.socket.emit('join-session', { sessionId });
});

// If server never responds (network partition, server overload):
// - Timeout fires
// - Promise rejected
// - UI shows error "Failed to join"
// - But participant IS in database
// - User refreshes, sees themselves as joined
// - Next user joins, sees phantom participant in count
```

**Impact:** 
- Data is consistent (participant in DB)
- But UI is inconsistent (thinks join failed)
- Refresh fixes UI (reload from API)

**Monitoring:**
- Track "WebSocket timeout" errors
- Compare API participant count vs UI count
- Alert if discrepancy > 30 seconds

---

#### 5. PIN Rate Limiting in Memory (Not Distributed)

**Location:** `packages/shared/api/sessions.js` lines 33-137

```javascript
// BUGGY: In-memory rate limiting
const PIN_ATTEMPTS = new Map(); // Global memory

function checkPinAttempt(sessionId) {
  if (!PIN_ATTEMPTS.has(sessionId)) {
    PIN_ATTEMPTS.set(sessionId, {attempts: 0, ...});
  }
  // Vulnerable to server restart, horizontal scaling
}
```

**Issues:**
1. Rate limit lost on server restart
2. Multiple servers don't share rate limit state
3. Attacker can brute force by hitting different servers
4. Memory leak: never clears old entries

**Fix needed:**
- Use Redis for distributed rate limiting
- Or: Database (slower but persistent)
- Or: JWT-based token with built-in expiry

**Example attack:**
```
Server A: User attempts PIN 5 times → locked
User switches server:
Server B: User attempts PIN 5 times → locked
User switches server:
Server C: User attempts PIN 5 times → locked
...repeat until PIN guessed
```

---

#### 6. Nickname Reservation Race (Minor)

**Location:** `packages/sessions-core/src/nicknames/reserve.ts` lines 36-79

**Flow:**
```typescript
// Find nickname
const matchedMale = await prisma.nicknamesPool.findFirst({...})

// Immediately try to reserve (but not atomic!)
if (matchedMale) {
  const {data: reserved} = await reserveNickname(matchedMale.id, tempSessionId);
  // Between findFirst and reserveNickname, another request could claim it!
}
```

**Issue:** Two-query pattern allows race condition
- Query 1: findFirst() returns available nickname
- Query 2: Another request claims it with reserveNickname()
- Query 3: Original request's reserveNickname() fails
- Result: Fallback nickname used, no error

**Impact:** Low (fallback nicknames available), but suboptimal UX

**Fix needed:**
- Use atomic SELECT...FOR UPDATE in transaction
- Or: Combined select+reserve in single query

---

### HIGH-PRIORITY HOTSPOTS

#### 7. Participant Count Validation in Group Mode

**Location:** `packages/sessions-core/src/invites/crud.ts` lines 441-455

**Current status:** FIXED with FOR UPDATE lock

**Check:**
```typescript
// Happens inside transaction (after FOR UPDATE)
const currentCount = await tx.participant.count({...});
const maxParticipants = invite.session.maxParticipants || 4;
if (currentCount >= maxParticipants) {
  throw new SessionError('PARTICIPANT_LIMIT_REACHED');
}
```

**Remaining issue:** Check count doesn't include "marked_not_coming" participants
```typescript
// Count only counts WHERE leftAt IS NULL
// But participant could be marked_not_coming=true
// Still counted toward limit

// SHOULD BE:
const currentCount = await tx.participant.count({
  where: {
    sessionId: invite.session.id,
    leftAt: null,
    // markedNotComing: false,  // Should we exclude?
  }
});
```

**Question:** Are "not coming" participants reserved slots?
- If YES: Need to exclude from count
- If NO: Current logic correct

---

#### 8. Constant Invite Token Lookup (Was critical, now FIXED)

**Location:** `packages/sessions-core/src/invites/crud.ts` lines 408-435

**Previous bug:** Nested relation query unreliable
```typescript
// OLD (buggy):
const invite = await tx.invite.findUnique({
  where: {sessionId_inviteToken: {sessionId, inviteToken}},
  include: {session: true}  // Nested relation
});

// Issue: Complex where clause + include = query planner issues
```

**Fix applied:** Direct FK lookup
```typescript
// NEW (fixed):
const invite = await tx.invite.findFirst({
  where: {
    sessionId: session.id,  // Use UUID directly, not sessionId text
    inviteToken
  },
  include: {session: true}
});
```

**Status:** FIXED, working in production

---

### MEDIUM-PRIORITY HOTSPOTS

#### 9. WebSocket Server-Side Broadcasting

**Location:** `packages/sessions-core/src/websocket/handlers.ts` lines 154-158

**Current pattern:** Client-driven broadcasting

```typescript
// CLIENT sends:
socket.emit('participant-joined', {sessionId, participant})

// SERVER broadcasts:
socket.on('participant-joined', (data) => {
  io.to(data.sessionId).emit('participant-joined', data.participant);
})
```

**Issue:** If client's WebSocket fails after API succeeds:
- Participant created in DB
- Broadcast never sent
- Other users don't see new participant
- They only see it on refresh

**Fix needed:** Server-side broadcasting after DB commit
```typescript
// In API handler (after claimNextAvailableSlot succeeds):
const participant = result.participant;

// Broadcast to all clients in room (server-initiated)
io.to(sessionId).emit('participant-joined', participant);
```

**Blocker:** Sessions SDK doesn't have access to io instance
- Solution 1: Pass io to SDK functions
- Solution 2: Publish events to message queue (async)
- Solution 3: Client polls at regular intervals

**Current mitigation:** Frontend calls loadSession() after join
- Polls API for fresh data
- Catches most cases within 5 seconds

---

#### 10. Soft Deletion & Historical Data Queries

**Location:** Multiple files
- Create: `lifecycle.ts` line 199 (sets leftAt)
- Query: `lifecycle.ts` line 337 (filters `leftAt: null`)

**Issue:** Some queries might include left participants

```typescript
// CORRECT (active only):
const participants = await prisma.participant.findMany({
  where: {
    sessionId,
    leftAt: null  // ✓ Filters inactive
  }
});

// BUGGY (might include inactive):
const allParticipants = await prisma.participant.findMany({
  where: {sessionId},
  // ✗ Missing leftAt: null filter
});
```

**Impact:** 
- Left participants appear in count
- UI shows "4 participants" even if only 2 active
- Checkpoint calculation incorrect

**Audit needed:** Search codebase for `.findMany({sessionId})` without leftAt filter

---

#### 11. Authorization Gaps

**Location:** Multiple API endpoints

**Issue:** Not all endpoints require authentication

```javascript
// PUBLIC (no auth needed):
GET /api/sessions/{sessionId}           // Anyone can view
POST /api/sessions/{sessionId}/join     // Anyone can join

// HOST-ONLY (requires hostToken):
PUT /api/sessions/{sessionId}/status    // Needs Bearer token
DELETE /api/sessions/{sessionId}        // Needs Bearer token

// PARTICIPANT-ONLY (requires authToken):
PATCH /api/participants/{participantId}/status  // Should need authToken

// MISSING CHECKS:
POST /api/sessions/{sessionId}/payments  // Who can record payments?
PUT /api/participants/{participantId}/items    // Who can update items?
```

**Risk:** 
- User A could update User B's items
- User A could record payments on behalf of User B
- User A could mark User B as "not coming"

**Fix needed:**
- Add participantId validation in middleware
- Check authToken matches participant
- Use session room membership as authorization

---

#### 12. Session Expiration Handling

**Location:** `packages/sessions-core/src/sessions/crud.ts` lines 246-248

**Check:**
```typescript
const isExpired = session.expiresAt && new Date() > session.expiresAt;
return {
  ...session,
  status: isExpired ? 'expired' : session.status
};
```

**Issues:**
1. Computed at query time (not deterministic)
2. No automatic status update in DB
3. Stale data if session kept open

**Scenario:**
```
T=0: Session created, expires_at = now + 24 hours
T=1 hour: User loads session, shows "open"
T=25 hours: Same session, user loads again, shows "expired"
T=25 hours + 30min: Server restart, old code thinks "open" (race)
```

**Fix needed:**
- Periodic job to mark expired sessions
- Or: Explicit status check before operations
- Or: Add `updated_at` and don't allow operations on old sessions

---

## Error Handling & Gaps

### EXISTING ERROR HANDLING

**API level (sessions.js):**
```javascript
// PIN validation errors
if (session_pin !== session.session_pin) {
  return res.status(403).json({error: 'Incorrect PIN', code: 'INCORRECT_PIN'});
}

// Session not found
if (!session) {
  return res.status(404).json({error: 'Session not found'});
}

// Session expired
if (isSessionExpired(session)) {
  return res.status(410).json({error: 'Session expired'});
}
```

**SDK level (lifecycle.ts):**
```typescript
// Participant not found
if (!participant) {
  throw new SessionError(SessionErrorCode.INVALID_HOST_TOKEN, '...');
}

// Nickname already claimed
if (updated.count === 0) {
  return {data: null, error: new Error('Nickname already claimed')};
}
```

### MISSING ERROR HANDLING

#### 1. Network Errors in SDK Calls

**Location:** `packages/shared/adapters/SessionsAdapter.js`

```javascript
// MISSING: timeout handling
const sdkResult = await sdkCreateSession(...); // Can hang indefinitely

// MISSING: retry logic
if (sdkResult.error?.code === 'DATABASE_TIMEOUT') {
  // Should retry, but doesn't
}

// MISSING: circuit breaker
// If SDK has repeated failures, should fast-fail
```

**Fix needed:**
- Add request timeouts (30 seconds for DB operations)
- Exponential backoff retry (up to 3 times)
- Circuit breaker (fail fast after 5 consecutive failures)

---

#### 2. Invalid Token/Authentication Errors

**Location:** `packages/sessions-core/src/websocket/auth.ts`

```typescript
// MISSING: Detailed error codes
if (error || !participant) {
  return {
    success: false,
    error: {
      message: error?.message || 'Invalid credentials',
      code: 'INVALID_CREDENTIALS',  // Generic, not specific
      // MISSING: HTTP status code suggestion
      // MISSING: retry-ability flag
      // MISSING: suggested action
    }
  };
}
```

**Should include:**
```typescript
{
  success: false,
  error: {
    message: 'Authentication token expired',
    code: 'AUTH_TOKEN_EXPIRED',     // Specific code
    retryable: true,                 // Can user retry?
    suggestedAction: 'refresh-page', // What should frontend do?
    httpStatus: 401                  // HTTP status to use
  }
}
```

---

#### 3. Database Constraint Violations

**Location:** Unknown (could happen anywhere)

**Unhandled scenario:**
```typescript
// If DB has unique constraint violation:
const participant = await prisma.participant.create({...});
// Throws: Unique constraint violation on (sessionId, nickname)
// Error handler: Generic 500 error, no specific message
```

**Fix needed:**
- Catch Prisma errors by type
- Translate to user-friendly messages
- Log full error for debugging

```typescript
try {
  return await prisma.participant.create(...);
} catch (error) {
  if (error.code === 'P2002') {
    // Unique constraint violation
    return {error: new SessionError('NICKNAME_ALREADY_USED', '...')};
  }
  throw error;
}
```

---

#### 4. State Machine Violations

**Location:** `packages/sessions-core/src/sessions/crud.ts`

**Unhandled scenario:**
```typescript
// No validation that status transitions are legal
// Can transition from any state to any state:
// - 'completed' → 'open' (invalid!)
// - 'cancelled' → 'active' (invalid!)
// - 'expired' → 'shopping' (invalid!)
```

**Valid transitions:**
```
open ──→ active ──→ shopping ──→ completed
                          ↓
                      cancelled
                          ↓
                       expired (time-based)
```

**Fix needed:**
```typescript
const VALID_TRANSITIONS = {
  'open': ['active', 'cancelled'],
  'active': ['shopping', 'cancelled'],
  'shopping': ['completed', 'cancelled'],
  'completed': [],
  'cancelled': [],
  'expired': []
};

if (!VALID_TRANSITIONS[currentStatus]?.includes(newStatus)) {
  throw new Error(`Invalid transition: ${currentStatus} → ${newStatus}`);
}
```

---

## Race Conditions & State Management

### IDENTIFIED RACE CONDITIONS

#### RC-1: Concurrent Joins Exceeding Limit (FIXED)

**Status:** FIXED with `SELECT FOR UPDATE`

**Original issue:** Two parallel join requests could both pass the limit check

**Current fix:**
```sql
BEGIN TRANSACTION;
SELECT * FROM sessions WHERE id = {sessionId} FOR UPDATE;
-- Now serialized: only one request can hold this lock
```

**Remaining gap:** What about invites with `slot_assignments`?
```json
{
  "slotAssignments": [
    {"slotNumber": 1, "participantId": "uuid-1", "claimedAt": "..."},
    {"slotNumber": 2, "participantId": "uuid-2", "claimedAt": "..."}
  ]
}
```

If maxParticipants=4 but 5 entries in slotAssignments:
- Query checks participant count (4)
- But slotAssignments has 5 (invalid state)
- Unclear which is source of truth

---

#### RC-2: Nickname Claim Race (FIXED)

**Status:** FIXED with atomic transaction

**Original issue:** Nickname could be claimed outside transaction
```
Request A: Claim nickname (succeeds)
Request A: Create participant (fails - network error)
Request B: Claim same nickname (fails - taken)
Request A: Retries
Request A: Create participant (now uses taken nickname)
```

**Current fix:** All-or-nothing transaction
```typescript
await prisma.$transaction(async (tx) => {
  // Claim nickname
  const updated = await tx.nicknamesPool.updateMany({...});
  
  // Create participant
  const participant = await tx.participant.create({...});
  
  // Both succeed or both rollback
});
```

---

#### RC-3: WebSocket Broadcast Timing (DEFERRED)

**Status:** Not fixed (architectural issue)

**Issue:** WebSocket broadcasts may not reach all clients if sender's connection fails

**Scenario:**
```
1. User A clicks "Join"
2. API succeeds: participant created in DB
3. User A's WebSocket fails (network partition)
4. Broadcast "participant-joined" never sent
5. User B doesn't see User A join
6. User A refreshes, sees themselves (correct)
7. User B refreshes, sees User A (correct)
```

**Impact:** Eventual consistency (5-30 second delay if no manual refresh)

**Proper fix:** Server-initiated broadcasts
```typescript
// In API handler (after DB commit):
io.to(sessionId).emit('participant-joined', participant);
```

**Blocker:** Sessions SDK doesn't expose `io` instance

**Mitigation (current):**
- Frontend polls API if no WebSocket updates for 10 seconds
- Explicit refresh button
- Eventually consistent (user sees correct data on refresh)

---

#### RC-4: Duplicate Invite Slot Assignment

**Location:** `packages/sessions-core/src/invites/crud.ts` lines 501-510

**Bug scenario:**
```
1. User claims slot via constant invite
2. API fails (500 error)
3. User retries (same inviteToken, same nickname)
4. Should detect duplicate and return same slot number
5. Currently: May create duplicate slot assignment

Check:
  WHERE sessionId AND nickname AND markedNotComing=false
  If found: return "already claimed, slot={number}"
```

**Status:** FIXED in recent commit
```typescript
// Check for existing participant with same nickname
const existing = await tx.participant.findFirst({
  where: {
    sessionId: invite.session.id,
    nickname,
    leftAt: null
  }
});

if (existing) {
  return {
    error: new SessionError(
      SessionErrorCode.NICKNAME_CLAIM_FAILED,
      'Nickname is no longer available'
    )
  };
}
```

---

### STATE CONSISTENCY ISSUES

#### SC-1: Participant Items Sync (Minor)

**Layers:**
- Database (PostgreSQL + Supabase)
- Socket.IO in-memory state
- Client React state

**Flow:**
```
1. User updates items in UI (optimistic)
2. Frontend emits via WebSocket
3. Server doesn't store (no endpoint!)
4. Broadcast to all clients
5. Browser refresh: items gone (not in DB)
```

**Issue:** Items not persisted server-side

**Fix:** Implement `/api/participants/{id}/items` PUT endpoint
- Persist items in Supabase
- Broadcast via WebSocket
- Prevent loss on refresh

---

#### SC-2: Checkpoint Completion (Major)

**Logic:** When do we mark checkpoint_complete=true?

**Current rules:**
- Solo mode: immediately (only host)
- Group mode: When all expected_participants + 1 (host) are present

**Problem:** No atomic check
```typescript
// BUGGY:
const expected = session.expectedParticipants;
const current = participants.filter(p => !p.leftAt).length;

if (current === expected + 1) {
  // Update checkpoint (but not atomic with participant count!)
}
```

**Race condition:** Between count check and update, participant could leave

**Fix needed:**
```typescript
// Inside transaction:
const currentCount = await tx.participant.count({
  where: {sessionId: invite.session.id, leftAt: null}
});

if (currentCount === expected + 1) {
  await tx.session.update({
    where: {id: sessionId},
    data: {checkpointComplete: true}
  });
}
```

---

## Production Recommendations

### IMMEDIATE (Before deploying with SDKgroup mode)

1. **Enable distributed rate limiting for PINs**
   - Use Redis (ideal) or Supabase
   - Test with 100 concurrent PIN attempts
   - Verify 5th attempt is blocked

2. **Test concurrent joins under load**
   - 10 users joining same 4-person session simultaneously
   - Verify exactly 4 succeed, 6 fail with "full" error
   - Verify no duplicate nickname claims

3. **Audit all participant-level endpoints**
   - `/api/participants/{id}/status`
   - `/api/participants/{id}/items`
   - Verify authToken validation on all

4. **Add monitoring for orphaned SDK sessions**
   - Alert if session exists in PostgreSQL but not Supabase
   - Alert if session exists in Supabase but not PostgreSQL
   - Daily reconciliation report

### SHORT-TERM (Sprint 1)

1. **Implement server-side WebSocket broadcasts**
   - After claimNextAvailableSlot(), emit participant-joined from API
   - Requires refactor to pass io instance to SDK

2. **Add authToken expiration**
   - Add `authTokenExpiresAt` (30-minute TTL)
   - Clear token when participant leaves
   - Test WebSocket reconnect with expired token

3. **Fix two-database sync**
   - Wrap SDK + Supabase in distributed transaction
   - Or: implement async retry queue
   - Add alerting for failures

4. **Implement state machine validation**
   - Define legal session status transitions
   - Validate before every status update
   - Reject invalid transitions with clear error

### MEDIUM-TERM (Sprint 2)

1. **Migrate PIN rate limiting to distributed system**
   - Current in-memory: lost on restart, not shared across servers
   - Move to Redis or Supabase

2. **Add comprehensive audit logging**
   - Log every session creation, join, leave
   - Log every status change
   - Log every payment, item update
   - Enables forensics for disputes

3. **Implement WebSocket reconnection strategy**
   - Current: manual refresh if no messages for 10 sec
   - Better: automatic re-authentication on reconnect
   - Better: queue offline messages, replay on reconnect

4. **Test disaster scenarios**
   - Server crash during join
   - Database connection loss mid-transaction
   - WebSocket server restart
   - Network partition (split brain)

---

## SUMMARY TABLE

| Component | Status | Risk Level | Fix Applied | Notes |
|-----------|--------|-----------|------------|-------|
| Concurrent join limit | FIXED | Low | FOR UPDATE lock | Serializes joins per session |
| Nickname claim atomicity | FIXED | Low | Transaction wrapping | Prevents orphaned nicknames |
| Constant invite lookup | FIXED | Low | Direct FK | Eliminates nested relation issues |
| WebSocket broadcasts | DEFERRED | Medium | Polling fallback | Eventual consistency OK for now |
| Token expiration | NOT FIXED | Medium | None | Tokens never expire |
| PIN rate limiting | VULNERABLE | Medium | In-memory tracking | Lost on restart, not distributed |
| Two-DB sync | VULNERABLE | High | None | Orphaned records possible |
| State machine validation | NOT FIXED | Low | None | Any transition allowed |
| Authorization checks | PARTIAL | Medium | Token validation | Not all endpoints checked |
| Session expiration enforcement | WEAK | Low | Time-based check | No automatic DB update |
| Participant count (not-coming) | NEEDS REVIEW | Low | None | Unclear if should be excluded |
| Server-side broadcasts | DEFERRED | Medium | Client-driven fallback | Depends on SDK refactor |

