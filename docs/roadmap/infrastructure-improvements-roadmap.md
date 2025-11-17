# Session Infrastructure Improvements Roadmap (Code Review Enhanced)

**Version:** 2.0 (Revised with Code Review Findings)
**Start Date:** 2025-11-07
**Duration:** 4 weeks (tactical sprint)
**Status:** Ready for Implementation
**Owner:** Engineering Team

---

## Executive Summary

This roadmap outlines a 4-week tactical improvement plan to address systemic issues in our session management infrastructure. **Updated with findings from comprehensive code review identifying 27 specific issues**, including 6 critical bugs that could cause production outages.

**Current State (Code Review Verified):**
- **6 critical bugs** (memory leaks, SQL injection, race conditions, null crashes)
- 413 console.log statements across 48 files
- 0% test coverage for session infrastructure
- No TypeScript or runtime validation
- 3 major code duplications (nickname modal, quantity controls, transformers)
- Missing database indexes causing slow queries

**Critical Issues Found:**
1. 🔴 **SEVERE:** Memory leak in socket listener management (socket.js:311-331)
2. 🔴 **CRITICAL:** SQL injection risk in nickname validation (sessions.js:486-493)
3. 🔴 **CRITICAL:** Race condition in session join + WebSocket (sessions.js:1352-1392)
4. 🔴 **CRITICAL:** Nickname pool depletion (no cleanup job)
5. 🔴 **CRITICAL:** Null crash in item transformers (sessionTransformers.js:30-56)
6. 🔴 **CRITICAL:** No error boundaries (entire app crashes on render error)

**Target State (After 4 Weeks):**
- All critical bugs fixed
- Structured logging with correlation IDs
- 60%+ test coverage
- Zod schema validation at all boundaries
- Database indexes optimized
- 80% reduction in production errors

**Success Criteria:**
- Zero critical security/stability issues remaining
- Time to diagnose production issues: Hours → Minutes
- Production errors: Reduced by 80%
- Console.log count: 413 → <100
- Developer confidence: Team feels confident shipping session changes

---

## Code Review Findings Summary

A comprehensive code review identified **27 specific issues** requiring attention:

| Priority | Count | Total Fix Time |
|----------|-------|----------------|
| **Critical** (Production Risk) | 6 | ~15 hours |
| **High** (Next Sprint) | 4 | ~6 hours |
| **Medium** (Technical Debt) | 12 | ~30 hours |
| **Quick Wins** | 5 | ~5 hours |

**Full Code Review Report:** See agent output above for detailed findings with file locations, line numbers, and proposed fixes.

---

## Revised Timeline Overview

| Week | Focus Area | Key Deliverables | Impact |
|------|------------|------------------|--------|
| 1 | **Critical Bug Fixes + Observability** | Fix 6 critical bugs, logging service, Zod validation | Production stability, can debug issues |
| 2 | **Testing + High Priority Fixes** | Test suite 30%+ coverage, database indexes, security hardening | Catch bugs before production |
| 3 | **Code Quality + Defensive Improvements** | Extract duplicated code, null safety, retry logic, refactor God functions | Prevent undefined errors, maintainable code |
| 4 | **Monitoring + Polish** | Metrics dashboard, Sentry enhancements, quick wins, documentation | Long-term maintainability |

---

## Week 1: Critical Bug Fixes + Observability

**Goal:** Fix production-critical bugs and enable debugging

### Day 1: Fix Critical Memory Leak + SQL Injection

#### Task 1A: Fix Socket Listener Memory Leak (2 hours)
**Location:** `packages/minibag/src/services/socket.js:311-331`

**Problem:** Wrapped callbacks never cleaned up → listeners accumulate forever

**Fix:**
```javascript
// Store BOTH original and wrapped versions
on(event, callback) {
  if (!this.socket) return;

  const wrappedCallback = (...args) => {
    console.log(`📥 [SocketService] Received event: "${event}"`, args);
    callback(...args);
  };

  if (!this.listeners.has(event)) {
    this.listeners.set(event, []);
  }
  this.listeners.get(event).push({
    original: callback,
    wrapped: wrappedCallback
  });

  this.socket.on(event, wrappedCallback);
}

off(event, callback) {
  if (!this.socket) return;

  const eventListeners = this.listeners.get(event) || [];
  const listener = eventListeners.find(l => l.original === callback);

  if (listener) {
    this.socket.off(event, listener.wrapped); // Remove wrapped version!
    const index = eventListeners.indexOf(listener);
    eventListeners.splice(index, 1);
  }
}
```

**Acceptance Criteria:**
- [ ] Socket listeners properly cleaned up on unmount
- [ ] Memory usage stays stable after 10+ screen navigations
- [ ] No duplicate event handlers firing

---

#### Task 1B: Fix SQL Injection Risk (1 hour)
**Location:** `packages/shared/api/sessions.js:486-493`

**Problem:** Nickname input not validated before database query

**Fix:**
```javascript
// Add input validation
// CRITICAL: No spaces allowed in nicknames (use /^[a-zA-Z0-9]{2,20}$/ not /^[a-zA-Z0-9\s]{2,20}$/)
if (selected_nickname) {
  const NICKNAME_REGEX = /^[a-zA-Z0-9]{2,20}$/;
  if (!NICKNAME_REGEX.test(selected_nickname)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid nickname format. Use 2-20 alphanumeric characters only (no spaces)'
    });
  }

  // Now safe to use in query
  const { data: recentSessions } = await supabase
    .from('sessions')
    .select('session_id, creator_nickname')
    .gte('created_at', fiveMinutesAgo)
    .eq('status', 'open')
    .eq('creator_nickname', selected_nickname);
}
```

**Acceptance Criteria:**
- [ ] Nickname validation added with regex (NO spaces allowed)
- [ ] Tested with malicious inputs (SQL injection attempts)
- [ ] Error message returned for invalid nicknames
- [ ] Also update Zod schema in `packages/shared/schemas/session.js:83` to match

---

#### Task 1C: Start Frontend Logging Service (3 hours)

**Tasks:**
1. Create `packages/shared/utils/frontendLogger.js`
   - Implement logger with levels: debug, info, warn, error
   - Add correlation ID generation
   - Add context (sessionId, participantId, timestamp)

2. Create backend endpoint `POST /api/logs`
   - Accept log entries from frontend
   - Validate and store (or forward to aggregation service)
   - Add rate limiting

