# Architecture Decision Record: Session Infrastructure Improvements

**Date:** 2025-11-07
**Status:** Proposed
**Deciders:** Engineering Team
**Priority:** Critical

---

## Executive Summary

Our session management system has experienced a cascade of production bugs stemming from systemic architectural gaps rather than isolated coding errors. Analysis of recent commits reveals a pattern: **incomplete refactors, missing validation, race conditions, and extensive code duplication** have made the system fragile and difficult to debug.

**Key Metrics:**
- 413 console.log statements across 48 files
- 0% test coverage for session infrastructure
- No TypeScript or runtime validation
- 5 critical bugs fixed in last 5 commits
- Extensive code duplication (nickname modal, quantity controls, API transformers)

**Root Cause:** Reactive development without architectural safeguards - we fix bugs individually without addressing underlying systemic issues.

**Proposed Solution:** Implement comprehensive infrastructure improvements over 4-week tactical sprint focusing on observability, validation, testing, and code quality.

---

## Context & Problem Statement

### Current Architecture

Our session management system is built on:

**Frontend Stack:**
- React (Vite) with functional components and hooks
- WebSocket (Socket.IO) for real-time sync
- localStorage for session persistence (2-hour expiry)
- No state management library (prop drilling)
- No TypeScript, PropTypes, or runtime validation

**Backend Stack:**
- Express.js with Node.js
- Supabase (PostgreSQL) database
- Socket.IO for WebSocket rooms
- Pino structured logging (backend only)
- Sentry error tracking

**Session Lifecycle:**
```
Creation: User fills items → API creates session → Returns data → WebSocket join → Navigate
Join: User clicks invite → Validates → Creates participant → Broadcasts → WebSocket join
Active: Real-time sync via WebSocket → State updates via hooks → localStorage persistence
Payment: Calculate bills → Process payments → Update statuses → Close session
```

### Problems Identified

#### 1. Undefined Value Propagation

**Pattern:** Data flows through multiple layers without validation, allowing undefined/null values to propagate until they cause runtime errors.

**Examples from Recent Bugs:**
```javascript
// Commit a52acb8: Destructuring undefined
const { error } = await markNicknameAsUsed(...);  // Crashes if undefined returned

// useSession.js:352: No null check
setParticipants(prev => prev.filter(p => p.id !== participantId));  // Crashes if p is undefined

// sessionTransformers.js:28: Silent failure
if (!apiItems || !Array.isArray(apiItems)) {
  return {};  // Returns empty object, error propagates silently
}
```

**Root Cause:** No schema validation at layer boundaries (API → transformers → hooks → components).

#### 2. Race Conditions

**WebSocket Room Join Race:**
```javascript
// sessions.js:1375-1381
if (roomSize === 0) {
  console.log('⚠️ Room empty (race condition), using global broadcast fallback');
  io.emit('participant-joined', { ... });  // Workaround, not solution
}
```

**Problem:** Host's socket might not be in room when participant joins, causing missed events.

**Other Race Conditions:**
- Session restoration can trigger multiple times
- Participant sync handlers can re-register during updates
- WebSocket reconnection can emit duplicate events

#### 3. Code Duplication

**Major Duplications:**
1. **Nickname Selection Modal** - 95% identical in:
   - `SessionCreateScreen/index.jsx` (lines 469-662)
   - `JoinSessionScreen/index.jsx` (lines 324-543)

2. **Item Quantity Controls** - Duplicated in:
   - `SessionCreateScreen/index.jsx` (lines 345-415)
   - `SessionActiveScreen.jsx` (lines 331-396)

3. **API Response Transformation** - Repeated in:
   - `sessionTransformers.js`
   - `useSession.js`
   - `minibag-ui-prototype.tsx`

**Impact:** Bug fixes must be applied in multiple places, increasing risk of inconsistency.

#### 4. Inadequate Error Handling

**Frontend Issues:**
- Errors caught but swallowed silently (no user feedback)
- No retry logic for transient failures
- No circuit breaker for repeated failures
- Error boundaries exist but minimally used

**Example:**
```javascript
// useSession.js:98-100
catch (err) {
  console.error('Failed to restore session:', err);
  clearPersistedSession();
  return false;  // Silent failure, user sees nothing
}
```

**Backend Issues:**
- Error middleware exists but inconsistent error response formats
- No error classification (retryable vs fatal)
- Transaction support missing (no rollback on partial failures)

#### 5. Poor Observability

**Frontend:**
- 413 console.log statements (excessive debugging left in code)
- No structured logging
- No performance timing
- No correlation IDs

