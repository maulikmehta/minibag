# Development Standards & Coding Patterns

**Version:** 1.0
**Last Updated:** 2025-11-07
**Status:** Approved for Session Infrastructure
**Applies To:** All session-related code (frontend & backend)

---

## Overview

This document establishes coding standards and patterns for session management infrastructure to prevent common bugs, improve maintainability, and ensure consistency across the codebase.

**Goals:**
1. Prevent undefined value errors
2. Ensure consistent error handling
3. Improve debuggability with structured logging
4. Maintain test coverage
5. Enable safe refactoring

---

## Table of Contents

1. [Null Safety](#null-safety)
2. [Error Handling](#error-handling)
3. [Logging Guidelines](#logging-guidelines)
4. [Testing Requirements](#testing-requirements)
5. [WebSocket Patterns](#websocket-patterns)
6. [State Management](#state-management)
7. [API Design](#api-design)
8. [Code Review Checklist](#code-review-checklist)
9. [File Organization](#file-organization)
10. [Performance Guidelines](#performance-guidelines)

---

## Null Safety

### Rule 1: Always Validate Data at Boundaries

**Boundaries are:**
- API responses → Frontend transformers
- Database queries → API handlers
- Props → Components
- Hook return values → Components

**Pattern:**

```javascript
// ❌ BAD: Assuming data exists
function SessionScreen({ sessionId }) {
  const session = useSession(sessionId);

  return (
    <div>
      <h1>{session.name}</h1>  {/* Crashes if session undefined */}
      <ItemList items={session.items} />  {/* Crashes if session undefined */}
    </div>
  );
}

// ✅ GOOD: Defensive checks
function SessionScreen({ sessionId }) {
  const session = useSession(sessionId);

  if (!session) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <h1>{session.name}</h1>
      <ItemList items={session.items ?? []} />
    </div>
  );
}

// ✅ BETTER: Validate with schema (future)
function SessionScreen({ sessionId }) {
  const session = useSession(sessionId);

  if (!session) {
    return <LoadingSpinner />;
  }

  try {
    const validated = SessionSchema.parse(session);
    return <SessionUI session={validated} />;
  } catch (err) {
    logger.error('Invalid session structure', { sessionId, error: err.message });
    return <ErrorMessage message="Session data invalid" />;
  }
}
```

### Rule 2: Use Optional Chaining for Nested Access

```javascript
// ❌ BAD: Multiple checks
if (session && session.host && session.host.name) {
  console.log(session.host.name);
}

// ✅ GOOD: Optional chaining
console.log(session?.host?.name ?? 'Unknown');

// ❌ BAD: Array access without check
const firstItem = session.items[0].name;

// ✅ GOOD: Safe array access
const firstItem = session?.items?.[0]?.name ?? 'No items';
```

### Rule 3: Filter Out Undefined/Null in Arrays

```javascript
// ❌ BAD: Assuming all elements valid
participants.map(p => p.name)  // Crashes if any p is undefined

// ✅ GOOD: Filter first
participants.filter(Boolean).map(p => p.name)

// ✅ GOOD: Optional chaining in map
participants.map(p => p?.name).filter(Boolean)

// ❌ BAD: Array methods without validation
const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

// ✅ GOOD: Filter and validate
const totalQuantity = items
  .filter(Boolean)
  .filter(item => typeof item.quantity === 'number')
  .reduce((sum, item) => sum + item.quantity, 0);
```

### Rule 4: Provide Default Values

```javascript
// ❌ BAD: Undefined propagates
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
const total = calculateTotal(session.items);  // Crashes if items undefined

// ✅ GOOD: Default empty array
function calculateTotal(items = []) {
  return items
    .filter(Boolean)
    .reduce((sum, item) => sum + (item.price ?? 0), 0);
}
const total = calculateTotal(session?.items);

// ✅ GOOD: Nullish coalescing
const itemCount = session?.items?.length ?? 0;
const participantName = participant?.name ?? 'Guest';
```

### Rule 5: Validate Function Arguments

```javascript
// ❌ BAD: Assume arguments valid
function addParticipant(sessionId, participantData) {
  return api.post(`/sessions/${sessionId}/participants`, participantData);
}

// ✅ GOOD: Validate arguments
function addParticipant(sessionId, participantData) {
  if (!sessionId || typeof sessionId !== 'string') {
    throw new TypeError('sessionId must be a non-empty string');
  }

  if (!participantData || !participantData.name) {
    throw new TypeError('participantData must have name property');
  }

  return api.post(`/sessions/${sessionId}/participants`, participantData);
}

// ✅ BETTER: Use schema validation (future)
function addParticipant(sessionId, participantData) {
  const validated = ParticipantInputSchema.parse({ sessionId, ...participantData });
  return api.post(`/sessions/${sessionId}/participants`, validated);
}
```

---

## Error Handling

### Rule 1: Never Swallow Errors Silently

```javascript
// ❌ BAD: Silent failure
async function loadSession(sessionId) {
  try {
    const response = await api.get(`/sessions/${sessionId}`);
    return response.data;
  } catch (err) {
    console.error('Failed to load session:', err);
    return null;  // User sees nothing, doesn't know what happened
  }
}

// ✅ GOOD: Log and notify user
async function loadSession(sessionId) {
  try {
    const response = await api.get(`/sessions/${sessionId}`);
    return response.data;
  } catch (err) {
    logger.error('Failed to load session', {
      sessionId,
      error: err.message,
      status: err.response?.status,
    });

    // Notify user
    showNotification({
      type: 'error',
      message: 'Could not load session. Please try again.',
    });

    throw err;  // Let caller handle
  }
}
```

### Rule 2: Use Typed Errors

```javascript
// Create custom error classes
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.isRetryable = false;
  }
}

class ApiError extends Error {
  constructor(message, status, isRetryable = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isRetryable = isRetryable;
  }
}

// Use in code
function validateSessionData(data) {
  if (!data.name || data.name.trim().length === 0) {
    throw new ValidationError('Session name is required', 'name');
  }

  if (!Array.isArray(data.items) || data.items.length === 0) {
    throw new ValidationError('At least one item is required', 'items');
  }
}

// Handle specifically
try {
  validateSessionData(formData);
  await createSession(formData);
} catch (err) {
  if (err instanceof ValidationError) {
    // Show field-specific error
    setFieldError(err.field, err.message);
  } else if (err instanceof ApiError && err.isRetryable) {
    // Retry API call
    retryCreateSession(formData);
  } else {
    // Generic error handling
    showErrorMessage(err.message);
  }
}
```

### Rule 3: Add Retry Logic for Transient Failures

```javascript
// Utility for retrying operations
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isLastAttempt = attempt === maxRetries;
      const isRetryable = err.isRetryable || err.response?.status >= 500;

      if (isLastAttempt || !isRetryable) {
        throw err;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      logger.warn('API call failed, retrying', {
        attempt,
        maxRetries,
        delay,
        error: err.message,
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Usage
async function createSession(data) {
  return retryWithBackoff(async () => {
    const response = await api.post('/sessions', data);
    return response.data;
  });
}
```

### Rule 4: Use Error Boundaries in React

```javascript
// SessionErrorBoundary.jsx
class SessionErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('Session screen crashed', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      sessionId: this.props.sessionId,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          onReset={() => this.setState({ hasError: false })}
        />
      );
    }

    return this.props.children;
  }
}

// Usage
<SessionErrorBoundary sessionId={sessionId}>
  <SessionActiveScreen sessionId={sessionId} />
</SessionErrorBoundary>
```

---

## Logging Guidelines

### Rule 1: Use Structured Logging (Not console.log)

```javascript
// ❌ BAD: Unstructured console.log
console.log('User joined session', user.name, sessionId);

// ✅ GOOD: Structured logging with context
logger.info('Participant joined session', {
  participantId: user.id,
  participantName: user.name,
  sessionId,
  timestamp: Date.now(),
});

// In backend (using Pino)
logger.info({
  event: 'participant_joined',
  participantId: user.id,
  sessionId,
  roomSize,
}, 'Participant joined session');
```

### Rule 2: Choose Appropriate Log Levels

| Level | When to Use | Example |
|-------|-------------|---------|
| `debug` | Detailed debugging info (disabled in prod) | "Transforming API response", "WebSocket event received" |
| `info` | Normal operations, audit trail | "Session created", "Participant joined" |
| `warn` | Unexpected but handled situations | "Race condition detected", "Retrying API call" |
| `error` | Errors that need attention | "API call failed", "Database error" |

```javascript
// Examples
logger.debug('Parsing session data', { rawData });  // Dev only
logger.info('Session created successfully', { sessionId });  // Audit trail
logger.warn('WebSocket room empty, using broadcast fallback', { sessionId });  // Needs attention
logger.error('Failed to create session', { error: err.message, sessionId });  // Critical
```

### Rule 3: Include Context in Logs

**Always include:**
- `sessionId` (if available)
- `participantId` (if available)
- `correlationId` (to trace requests across systems)
- Relevant data (but not sensitive info like PINs, payment details)

```javascript
// ❌ BAD: No context
logger.error('Failed to update');

// ✅ GOOD: Rich context
logger.error('Failed to update participant items', {
  participantId,
  sessionId,
  itemCount: items.length,
  error: err.message,
  correlationId: req.id,
});
```

### Rule 4: Don't Log Sensitive Data

```javascript
// ❌ BAD: Logging sensitive data
logger.info('User data', { user });  // Might contain email, PIN, payment info

// ✅ GOOD: Log safe subset
logger.info('User created', {
  userId: user.id,
  name: user.name,  // Safe
  // Don't log: email, PIN, payment details
});

// ✅ GOOD: Sanitize before logging
function sanitizeForLogging(obj) {
  const { pin, password, email, ...safe } = obj;
  return safe;
}

logger.info('Session data', sanitizeForLogging(session));
```

### Rule 5: Remove Debug Logs Before Merging

```javascript
// ❌ BAD: Debug logs left in code
console.log('HERE 1');
console.log('data:', data);
console.log('test test test');

// ✅ GOOD: Use proper logging that can be filtered
logger.debug('Processing session data', { data });  // Can disable in production
```

**Pre-merge checklist:**
- [ ] Search codebase for `console.log`
- [ ] Remove or replace with `logger.debug()`
- [ ] Remove commented-out code
- [ ] Remove debugger statements

---

## Testing Requirements

### Rule 1: Required Test Coverage by File Type

| File Type | Minimum Coverage | Test Types |
|-----------|------------------|------------|
| Utilities (utils/, transformers/) | 80% | Unit tests |
| Hooks (useSession, useParticipantSync) | 70% | Unit tests with mocks |
| API endpoints | 60% | Integration tests |
| Components | 50% | Component tests |
| Screens | 30% | E2E tests for critical flows |

### Rule 2: Unit Tests for All Utilities

```javascript
// sessionTransformers.test.js
import { describe, it, expect } from 'vitest';
import { transformSession, transformParticipant } from './sessionTransformers';

describe('sessionTransformers', () => {
  describe('transformSession', () => {
    it('should transform valid API response', () => {
      const apiResponse = {
        id: 'abc123',
        host_id: 'user1',
        items: [{ id: 'item1', name: 'Item 1', quantity: 2, price: 10 }],
      };

      const result = transformSession(apiResponse);

      expect(result).toEqual({
        id: 'abc123',
        hostId: 'user1',
        items: [{ id: 'item1', name: 'Item 1', quantity: 2, price: 10 }],
      });
    });

    it('should return null for invalid input', () => {
      expect(transformSession(null)).toBeNull();
      expect(transformSession(undefined)).toBeNull();
      expect(transformSession({})).toBeNull();
    });

    it('should handle missing items array', () => {
      const apiResponse = { id: 'abc123', host_id: 'user1' };
      const result = transformSession(apiResponse);
      expect(result.items).toEqual([]);
    });
  });
});
```

### Rule 3: Integration Tests for API Endpoints

```javascript
// sessions.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../server';
import { resetDatabase, createTestSession } from './testUtils';

describe('POST /api/sessions', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('should create session with valid data', async () => {
    const response = await request(app)
      .post('/api/sessions')
      .send({
        name: 'Test Session',
        items: [
          { name: 'Item 1', quantity: 2, price: 10 },
        ],
      })
      .expect(201);

    expect(response.body).toMatchObject({
      session: {
        id: expect.any(String),
        name: 'Test Session',
        status: 'active',
      },
    });
  });

  it('should return 400 for missing items', async () => {
    const response = await request(app)
      .post('/api/sessions')
      .send({ name: 'Test Session' })
      .expect(400);

    expect(response.body.error).toContain('items');
  });
});
```

### Rule 4: Test Error Cases

```javascript
// Always test both success and failure paths
describe('useSession', () => {
  it('should load session successfully', async () => {
    // Test happy path
  });

  it('should handle API error gracefully', async () => {
    // Test error path
  });

  it('should handle invalid session ID', async () => {
    // Test validation
  });

  it('should handle undefined response', async () => {
    // Test edge case
  });
});
```

### Rule 5: Write Tests Before Fixing Bugs

**Process:**
1. Bug reported
2. Write test that reproduces bug (should fail)
3. Fix bug
4. Test should now pass
5. Commit test + fix together

```javascript
// Example: Bug where empty items array crashes
it('should handle empty items array', () => {
  const session = { id: 'abc', items: [] };
  const result = calculateTotal(session);
  expect(result).toBe(0);  // This test will fail until bug fixed
});
```

---

## WebSocket Patterns

### Rule 1: Always Clean Up Event Listeners

```javascript
// ❌ BAD: Listeners not cleaned up
useEffect(() => {
  socket.on('participant-joined', handleParticipantJoined);
}, []);

// ✅ GOOD: Clean up on unmount
useEffect(() => {
  socket.on('participant-joined', handleParticipantJoined);

  return () => {
    socket.off('participant-joined', handleParticipantJoined);
  };
}, [handleParticipantJoined]);

// ✅ BETTER: Use refs to avoid re-registering
const handleParticipantJoinedRef = useRef(handleParticipantJoined);
handleParticipantJoinedRef.current = handleParticipantJoined;

useEffect(() => {
  const handler = (...args) => handleParticipantJoinedRef.current(...args);
  socket.on('participant-joined', handler);

  return () => {
    socket.off('participant-joined', handler);
  };
}, []); // Empty deps - registered once
```

### Rule 2: Handle Connection Failures

```javascript
// Always handle disconnection
socket.on('disconnect', (reason) => {
  logger.warn('WebSocket disconnected', { reason, sessionId });

  // Show UI indicator
  setConnectionStatus('disconnected');

  // Auto-reconnect (Socket.IO does this automatically)
});

socket.on('connect', () => {
  logger.info('WebSocket connected', { sessionId });

  // Re-join room
  socket.emit('join-session', sessionId);

  // Refresh data (might be stale)
  refetchSessionData();

  setConnectionStatus('connected');
});
```

### Rule 3: Add Handshake for Room Join

```javascript
// ❌ BAD: Assume room join worked
socket.emit('join-session', sessionId);
// Immediately start emitting events - race condition!

// ✅ GOOD: Wait for confirmation
socket.emit('join-session', sessionId);

socket.once('joined-session', (data) => {
  logger.info('Successfully joined session room', {
    sessionId,
    participantCount: data.participantCount,
  });

  setRoomReady(true);
});

// Only emit events when room ready
if (roomReady) {
  socket.emit('update-items', items);
}
```

### Rule 4: Avoid Event Handler Duplication

```javascript
// ❌ BAD: Re-registering handlers on every render
useEffect(() => {
  socket.on('participant-joined', handleParticipantJoined);
}, [participants]);  // Re-registers every time participants changes!

// ✅ GOOD: Register once, use refs for latest state
const participantsRef = useRef(participants);
participantsRef.current = participants;

useEffect(() => {
  const handler = (newParticipant) => {
    const currentParticipants = participantsRef.current;
    setParticipants([...currentParticipants, newParticipant]);
  };

  socket.on('participant-joined', handler);

  return () => socket.off('participant-joined', handler);
}, []); // Register once
```

---

## State Management

### Rule 1: Avoid Stale Closures

```javascript
// ❌ BAD: Closure over stale state
useEffect(() => {
  socket.on('update', () => {
    console.log(count);  // Will always log initial count value
  });
}, []);

// ✅ GOOD: Use refs for latest value
const countRef = useRef(count);
countRef.current = count;

useEffect(() => {
  socket.on('update', () => {
    console.log(countRef.current);  // Always logs current count
  });
}, []);

// ✅ GOOD: Use functional setState
useEffect(() => {
  socket.on('increment', () => {
    setCount(prev => prev + 1);  // Uses latest value
  });
}, []);
```

### Rule 2: Minimize useEffect Dependencies

```javascript
// ❌ BAD: Too many dependencies cause excessive re-runs
useEffect(() => {
  fetchData(sessionId, userId, filters, sort);
}, [sessionId, userId, filters, sort]);  // Re-runs when any change

// ✅ GOOD: Memoize objects
const memoizedFilters = useMemo(() => filters, [
  filters.status,
  filters.search,
]);

useEffect(() => {
  fetchData(sessionId, userId, memoizedFilters, sort);
}, [sessionId, userId, memoizedFilters, sort]);

// ✅ BETTER: Combine related state
const [queryParams, setQueryParams] = useState({
  sessionId,
  userId,
  filters,
  sort,
});

useEffect(() => {
  fetchData(queryParams);
}, [queryParams]);  // Single dependency
```

### Rule 3: Prevent Infinite Loops

```javascript
// ❌ BAD: State update causes re-render, which triggers effect again
useEffect(() => {
  setData({ ...data, timestamp: Date.now() });
}, [data]);  // Infinite loop!

// ✅ GOOD: Only run when specific fields change
useEffect(() => {
  setData(prev => ({ ...prev, timestamp: Date.now() }));
}, [data.id, data.status]);  // Only when ID or status changes

// ✅ GOOD: Use flag to prevent loop
const isFirstRender = useRef(true);

useEffect(() => {
  if (isFirstRender.current) {
    isFirstRender.current = false;
    return;
  }

  updateData();
}, [data]);
```

### Rule 4: Use Proper Loading States

```javascript
// ❌ BAD: No loading state
function SessionScreen() {
  const session = useSession(sessionId);

  return <div>{session.name}</div>;  // Crashes if session undefined
}

// ✅ GOOD: Proper loading states
function SessionScreen() {
  const { session, loading, error } = useSession(sessionId);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!session) return <NotFound />;

  return <div>{session.name}</div>;
}

// ✅ BETTER: Timeout for hanging requests
function SessionScreen() {
  const { session, loading, error } = useSession(sessionId);
  const [loadingTooLong, setLoadingTooLong] = useState(false);

  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => setLoadingTooLong(true), 10000);
      return () => clearTimeout(timeout);
    }
  }, [loading]);

  if (loading && !loadingTooLong) return <LoadingSpinner />;
  if (loading && loadingTooLong) return <ErrorMessage message="Taking too long to load. Please refresh." />;
  // ... rest of code
}
```

---

## API Design

### Rule 1: Consistent Response Format

```javascript
// All API responses should follow this format
{
  // Success response
  "data": { ... },
  "meta": {
    "timestamp": "2025-11-07T10:00:00Z",
    "requestId": "req-123-456"
  }
}

{
  // Error response
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Session name is required",
    "field": "name",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2025-11-07T10:00:00Z",
    "requestId": "req-123-456"
  }
}
```

### Rule 2: Use HTTP Status Codes Correctly

| Status | Usage | Example |
|--------|-------|---------|
| 200 | Success | GET /sessions/:id |
| 201 | Created | POST /sessions |
| 204 | Success, no content | DELETE /sessions/:id |
| 400 | Bad request (validation) | Missing required field |
| 401 | Unauthorized | Invalid session auth |
| 403 | Forbidden | Not session host |
| 404 | Not found | Session doesn't exist |
| 409 | Conflict | Duplicate session |
| 500 | Server error | Database error |
| 503 | Service unavailable | Database down |

### Rule 3: Validate All Inputs

```javascript
// Use express-validator
const { body, param, validationResult } = require('express-validator');

router.post('/sessions',
  [
    body('name').trim().isLength({ min: 1, max: 100 }),
    body('items').isArray({ min: 1 }),
    body('items.*.name').trim().isLength({ min: 1 }),
    body('items.*.quantity').isInt({ min: 1 }),
    body('items.*.price').isFloat({ min: 0 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          details: errors.array(),
        },
      });
    }

    // Process request
  }
);
```

### Rule 4: Add Cache Headers

```javascript
// No cache for dynamic data
router.get('/sessions/:sessionId', (req, res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0',
  });

  // Return session data
});

// Cache for static data
router.get('/emoji-map', (req, res) => {
  res.set({
    'Cache-Control': 'public, max-age=86400',  // 24 hours
  });

  // Return emoji map
});
```

---

## Code Review Checklist

### For All Code

- [ ] No `console.log` statements (use `logger` instead)
- [ ] No commented-out code
- [ ] No debugger statements
- [ ] No hardcoded values (use constants/env vars)
- [ ] No sensitive data in logs
- [ ] All functions have clear names
- [ ] Complex logic has explanatory comments

### For Session-Related Code

- [ ] All array operations have `.filter(Boolean)` or null checks
- [ ] All object access uses optional chaining (`?.`)
- [ ] All async functions have try-catch
- [ ] All API responses validated before use
- [ ] All errors logged with context
- [ ] WebSocket event listeners cleaned up
- [ ] useEffect dependencies correct (no missing, no infinite loops)
- [ ] Loading states handled
- [ ] Error states handled
- [ ] Tests added for new functionality

### For API Endpoints

- [ ] Input validation added
- [ ] Proper HTTP status codes used
- [ ] Cache headers set appropriately
- [ ] Errors return consistent format
- [ ] Request ID logged
- [ ] Database queries use parameterized queries (no SQL injection)
- [ ] Rate limiting considered

### For React Components

- [ ] Props validated (PropTypes or TypeScript)
- [ ] No prop drilling (consider Context or state library)
- [ ] Keys provided for list items
- [ ] Error boundary wraps error-prone components
- [ ] Loading states shown during async operations
- [ ] Accessibility: proper ARIA labels, keyboard navigation

---

## File Organization

### Directory Structure

```
packages/
├── minibag/
│   ├── src/
│   │   ├── components/
│   │   │   ├── shared/           # Reusable components
│   │   │   │   ├── NicknameModal.jsx
│   │   │   │   ├── QuantityInput.jsx
│   │   │   │   └── ErrorBoundary.jsx
│   │   │   ├── session/          # Session-specific components
│   │   │   │   ├── SessionHeader.jsx
│   │   │   │   ├── ParticipantList.jsx
│   │   │   │   └── ItemList.jsx
│   │   ├── hooks/
│   │   │   ├── useSession.js
│   │   │   ├── useParticipantSync.js
│   │   │   └── useNotification.js
│   │   ├── screens/
│   │   │   ├── SessionCreateScreen/
│   │   │   ├── SessionActiveScreen.jsx
│   │   │   └── JoinSessionScreen/
│   │   ├── services/
│   │   │   ├── socket.js
│   │   │   └── api.js
│   │   ├── utils/
│   │   │   ├── sessionTransformers.js
│   │   │   ├── validation.js
│   │   │   └── logger.js           # Frontend logger (to be created)
│   │   └── __tests__/
│   │       ├── unit/
│   │       ├── integration/
│   │       └── e2e/
├── shared/
│   ├── api/
│   │   ├── sessions.js
│   │   ├── payments.js
│   │   └── bills.js
│   ├── websocket/
│   │   └── handlers.js
│   ├── utils/
│   │   └── logger.js               # Backend logger (Pino)
│   └── middleware/
│       ├── validation.js
│       └── errorHandler.js
```

### Naming Conventions

**Files:**
- Components: `PascalCase.jsx` (e.g., `SessionHeader.jsx`)
- Hooks: `camelCase.js` starting with `use` (e.g., `useSession.js`)
- Utilities: `camelCase.js` (e.g., `sessionTransformers.js`)
- Tests: `*.test.js` or `*.spec.js`

**Variables:**
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_PARTICIPANTS`)
- Functions: `camelCase` (e.g., `calculateTotal`)
- Components: `PascalCase` (e.g., `SessionHeader`)
- Private functions: `_camelCase` (e.g., `_validateInput`)

**Functions:**
- Boolean getters: `is`, `has`, `should` (e.g., `isSessionExpired`, `hasParticipants`)
- Event handlers: `handle` or `on` prefix (e.g., `handleSubmit`, `onParticipantJoin`)
- Async functions: clear verb (e.g., `fetchSession`, `createParticipant`, not `session` or `participant`)

---

## Performance Guidelines

### Rule 1: Memoize Expensive Computations

```javascript
// ❌ BAD: Recalculates on every render
function SessionScreen({ session }) {
  const total = calculateComplexTotal(session.items, session.tax, session.tip);
  return <div>Total: ${total}</div>;
}

// ✅ GOOD: Memoize calculation
function SessionScreen({ session }) {
  const total = useMemo(
    () => calculateComplexTotal(session.items, session.tax, session.tip),
    [session.items, session.tax, session.tip]
  );
  return <div>Total: ${total}</div>;
}
```

### Rule 2: Debounce User Input

```javascript
// ❌ BAD: API call on every keystroke
function SearchInput() {
  const [query, setQuery] = useState('');

  useEffect(() => {
    searchAPI(query);  // Called 100 times for "hello world"
  }, [query]);

  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}

// ✅ GOOD: Debounce input
import { useDebouncedValue } from './hooks/useDebounce';

function SearchInput() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, 500);  // 500ms delay

  useEffect(() => {
    if (debouncedQuery) {
      searchAPI(debouncedQuery);  // Called once after user stops typing
    }
  }, [debouncedQuery]);

  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}
```

### Rule 3: Batch State Updates

```javascript
// ❌ BAD: Multiple state updates = multiple re-renders
function handleDataLoad(data) {
  setSession(data.session);       // Re-render 1
  setParticipants(data.participants);  // Re-render 2
  setItems(data.items);           // Re-render 3
}

// ✅ GOOD: Single state object
function handleDataLoad(data) {
  setState({
    session: data.session,
    participants: data.participants,
    items: data.items,
  });  // Single re-render
}

// ✅ GOOD: Use React 18 automatic batching (enabled by default)
// Multiple setState calls in same event handler are automatically batched
```

### Rule 4: Lazy Load Large Components

```javascript
// ❌ BAD: Loads payment screen immediately (even if not needed)
import PaymentScreen from './screens/PaymentScreen';

// ✅ GOOD: Lazy load
const PaymentScreen = lazy(() => import('./screens/PaymentScreen'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/payment" element={<PaymentScreen />} />
      </Routes>
    </Suspense>
  );
}
```

---

## Appendix: Common Anti-Patterns to Avoid

### Anti-Pattern 1: God Components

```javascript
// ❌ BAD: 1000-line component doing everything
function SessionScreen() {
  // 50 useState hooks
  // 30 useEffect hooks
  // All business logic
  // All UI rendering

  return (
    <div>
      {/* 500 lines of JSX */}
    </div>
  );
}

// ✅ GOOD: Split into smaller components
function SessionScreen() {
  return (
    <div>
      <SessionHeader />
      <ParticipantList />
      <ItemList />
      <PaymentSection />
    </div>
  );
}
```

### Anti-Pattern 2: Prop Drilling

```javascript
// ❌ BAD: Passing props through 5 levels
<App sessionId={sessionId}>
  <SessionContainer sessionId={sessionId}>
    <SessionContent sessionId={sessionId}>
      <SessionDetails sessionId={sessionId}>
        {/* Finally used here */}
      </SessionDetails>
    </SessionContent>
  </SessionContainer>
</App>

// ✅ GOOD: Use Context or state library
const SessionContext = createContext();

function App() {
  return (
    <SessionContext.Provider value={{ sessionId }}>
      <SessionContainer />
    </SessionContext.Provider>
  );
}

function SessionDetails() {
  const { sessionId } = useContext(SessionContext);
  // Use directly
}
```

### Anti-Pattern 3: Premature Optimization

```javascript
// ❌ BAD: Over-engineering simple code
const memoizedCallback = useCallback(
  useMemo(() => () => {
    return useMemo(() => {
      return value + 1;
    }, [value]);
  }, [value]),
  [value]
);

// ✅ GOOD: Keep it simple until proven slow
const result = value + 1;

// Only optimize if profiling shows it's actually slow
```

---

## Document Maintenance

This document should be updated when:
- New patterns emerge from code reviews
- New tools/libraries adopted
- Bug patterns identified
- Team consensus on new standards

**Review Schedule:** Quarterly

**Owner:** Tech Lead

---

**Questions about these standards?** Open a discussion in #engineering-standards