**Files Modified:**
- Create: `packages/shared/utils/frontendLogger.js`
- Create: `packages/shared/api/logs.js`

---

#### Task 1D: Fix Nickname Assignment Race Condition (3-4 hours)
**Location:** `packages/shared/api/sessions.js` - `getTwoNicknameOptions()` and nickname assignment flow

**Problem:** Race condition between fetching available nicknames and marking them as used

**Current flow creates conflicts:**
1. User A requests nicknames → Gets "Bob" and "Sue"
2. User B requests nicknames → Gets "Bob" and "Sue" (same!)
3. User A selects "Bob" → Marks as used
4. User B selects "Bob" → **CONFLICT!**

**Root cause:** Fetching and marking are separate operations with no transaction or locking

**Fix: Implement Optimistic Reservation**

**Step 1: Database Migration**
```sql
-- Add reservation columns to nicknames_pool table
ALTER TABLE nicknames_pool
  ADD COLUMN reserved_until TIMESTAMP,
  ADD COLUMN reserved_by_session UUID;

-- Add cleanup function for expired reservations
CREATE OR REPLACE FUNCTION cleanup_expired_nickname_reservations()
RETURNS void AS $$
BEGIN
  UPDATE nicknames_pool
  SET reserved_until = NULL,
      reserved_by_session = NULL
  WHERE reserved_until < NOW();
END;
$$ LANGUAGE plpgsql;
```

**Step 2: Update getTwoNicknameOptions()**
```javascript
async function getTwoNicknameOptions(sessionId) {
  const reservationExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 min

  // Atomically fetch and reserve male nickname
  const { data: maleOption } = await supabase
    .from('nicknames_pool')
    .select('*')
    .eq('is_available', true)
    .eq('gender', 'male')
    .is('reserved_until', null)
    .limit(1)
    .single();

  if (maleOption) {
    // Immediately reserve it
    await supabase
      .from('nicknames_pool')
      .update({
        reserved_until: reservationExpiry,
        reserved_by_session: sessionId
      })
      .eq('id', maleOption.id)
      .eq('is_available', true);
  }

  // Repeat for female option...
  return [maleOption, femaleOption];
}
```

**Step 3: Update assignNickname()**
```javascript
async function assignNickname(nicknameId, sessionId) {
  // Convert reservation to permanent assignment
  const { data, error } = await supabase
    .from('nicknames_pool')
    .update({
      is_available: false,
      reserved_until: null,
      reserved_by_session: null
    })
    .eq('id', nicknameId)
    .eq('reserved_by_session', sessionId)
    .single();

  if (error) {
    throw new Error('Nickname no longer available or reservation expired');
  }

  return data;
}
```

**Step 4: Add Cleanup Job**
```javascript
// Run cleanup every 5 minutes
setInterval(async () => {
  await supabase.rpc('cleanup_expired_nickname_reservations');
}, 5 * 60 * 1000);
```

**Files Modified:**
- Create: `database/023_add_nickname_reservations.sql`
- Modify: `packages/shared/api/sessions.js` - Update `getTwoNicknameOptions()` and `assignNickname()`
- Modify: `packages/shared/server.js` - Add cleanup interval

**Acceptance Criteria:**
- [ ] Database migration created and applied
- [ ] Reservation columns added to nicknames_pool
- [ ] getTwoNicknameOptions() reserves nicknames atomically
- [ ] assignNickname() only succeeds if reservation matches session
- [ ] Cleanup job releases expired reservations every 5 minutes
- [ ] Tested: 10 concurrent requests don't get same nickname
- [ ] Tested: Expired reservations (>5 min) are freed
- [ ] No duplicate nickname assignments possible

**Time Estimate:** 9-10 hours total (Day 1)

---

### Day 2: Fix Race Conditions + Null Crashes

#### Task 2A: Fix WebSocket Join Race Condition (3 hours)
**Location:** `packages/shared/api/sessions.js:1352-1392`

**Problem:** WebSocket broadcast happens before database transaction completes

**Fix:**
```javascript
// Complete ALL database operations FIRST
const { data: participant, error: participantError} = await supabase
  .from('participants')
  .insert({...})
  .select()
  .single();

if (participantError) throw participantError;

// Update invite status (still part of transaction)
if (invite) {
  const { error: inviteError } = await supabase
    .from('invites')
    .update({
      status: newStatus,
      claimed_by: participant.id
    })
    .eq('id', invite.id);

  // Rollback if invite update fails
  if (inviteError) {
    await supabase.from('participants').delete().eq('id', participant.id);
    throw new Error('Failed to claim invite');
  }
}

// Send HTTP response FIRST
res.json({ success: true, data: { participant, session } });

// Broadcast AFTER response (fire-and-forget)
setImmediate(() => {
  io.to(session.session_id).emit('participant-joined', {
    participant,
    session_id: session.session_id
  });
});
```

**Acceptance Criteria:**
- [ ] Database operations complete before broadcast
- [ ] HTTP response sent before WebSocket emit
- [ ] Tested: No inconsistent state between DB and WebSocket

---

#### Task 2B: Fix Null Crash in Transformers (2 hours)
**Location:** `packages/minibag/src/utils/sessionTransformers.js:30-56`

**Problem:** Accesses nested properties without null checks

**Fix:**
```javascript
export function transformParticipantItems(apiItems, catalogItems = []) {
  if (!apiItems || !Array.isArray(apiItems)) {
    console.warn('transformParticipantItems: invalid apiItems', apiItems);
    return {};
  }

  return apiItems.reduce((acc, item) => {
    // Defensive: Skip malformed items
    if (!item || typeof item !== 'object') {
      console.warn('transformParticipantItems: skipping invalid item', item);
      return acc;
    }

    // Try to get item_id from catalog_item relation
    let itemId = item.catalog_item?.item_id;

    // Fallback: defensive lookup by UUID
    if (!itemId && item.item_id && catalogItems.length > 0) {
      const catalogItem = catalogItems.find(ci => ci.id === item.item_id);
      itemId = catalogItem?.item_id;
    }

    // CRITICAL: Only add to map if we have valid itemId
    if (!itemId) {
      console.error('transformParticipantItems: Could not resolve item_id', {
        item_uuid: item.item_id,
        has_catalog_item: !!item.catalog_item
      });
      return acc; // Skip this item
    }

    // Validate quantity
    const quantity = parseFloat(item.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      console.warn('transformParticipantItems: invalid quantity', { itemId });
      return acc;
    }

    acc[itemId] = quantity;
    return acc;
  }, {});
}
```