**Backend:**
- Structured logging exists (Pino) ✓
- Sentry error tracking ✓
- Missing: APM, real-time dashboards, alerting, distributed tracing

**Result:** Cannot diagnose production issues effectively - "What happened to session X?" is difficult to answer.

#### 6. No Testing Infrastructure

**Current State:**
- 1 test file found: `emojiMap.test.js` (2 tests with TODO comments)
- No unit tests for hooks, transformers, or services
- No integration tests for API endpoints
- No E2E tests for session lifecycle
- Vitest configured but unused

**Impact:** Bugs discovered in production, not during development.

---

## Analysis of Recent Bug Cascade

### Commit Timeline (Last 5 Fixes)

#### 1. Commit 101ff71: "fix(join): resolve participant join modal rendering and state issues"

**Bug:** Modal existed in DOM but rendered off-screen (invisible to users)

**Root Cause:** Referenced non-existent CSS class `animate-slide-up`

**Pattern:** Incomplete refactor - animation class removed but references not updated

**Fix:** Removed undefined class + lifted state to parent with refs

**Prevention Needed:** Component tests would catch missing CSS classes

---

#### 2. Commit a52acb8: "fix(session): resolve critical session creation and items display issues"

**5 Interconnected Bugs:**

1. **Non-existent method:** `supabase.raw()` called but doesn't exist
2. **Destructuring error:** After refactor changed return type
3. **Database schema mismatch:** Query selected non-existent column `created_at`
4. **Missing API validation:** Response structure not validated before use
5. **Undefined participants:** WebSocket handlers didn't check for undefined in arrays

**Root Cause:** Cascading failure from incomplete refactor without schema validation

**Pattern:** Changed one layer without updating all dependent layers

**Fix:** Multi-layer defensive checks, read-then-update pattern

**Prevention Needed:** TypeScript + Zod schemas + integration tests

---

#### 3. Commit 6e1a2f7: "feat(nicknames): enhance nickname system with first-letter matching and immediate release"

**Pattern:** Feature addition without backward compatibility testing

**Impact:** Likely broke existing flows (specifics not in commit message)

**Prevention Needed:** E2E tests for critical flows before shipping

---

#### 4. Commit 11813c0: "fix(join): resolve 'Not Coming' navigation and modal feedback issues"

**Bug:** "Not Coming" flow had unclear user feedback

**Pattern:** UX polish after initial feature worked

**Root Cause:** Edge case not considered in initial implementation

**Prevention Needed:** User flow testing, clearer acceptance criteria

---

#### 5. Commit 3177f88: "fix(cache): implement comprehensive no-cache policy to prevent stale data"

**Bug:** Browser caching API responses, showing stale session data

**Root Cause:** Missing cache headers on API routes

**Pattern:** Non-functional requirement (caching) not considered initially

**Fix:** Added comprehensive no-cache headers (server.js:146-153)

**Prevention Needed:** Architecture review checklist for new endpoints

---

### Common Themes

1. **Incomplete Refactors** - Changed signatures but missed call sites
2. **Missing Validation** - Assumed data exists when it might not
3. **Frontend-Backend Contract Violations** - API returns different shape than expected
4. **State Management Issues** - Race conditions, stale closures, undefined in arrays
5. **Copy-Paste Errors** - Duplicated code with modifications, bugs in one copy

---

## Decision Drivers

### Must Solve (Critical)

1. **Production Debugging Capability** - "Why did session X fail?" must be answerable
2. **Prevent Undefined Value Crashes** - Data must be validated at boundaries
3. **Fix Race Conditions** - WebSocket and state management must be deterministic
4. **Enable Safe Refactoring** - Tests must catch regressions before production

### Should Solve (High Priority)

1. **Reduce Code Duplication** - Single source of truth for shared components
2. **Improve Developer Experience** - Clear patterns, helpful error messages
3. **Establish Quality Gates** - Automated checks prevent bad code from merging

### Nice to Have (Medium Priority)

1. **Type Safety** - TypeScript for compile-time validation
2. **Performance Monitoring** - Identify slow operations proactively
3. **Feature Flags** - Safer rollouts, quick rollbacks

---

## Considered Options

### Option 1: Incremental Improvements (Recommended)

**Approach:** Add infrastructure gradually over 4 weeks while maintaining feature velocity

**Week 1: Observability & Validation**
- Frontend logging service (structured, correlation IDs, backend aggregation)
- Zod schemas for Session/Participant/Item/API responses
- Fix critical race conditions (WebSocket, session restoration)

