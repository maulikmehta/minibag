# Minibag-2 Session Creation Architecture Analysis

## Executive Summary

The minibag-2 session creation flow uses **scheduled_time + 2 hours** for calculating session expiry across both SDK and API layers. Sessions are being created with past `scheduled_time` by design (currently 1 hour from now in the frontend). This is NOT a "shop now" feature but appears to be test/demo data.

---

## Key Findings

### 1. SCHEDULED_TIME USAGE - Where It Comes From

**Frontend (SessionCreateScreen)** - Line 235:
```javascript
scheduled_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
```
- Always set to 1 hour in the future at creation
- Marked with TODO for future user input: `location_text` and `neighborhood` also need user input
- No "shop now" feature implemented - this is hardcoded test default

---

### 2. EXPIRY CALCULATION - SDK vs API

#### SDK (sessions-core) - `/packages/sessions-core/src/sessions/crud.ts`, Lines 107-109:
```typescript
// Calculate expiry
const expiresAt = new Date();
expiresAt.setHours(expiresAt.getHours() + expiresInHours);
```
**Problem**: Calculates from `NOW` (current time), not from `scheduled_time`
- Default `expiresInHours = 24` (hardcoded)
- Session created at time T expires at T+24 hours
- **Does NOT use scheduled_time at all**

#### API (Supabase) - `/packages/shared/api/sessions.js`, Lines 882-884:
```javascript
// Calculate expiry (2 hours after scheduled time)
const expiresAt = new Date(scheduled_time);
expiresAt.setHours(expiresAt.getHours() + 2);
```
**Correct**: Calculates from `scheduled_time`
- Session with `scheduled_time = T` expires at `T+2 hours`
- Matches business logic comments throughout codebase

---

### 3. DUAL CODE PATHS - Two Different Implementations

The system has **TWO conflicting implementations**:

| Component | Method | Calculation | Result |
|-----------|--------|-------------|---------|
| **Sessions SDK (sessions-core)** | Passthrough from API | `NOW + expiresInHours (24hr default)` | Mismatch |
| **API (shared/api/sessions.js)** | Direct insert to Supabase | `scheduled_time + 2 hours` | Correct |
| **SessionsAdapter** | SDK wrapper | Passes `expiresInHours: 2` to SDK | Attempts fix |

---

### 4. INTEGRATION POINTS

#### A. SessionsAdapter (`/packages/shared/adapters/SessionsAdapter.js`, Line 84):
```javascript
const sdkResult = await sdkCreateSession({
  mode,
  maxParticipants,
  creatorNickname: selected_nickname,
  creatorAvatarEmoji: selected_avatar_emoji,
  creatorRealName: real_name,
  nicknameId: selected_nickname_id,
  expiresInHours: 2, // Standard 2-hour expiry
  sessionPin: session_pin,
  generatePin: generate_pin,
});
```
**Does NOT pass `scheduled_time`** to SDK - SDK has no concept of scheduled shopping time

**Then stores Supabase data with correct expiry** (Line 116):
```javascript
expires_at: session.expiresAt, // From SDK (24hr) - WRONG
```

#### B. sessions-sdk.js (`/packages/shared/api/sessions-sdk.js`):
```javascript
// Feature flag routing - can switch between SDK and legacy
if (!USE_SESSIONS_SDK) {
  return legacyCreateSession(req, res);
}
```
- When SDK enabled: uses SessionsAdapter
- When SDK disabled: uses legacy API (shared/api/sessions.js)
- No feature flag discovered - appears SDK always enabled

---

### 5. CRITICAL BUG: EXPIRY MISMATCH

**Where the bug manifests:**
1. Frontend creates session with `scheduled_time = NOW + 1 hour`
2. SessionsAdapter calls SDK with `expiresInHours: 2`
3. SDK calculates: `expiresAt = NOW + 2 hours` (Line 108-109 in crud.ts)
4. API stores: `expires_at = scheduled_time + 2 hours = (NOW + 1 hour) + 2 hours = NOW + 3 hours`
5. BUT SDK returned: `NOW + 2 hours`
6. **Mismatch**: Session appears valid in SDK but may expire in API