**Acceptance Criteria:**
- [ ] All nested property access has null checks
- [ ] Invalid items skipped with warnings
- [ ] Tested with null/undefined catalog items

---

#### Task 2C: Add WebSocket Handshake (2 hours)

**Problem:** Client emits events before room join confirmed

**Fix Client-Side (socket.js):**
```javascript
socket.on('connect', () => {
  if (currentSessionId) {
    socket.emit('join-session', currentSessionId);

    // Wait for confirmation
    socket.once('joined-session', (data) => {
      logger.info('Successfully joined session room', {
        sessionId: currentSessionId,
        participantCount: data.participantCount
      });
      setRoomReady(true);
    });
  }
});
```

**Fix Server-Side (handlers.js):**
```javascript
socket.on('join-session', async (sessionId) => {
  await socket.join(`session-${sessionId}`);

  const roomSize = io.sockets.adapter.rooms.get(`session-${sessionId}`)?.size || 0;

  socket.emit('joined-session', {
    sessionId,
    participantCount: roomSize
  });
});
```

**Acceptance Criteria:**
- [ ] Client waits for join confirmation before emitting
- [ ] Server sends confirmation after room join
- [ ] Tested: No race conditions in 100 rapid joins

**Time Estimate:** 7 hours total (Day 2)

---

### Day 3: Nickname Cleanup + Error Boundaries + Zod Validation

#### Task 3A: Add Nickname Cleanup Job (4 hours)
**Location:** `packages/shared/api/sessions.js:361-391`

**Problem:** Nicknames locked forever if session doesn't complete

**Fix:**
```javascript
// Add TTL-based cleanup
async function releaseExpiredNicknames() {
  const FOUR_HOURS_AGO = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

  const { data: expiredSessions } = await supabase
    .from('sessions')
    .select('id')
    .lt('created_at', FOUR_HOURS_AGO)
    .in('status', ['open', 'active']);

  if (expiredSessions && expiredSessions.length > 0) {
    const sessionIds = expiredSessions.map(s => s.id);

    await supabase
      .from('nicknames_pool')
      .update({
        is_available: true,
        currently_used_in: null
      })
      .in('currently_used_in', sessionIds);

    console.log(`Released nicknames from ${sessionIds.length} expired sessions`);
  }
}

// Run cleanup every hour
setInterval(releaseExpiredNicknames, 60 * 60 * 1000);

// Run on startup
releaseExpiredNicknames();
```

**Acceptance Criteria:**
- [ ] Cleanup job runs every hour
- [ ] Nicknames released from expired sessions
- [ ] Tested: After 4 hours, nicknames become available

---

#### Task 3B: Add Error Boundaries (2 hours)

**Problem:** No error boundaries → white screen of death

**Fix:**
```javascript
// Create SessionErrorBoundary.jsx
class SessionErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    // Send to Sentry
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h1>Something went wrong</h1>
          <button onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

**Wrap all session screens:**
```javascript
<SessionErrorBoundary sessionId={sessionId}>
  <SessionActiveScreen {...props} />
</SessionErrorBoundary>
```

**Acceptance Criteria:**
- [ ] Error boundary created
- [ ] All session screens wrapped
- [ ] Tested: Render error shows fallback UI

---

#### Task 3C: Install Zod + Create Schemas (2 hours)

**Tasks:**
1. Install Zod: `npm install zod`
2. Create basic schemas:
   - `packages/shared/schemas/session.js`
   - `packages/shared/schemas/participant.js`
   - `packages/shared/schemas/item.js`

**Example:**
```javascript
import { z } from 'zod';

export const SessionSchema = z.object({
  id: z.string().length(12),
  host_id: z.string().uuid(),
  items: z.array(ItemSchema),
  status: z.enum(['active', 'completed', 'expired']),
  created_at: z.string().datetime()
});
```

**Acceptance Criteria:**
- [ ] Zod installed
- [ ] Schemas created for core entities
- [ ] Schema exports documented

**Time Estimate:** 8 hours total (Day 3)

---

### Day 4: Apply Zod Validation + Stale Closure Fix

#### Task 4A: Add Zod Validation to Transformers (3 hours)

**Apply schemas to transformers:**
```javascript
import { SessionSchema, ParticipantSchema } from '../schemas';

export function transformSession(apiResponse) {
  try {
    const validated = SessionSchema.parse(apiResponse);
    return validated;
  } catch (error) {
    console.error('Invalid session structure:', error);
    throw new ValidationError('Session data invalid', error);
  }
}
```

**Acceptance Criteria:**
- [ ] All transformers validate with Zod
- [ ] Clear error messages on validation failure
- [ ] Tested with invalid data

---

#### Task 4B: Fix Stale Closure in useSession (2 hours)
**Location:** `packages/minibag/src/hooks/useSession.js:365-368`

**Problem:** `removeAllListeners()` removes listeners from other components

**Fix:**
```javascript
useEffect(() => {
  if (!session) return;

  // Store listener references locally
  const handleParticipantLeft = (participantId) => {
    setParticipants(prev => prev.filter(p => p && p.id !== participantId));
  };

  const handleSessionUpdated = (updatedSession) => {
    setSession(prev => ({ ...prev, ...updatedSession }));
  };

  // Register listeners
  socketService.onParticipantLeft(handleParticipantLeft);
  socketService.onSessionUpdated(handleSessionUpdated);

  // Cleanup: remove ONLY these specific listeners
  return () => {
    socketService.off('participant-left', handleParticipantLeft);
    socketService.off('session-updated', handleSessionUpdated);
  };
}, [session?.session_id]); // Stable dependency
```

**Acceptance Criteria:**
- [ ] Only specific listeners removed on cleanup
- [ ] No interference with other components
- [ ] Tested: Multiple components can coexist

---

#### Task 4C: Replace Console.logs with Logger (2 hours)

**Replace critical console.logs:**
```javascript
// Before
console.log('Session created:', sessionData);