**Week 2: Testing Foundation**
- Configure Vitest with coverage
- Unit tests for transformers, hooks, utils
- Integration tests for critical API endpoints
- E2E test for happy path (create → join → pay)

**Week 3: Defensive Improvements**
- Add null safety to all array operations
- Extract duplicated components (nickname modal, quantity controls)
- Error boundaries on session screens
- Retry logic for API calls

**Week 4: Monitoring & Quality**
- Enhanced Sentry breadcrumbs
- Performance timing for slow operations
- Metrics dashboard (active sessions, error rates)
- Development standards documentation

**Pros:**
- Maintains feature velocity
- Risk is spread over time
- Team learns incrementally
- Immediate value from each week's work

**Cons:**
- Longer total timeline
- Requires discipline to not skip steps
- Some technical debt remains until completion

---

### Option 2: Big Bang Rewrite

**Approach:** Pause features for 2-3 weeks, rewrite session infrastructure with TypeScript + Redux + full test coverage

**Pros:**
- Clean slate, no legacy baggage
- All improvements at once
- Consistent patterns throughout

**Cons:**
- High risk (might introduce new bugs)
- Complete feature freeze (business impact)
- Difficult to test rewrite incrementally
- May over-engineer for current needs

**Decision:** Rejected - too risky and disruptive

---

### Option 3: Band-Aid Fixes Only

**Approach:** Continue fixing bugs reactively as they appear

**Pros:**
- Zero upfront investment
- Maintains maximum feature velocity short-term

**Cons:**
- Technical debt compounds
- Bug rate will increase over time
- Eventually hits crisis point requiring full rewrite
- Team morale suffers from constant firefighting

**Decision:** Rejected - unsustainable, already experiencing pain

---

## Decision: Option 1 (Incremental Improvements)

### Rationale

1. **Balances Risk & Reward** - Improvements deliver value weekly without stopping features
2. **Addresses Root Causes** - Fixes systemic issues, not just symptoms
3. **Team Buy-In** - Smaller changes easier to review and adopt
4. **Measurable Progress** - Can track metrics (console.log count, test coverage, error rates)
5. **Reversible** - Can pause if urgent features needed

### Key Architectural Changes

#### 1. Add Validation Layer (Zod)

**Before:**
```javascript
function transformParticipantItems(apiItems, catalogItems = []) {
  if (!apiItems || !Array.isArray(apiItems)) {
    console.log('⚠️ transformParticipantItems: apiItems is invalid', apiItems);
    return {};  // Silent failure
  }
  // ... process
}
```

**After:**
```typescript
import { z } from 'zod';

const ItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  price: z.number().nonnegative(),
});

const SessionSchema = z.object({
  id: z.string().length(12),
  host_id: z.string().uuid(),
  items: z.array(ItemSchema),
  status: z.enum(['active', 'completed', 'expired']),
});

function transformSession(apiResponse) {
  const validated = SessionSchema.parse(apiResponse);  // Throws on invalid
  return validated;
}
```

**Benefits:**
- Fails fast at boundaries
- Clear error messages
- Self-documenting schemas
- Runtime + TypeScript integration

---

#### 2. Structured Logging Service

**Implementation:**
```javascript
// packages/shared/utils/frontendLogger.js
class FrontendLogger {
  constructor() {
    this.correlationId = generateCorrelationId();
    this.sessionId = null;
  }

  setSessionId(sessionId) {
    this.sessionId = sessionId;
  }

  log(level, message, context = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: this.correlationId,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...context,
    };

    // Console for development
    console[level === 'error' ? 'error' : 'log'](
      `[${level.toUpperCase()}]`,
      message,
      context
    );

    // Send critical logs to backend
    if (level === 'error' || level === 'warn') {
      this.sendToBackend(logEntry);
    }
  }

  info(message, context) { this.log('info', message, context); }
  warn(message, context) { this.log('warn', message, context); }
  error(message, context) { this.log('error', message, context); }
  debug(message, context) { this.log('debug', message, context); }

  async sendToBackend(logEntry) {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry),
      });
    } catch (err) {
      // Silent failure to avoid infinite loop
    }
  }
}

export const logger = new FrontendLogger();
```

**Usage:**
```javascript
// Before
console.log('Session created:', sessionData);

// After
logger.info('Session created successfully', {
  sessionId: sessionData.id,
  itemCount: sessionData.items.length,
  hasPin: !!sessionData.pin,
});
```

---

#### 3. Fix WebSocket Race Conditions

**Problem:** Room might be empty when broadcast fires

**Solution:** Add handshake pattern