**Code locations showing the bug:**
- SDK crud.ts Line 108-109: Ignores `scheduled_time`, uses current time
- sessions.js Line 883-884: Uses `scheduled_time` correctly
- SessionsAdapter Line 116: Stores SDK's wrong expiry time to Supabase

---

### 6. GROUP MODE & CONSTANT INVITE LINKS

**Constant invite tokens** (`/packages/sessions-core/src/sessions/crud.ts` Lines 140-154):
```typescript
if (mode === 'group' && constantInviteToken) {
  const invite = await tx.invite.create({
    inviteType: 'constant',
    isConstantLink: true,
    status: 'active',
    // BUGFIX: Constant invite links never expire independently
    // They remain valid as long as session.status === 'open'
    // Setting expiresAt to session.expiresAt breaks sessions created with past scheduled_time
    expiresAt: null,
  });
}
```

**Key insight**: Constant tokens intentionally set `expiresAt: null` because of the scheduled_time problem!
- Comment acknowledges: "Setting expiresAt to session.expiresAt breaks sessions created with past scheduled_time"
- Suggests this bug was encountered and worked around, not fixed

---

### 7. SESSION EXPIRY ENFORCEMENT

#### SDK Checks (getSession, Line 259-260):
```typescript
// Check if session has expired
const isExpired = session.expiresAt && new Date() > session.expiresAt;
```
- Simple: NOW > expiresAt

#### API Checks (sessions.js, Lines 168-171):
```typescript
function isSessionExpired(session) {
  if (!session.expires_at) return false;
  return new Date() > new Date(session.expires_at);
}
```
- Same simple logic

#### Join Session Validation (sessions.js, Lines 1708-1715):
```javascript
// Check if session has expired (2 hours after scheduled time)
if (isSessionExpired(session)) {
  return res.status(410).json({
    success: false,
    error: 'This session has expired. Sessions are only valid for 2 hours after the scheduled time.',
    error_code: 'SESSION_EXPIRED'
  });
}
```
- Error message indicates intended behavior: "2 hours after scheduled time"
- But actual expiry calculated at creation is wrong

---

## Root Cause Analysis

### Why Sessions Are Created with Past `scheduled_time`

Looking at the frontend code, this is **NOT "shop now" functionality** but **hardcoded test default**:

**File**: `/packages/minibag/src/screens/SessionCreateScreen/index.jsx` Line 235:
```javascript
scheduled_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
```

With comments showing TODOs:
```javascript
location_text: 'My location', // TODO: Get from user input
neighborhood: 'Local area',   // TODO: Get from user input
```

The 1-hour future time IS the frontend setting it, but there's no user control. Once SDK expiry calculates from NOW instead of scheduled_time, sessions effectively get 3 hours (1 hour wait + 2 hour shopping window).

---

## Architecture Diagram

```
Frontend SessionCreateScreen (Line 235)
  scheduled_time = NOW + 1 hour
  ↓
API /sessions/create
  ├─→ Via SessionsAdapter.createShoppingSession()
  │    ├─→ SDK createSession(expiresInHours: 2)
  │    │    └─→ expiresAt = NOW + 2 hours (BUG: ignores scheduled_time)
  │    └─→ Store to Supabase
  │        ├─ expires_at = scheduled_time + 2 = NOW + 3 hours (CORRECT)
  │        └─ expiresAt from SDK = NOW + 2 hours (WRONG - but what's stored)
  │
  └─→ Response to Frontend
      └─ constant_invite_token: (for group mode, expiry = null)

Later: Join Session / Get Session
  ├─→ SDK getSession()
  │    └─ isExpired = NOW > expiresAt (uses SDK's NOW + 2 hours)
  └─→ API checks
       └─ isExpired = NOW > expires_at (uses Supabase's NOW + 3 hours)
```

---

## Missing Features

### "Shop Now" Functionality - NOT IMPLEMENTED
- No feature flag found: `SHOP_NOW`, `IMMEDIATE_SESSION`, `NOW_FEATURE`
- No code path that bypasses `scheduled_time`
- Sessions are created 1 hour in future (hardcoded)
- No indication this is intentional behavior

