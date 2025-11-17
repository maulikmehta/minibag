# Sessions SDK Integration - Minibag-2

**Date**: 2025-11-17
**Status**: Adapter Layer Complete ✅
**Branch**: `integrate-sessions-sdk`

---

## Overview

Minibag-2 now integrates with the Sessions SDK for session management via an adapter layer. This provides a clean separation between coordination logic (SDK) and shopping logic (Minibag).

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Minibag-2 Backend                      │
│                                                          │
│  ┌────────────────────────────────────────────────┐    │
│  │           Express API Routes                   │    │
│  │  POST /api/sessions/create                     │    │
│  │  POST /api/sessions/:id/join                   │    │
│  │  GET /api/sessions/nickname-options            │    │
│  └──────────────┬─────────────────────────────────┘    │
│                 │                                        │
│                 ▼                                        │
│  ┌────────────────────────────────────────────────┐    │
│  │        sessions-sdk.js (Integration Layer)     │    │
│  │  - Feature flags (USE_SESSIONS_SDK)            │    │
│  │  - Fallback to legacy on error                 │    │
│  │  - Dual-write mode (optional)                  │    │
│  └──────────────┬─────────────────────────────────┘    │
│                 │                                        │
│                 ▼                                        │
│  ┌────────────────────────────────────────────────┐    │
│  │      SessionsAdapter (Adapter Layer)           │    │
│  │  - Maps Minibag → Sessions SDK                 │    │
│  │  - Creates shopping session via SDK            │    │
│  │  - Stores shopping data in Minibag tables      │    │
│  └──────────────┬─────────────────────────────────┘    │
│                 │                                        │
│                 ▼                                        │
│  ┌────────────────────────────────────────────────┐    │
│  │         @sessions/core (SDK)                   │    │
│  │  - Session lifecycle                           │    │
│  │  - Participants                                │    │
│  │  - Invites (constant links)                    │    │
│  │  - WebSocket coordination                      │    │
│  └────────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Files Created

### 1. `packages/shared/adapters/SessionsAdapter.js` ✅

**Purpose**: Bridges Sessions SDK with Minibag shopping logic

**Responsibilities**:
- **SDK handles**: Session lifecycle, participants, invites, WebSocket
- **Minibag handles**: Shopping items, bills, payments, catalog

**Key Methods**:
- `createShoppingSession()` - Creates session via SDK + stores shopping data
- `joinShoppingSession()` - Joins session via SDK
- `storeParticipantItems()` - Stores shopping items (Minibag-specific)
- `getNicknameOptions()` - Pass-through to SDK
- `claimSlotViaConstantLink()` - Group mode join
- `declineInvitation()` - Decline tracking

### 2. `packages/shared/config/features.js` ✅

**Purpose**: Feature flags for gradual rollout

**Flags**:
- `USE_SESSIONS_SDK` - Enable/disable SDK (default: false)
- `DUAL_WRITE_MODE` - Write to both old+new systems (default: false)
- `ENABLE_GROUP_MODE` - Enable constant invite links (default: true if SDK enabled)

### 3. `packages/shared/api/sessions-sdk.js` ✅

**Purpose**: Integration layer with fallback logic

**Functions**:
- `createSessionWithSDK()` - Wrapper for session creation
- `joinSessionWithSDK()` - Wrapper for join session
- `getNicknameOptionsWithSDK()` - Wrapper for nickname options

**Features**:
- Fallback to legacy on SDK failure
- Dual-write mode support
- Feature flag checking
- Error logging

---

## Files Modified

### 1. `packages/shared/server.js`

**Changes**:
- Added Sessions SDK imports
- Added feature flags import
- Updated routes to use SDK wrappers
- Added `logFeatureFlags()` on startup

**Routes Updated**:
```javascript
// Before
app.post('/api/sessions/create', createSessionLimiter, validateSessionCreation, sessionsAPI.createSession);

// After (with SDK wrapper)
app.post('/api/sessions/create', createSessionLimiter, validateSessionCreation, (req, res) =>
  createSessionWithSDK(req, res, sessionsAPI.createSession)
);
```

### 2. `.env.example`

**Added**:
```bash
USE_SESSIONS_SDK=false
DUAL_WRITE_MODE=false
ENABLE_GROUP_MODE=true
```

---

## How It Works

### Session Creation Flow

**1. Request arrives** at `POST /api/sessions/create`

**2. SDK wrapper checks feature flag**:
```javascript
if (!USE_SESSIONS_SDK) {
  return legacyCreateSession(req, res); // Use old system
}
```

**3. If SDK enabled**, call adapter:
```javascript
const result = await sessionsAdapter.createShoppingSession({
  location_text,
  items,
  expected_participants,
  selected_nickname,
  // ...
});
```

**4. Adapter calls SDK**:
```javascript
const sdkResult = await sdkCreateSession({
  mode: 'group',
  maxParticipants: 10,
  creatorNickname: selected_nickname,
  // ...
});
```

**5. SDK creates session** (participants, invites, WebSocket)

**6. Adapter stores shopping data**:
```javascript
await supabase.from('sessions').insert({
  id: session.id,
  location_text,
  items,
  // ...
});
```

**7. Return combined response** to client

---

