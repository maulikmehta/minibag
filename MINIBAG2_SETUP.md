# Minibag-2 Setup Documentation

**Date**: 2025-11-17
**Status**: Setup Complete ✅
**Purpose**: Integration testbed for Sessions SDK

---

## Overview

**minibag-2** is a clone of the production LocalLoops codebase, created to integrate and test the Sessions SDK without affecting production. This follows the 3-repo strategy outlined in `SESSIONS_EXTRACTION_STRATEGY.md`.

## Repository Structure

```
minibag-2/
├── packages/
│   ├── shared/          # Backend (Express + Socket.IO)
│   │   └── @sessions/core installed here ✅
│   ├── minibag/         # Frontend (React + Vite)
│   └── ui-components/   # Shared UI components
├── database/            # SQL migration files
├── docs/               # Documentation
└── temp/               # Temporary files & strategy docs
```

---

## Setup Steps Completed

### 1. Clone LocalLoops → Minibag-2 ✅

```bash
cd /Users/maulik/llcode
git clone localloops minibag-2
```

**Result**: Complete clone with all history preserved

### 2. Create Integration Branch ✅

```bash
cd minibag-2
git checkout -b integrate-sessions-sdk
```

**Result**: New branch `integrate-sessions-sdk` created

### 3. Install Sessions SDK ✅

```bash
cd packages/shared
npm install ../../../sessions/packages/core
```

**Result**:
- Sessions SDK installed as local file dependency
- `package.json` updated with: `"@sessions/core": "file:../../../sessions/packages/core"`
- 403 packages added to node_modules

### 4. Install All Dependencies ✅

```bash
cd /Users/maulik/llcode/minibag-2
npm install
```

**Result**:
- 763 total packages installed across workspaces
- All workspace dependencies resolved

### 5. Verify SDK Integration ✅

**Test Command**:
```bash
cd packages/shared
node -e "import('@sessions/core').then(m => console.log('Loaded:', Object.keys(m).length, 'exports'))"
```

**Result**: ✅ All exports loaded successfully

**Key Functions Verified**:
- `createSession` ✅
- `joinSession` ✅
- `leaveSession` ✅
- `getTwoNicknameOptions` ✅
- `claimNextAvailableSlot` ✅
- `declineInvite` ✅
- `notifySessionAutoCompleted` ✅

---

## Sessions SDK Integration

### Installed Package

**Package**: `@sessions/core`
**Version**: `0.1.0-alpha.0`
**Type**: Local file dependency
**Path**: `file:../../../sessions/packages/core`

### Available Exports

**Session Management**:
- `createSession()` - Create new session (solo/group mode)
- `joinSession()` - Join existing session
- `leaveSession()` - Leave session (auto-closes if last participant)
- `updateSession()` - Update session status/settings
- `getSession()` - Fetch session details

**Participant Management**:
- `updateParticipant()` - Update participant status
- `getParticipants()` - Get all participants
- `verifyParticipant()` - Verify participant auth token

**Nickname Pool**:
- `getTwoNicknameOptions()` - Get 2 nickname options (male/female)
- `reserveNickname()` - Reserve nickname for 5 minutes
- `markNicknameAsUsed()` - Claim nickname
- `releaseNickname()` - Release nickname back to pool

**Invites (Phase 2 Week 6)**:
- `generateInvites()` - Generate named invites
- `getInvites()` - Get session invites
- `claimNextAvailableSlot()` - Join via constant link (group mode)
- `declineInvite()` - Decline invitation

**WebSocket Notifications**:
- `setupSocketHandlers()` - Setup Socket.IO handlers
- `notifyParticipantJoined()` - Broadcast participant join
- `notifyParticipantLeft()` - Broadcast participant leave
- `notifySessionStatusUpdated()` - Broadcast status change
- `notifySessionCancelled()` - Broadcast cancellation
- `notifyInviteDeclined()` - Broadcast decline (Phase 2 Week 6)
- `notifySlotClaimed()` - Broadcast slot claim (Phase 2 Week 6)
- `notifySessionAutoCompleted()` - Broadcast auto-close

**Validation (Zod)**:
- All schemas: `CreateSessionSchema`, `JoinSessionSchema`, etc.
- Helpers: `validate()`, `safeValidate()`, `formatZodError()`

**Utilities**:
- `generateSessionId()` - Generate 12-char session ID
- `generateHostToken()` - Generate host auth token
- `generateAuthToken()` - Generate participant auth token
- `generateConstantInviteToken()` - Generate 16-char constant invite token

---

## Next Steps

### Phase 3 (Week 4): Create Adapter Layer

**Goal**: Map minibag concepts → Sessions SDK concepts

**Tasks**:
1. Create `packages/shared/adapters/SessionsAdapter.js`
2. Implement session creation adapter
3. Implement join session adapter
4. Implement leave session adapter
5. Keep shopping data in minibag tables (separate from SDK)