```javascript
// Client-side (socket.js)
socket.on('connect', () => {
  if (currentSessionId) {
    socket.emit('join-session', currentSessionId);

    // Wait for confirmation before considering connected
    socket.once('joined-session', (data) => {
      logger.info('Successfully joined session room', {
        sessionId: currentSessionId,
        participantCount: data.participantCount,
      });
      setRoomReady(true);
    });
  }
});

// Server-side (handlers.js)
socket.on('join-session', async (sessionId) => {
  await socket.join(`session-${sessionId}`);

  const roomSize = io.sockets.adapter.rooms.get(`session-${sessionId}`)?.size || 0;

  socket.emit('joined-session', {
    sessionId,
    participantCount: roomSize,
  });

  logger.info('Socket joined session room', {
    sessionId,
    socketId: socket.id,
    roomSize,
  });
});
```

---

#### 4. Component Extraction Pattern

**Duplicate:** Nickname selection modal

**Solution:** Extract to shared component

```javascript
// packages/minibag/src/components/shared/NicknameModal.jsx
export function NicknameModal({
  isOpen,
  onClose,
  onSelect,
  availableNicknames,
  selectedLanguage,
}) {
  // Single source of truth for nickname selection
  // Used by both SessionCreateScreen and JoinSessionScreen
}
```

**Benefits:**
- Fix bugs once
- Consistent UX
- Easier to test
- Clearer ownership

---

#### 5. Testing Strategy

**Unit Tests (Target: 70% coverage)**
- All transformers (sessionTransformers.js)
- All hooks (useSession, useParticipantSync, useExpectedParticipants)
- All utilities (emojiMap, validation helpers)

**Integration Tests**
- Session creation API
- Participant join API
- Payment processing API
- WebSocket event handlers

**E2E Tests (Critical Flows)**
- Happy path: Create session → Add items → Share invite → Join → Complete payment
- Error path: Join expired session, invalid PIN, full session
- Edge case: Network disconnection and reconnection

**Tools:**
- Vitest (unit/integration)
- Testing Library (React components)
- MSW (API mocking)
- Playwright (E2E)

---

## Implementation Plan

### Week 1: Observability & Validation (Days 1-5)

**Day 1:**
- Create frontend logging service
- Add `/api/logs` backend endpoint
- Replace console.logs in session creation flow

**Day 2:**
- Install Zod
- Create schemas for Session, Participant, Item
- Add validation to sessionTransformers.js

**Day 3:**
- Fix WebSocket race conditions (handshake pattern)
- Fix session restoration race (debouncing)
- Add null safety to participant arrays

**Day 4:**
- Add error boundaries to session screens
- Improve error messages for users
- Add Sentry breadcrumbs to session lifecycle

**Day 5:**
- Documentation: Debugging playbook
- Team review & feedback

---

### Week 2: Testing Foundation (Days 6-10)

**Day 6:**
- Configure Vitest with coverage reporting
- Set up Testing Library
- Create test utilities (mock factories)

**Day 7:**
- Write unit tests for sessionTransformers
- Write unit tests for useSession hook
- Target: 30% coverage

**Day 8:**
- Set up MSW for API mocking
- Write integration tests for session creation API
- Write integration tests for participant join API

**Day 9:**
- Install Playwright
- Write E2E test for happy path
- Set up CI to run tests

**Day 10:**
- Review coverage gaps
- Write tests for critical paths
- Target: 50% coverage

---

### Week 3: Defensive Improvements (Days 11-15)

**Day 11:**
- Extract NicknameModal to shared component
- Update SessionCreateScreen to use shared modal
- Update JoinSessionScreen to use shared modal

**Day 12:**
- Extract QuantityInput to shared component
- Add null safety to all `.map()` and `.filter()` operations
- Add optional chaining to all nested object access

**Day 13:**
- Create retry logic utility
- Add retry to critical API calls
- Add loading states with timeouts

**Day 14:**
- Create API response validation HOC
- Add circuit breaker for repeated failures
- Improve error handling in catch blocks

**Day 15:**
- Code review across session files
- Identify remaining duplication
- Refactor where high value

---

### Week 4: Monitoring & Documentation (Days 16-20)

**Day 16:**
- Add performance timing to API calls
- Create `/api/metrics` dashboard endpoint
- Log slow operations (>2s threshold)

**Day 17:**
- Enhanced Sentry configuration
- Add custom context to Sentry events
- Set up error rate alerts

**Day 18:**
- Create simple metrics dashboard
- Show: active sessions, error rates, avg session duration
- Add WebSocket health monitoring

**Day 19:**
- Write development standards document
- Write coding patterns guide
- Create PR review checklist