**Recommendation**: If "shop now" is planned, need to:
1. Add `scheduled_time = NOW` option (alongside scheduled future time)
2. Pass `scheduled_time` to SDK (currently it's ignored)
3. Use `scheduled_time` in SDK's expiry calculation, not NOW

---

## Detailed Code References

### File Paths with Line Numbers

| File | Lines | What |
|------|-------|------|
| `/packages/minibag/src/screens/SessionCreateScreen/index.jsx` | 235 | Frontend sets scheduled_time to NOW + 1 hour |
| `/packages/shared/adapters/SessionsAdapter.js` | 44-246 | Adapter bridges SDK and Supabase |
| `/packages/shared/adapters/SessionsAdapter.js` | 77-87 | Passes expiresInHours: 2 to SDK |
| `/packages/shared/adapters/SessionsAdapter.js` | 99-124 | Stores session to Supabase |
| `/packages/shared/adapters/SessionsAdapter.js` | 116 | Stores expires_at from SDK |
| `/packages/shared/api/sessions-sdk.js` | 20-126 | SDK wrapper with feature flag |
| `/packages/shared/api/sessions-sdk.js` | 63-76 | Passes to SessionsAdapter |
| `/packages/shared/api/sessions.js` | 768-1103 | Legacy API createSession |
| `/packages/shared/api/sessions.js` | 882-884 | **CORRECT** expiry calculation |
| `/packages/shared/api/sessions.js` | 1129-1131 | Expiry check during join |
| `/packages/sessions-core/src/sessions/crud.ts` | 44-221 | SDK createSession |
| `/packages/sessions-core/src/sessions/crud.ts` | 107-109 | **INCORRECT** expiry calculation |
| `/packages/sessions-core/src/sessions/crud.ts` | 140-154 | Constant invite (works around bug) |
| `/packages/minibag/src/__tests__/integration/api/sessions.test.js` | 30 | Test expects NOW + 2 hours |

---

## Test Evidence

**Integration test mock** (`sessions.test.js` Line 30):
```javascript
expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
```
- Test expects 2-hour expiry from NOW
- Confirms this is the intended behavior
- But doesn't account for scheduled_time offset

---

## Recommendations

### Priority 1: Fix SDK Expiry Calculation
**File**: `/packages/sessions-core/src/sessions/crud.ts` Lines 107-109

Current:
```typescript
const expiresAt = new Date();
expiresAt.setHours(expiresAt.getHours() + expiresInHours);
```

Should be:
```typescript
// Accept scheduledTime as parameter
const scheduledTime = options.scheduledTime ? new Date(options.scheduledTime) : new Date();
const expiresAt = new Date(scheduledTime);
expiresAt.setHours(expiresAt.getHours() + expiresInHours);
```

### Priority 2: Pass scheduledTime to SDK
**File**: `/packages/shared/adapters/SessionsAdapter.js` Line 77

Add:
```javascript
const sdkResult = await sdkCreateSession({
  // ... existing fields
  scheduledTime: scheduled_time, // NEW
  expiresInHours: 2,
});
```

### Priority 3: Implement User-Controlled Scheduling
**File**: `/packages/minibag/src/screens/SessionCreateScreen/index.jsx` Line 235

Replace hardcoded time with user selection:
```javascript
scheduled_time: userSelectedTime.toISOString(), // User picks date/time
```

### Priority 4: Add "Shop Now" Feature (If Planned)
1. Add option: "Shop now" vs "Schedule for later"
2. If "Shop now": `scheduled_time = NOW`
3. If "Later": `scheduled_time = userSelectedTime`
4. Update expiry logic to use `scheduled_time + duration`

---

## Conclusion

The minibag-2 session creation system has a **consistent 3-hour expiry window** (SDK calculates NOW+2, but scheduled_time is NOW+1 in frontend), not the intended 2-hour window after scheduled time. The code paths are:

1. **SDK Path**: Calculates `NOW + 2 hours` (ignores scheduled_time)
2. **API Path**: Calculates `scheduled_time + 2 hours` (correct)
3. **Group Mode**: Works around this with `expiresAt: null` for constant invites

No "shop now" feature exists - the frontend always schedules 1 hour in the future. This appears to be incomplete/test code awaiting user input implementation.