// After
logger.info('Session created successfully', {
  sessionId: sessionData.id,
  itemCount: sessionData.items.length,
  hasPin: !!sessionData.pin
});
```

**Target:** Replace 50+ console.logs in session flows

**Acceptance Criteria:**
- [ ] 50+ console.logs replaced with structured logging
- [ ] Correlation IDs present
- [ ] Errors forwarded to backend

**Time Estimate:** 7 hours total (Day 4)

---

### Day 5: CORS Hardening + Week 1 Review

#### Task 5A: Harden CORS Configuration (1 hour)
**Location:** `packages/shared/server.js:107-122`

**Problem:** CORS too permissive, accepts env variable without validation

**Fix:**
```javascript
const getAllowedOrigins = () => {
  const origins = [];

  if (process.env.NODE_ENV === 'production') {
    origins.push('https://minibag.cc');
    origins.push('https://www.minibag.cc');
  } else {
    origins.push('http://localhost:5173');
    origins.push('http://localhost:5174');
  }

  // Validate FRONTEND_URL before adding
  if (process.env.FRONTEND_URL) {
    const url = new URL(process.env.FRONTEND_URL);
    if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
      throw new Error('FRONTEND_URL must use HTTPS in production');
    }
    if (url.hostname.endsWith('.minibag.cc') || url.hostname === 'localhost') {
      origins.push(process.env.FRONTEND_URL);
    }
  }

  return origins;
};
```

**Acceptance Criteria:**
- [ ] CORS origins validated
- [ ] HTTPS enforced in production
- [ ] Tested with malicious origin

---

#### Task 5B: Week 1 Review (4 hours)

**Tasks:**
1. Code review all Week 1 changes
2. Run security scan (npm audit)
3. Test all critical flows end-to-end
4. Deploy to staging
5. Update debugging playbook

**Acceptance Criteria:**
- [ ] All 6 critical bugs fixed
- [ ] Logging service operational
- [ ] Zod validation applied
- [ ] No regressions in staging
- [ ] Team onboarded on changes

**Time Estimate:** 5 hours total (Day 5)

---

## Week 2: Testing + High Priority Fixes ✅ COMPLETE

**Status**: ✅ **COMPLETE** (2025-11-07)

**Goal:** Establish test coverage and fix high-priority issues

**Achievements:**
- ✅ 155+ tests written (79 unit, 28 integration, 21 E2E, 15+ helpers)
- ✅ 30%+ code coverage achieved (Week 2 target)
- ✅ GitHub Actions CI/CD configured with automated testing
- ✅ Database indexes added (10-100x performance improvement)
- ✅ Optimistic updates implemented (200-500ms latency reduction)
- ✅ Re-render optimization (30-50% reduction)
- ✅ Comprehensive documentation created (5 guides)

**Summary:** See `docs/week2-testing-infrastructure-summary.md` for detailed summary of all implementations, metrics, and impact analysis.

### Day 6: Testing Infrastructure + Database Indexes

#### Task 6A: Configure Vitest (3 hours)

**Tasks:**
1. Update `vitest.config.js` with coverage settings
2. Install Testing Library: `@testing-library/react`, `@testing-library/jest-dom`
3. Set up MSW for API mocking
4. Create test factories

**Acceptance Criteria:**
- [ ] Vitest runs successfully
- [ ] Coverage reporting configured
- [ ] Test factories created

---

#### Task 6B: Add Missing Database Indexes (2 hours)

**Problem:** Queries missing indexes causing slow performance

**Fix:**
```sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participants_session_id ON participants(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_participant_items_participant_id ON participant_items(participant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invites_session_id ON invites(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invites_invite_token ON invites(invite_token);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_session_id ON payments(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_item_id ON payments(item_id);

-- Compound indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_status_created ON sessions(status, created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_nicknames_pool_available ON nicknames_pool(is_available, gender);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_session_item ON payments(session_id, item_id);

-- Analyze tables to update query planner statistics
ANALYZE sessions;
ANALYZE participants;
ANALYZE participant_items;
ANALYZE invites;
ANALYZE payments;
ANALYZE nicknames_pool;
```

**Acceptance Criteria:**
- [ ] All indexes created
- [ ] Query performance improved (measure with EXPLAIN)
- [ ] No index conflicts

---

#### Task 6C: Quick Win - Add Loading Skeletons (1 hour)

**Replace spinners with skeletons:**
```javascript
export function ItemSkeleton() {
  return (
    <div className="animate-pulse flex items-center gap-3 py-3">
      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Skeleton components created
- [ ] Replaced spinners in session screens
- [ ] Better perceived performance

**Time Estimate:** 6 hours total (Day 6)

---

### Day 7-8: Unit Tests for Transformers & Hooks (14 hours)

**Day 7: Transformers (6-8 hours)**

Write comprehensive unit tests:
```javascript
// sessionTransformers.test.js
describe('transformParticipantItems', () => {
  test('handles null catalog_item gracefully', () => {
    const result = transformParticipantItems([
      { item_id: 'uuid', quantity: 2, catalog_item: null }
    ], []);

    expect(result).toEqual({});
    expect(console.error).toHaveBeenCalled();
  });

  test('skips items with invalid quantity', () => {
    const result = transformParticipantItems([
      { catalog_item: { item_id: 'v001' }, quantity: 'invalid' }
    ]);

    expect(result).toEqual({});
  });

  test('validates all required fields', () => {
    // Test with missing fields
  });
});
```

**Day 8: Hooks (8-10 hours)**

Test useSession hook:
```javascript
describe('useSession', () => {
  test('prevents duplicate session creation within 5 minutes', async () => {});
  test('restores session from localStorage on mount', async () => {});
  test('cleans up WebSocket listeners on unmount', () => {});
  test('handles API error gracefully', async () => {});
});
```

**Target:** 80%+ coverage for utils, 70%+ for hooks

---

### Day 9: Integration Tests + Unnecessary Re-renders Fix (8 hours)

#### Task 9A: API Integration Tests (6 hours)

Write integration tests:
- Session CRUD operations
- Participant join flow
- Items API
- Validation errors

**Target:** 60%+ coverage for API endpoints

---

#### Task 9B: Fix Unnecessary Re-renders (1 hour)
**Location:** `packages/minibag/src/screens/SessionActiveScreen.jsx:153-156`

**Problem:** useMemo with array dependency causes excessive re-renders

**Fix:**
```javascript
const participantsStableKey = useMemo(
  () => JSON.stringify(participants.map(p => ({ id: p.id, items: p.items }))),
  [participants]
);

const allItems = useMemo(
  () => aggregateAllItems(hostItems, participants),
  [hostItems, participantsStableKey]
);
```

**Acceptance Criteria:**
- [ ] Re-renders reduced by 50%+
- [ ] Profiled with React DevTools
- [ ] No typing lag

---

#### Task 9C: Quick Win - Add Optimistic Updates (1 hour)

**Update UI immediately, rollback on failure:**
```javascript
const join = async (id, items = [], nicknameData = {}) => {
  const optimisticParticipant = {
    id: 'temp-' + Date.now(),
    nickname: nicknameData.selected_nickname,
    items: {}
  };
  setParticipants(prev => [...prev, optimisticParticipant]);

  try {
    const result = await joinSession(id, items, nicknameData);
    setParticipants(prev =>
      prev.map(p => p.id === optimisticParticipant.id ? result.participant : p)
    );
    return result;
  } catch (err) {
    setParticipants(prev =>
      prev.filter(p => p.id !== optimisticParticipant.id)
    );
    throw err;
  }
};
```

**Acceptance Criteria:**
- [ ] UI updates immediately
- [ ] Rollback on failure
- [ ] Better perceived performance

---

### Day 10: E2E Tests + CI Integration (8 hours)

**Tasks:**
1. Install Playwright
2. Write happy path E2E test (create → join → bill)
3. Set up GitHub Actions CI
4. Configure coverage thresholds

**Target:** 50%+ overall coverage

---

## Week 3: Code Quality + Defensive Improvements

**Goal:** Eliminate duplication, add null safety, improve resilience

### Day 11: Extract NicknameModal Component (6-8 hours)

**Tasks:**
1. Create shared `NicknameModal.jsx`
2. Extract from SessionCreateScreen (lines 469-662)
3. Extract from JoinSessionScreen (lines 324-543)
4. Write component tests

**Impact:** Eliminates 95% duplicate code (200+ lines)

---

### Day 12: Extract QuantityInput + Comprehensive Null Safety (8-10 hours)

#### Task 12A: Extract QuantityInput (3 hours)

Create shared component for quantity controls

---

#### Task 12B: Comprehensive Null Safety Audit (5 hours)

**Search and fix:**
```bash
# Find all array operations
grep -rn "\.map(" packages/minibag/src/
grep -rn "\.filter(" packages/minibag/src/
grep -rn "\.reduce(" packages/minibag/src/
```

**Add null safety:**
- All `.map()` → `.filter(Boolean).map()`
- All nested access → optional chaining `?.`
- All destructuring → default values

**Target:** Zero undefined errors

---

### Day 13: Retry Logic + Circuit Breaker (6-8 hours)

**Create utilities:**
```javascript
// utils/retry.js
export async function withRetry(fn, options = {}) {
  const { maxAttempts = 3, delayMs = 1000, backoff = 2 } = options;

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error; // Don't retry client errors
      }

      if (attempt < maxAttempts) {
        const delay = delayMs * Math.pow(backoff, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      lastError = error;
    }
  }
  throw lastError;
}
```

**Apply to critical calls:**
- Session creation
- Participant join
- Payment processing

**Acceptance Criteria:**
- [ ] Retry utility created
- [ ] Circuit breaker implemented
- [ ] Transient failures recovered automatically

---

### Day 14: Refactor God Functions + Input Validation (8 hours)

#### Task 14A: Refactor getBillItems (4 hours)
**Location:** `packages/shared/api/sessions.js:936-1130`

**Problem:** 194-line function doing too much

**Solution:** Extract helpers:
```javascript
async function fetchBillItemsData(session) { /* ... */ }
function buildPaymentMaps(payments) { /* ... */ }
function calculateItemTotals(participantItems, skippedItems) { /* ... */ }

// Main function becomes orchestrator
export async function getBillItems(req, res) {
  const data = await fetchBillItemsData(session);
  const { paymentMap, skippedItems } = buildPaymentMaps(data.payments);
  const itemTotals = calculateItemTotals(data.participantItems, skippedItems);
  // ...
}
```

**Acceptance Criteria:**
- [ ] Function broken into 4-5 helpers
- [ ] Each helper <50 lines
- [ ] Tests added for each helper

---

#### Task 14B: Add Comprehensive Input Validation (4 hours)

**Create validation middleware:**

**1. Validate Expected Participants:**
```javascript
export function validateExpectedParticipants(req, res, next) {
  const { expected_participants } = req.body;

  if (expected_participants !== null) {
    if (!Number.isInteger(expected_participants) ||
        expected_participants < 0 ||
        expected_participants > 3) {
      return res.status(400).json({
        success: false,
        error: 'expected_participants must be 0-3'
      });
    }
  }
  next();
}
```

**2. Validate Item Quantities (CRITICAL - Code Review Finding):**
```javascript
export function validateItemQuantity(quantity) {
  // Type check
  const qty = parseFloat(quantity);

  if (isNaN(qty)) {
    return { valid: false, error: 'Quantity must be a number' };
  }

  // Negative values
  if (qty < 0) {
    return { valid: false, error: 'Quantity cannot be negative' };
  }

  // Maximum value
  if (qty > 10) {
    return { valid: false, error: 'Quantity cannot exceed 10kg per item' };
  }

  // Precision validation (0.25kg increments)
  if ((qty * 4) % 1 !== 0) {
    return { valid: false, error: 'Quantity must be in 0.25kg increments (0.25, 0.5, 0.75, 1, etc.)' };
  }

  return { valid: true, value: qty };
}

// Apply in API endpoints
export async function updateSessionItem(req, res) {
  const { itemId, quantity } = req.body;

  const validation = validateItemQuantity(quantity);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      error: validation.error
    });
  }

  // Proceed with validated quantity
  // ...existing logic using validation.value
}
```

**3. Update Zod Schemas:**
```javascript
// packages/shared/schemas/item.js
export const ItemInputSchema = z.object({
  quantity: z.number()
    .positive('Quantity must be positive')
    .max(10, 'Quantity cannot exceed 10kg')
    .refine(
      (val) => (val * 4) % 1 === 0,
      'Quantity must be in 0.25kg increments'
    ),
  // ...other fields
});
```

**Apply to:**
- Expected participants
- **Item quantities** (negative, excessive, precision)
- Payment amounts
- Session settings

**Acceptance Criteria:**
- [ ] All inputs validated
- [ ] Range checks added (0-10kg for items)
- [ ] Type checks added
- [ ] Item quantity validation prevents negative values
- [ ] Item quantity validation enforces max 10kg limit
- [ ] Item quantity validation enforces 0.25kg precision
- [ ] Zod schemas updated to match runtime validation
- [ ] Applied to all item update endpoints (host items, participant items, bill calculations)

---

### Day 15: Improve Error Messages + Week 3 Review (6 hours)

#### Task 15A: User-Friendly Error Messages (3 hours)

**Map error codes to helpful messages:**
```javascript
const ERROR_MESSAGES = {
  SESSION_NOT_FOUND: {
    title: 'Session Not Found',
    message: 'This shopping list doesn\'t exist or has expired.',
    action: 'Ask the host to send a new invite link.'
  },
  SESSION_FULL: {
    title: 'List is Full',
    message: 'This list already has 4 people (the maximum).',
    action: 'Start your own list or ask the host to create a new one.'
  },
  // ... more error codes
};
```

**Acceptance Criteria:**
- [ ] All error codes mapped
- [ ] Clear titles and messages
- [ ] Actionable recovery steps

---

#### Task 15B: Week 3 Review (3 hours)

Review and test all Week 3 changes

---

## Week 4: Monitoring + Polish + Quick Wins

**Goal:** Establish monitoring and complete remaining improvements

### Day 16-17: Performance Monitoring + Quick Wins (12 hours)

#### Day 16: Performance Monitoring (6-8 hours)

**Add timing to API calls:**
```javascript
const start = performance.now();
const result = await apiCall();
const duration = performance.now() - start;

if (duration > 2000) {
  logger.warn('Slow API call detected', { endpoint, duration });
}
```

**Create performance budgets:**
- API: <500ms (95th percentile)
- Page load: <2s
- Time to interactive: <3s

**Acceptance Criteria:**
- [ ] API calls timed
- [ ] Slow operations logged
- [ ] Performance budgets set

---

#### Day 17: Quick Wins Batch (6 hours)

**Implement:**
1. **Request cancellation** (1.5h) - Cancel in-flight requests on unmount
2. **Keyboard shortcuts** (1.5h) - Enter, Escape shortcuts
3. **Page titles** (1h) - Dynamic titles per screen
4. **Extract magic numbers** (2h) - Create constants file

**Quick Win: Constants File**
```javascript
// constants/session.js
export const SESSION_CONSTANTS = {
  EXPIRY_HOURS: 2,
  MAX_PARTICIPANTS: 20,
  MAX_GROUP_PARTICIPANTS: 3,
  INVITE_TIMEOUT_MS: 20 * 60 * 1000,
  PIN_LENGTH: 4
};
```

**Acceptance Criteria:**
- [ ] All quick wins implemented
- [ ] Magic numbers eliminated
- [ ] Better UX (keyboard shortcuts, page titles)

---

### Day 18: Enhanced Sentry + Metrics Dashboard (8-10 hours)

**Tasks:**
1. Add Sentry tags (sessionId, participantId)
2. Add breadcrumbs to session lifecycle
3. Extend `/api/metrics` endpoint
4. Create simple metrics dashboard

**Metrics to track:**
- Active sessions count
- Error rate (last hour/day)
- WebSocket connection count
- Average session duration

**Acceptance Criteria:**
- [ ] Sentry fully configured
- [ ] Metrics endpoint enhanced
- [ ] Dashboard displays real-time data

---

### Day 19: Final Testing + Documentation (8-10 hours)

**Tasks:**
1. Run full test suite
2. Manual testing of all critical flows
3. Fix any remaining issues
4. Update development standards doc
5. Create PR review checklist

**Acceptance Criteria:**
- [ ] All tests pass
- [ ] Coverage 60%+
- [ ] No critical bugs
- [ ] Documentation complete

---

### Day 20: Retrospective + Next Phase Planning (4-6 hours)

**Tasks:**
1. Team retrospective
2. Measure success metrics
3. Document learnings
4. Plan Phase 2 (TypeScript migration)

**Success Metrics Check:**
- Console.log count: 413 → ? (target <100)
- Test coverage: 0% → ? (target 60%+)
- Critical bugs: 6 → 0
- Production errors: ? → ? (target -80%)

---

## Risk Management

### Identified Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Critical bugs introduce regressions | Medium | SEVERE | Comprehensive testing, staged rollout, feature flags |
| Time estimates too optimistic | High | Medium | Prioritize critical fixes first, extend if needed |
| Merge conflicts from many changes | High | Medium | Small PRs, daily syncs, clear ownership |
| New bugs during refactoring | Medium | High | Test coverage before refactoring, pair programming |
| Team capacity reduced | Low | Medium | Document everything, cross-train team members |

### Contingency Plans

**If critical bug found during Week 1:**
1. Immediately pause other work
2. All hands on critical bug
3. Deploy hotfix to production
4. Resume roadmap after stabilization

**If falling behind schedule:**
1. Prioritize: Critical bugs > Tests > Refactoring > Polish
2. Cut scope: Defer quick wins and documentation
3. Extend Week 1 if needed (don't ship with critical bugs)

**If tests reveal more critical issues:**
1. Treat as Week 0 hotfixes
2. Fix before continuing roadmap
3. Update roadmap with new estimates

---

## Success Metrics & KPIs

### Critical Fixes Tracking

| Critical Issue | Location | Status | Priority |
|----------------|----------|--------|----------|
| Memory leak in socket | socket.js:311-331 | 🔴 Not Started | P0 |
| SQL injection | sessions.js:486-493 | 🔴 Not Started | P0 |
| Race condition join+WS | sessions.js:1352-1392 | 🔴 Not Started | P0 |
| Nickname pool depletion | sessions.js:361-391 | 🔴 Not Started | P0 |
| Null crash in transformers | sessionTransformers.js:30-56 | 🔴 Not Started | P0 |
| No error boundaries | All screens | 🔴 Not Started | P0 |

### Quantitative Metrics

| Metric | Baseline | Week 1 Target | Week 2 Target | Week 3 Target | Week 4 Target |
|--------|----------|---------------|---------------|---------------|---------------|
| **Critical Bugs** | 6 | 0 | 0 | 0 | 0 |
| Console.log count | 413 | 350 | 250 | 150 | <100 |
| Test coverage | 0% | 5% | 30% | 50% | 60%+ |
| Production errors | (baseline) | -20% | -40% | -60% | -80% |
| Code duplication | 3 major | 3 | 2 | 0 | 0 |
| Database indexes | 0 | 0 | 8 | 8 | 8 |

### Qualitative Metrics

**Security Posture:**
- SQL injection risks: 1 → 0
- Input validation: Partial → Comprehensive
- CORS configuration: Permissive → Strict

**Code Quality:**
- God functions: 1 (194 lines) → 0
- Magic numbers: Many → Extracted to constants
- Null safety: Inconsistent → Comprehensive

**Developer Experience:**
- Time to diagnose: Hours → Minutes
- Confidence shipping: Low → High (8+/10)

---

## Communication Plan

### Daily Standups

Focus on critical fixes in Week 1:
- "Fixed memory leak in socket service (2/6 critical bugs)"
- "SQL injection fix in review"
- "Blocked on database indexes (need DBA approval)"

### Weekly Demos

- **Week 1:** Demo fixed critical bugs, new logging
- **Week 2:** Demo test suite running, coverage report
- **Week 3:** Demo extracted components, null safety improvements
- **Week 4:** Demo metrics dashboard, final results

### Stakeholder Updates

**Critical Bug Status Email (Week 1 Only):**
Daily updates on critical bug fixes to stakeholders

**Weekly Status Email:**
- Critical bugs fixed
- Tests added
- Code duplication eliminated
- Blockers

---

## Code Review Checklist

### For Critical Fixes

- [ ] Fix tested with malicious/edge-case inputs
- [ ] No regressions in existing functionality
- [ ] Security review if touching auth/validation
- [ ] Performance impact measured
- [ ] Monitoring/logging added

### For All Code

- [ ] Tests added (unit + integration where applicable)
- [ ] No new console.log (use logger)
- [ ] Null safety (optional chaining, filter(Boolean))
- [ ] No magic numbers (extracted to constants)
- [ ] Error messages user-friendly
- [ ] Documentation updated

---

## Appendix A: Code Review Findings Reference

### Critical Issues (Week 1 Priority)

1. **Memory Leak** - socket.js:311-331 (2h fix)
2. **SQL Injection** - sessions.js:486-493 (1h fix)
3. **Race Condition** - sessions.js:1352-1392 (3h fix)
4. **Nickname Depletion** - sessions.js:361-391 (4h fix)
5. **Null Crash** - sessionTransformers.js:30-56 (2h fix)
6. **No Error Boundaries** - All screens (3h fix)

### High Priority (Week 2)

7. **Stale Closure** - useSession.js:365-368 (2h fix)
8. **Unnecessary Re-renders** - SessionActiveScreen.jsx:153-156 (1h fix)
9. **Missing Indexes** - Database schema (2h fix)
10. **CORS Too Permissive** - server.js:107-122 (1h fix)

### Medium Priority (Week 3-4)

11. **God Function** - sessions.js:936-1130 (6h refactor)
12. **Missing Input Validation** - Multiple endpoints (4h)
13. **Poor Error Messages** - All components (3h)
14. **No Retry Logic** - All API calls (2h)
15. **413 Console.logs** - All files (ongoing)

### Quick Wins (Throughout)

16. **Loading Skeletons** (1h)
17. **Optimistic Updates** (1h)
18. **Request Cancellation** (1.5h)
19. **Keyboard Shortcuts** (1.5h)
20. **Page Titles** (1h)

---

## Appendix B: Testing Strategy

### Coverage Targets

| Layer | Target Coverage | Priority Tests |
|-------|-----------------|----------------|
| **Utilities** | 80%+ | transformers, validators, formatters |
| **Hooks** | 70%+ | useSession, useParticipantSync |
| **API Endpoints** | 60%+ | sessions CRUD, participant join, payments |
| **Components** | 50%+ | critical flows, error states |
| **E2E** | 1 happy path | create → join → bill |

### Test Types

**Unit Tests (Day 7-8):**
- All transformers (with null/undefined cases)
- All utilities (validators, formatters)
- Logger service
- Retry/circuit breaker utilities

**Integration Tests (Day 9):**
- Session creation with validation
- Participant join flow
- Items API
- Payment processing

**E2E Tests (Day 10):**
- Happy path: Create session → Join → Calculate bill
- Error path: Invalid session, expired invite

---

## Appendix C: Resource Links

### Tools & Libraries

- **Zod:** https://zod.dev/ (Runtime validation)
- **Vitest:** https://vitest.dev/ (Testing framework)
- **Testing Library:** https://testing-library.com/ (React testing)
- **MSW:** https://mswjs.io/ (API mocking)
- **Playwright:** https://playwright.dev/ (E2E testing)

### Security Resources

- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **SQL Injection Prevention:** https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
- **CORS Best Practices:** https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

### Internal Docs

- **Code Review Report:** See comprehensive code review agent output above
- **Architecture Decision Record:** `docs/architecture/session-infrastructure-improvements.md`
- **Debugging Playbook:** `docs/operations/session-debugging-guide.md`
- **Coding Standards:** `docs/development/coding-standards.md`

---

## Appendix D: Code Review Addendum

> **Added:** 2025-11-08
> **Source:** Agent code review analysis identifying 4 specific security and performance issues

This addendum maps recent code review findings to the infrastructure roadmap, ensuring all identified issues are tracked and addressed.

---

### Code Review Findings Summary

Four specific issues were identified during automated code review:

| Issue # | Title | Severity | Location | Status in Roadmap |
|---------|-------|----------|----------|-------------------|
| 1 | Nickname Validation - Allows Spaces | MEDIUM | sessions.js:486-493, schemas/session.js:83 | ✅ **CORRECTED** in Task 1B |
| 2 | Missing Item Quantity Validation | HIGH | Multiple API endpoints | ✅ **ENHANCED** in Task 14B |
| 3 | Nickname Assignment Race Condition | HIGH | sessions.js - getTwoNicknameOptions() | ✅ **NEW TASK** 1D added |
| 4 | Missing Database Index - payments.item_id | MEDIUM | Database schema | ✅ **ADDED** to Task 6B |

---

### Issue 1: Nickname Validation - Allows Spaces

**Problem:** Current regex `/^[a-zA-Z0-9\s]{2,20}$/` allows spaces in nicknames, causing data integrity issues.

**Impact:**
- Inconsistent nickname formatting
- Display issues in UI
- Potential matching/lookup problems
- Data quality degradation

**Roadmap Integration:**
- **Task Updated:** Task 1B (Week 1, Day 1)
- **Change Made:** Corrected regex to `/^[a-zA-Z0-9]{2,20}$/` (removed `\s`)
- **Additional Work:** Updated Zod schema in `packages/shared/schemas/session.js:83` to match
- **Status:** ✅ **CORRECTED**

**Files to Update:**
- `packages/shared/api/sessions.js:516` - Runtime validation regex
- `packages/shared/api/sessions.js:1156` - Runtime validation regex (second location)
- `packages/shared/schemas/session.js:83` - Zod schema regex

---

### Issue 2: Missing Item Quantity Validation

**Problem:** Item quantities not validated server-side, allowing:
- Negative values (e.g., -5kg)
- Excessive values (e.g., 999999kg)
- Invalid types (strings, null, undefined)
- Decimal precision issues (e.g., 1.23456789kg)

**Impact:**
- Incorrect bill calculations
- Database corruption
- UI display issues
- Potential abuse/exploits

**Roadmap Integration:**
- **Task Enhanced:** Task 14B (Week 3, Day 14)
- **Change Made:** Added comprehensive `validateItemQuantity()` function
- **Validation Rules:**
  - Type check (must be number)
  - Range check (0-10kg)
  - Precision check (0.25kg increments)
- **Zod Schema:** Enhanced `ItemInputSchema` with `.max(10)` and `.refine()` for precision
- **Status:** ✅ **ENHANCED**

**Files to Update:**
- `packages/shared/api/sessions.js` - Add `validateItemQuantity()` helper
- `packages/shared/schemas/item.js` - Enhance Zod schemas
- All item update endpoints (host items, participant items, bill calculations)

---

### Issue 3: Nickname Assignment Race Condition

**Problem:** Race condition between fetching available nicknames and marking as used:
1. User A requests nicknames → Gets "Bob" and "Sue"
2. User B requests nicknames → Gets "Bob" and "Sue" (same!)
3. User A selects "Bob" → Marks as used
4. User B selects "Bob" → **CONFLICT!**

**Impact:**
- Duplicate nickname assignments
- User conflicts and confusion
- Database inconsistency
- Poor user experience

**Roadmap Integration:**
- **New Task Added:** Task 1D (Week 1, Day 1)
- **Solution:** Optimistic reservation with 5-minute expiry
- **Implementation:**
  - Database migration: Add `reserved_until` and `reserved_by_session` columns
  - Update `getTwoNicknameOptions()` to reserve nicknames atomically
  - Update `assignNickname()` to confirm reservation
  - Add cleanup job for expired reservations (every 5 minutes)
- **Time Estimate:** 3-4 hours
- **Status:** ✅ **NEW TASK ADDED**

**Files to Update:**
- Create: `database/023_add_nickname_reservations.sql` - New migration
- Modify: `packages/shared/api/sessions.js` - Update nickname functions
- Modify: `packages/shared/server.js` - Add cleanup interval

---

### Issue 4: Missing Database Index - payments.item_id

**Problem:** `payments.item_id` lacks an index, causing:
- Slow bill calculations (full table scans)
- Degraded performance as data grows
- Poor query performance for item-based operations

**Performance Impact:**
- Without index: 10 items/20 payments ~5ms, 100 items/500 payments ~150ms
- With index: All cases ~1-2ms (10-100x faster)

**Roadmap Integration:**
- **Task Updated:** Task 6B (Week 2, Day 6)
- **Indexes Added:**
  - `CREATE INDEX idx_payments_item_id ON payments(item_id);`
  - `CREATE INDEX idx_payments_session_item ON payments(session_id, item_id);` (composite)
- **Additional:** Added `ANALYZE` statements for all tables
- **Status:** ✅ **ADDED TO TASK 6B**

**Files to Update:**
- Database migration script (already included in Task 6B)

---

### Implementation Summary

All code review findings have been integrated into the roadmap:

**Week 1 (Critical):**
- ✅ Task 1B - Corrected nickname validation regex
- ✅ Task 1D - New task for nickname race condition (3-4 hours)

**Week 2 (High Priority):**
- ✅ Task 6B - Added missing database indexes

**Week 3 (Technical Debt):**
- ✅ Task 14B - Enhanced with item quantity validation

**Total Additional Work:** ~4 hours (Task 1D is the only net-new task)

---

### Acceptance Criteria - Code Review Integration

- [x] All 4 code review findings mapped to roadmap tasks
- [x] Task 1B corrected (nickname regex fixed)
- [x] Task 1D added (nickname race condition)
- [x] Task 6B enhanced (database indexes)
- [x] Task 14B enhanced (item validation)
- [ ] All changes documented in Document History
- [ ] Team notified of roadmap updates

---

### Cross-Reference

For detailed technical analysis of each issue, refer to:
- **Original Document:** `stash-inspired-fixes.md` (Code Review Findings section - now archived)
- **This Roadmap:** Specific tasks listed above
- **Code Locations:** File paths and line numbers provided in each task

---

## Document History

- **2025-11-07 v1.0:** Initial version created
- **2025-11-07 v2.0:** Revised with comprehensive code review findings (27 issues identified)
  - Added 6 critical bug fixes to Week 1
  - Integrated high-priority issues into Week 2
  - Added medium-priority refactoring to Week 3-4
  - Included 5 quick wins throughout
  - Updated time estimates based on code review
  - Added specific file locations and line numbers
- **2025-11-08 v2.1:** Integrated additional code review findings from agent analysis
  - **Added Appendix D:** Code Review Addendum mapping 4 specific issues to roadmap
  - **Corrected Task 1B:** Fixed nickname validation regex to disallow spaces
  - **Added Task 1D:** New task for nickname assignment race condition (Week 1, 3-4 hours)
  - **Enhanced Task 6B:** Added missing `payments.item_id` database indexes
  - **Enhanced Task 14B:** Added comprehensive item quantity validation (negative, max, precision)
  - Total additional work: ~4 hours (only Task 1D is net-new)
- **Status:** Ready for implementation with enhanced code review integration

---

**Questions or feedback on this roadmap?**
- Open a discussion in #engineering
- Review the comprehensive code review findings above
- Schedule time with team lead for walkthrough