**Day 20:**
- Team retrospective
- Measure success metrics
- Plan next phase (TypeScript migration)

---

## Success Metrics

### Week 1 Targets
- [ ] Frontend logging service implemented and used in 10+ places
- [ ] Zod schemas created for all core data types
- [ ] 0 WebSocket race condition failures in testing
- [ ] 100+ console.logs replaced with structured logging

### Week 2 Targets
- [ ] 30%+ test coverage
- [ ] All transformers and hooks have unit tests
- [ ] 3+ critical API endpoints have integration tests
- [ ] 1 E2E test for session creation → payment flow

### Week 3 Targets
- [ ] Nickname modal duplication eliminated
- [ ] 0 undefined errors in session screens (with tests to prove)
- [ ] All API calls have retry logic
- [ ] Error boundaries deployed on session screens

### Week 4 Targets
- [ ] Metrics dashboard showing real-time session data
- [ ] Sentry configured with breadcrumbs for session lifecycle
- [ ] Development standards documented
- [ ] Team trained on new patterns

### Overall Success Criteria
- [ ] Console.log count: 413 → <100
- [ ] Test coverage: 0% → 60%+
- [ ] Production errors from sessions: Reduced by 80%
- [ ] Time to diagnose production issue: Reduced from hours → minutes
- [ ] Code duplication: 3 major duplications → 0
- [ ] Developer confidence: Team feels confident shipping session changes

---

## Consequences

### Positive

1. **Debuggability** - Production issues become diagnosable with correlation IDs and structured logs
2. **Reliability** - Validation catches errors at boundaries before they cascade
3. **Maintainability** - Tests enable confident refactoring, duplication elimination improves clarity
4. **Developer Experience** - Clear patterns reduce cognitive load, debugging playbook helps new team members
5. **Foundation for Scale** - Infrastructure ready for TypeScript migration, state management library, APM tools

### Negative

1. **Short-term Velocity** - Features will ship ~20% slower during 4-week improvement period
2. **Learning Curve** - Team must learn Zod, Testing Library, new patterns
3. **Code Churn** - Many files will change, merge conflicts likely
4. **Incomplete State** - During transition, mix of old/new patterns (requires discipline)

### Mitigations

1. **Communicate Timeline** - Stakeholders informed of temporary velocity reduction
2. **Pair Programming** - Share knowledge of new tools/patterns
3. **Small PRs** - Break work into reviewable chunks to reduce conflict risk
4. **Standards Doc** - Clear guidance prevents inconsistent adoption

---

## Related Decisions

- **TypeScript Migration** (Planned for Month 2) - This ADR establishes runtime validation as prerequisite
- **State Management** (Future) - Current improvements make Zustand/Redux adoption cleaner
- **Monitoring/APM** (Future) - Logging service and metrics dashboard are stepping stones to DataDog/New Relic

---

## References

- Codebase Analysis: /packages/minibag/src (session screens, hooks, services)
- Recent Commits: 101ff71, a52acb8, 6e1a2f7, 11813c0, 3177f88
- Git Status: 19 modified files on branch `refactor/phase3-day-7`
- Tech Stack: React, Express, Supabase, Socket.IO, Sentry, Pino

---

## Appendix: Alternative Approaches Considered

### A. Add TypeScript First

**Rationale:** Type safety prevents many of the bugs we've seen

**Rejected Because:**
- TypeScript doesn't catch runtime issues (API returns invalid data)
- No tests means TypeScript just moves errors to different layer
- Logging/monitoring still missing, debugging still hard
- Better to add runtime validation (Zod) which works with/without TypeScript

**Future:** TypeScript migration planned for Month 2, after runtime validation and tests are in place

---

### B. Adopt Redux/Zustand Now

**Rationale:** State management issues contribute to bugs

**Rejected Because:**
- Doesn't solve validation, logging, or testing gaps
- Requires larger refactor (every component that uses useSession)
- Better to fix data quality issues first, then improve state management
- Current hook pattern works adequately with defensive improvements

**Future:** State management library planned for Month 3-4, after stabilization

---

### C. Rewrite Frontend in Next.js/Remix

**Rationale:** Modern framework might prevent some issues

**Rejected Because:**
- Massive rewrite risk
- Doesn't address backend validation, WebSocket races, or testing gaps
- Framework doesn't prevent bugs from missing validation
- Vite + React is not the problem

**Future:** Not planned - current stack is adequate with proper infrastructure

---

## Document History

- **2025-11-07:** Initial version based on comprehensive codebase analysis
- **Status:** Proposed - Awaiting team review and approval