## Session Mode Mapping

**Legacy → SDK**:
- `expected_participants = null` → `mode: 'solo'`
- `expected_participants = 1-3` → `mode: 'group'`

**SDK → Minibag**:
- `mode: 'solo'` → No invites, single participant
- `mode: 'group'` → Constant invite token, up to maxParticipants

---

## Feature Flags

### USE_SESSIONS_SDK (Default: false)

**When false**:
- Uses legacy Supabase-based session management
- No SDK code runs
- 100% backward compatible

**When true**:
- Uses Sessions SDK for coordination
- Minibag tables store shopping data
- Fallback to legacy on SDK errors

### DUAL_WRITE_MODE (Default: false)

**Requires**: `USE_SESSIONS_SDK=true`

**When enabled**:
- Writes to both SDK and legacy systems
- Allows comparison of outputs
- Logs any discrepancies
- Non-blocking if legacy write fails

### ENABLE_GROUP_MODE (Default: true when SDK enabled)

**When true**:
- Group mode sessions generate constant invite tokens
- Multiple friends can join via same link
- Dynamic slot assignment

**When false**:
- Only solo mode works
- Backward compatible with 1-3 friends model

---

## Migration Path

### Phase 1: Deploy with SDK Disabled (Week 4) ✅

```bash
USE_SESSIONS_SDK=false
```

- Deploy code to minibag-2
- SDK code present but not active
- Test that legacy flow still works
- No risk to production

### Phase 2: Enable Dual-Write (Week 5)

```bash
USE_SESSIONS_SDK=true
DUAL_WRITE_MODE=true
```

- SDK creates sessions
- Legacy also creates sessions (for comparison)
- Monitor for discrepancies
- Validate SDK output matches legacy

### Phase 3: SDK Only (Week 6)

```bash
USE_SESSIONS_SDK=true
DUAL_WRITE_MODE=false
```

- Disable legacy writes
- Use SDK exclusively
- Monitor for errors
- Keep legacy as fallback on SDK failure

### Phase 4: Remove Legacy (Week 8)

- Remove legacy code entirely
- SDK is production system
- Full migration complete

---

## Data Flow

### What SDK Manages

**Tables** (in Sessions SDK database):
- `sessions` - Basic session metadata
- `participants` - Who's in the session
- `invites` - Invite tokens and tracking
- `nicknames_pool` - Available nicknames

**Operations**:
- Session creation/join/leave
- Participant tracking
- WebSocket coordination
- Auto-close when all leave

### What Minibag Manages

**Tables** (in Minibag database):
- `sessions` - Shopping metadata (location, schedule)
- `participant_items` - What each person wants to buy
- `payments` - Payment tracking
- `bills` - Bill generation
- `catalog_items` - Shopping catalog

**Operations**:
- Item selection
- Bill calculation
- Payment processing
- Delivery coordination

---

## Testing

### Test SDK Integration

```bash
# Enable SDK
export USE_SESSIONS_SDK=true

# Start server
cd packages/shared
npm run dev

# Check logs for feature flags
# Should see: USE_SESSIONS_SDK: true
```

### Test Legacy Fallback

```bash
# Disable SDK
export USE_SESSIONS_SDK=false

# Start server
npm run dev

# Create session - should use legacy
curl -X POST http://localhost:3000/api/sessions/create ...
```

### Test Dual-Write Mode

```bash
# Enable both
export USE_SESSIONS_SDK=true
export DUAL_WRITE_MODE=true

# Create session
# Should write to both systems
# Check logs for dual-write messages
```

---

## Error Handling

**SDK Creation Fails**:
```javascript
try {
  const result = await sessionsAdapter.createShoppingSession(...);
} catch (error) {
  logger.error('[SDK] Session creation failed, falling back to legacy');
  return legacyCreateSession(req, res); // Automatic fallback
}
```

**Validation Errors**:
- Same validation as legacy
- SDK has additional Zod validation
- Returns clear error messages

**Network Errors**:
- Adapter catches and logs
- Falls back to legacy
- User experience uninterrupted

---

## Monitoring

**Logs to Watch**:
```
[SDK] Creating session via Sessions SDK
[SDK] Session creation failed, falling back to legacy
[SDK] Dual-write mode: Also creating via legacy system
```

**Metrics**:
- SDK success rate
- Fallback frequency
- Dual-write discrepancies
- Performance comparison

---

## Next Steps

1. ✅ Adapter layer complete
2. ⏳ Test session creation with SDK
3. ⏳ Test join session with SDK
4. ⏳ Enable dual-write mode
5. ⏳ Compare SDK vs legacy outputs
6. ⏳ Fix any discrepancies
7. ⏳ Enable SDK-only mode
8. ⏳ Monitor in production

---

## Status

**Completed**:
- ✅ SessionsAdapter class created
- ✅ Feature flags implemented
- ✅ API routes wired with SDK wrappers
- ✅ .env.example documented
- ✅ Fallback logic implemented

**Pending**:
- ⏳ Unit tests for adapter
- ⏳ Integration tests
- ⏳ End-to-end testing
- ⏳ Performance benchmarks

---

**Ready for testing!** 🚀

Set `USE_SESSIONS_SDK=true` and test session creation.