### Phase 4 (Week 5): Dual-Write Strategy

**Goal**: Run old + new systems in parallel

**Tasks**:
1. Add feature flag: `USE_SESSIONS_SDK=false`
2. Implement parallel writes (old + new)
3. Add logging/monitoring for comparison
4. Start read-only (no writes yet)

### Phase 5 (Week 6): Testing & Validation

**Goal**: Enable Sessions SDK and validate

**Tasks**:
1. Enable SDK with feature flag
2. Test all flows end-to-end
3. Fix integration bugs
4. Verify real-time updates work
5. Ensure no data loss

---

## Directory Structure

**Production (Untouched)**:
```
/Users/maulik/llcode/localloops/
```

**Sessions SDK**:
```
/Users/maulik/llcode/sessions/
└── packages/
    └── core/          # @sessions/core
```

**Integration Testbed (This Repo)**:
```
/Users/maulik/llcode/minibag-2/
├── packages/shared/   # Uses @sessions/core
├── packages/minibag/  # Frontend
└── MINIBAG2_SETUP.md  # This file
```

---

## Build Status

**Sessions SDK Build**:
```
✅ CJS: 56.50 KB
✅ ESM: 45.90 KB
✅ DTS: 32.80 KB
```

**Minibag-2 Dependencies**:
```
✅ 763 packages installed
✅ @sessions/core linked via file:
⚠️ 6 moderate vulnerabilities (non-blocking)
```

---

## Git Status

**Current Branch**: `integrate-sessions-sdk`
**Commits Behind Main**: 0 (just created)
**Working Tree**: Clean

**Modified Files** (after SDK install):
- `packages/shared/package.json` - Added @sessions/core
- `packages/shared/package-lock.json` - Dependency lockfile updated

---

## Environment Setup

**Requirements**:
- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL (via Supabase)

**Environment Variables** (same as LocalLoops):
- `DATABASE_URL` - Supabase connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `PORT` - Backend server port (default: 3000)

---

## Testing Strategy

### Unit Tests
- [ ] Test adapter functions individually
- [ ] Mock Sessions SDK responses
- [ ] Test error handling

### Integration Tests
- [ ] Create session via SDK
- [ ] Join session via SDK
- [ ] Leave session via SDK
- [ ] Verify database state matches

### End-to-End Tests
- [ ] Full shopping flow with SDK
- [ ] WebSocket notifications work
- [ ] Session auto-close triggers correctly
- [ ] Backward compatibility maintained

---

## Comparison: LocalLoops vs Minibag-2

| Aspect | LocalLoops | Minibag-2 |
|--------|-----------|-----------|
| Purpose | Production | Integration testbed |
| Sessions | Custom implementation | Sessions SDK |
| Database | Same schema | Same schema |
| Feature Flag | N/A | `USE_SESSIONS_SDK` |
| Risk Level | HIGH (users affected) | LOW (isolated testing) |

---

## Success Criteria

### Week 4 (Adapter Layer)
- [ ] Adapter class created
- [ ] Sessions can be created via SDK
- [ ] Shopping data stays in minibag tables
- [ ] No errors in console

### Week 6 (Integration Complete)
- [ ] All flows work with SDK
- [ ] No critical bugs
- [ ] Real-time updates work
- [ ] Performance acceptable
- [ ] Tests pass

### Week 8 (Production Ready)
- [ ] minibag-2 runs 100% on SDK
- [ ] Zero data loss
- [ ] 95%+ feature parity
- [ ] All tests pass

---

## Troubleshooting

### Issue: SDK Functions Missing

**Symptom**: Import error or `undefined` function

**Solution**: Rebuild Sessions SDK
```bash
cd /Users/maulik/llcode/sessions/packages/core
npm run build
```

### Issue: Module Not Found

**Symptom**: `Cannot find package '@sessions/core'`

**Solution**: Reinstall SDK
```bash
cd /Users/maulik/llcode/minibag-2/packages/shared
npm install ../../../sessions/packages/core
```

### Issue: Build Fails

**Symptom**: Vite build errors

**Solution**: Install all dependencies
```bash
cd /Users/maulik/llcode/minibag-2
npm install
```

---

## Documentation References

- **Strategy**: `/Users/maulik/llcode/localloops/temp/SESSIONS_EXTRACTION_STRATEGY.md`
- **SDK Plan**: `/Users/maulik/llcode/sessions/docs/SESSION_FLOW_REDESIGN_PLAN.md`
- **SDK Summary**: `/Users/maulik/llcode/sessions/docs/SESSION_FLOW_IMPLEMENTATION_SUMMARY.md`
- **Auto-Close**: `/Users/maulik/llcode/sessions/docs/SESSION_AUTO_CLOSE_FEATURE.md`

---

**Status**: ✅ Minibag-2 ready for adapter layer implementation!
**Next**: Create `SessionsAdapter.js` in `packages/shared/adapters/`
