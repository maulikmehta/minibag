# Pre-Field Testing Improvements

**Date:** October 27, 2025
**Status:** Ready for Implementation
**Current Codebase State:**
- Main component: `minibag-ui-prototype.tsx` (2,070 lines)
- AdminDashboard: 796 lines
- Backend: Express + Socket.IO
- Database: Supabase (PostgreSQL)
- Frontend: React + Vite

---

## 🔴 CRITICAL - Must Fix Before Field Testing

### 1. Rate Limiting (Essential for Public Access)

**Why:** Prevent abuse, DoS attacks, and resource exhaustion during field testing.

**Implementation:**

```bash
npm install express-rate-limit --workspace=packages/shared
```

**Location:** `packages/shared/server.js`

```javascript
import rateLimit from 'express-rate-limit';

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP per window
  message: 'Too many requests, please try again later',
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
});

// Stricter limits for session creation (prevent spam)
const createSessionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 sessions per IP per hour
  message: 'Too many sessions created. Please try again later.'
});

// Apply to routes
app.use('/api/', apiLimiter);
app.post('/api/sessions/create', createSessionLimiter, sessionsAPI.createSession);
```

**Test Command:**
```bash
# Test rate limiting with curl
for i in {1..105}; do curl http://localhost:3000/api/catalog/items; done
```

---

### 2. Enhanced Error Handling

**Current Issue:** Generic 500 errors, no request tracking, error messages leak in production.

**Location:** `packages/shared/server.js:122-128`

**Implementation:**

```javascript
import crypto from 'crypto';

// Add request ID middleware (for tracking)
app.use((req, res, next) => {
  req.id = crypto.randomBytes(8).toString('hex');
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Add request timeout
app.use((req, res, next) => {
  req.setTimeout(30000); // 30 second timeout
  res.setTimeout(30000);
  next();
});

// Enhanced error handler (replace existing at line 122)
app.use((err, req, res, next) => {
  // Log error with context
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    requestId: req.id,
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
    userId: req.session?.userId || 'anonymous'
  }));

  // Send appropriate response
  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal server error' : err.message,
    requestId: req.id,
    timestamp: new Date().toISOString(),
    // Only include details in development
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.details
    })
  });
});
```

---

### 3. Input Validation Middleware

**Why:** Prevent malformed requests from reaching business logic.

**Implementation:**

```bash
npm install express-validator --workspace=packages/shared
```

**Location:** Create new file `packages/shared/middleware/validation.js`

```javascript
import { body, param, validationResult } from 'express-validator';

// Validation middleware to check results
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Session creation validation
export const validateSessionCreation = [
  body('host_nickname').isString().trim().isLength({ min: 2, max: 50 }),
  body('location').optional().isString().trim().isLength({ max: 200 }),
  validate
];

// Join session validation
export const validateJoinSession = [
  param('session_id').isString().isLength({ min: 6, max: 6 }),
  body('participant_nickname').isString().trim().isLength({ min: 2, max: 50 }),
  validate
];

// Payment validation
export const validatePayment = [
  body('participant_id').isUUID(),
  body('item_id').isUUID(),
  body('quantity').isInt({ min: 1, max: 1000 }),
  body('amount_paid').isFloat({ min: 0 }),
  validate
];
```

**Usage in server.js:**

```javascript
import {
  validateSessionCreation,
  validateJoinSession,
  validatePayment
} from './middleware/validation.js';

// Apply to routes
app.post('/api/sessions/create', createSessionLimiter, validateSessionCreation, sessionsAPI.createSession);
app.post('/api/sessions/:session_id/join', validateJoinSession, sessionsAPI.joinSession);
app.post('/api/sessions/:session_id/payments', validatePayment, paymentsAPI.recordPayment);
```

---

### 4. Health Checks & Monitoring

**Why:** Essential for detecting issues during field testing.

**Location:** `packages/shared/server.js` (add before error handler)

```javascript
// Detailed health check
app.get('/health/ready', async (req, res) => {
  const checks = {
    server: 'ok',
    database: 'unknown',
    websocket: 'unknown',
    timestamp: new Date().toISOString()
  };

  try {
    // Check database connection
    const { data, error } = await supabase
      .from('sessions')
      .select('id')
      .limit(1);
    checks.database = error ? 'error' : 'ok';
  } catch (err) {
    checks.database = 'error';
  }

  // Check WebSocket
  checks.websocket = io.engine.clientsCount !== undefined ? 'ok' : 'error';

  const isHealthy = Object.values(checks).every(v => v === 'ok' || typeof v === 'string');
  res.status(isHealthy ? 200 : 503).json(checks);
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    },
    connections: {
      websocket: io.engine.clientsCount,
      http: server.getConnections ? 'enabled' : 'disabled'
    },
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
  });
});
```

---

### 5. Session Security & Integrity

**Critical Issues:** Session creation is currently too permissive and vulnerable to abuse, collisions, and hijacking.

#### Problem 1: Session ID Collisions

**Risk:** 6-character hex IDs = only 16.7 million combinations. Birthday paradox means collisions likely after ~4,000 sessions.

**What happens:** Two users get same session ID → items mixed up, payment chaos, data corruption.

**Fix:**

**Location:** `packages/shared/api/sessions.js`

```javascript
// Improve generateSessionId function
function generateSessionId() {
  return crypto.randomBytes(4).toString('hex'); // 8 chars = 4.2 billion combinations
}

// Add collision check in createSession
export async function createSession(req, res) {
  let sessionId = generateSessionId();
  let attempts = 0;

  // Check for duplicates (max 3 attempts)
  while (attempts < 3) {
    const { data: existing } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .single();

    if (!existing) break; // ID is unique

    sessionId = generateSessionId();
    attempts++;
  }

  if (attempts === 3) {
    return res.status(500).json({
      success: false,
      error: 'Failed to generate unique session ID. Please try again.'
    });
  }

  // Continue with session creation...
}
```

---

#### Problem 2: No Host Ownership Proof

**Risk:** Anyone who knows session ID "abc123" can claim to be host and perform destructive actions.

**What happens:** Malicious user ends session, modifies items, kicks participants.

**Fix: Implement Host Tokens**

**Location:** `packages/shared/api/sessions.js`

```javascript
// Update database schema first (run in Supabase SQL Editor)
/*
ALTER TABLE sessions
ADD COLUMN host_token VARCHAR(64) UNIQUE NOT NULL DEFAULT '';

-- Add index for fast lookups
CREATE INDEX idx_sessions_host_token ON sessions(host_token);
*/

// Generate secure host token on session creation
export async function createSession(req, res) {
  const { host_nickname, location } = req.body;

  const sessionId = generateSessionId();
  const hostId = crypto.randomUUID();

  // Generate secure host token (32 bytes = 64 hex chars)
  const host_token = crypto.randomBytes(32).toString('hex');

  // Create session with token
  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      id: sessionId,
      host_id: hostId,
      host_token: host_token, // Store securely
      status: 'pending',
      location: location || null
    })
    .select()
    .single();

  if (error) throw error;

  // Return token to host (they must save this!)
  res.status(201).json({
    success: true,
    data: {
      session,
      host_token // IMPORTANT: Host must store this locally
    }
  });
}

// Protect host-only actions
export async function updateSessionStatus(req, res) {
  const { session_id } = req.params;
  const { status } = req.body;
  const host_token = req.headers['x-host-token']; // Host must send token

  if (!host_token) {
    return res.status(401).json({
      success: false,
      error: 'Host token required'
    });
  }

  // Verify host token
  const { data: session, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', session_id)
    .eq('host_token', host_token)
    .single();

  if (error || !session) {
    return res.status(403).json({
      success: false,
      error: 'Invalid host token or session not found'
    });
  }

  // Proceed with update...
}
```

**Frontend Changes:**

**Location:** `packages/minibag/src/hooks/useSession.js`

```javascript
// Store host token in localStorage when session is created
const create = async (hostNickname, location) => {
  const response = await fetch('/api/sessions/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host_nickname: hostNickname, location })
  });

  const result = await response.json();

  if (result.success) {
    // Store host token locally
    localStorage.setItem(`host_token_${result.data.session.id}`, result.data.host_token);
    setSession(result.data.session);
    setCurrentParticipant(result.data.host);
  }

  return result;
};

// Include token in host actions
const updateStatus = async (sessionId, status) => {
  const hostToken = localStorage.getItem(`host_token_${sessionId}`);

  const response = await fetch(`/api/sessions/${sessionId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Host-Token': hostToken // Send token for verification
    },
    body: JSON.stringify({ status })
  });

  return response.json();
};
```

---

#### Problem 3: Participant Limits

**Risk:** No limit on participants → database spam, performance issues.

**What happens:** 1000 bots join same session, legitimate users can't load participant list.

**Fix:**

**Location:** `packages/shared/api/sessions.js`

```javascript
export async function joinSession(req, res) {
  const { session_id } = req.params;
  const { participant_nickname, nickname_pool_id } = req.body;

  // Check current participant count
  const { data: participants, error: countError } = await supabase
    .from('participants')
    .select('id')
    .eq('session_id', session_id);

  if (countError) throw countError;

  // Enforce maximum participants (20 is reasonable for mobile sellers)
  if (participants.length >= 20) {
    return res.status(403).json({
      success: false,
      error: 'This session is full. Maximum 20 participants allowed.'
    });
  }

  // Continue with join logic...
}
```

---

#### Problem 4: Session Expiry & Cleanup

**Risk:** Sessions live forever → database bloat, nickname pool exhaustion, stale data.

**Fix: Automatic Session Cleanup**

**Option A: Database-level cleanup (cron job)**

**Location:** Create `packages/shared/jobs/cleanup-sessions.js`

```javascript
import { supabase } from '../db/supabase.js';

/**
 * Clean up abandoned and old sessions
 * Run this as a cron job (e.g., daily at 2 AM)
 */
export async function cleanupSessions() {
  console.log('[Cleanup] Starting session cleanup...');

  // 1. Delete pending sessions older than 24 hours
  const { data: expiredPending, error: pendingError } = await supabase
    .from('sessions')
    .delete()
    .eq('status', 'pending')
    .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .select();

  console.log(`[Cleanup] Deleted ${expiredPending?.length || 0} pending sessions`);

  // 2. Archive completed sessions older than 30 days
  const { data: oldCompleted, error: completedError } = await supabase
    .from('sessions')
    .update({ status: 'archived' })
    .eq('status', 'completed')
    .lt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .select();

  console.log(`[Cleanup] Archived ${oldCompleted?.length || 0} completed sessions`);

  // 3. Release nicknames from deleted/archived sessions
  const sessionIds = [
    ...(expiredPending?.map(s => s.id) || []),
    ...(oldCompleted?.map(s => s.id) || [])
  ];

  if (sessionIds.length > 0) {
    const { data: participants } = await supabase
      .from('participants')
      .select('nickname_pool_id')
      .in('session_id', sessionIds);

    const nicknameIds = participants
      ?.map(p => p.nickname_pool_id)
      .filter(id => id); // Remove nulls

    if (nicknameIds.length > 0) {
      await supabase
        .from('nicknames_pool')
        .update({ is_available: true })
        .in('id', nicknameIds);

      console.log(`[Cleanup] Released ${nicknameIds.length} nicknames back to pool`);
    }
  }

  return {
    deletedPending: expiredPending?.length || 0,
    archivedCompleted: oldCompleted?.length || 0,
    releasedNicknames: sessionIds.length
  };
}

// If running as standalone script
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupSessions()
    .then(result => {
      console.log('[Cleanup] Results:', result);
      process.exit(0);
    })
    .catch(err => {
      console.error('[Cleanup] Error:', err);
      process.exit(1);
    });
}
```

**Setup cron job (in production):**

```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * cd /path/to/localloops && node packages/shared/jobs/cleanup-sessions.js
```

**Option B: On-demand cleanup (simpler for now)**

**Location:** `packages/shared/api/sessions.js`

```javascript
// Add cleanup check when creating new sessions
export async function createSession(req, res) {
  // Cleanup expired sessions before creating new one
  await supabase
    .from('sessions')
    .delete()
    .eq('status', 'pending')
    .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  // Continue with session creation...
}
```

---

#### Problem 5: Duplicate Session Prevention

**Risk:** User clicks "Create Session" 10 times (slow network) → 10 identical sessions created.

**Fix: De-duplication Window**

**Location:** `packages/shared/api/sessions.js`

```javascript
export async function createSession(req, res) {
  const { host_nickname, location } = req.body;
  const clientIp = req.ip;

  // Check for recent sessions from same IP with same nickname
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: recentSessions } = await supabase
    .from('sessions')
    .select('id, participants!inner(nickname)')
    .gte('created_at', fiveMinutesAgo)
    .eq('status', 'pending');

  // Check if duplicate exists (same IP + similar nickname + within 5 min)
  const duplicate = recentSessions?.find(s =>
    s.participants.some(p => p.nickname === host_nickname)
  );

  if (duplicate) {
    return res.status(200).json({
      success: true,
      data: { session: duplicate },
      message: 'Returning existing session from last 5 minutes'
    });
  }

  // Continue with new session creation...
}
```

---

#### Problem 6: Nickname Pool Exhaustion

**Risk:** All nicknames taken → new users can't join.

**Fix: Release nicknames on session completion**

**Location:** `packages/shared/api/sessions.js`

```javascript
export async function updateSessionStatus(req, res) {
  const { session_id } = req.params;
  const { status } = req.body;

  // Update session status
  const { data: session, error } = await supabase
    .from('sessions')
    .update({ status })
    .eq('id', session_id)
    .select()
    .single();

  if (error) throw error;

  // If session is completed, release nicknames back to pool
  if (status === 'completed') {
    const { data: participants } = await supabase
      .from('participants')
      .select('nickname_pool_id')
      .eq('session_id', session_id);

    const nicknameIds = participants
      ?.map(p => p.nickname_pool_id)
      .filter(id => id);

    if (nicknameIds.length > 0) {
      await supabase
        .from('nicknames_pool')
        .update({ is_available: true })
        .in('id', nicknameIds);

      console.log(`Released ${nicknameIds.length} nicknames from session ${session_id}`);
    }
  }

  res.json({ success: true, data: session });
}
```

---

#### Problem 7: Join Request Flooding

**Risk:** Bot spams join requests with random names.

**Fix: Already covered by rate limiting + add per-IP tracking**

**Location:** `packages/shared/api/sessions.js`

```javascript
// Add to validation middleware
export const validateJoinSession = [
  param('session_id').isString().isLength({ min: 8, max: 8 }), // Updated for 8-char IDs
  body('participant_nickname').isString().trim().isLength({ min: 2, max: 50 }),
  body('nickname_pool_id').optional().isUUID(),
  validate,

  // Additional check: prevent duplicate nicknames in same session
  async (req, res, next) => {
    const { session_id } = req.params;
    const { participant_nickname } = req.body;

    const { data: existing } = await supabase
      .from('participants')
      .select('id')
      .eq('session_id', session_id)
      .eq('nickname', participant_nickname)
      .single();

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'A participant with this nickname already exists in this session'
      });
    }

    next();
  }
];
```

---

#### Problem 8: Transaction Safety

**Risk:** Session created but nickname allocation fails → orphaned session.

**Fix: Use database transactions**

**Location:** `packages/shared/api/sessions.js`

```javascript
export async function createSession(req, res) {
  const { host_nickname, location, nickname_pool_id } = req.body;

  try {
    // Begin transaction-like behavior (Supabase doesn't expose transactions directly)
    // We'll use a two-phase approach with rollback capability

    const sessionId = await generateUniqueSessionId();
    const hostId = crypto.randomUUID();
    const host_token = crypto.randomBytes(32).toString('hex');

    // Step 1: Create session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        id: sessionId,
        host_id: hostId,
        host_token: host_token,
        status: 'pending',
        location: location || null
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    // Step 2: Mark nickname as unavailable
    if (nickname_pool_id) {
      const { error: nicknameError } = await supabase
        .from('nicknames_pool')
        .update({ is_available: false })
        .eq('id', nickname_pool_id);

      if (nicknameError) {
        // Rollback: Delete session
        await supabase.from('sessions').delete().eq('id', sessionId);
        throw new Error('Failed to allocate nickname');
      }
    }

    // Step 3: Create host participant
    const { data: host, error: hostError } = await supabase
      .from('participants')
      .insert({
        session_id: sessionId,
        user_id: hostId,
        nickname: host_nickname,
        nickname_pool_id: nickname_pool_id || null,
        is_host: true
      })
      .select()
      .single();

    if (hostError) {
      // Rollback: Delete session and release nickname
      await supabase.from('sessions').delete().eq('id', sessionId);
      if (nickname_pool_id) {
        await supabase
          .from('nicknames_pool')
          .update({ is_available: true })
          .eq('id', nickname_pool_id);
      }
      throw hostError;
    }

    // Success - all steps completed
    res.status(201).json({
      success: true,
      data: { session, host, host_token }
    });

  } catch (error) {
    console.error('Session creation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create session'
    });
  }
}

// Helper function for collision-resistant ID generation
async function generateUniqueSessionId(maxAttempts = 3) {
  for (let i = 0; i < maxAttempts; i++) {
    const sessionId = crypto.randomBytes(4).toString('hex');

    const { data } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .single();

    if (!data) return sessionId; // Unique ID found
  }

  throw new Error('Failed to generate unique session ID after multiple attempts');
}
```

---

#### Database Schema Updates Required

Run these SQL commands in **Supabase SQL Editor**:

```sql
-- 1. Add host_token column to sessions
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS host_token VARCHAR(64) UNIQUE;

-- Make it required for new sessions (but allow NULL for existing ones)
UPDATE sessions SET host_token = encode(gen_random_bytes(32), 'hex') WHERE host_token IS NULL;

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_host_token ON sessions(host_token);
CREATE INDEX IF NOT EXISTS idx_sessions_status_created
ON sessions(status, created_at DESC);

-- 3. Add check constraint for participant limits (enforced at DB level)
ALTER TABLE participants
ADD CONSTRAINT check_max_participants_per_session
CHECK (
  (SELECT COUNT(*) FROM participants WHERE session_id = participants.session_id) <= 20
);

-- 4. Add archived status to session enum (if not exists)
ALTER TYPE session_status ADD VALUE IF NOT EXISTS 'archived';

-- 5. Create cleanup function (optional - for automated cleanup)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  -- Delete pending sessions older than 24 hours
  DELETE FROM sessions
  WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '24 hours';

  -- Archive completed sessions older than 30 days
  UPDATE sessions
  SET status = 'archived'
  WHERE status = 'completed'
  AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-sessions', '0 2 * * *', 'SELECT cleanup_expired_sessions()');
```

---

### Summary of Session Security Fixes

| Problem | Impact | Priority | Implementation Time |
|---------|--------|----------|-------------------|
| Session ID collisions | **CRITICAL** - Data corruption | 🔴 Must fix | 30 min |
| No host ownership proof | **CRITICAL** - Security breach | 🔴 Must fix | 2 hours |
| No participant limits | **HIGH** - DoS risk | 🔴 Must fix | 15 min |
| No session expiry | **HIGH** - DB bloat | 🔴 Must fix | 1 hour |
| Duplicate prevention | **MEDIUM** - UX issue | 🟡 Important | 30 min |
| Nickname exhaustion | **MEDIUM** - Service outage | 🟡 Important | 30 min |
| Transaction safety | **MEDIUM** - Data integrity | 🟡 Important | 1 hour |

**Total implementation time: ~6 hours**

---

## 🟡 HIGH PRIORITY - Implement Within 1-2 Weeks

### 5. Component Splitting Strategy

**Current Problem:** `minibag-ui-prototype.tsx` is 2,070 lines - difficult to maintain, test, and optimize.

**Target Architecture:**

```
packages/minibag/src/
├── pages/
│   └── MinibagApp.jsx                    (~200 lines - main coordinator)
│
├── screens/
│   ├── HomeScreen.jsx                    (~150 lines)
│   ├── SessionCreateScreen.jsx           (~200 lines)
│   ├── SessionJoinScreen.jsx             (~200 lines)
│   ├── ShoppingScreen.jsx                (~300 lines)
│   ├── BillViewScreen.jsx                (~150 lines)
│   └── ParticipantBillScreen.jsx         (~100 lines)
│
├── components/
│   ├── session/
│   │   ├── SessionHeader.jsx             (~80 lines)
│   │   ├── ParticipantList.jsx           (~100 lines)
│   │   ├── SessionControls.jsx           (~80 lines)
│   │   └── SessionShareModal.jsx         (~120 lines)
│   │
│   ├── catalog/
│   │   ├── CategorySelector.jsx          (~80 lines)
│   │   ├── ItemGrid.jsx                  (~60 lines)
│   │   ├── ItemCard.jsx                  (~100 lines)
│   │   └── SearchBar.jsx                 (~60 lines)
│   │
│   ├── cart/
│   │   ├── CartSummary.jsx               (~120 lines)
│   │   ├── ParticipantCartView.jsx       (~100 lines)
│   │   └── ItemQuantityControl.jsx       (~60 lines)
│   │
│   ├── modals/
│   │   ├── NicknameSelectionModal.jsx    (~150 lines)
│   │   ├── PaymentModal.jsx              (~120 lines - extract from line 1991)
│   │   └── SignUpModal.jsx               (~100 lines)
│   │
│   └── common/
│       ├── LanguageSwitcher.jsx          (~50 lines - extract from line 27)
│       └── LoadingSpinner.jsx            (~30 lines)
│
├── hooks/
│   ├── useSession.js                     (existing - 334 lines)
│   ├── useCatalog.js                     (existing - 212 lines)
│   ├── useOnboarding.js                  (existing - 250 lines)
│   └── usePayments.js                    (new - extract payment logic)
│
└── services/
    ├── api.js                            (existing - 333 lines)
    └── socket.js                         (existing - 311 lines)
```

**Migration Steps:**

1. **Week 1 - Extract Standalone Components:**
   - `LanguageSwitcher` (line 27-54) → `components/common/LanguageSwitcher.jsx`
   - `PaymentModal` (line 1991+) → `components/modals/PaymentModal.jsx`

2. **Week 2 - Create Screens:**
   - Extract `HomeScreen` (landing view)
   - Extract `SessionCreateScreen` (host setup flow)
   - Extract `SessionJoinScreen` (participant join flow)

3. **Week 3 - Shopping Interface:**
   - Extract `ShoppingScreen` (main shopping view)
   - Create `CategorySelector`, `ItemGrid`, `ItemCard` components

4. **Week 4 - Polish:**
   - Extract `BillViewScreen`
   - Create cart components
   - Update routing in `App.jsx`

**Benefits:**
- Easier to test individual components
- Better code splitting (lazy loading)
- Multiple developers can work simultaneously
- Clearer component responsibilities
- Easier to add TypeScript types

---

### 6. Performance Optimization - Quick Wins

**Location:** Add to `minibag-ui-prototype.tsx` immediately

```javascript
// Import at top
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';

// Memoize expensive list items
const CategoryButton = memo(({ category, isSelected, onClick }) => (
  <button
    onClick={() => onClick(category.id)}
    className={`px-4 py-2 rounded-lg transition-colors ${
      isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200'
    }`}
  >
    {category.name}
  </button>
));
CategoryButton.displayName = 'CategoryButton';

const ItemCard = memo(({ item, quantity, onAdd, onRemove }) => {
  // Component implementation
});
ItemCard.displayName = 'ItemCard';

// Inside MinibagPrototype component:

// Memoize filtered items
const filteredItems = useMemo(() => {
  if (!items || items.length === 0) return [];

  return items.filter(item => {
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    const matchesSearch = !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
}, [items, selectedCategory, searchQuery]);

// Memoize total calculations
const totalAmount = useMemo(() => {
  return Object.entries(hostItems).reduce((sum, [itemId, qty]) => {
    const item = items.find(i => i.id === itemId);
    return sum + ((item?.price || 0) * qty);
  }, 0);
}, [hostItems, items]);

// Memoize callbacks
const handleCategoryChange = useCallback((categoryId) => {
  setSelectedCategory(categoryId);
}, []);

const handleSearchChange = useCallback((query) => {
  setSearchQuery(query);
}, []);
```

**Expected Impact:**
- Reduce unnecessary re-renders by 60-80%
- Faster list scrolling
- Smoother category switching

---

### 7. Database Optimization

**Location:** Run these SQL commands in Supabase SQL Editor

```sql
-- Add indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_sessions_status
ON sessions(status);

CREATE INDEX IF NOT EXISTS idx_sessions_created_at
ON sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_participants_session
ON participants(session_id);

CREATE INDEX IF NOT EXISTS idx_participants_session_nickname
ON participants(session_id, nickname);

CREATE INDEX IF NOT EXISTS idx_payments_session
ON payments(session_id);

CREATE INDEX IF NOT EXISTS idx_payments_participant
ON payments(participant_id);

CREATE INDEX IF NOT EXISTS idx_catalog_category
ON catalog_items(category_id);

CREATE INDEX IF NOT EXISTS idx_catalog_category_name
ON catalog_items(category_id, name);

-- Composite index for nickname pool lookups
CREATE INDEX IF NOT EXISTS idx_nicknames_available_gender
ON nicknames_pool(is_available, gender)
WHERE is_available = true;

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_sessions_status_created
ON sessions(status, created_at DESC);
```

**Test Query Performance:**

```sql
-- Before and after comparison
EXPLAIN ANALYZE
SELECT * FROM participants
WHERE session_id = 'abc123';

EXPLAIN ANALYZE
SELECT * FROM nicknames_pool
WHERE is_available = true AND gender = 'male'
LIMIT 1;
```

---

## 🟢 MEDIUM PRIORITY - Post-Launch Refinement

### 8. Client-Side Caching with React Query

**Why:** Reduce API calls, improve perceived performance, offline-first experience.

**Implementation:**

```bash
npm install @tanstack/react-query --workspace=packages/minibag
```

**Location:** Update `packages/minibag/src/hooks/useCatalog.js`

```javascript
import { useQuery, useQueryClient } from '@tanstack/react-query';

export default function useCatalog() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['catalog'],
    queryFn: async () => {
      const [categoriesRes, itemsRes] = await Promise.all([
        fetch('/api/catalog/categories'),
        fetch('/api/catalog/items')
      ]);

      const categories = await categoriesRes.json();
      const items = await itemsRes.json();

      return { categories: categories.data, items: items.data };
    },
    staleTime: 5 * 60 * 1000,      // Data fresh for 5 minutes
    cacheTime: 30 * 60 * 1000,     // Keep in cache for 30 minutes
    refetchOnWindowFocus: false,    // Don't refetch on tab switch
    retry: 2                        // Retry failed requests 2 times
  });

  return {
    categories: data?.categories || [],
    items: data?.items || [],
    loading: isLoading,
    error
  };
}
```

**Setup in main.jsx:**

```javascript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute default
    },
  },
});

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

---

### 9. Server-Side Caching with Redis (Optional)

**Why:** Reduce database load for read-heavy operations (catalog, analytics).

**Setup:**

```bash
npm install ioredis --workspace=packages/shared
```

**Location:** Create `packages/shared/cache/redis.js`

```javascript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export const cache = {
  async get(key) {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },

  async set(key, value, ttl = 300) {
    await redis.setex(key, ttl, JSON.stringify(value));
  },

  async del(key) {
    await redis.del(key);
  },

  async flush(pattern) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
};

export default redis;
```

**Usage Example in `packages/shared/api/catalog.js`:**

```javascript
import { cache } from '../cache/redis.js';

export async function getItems(req, res) {
  try {
    // Try cache first
    const cached = await cache.get('catalog:items');
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    // Cache miss - fetch from database
    const { data, error } = await supabase
      .from('catalog_items')
      .select('*')
      .order('name');

    if (error) throw error;

    // Store in cache for 5 minutes
    await cache.set('catalog:items', data, 300);

    res.json({ success: true, data, cached: false });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

**Cache Invalidation Strategy:**

```javascript
// When catalog items are updated
export async function updateCatalogItem(req, res) {
  try {
    // Update database
    const { data, error } = await supabase
      .from('catalog_items')
      .update(req.body)
      .eq('id', req.params.item_id);

    if (error) throw error;

    // Invalidate cache
    await cache.del('catalog:items');
    await cache.del(`catalog:item:${req.params.item_id}`);

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

---

### 10. Code Splitting with Vite

**Location:** `packages/minibag/vite.config.js`

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['chart.js', 'react-chartjs-2'],
          'vendor-ui': ['lucide-react'],
          'vendor-i18n': ['i18next', 'react-i18next'],

          // Feature chunks
          'admin': ['/src/AdminDashboard.jsx'],
          'landing': ['/src/LandingPage.jsx', '/src/LocalLoopsLanding.jsx']
        }
      }
    },

    // Optimize chunk size
    chunkSizeWarningLimit: 1000,

    // Generate source maps for production debugging
    sourcemap: true
  },

  // Development optimizations
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      overlay: true
    }
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
});
```

**Lazy Loading Routes:**

Update `App.jsx`:

```javascript
import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Eager load critical path
import MinibagPrototype from '../minibag-ui-prototype';

// Lazy load other routes
const AdminDashboard = lazy(() => import('./AdminDashboard'));
const LocalLoopsLanding = lazy(() => import('./LocalLoopsLanding'));
const LandingPage = lazy(() => import('./LandingPage'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<MinibagPrototype />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/home" element={<LocalLoopsLanding />} />
          <Route path="/minibag" element={<LandingPage />} />
          {/* ... other routes */}
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

---

### 11. API Documentation with Swagger

**Why:** Makes API easier to test and understand for your team.

**Setup:**

```bash
npm install swagger-ui-express swagger-jsdoc --workspace=packages/shared
```

**Location:** `packages/shared/server.js` (add after middleware setup)

```javascript
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LocalLoops API',
      version: '0.1.0',
      description: 'Micro-coordination infrastructure for mobile sellers',
      contact: {
        name: 'LocalLoops Team'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      schemas: {
        Session: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'abc123' },
            host_id: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['pending', 'active', 'completed'] },
            location: { type: 'string', example: 'Market Square' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Participant: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            session_id: { type: 'string', example: 'abc123' },
            nickname: { type: 'string', example: 'Raj' },
            avatar_emoji: { type: 'string', example: '👨' },
            is_host: { type: 'boolean' }
          }
        }
      }
    }
  },
  apis: ['./api/*.js'] // Path to API docs
};

const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
```

**Document Your Routes:**

In `packages/shared/api/sessions.js`:

```javascript
/**
 * @swagger
 * /api/sessions/create:
 *   post:
 *     summary: Create a new shopping session
 *     tags: [Sessions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - host_nickname
 *             properties:
 *               host_nickname:
 *                 type: string
 *                 example: "Raj"
 *               location:
 *                 type: string
 *                 example: "Market Square"
 *     responses:
 *       201:
 *         description: Session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Session'
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
export async function createSession(req, res) {
  // implementation
}
```

**Access:** http://localhost:3000/api-docs

---

### 12. TypeScript Migration Strategy

**Gradual Adoption Plan:**

**Phase 1: Setup (1 hour)**

```bash
npm install --save-dev typescript @types/react @types/react-dom @types/node --workspace=packages/minibag
```

Create `packages/minibag/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "checkJs": false,
    "strict": false,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

**Phase 2: Type Definitions (Week 1)**

Create `packages/minibag/src/types/api.ts`:

```typescript
// Session types
export interface Session {
  id: string;
  host_id: string;
  status: 'pending' | 'active' | 'completed';
  location?: string;
  created_at: string;
  updated_at: string;
}

export interface Participant {
  id: string;
  session_id: string;
  nickname: string;
  avatar_emoji: string;
  is_host: boolean;
  joined_at: string;
}

// Catalog types
export interface Category {
  id: string;
  name: string;
  icon?: string;
  display_order: number;
}

export interface CatalogItem {
  id: string;
  category_id: string;
  name: string;
  name_gujarati?: string;
  name_hindi?: string;
  price: number;
  unit: string;
  image_url?: string;
}

// Payment types
export interface Payment {
  id: string;
  session_id: string;
  participant_id: string;
  item_id: string;
  quantity: number;
  amount_paid: number;
  created_at: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
}

export interface ApiError {
  error: string;
  requestId?: string;
  timestamp?: string;
  details?: any;
}
```

**Phase 3: Convert Priority Order**

1. **Utilities first** (easiest wins):
   - `src/services/api.js` → `api.ts`
   - `src/utils/calculations.js` → `calculations.ts`

2. **Hooks** (clear input/output):
   - `src/hooks/useCatalog.js` → `useCatalog.ts`
   - `src/hooks/useSession.js` → `useSession.ts`

3. **New components** (write as `.tsx` from now on)

4. **Main components** (last priority)

**Example Hook Conversion:**

```typescript
// src/hooks/useCatalog.ts
import { useState, useEffect } from 'react';
import { Category, CatalogItem, ApiResponse } from '../types/api';

interface UseCatalogReturn {
  categories: Category[];
  items: CatalogItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export default function useCatalog(): UseCatalogReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/catalog/items');
      const data: ApiResponse<CatalogItem[]> = await response.json();

      if (data.success && data.data) {
        setItems(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  return { categories, items, loading, error, refetch: fetchCatalog };
}
```

---

## 📊 Testing & Validation

### Load Testing Before Field Launch

**Setup:**

```bash
npm install -g artillery
```

**Create `load-test.yml`:**

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 5
      name: Warm up
    - duration: 300
      arrivalRate: 20
      name: Sustained load
    - duration: 60
      arrivalRate: 50
      name: Spike test

scenarios:
  - name: "Browse catalog"
    flow:
      - get:
          url: "/api/catalog/categories"
      - get:
          url: "/api/catalog/items"
      - think: 2

  - name: "Create and join session"
    flow:
      - post:
          url: "/api/sessions/create"
          json:
            host_nickname: "TestHost"
            location: "Test Market"
      - think: 1
      - post:
          url: "/api/sessions/{{ session_id }}/join"
          json:
            participant_nickname: "TestUser"
```

**Run:**

```bash
artillery run load-test.yml
```

---

## 🔄 Implementation Checklist

### Before Field Testing (Week 1)

**Backend Security & Stability:**
- [ ] Install and configure rate limiting
- [ ] Add enhanced error handling
- [ ] Implement input validation middleware
- [ ] Add health checks and metrics endpoints

**Session Security (CRITICAL):**
- [ ] Extend session IDs from 6 to 8 characters
- [ ] Add collision detection for session IDs
- [ ] Implement host token system (database schema + API + frontend)
- [ ] Add participant limit (max 20 per session)
- [ ] Implement session expiry cleanup (24h for pending, 30d for completed)
- [ ] Add duplicate session prevention (5-minute window)
- [ ] Implement nickname release on session completion
- [ ] Add transaction safety with rollback logic
- [ ] Run database schema updates in Supabase
- [ ] Update frontend to store and send host tokens

**Testing & Validation:**
- [ ] Run load test with 50 concurrent users
- [ ] Test rate limiting behavior
- [ ] Test session ID collision handling
- [ ] Test host token authorization
- [ ] Test participant limit enforcement
- [ ] Verify session cleanup works
- [ ] Verify error responses don't leak sensitive data
- [ ] Test duplicate session prevention

### Week 2-3 (During Early Field Testing)
- [ ] Monitor error logs daily
- [ ] Collect user feedback on performance
- [ ] Add React.memo to expensive components
- [ ] Implement useMemo for filtered lists
- [ ] Extract LanguageSwitcher component
- [ ] Extract PaymentModal component
- [ ] Create first screen component (HomeScreen)

### Week 4+ (Refinement)
- [ ] Add database indexes
- [ ] Implement React Query for catalog
- [ ] Create remaining screen components
- [ ] Set up Swagger documentation
- [ ] Add code splitting in Vite
- [ ] Consider Redis caching for analytics
- [ ] Begin TypeScript migration with types
- [ ] Convert one hook to TypeScript

---

## 📈 Success Metrics

**Performance Targets:**
- API response time: < 200ms (p95)
- Page load time: < 2s (first contentful paint)
- Time to interactive: < 3s
- Bundle size: < 500KB (gzipped)

**Reliability Targets:**
- Uptime: > 99.5%
- Error rate: < 1%
- WebSocket connection stability: > 95%

**Scalability Targets:**
- Support 50 concurrent sessions
- Handle 500 requests/minute
- Database queries: < 100ms (p95)

---

## 🆘 Troubleshooting Guide

### Rate Limiting Issues
```bash
# Check if rate limit headers are present
curl -I http://localhost:3000/api/catalog/items

# Should see:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 99
# X-RateLimit-Reset: <timestamp>
```

### Performance Issues
```bash
# Check memory usage
curl http://localhost:3000/metrics

# Check health
curl http://localhost:3000/health/ready

# Check database indexes
# Run in Supabase SQL editor:
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE tablename IN ('sessions', 'participants', 'payments', 'catalog_items');
```

### Database Query Optimization
```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

---

## 📚 Additional Resources

**Rate Limiting:**
- https://github.com/express-rate-limit/express-rate-limit

**React Performance:**
- https://react.dev/reference/react/memo
- https://react.dev/reference/react/useMemo

**React Query:**
- https://tanstack.com/query/latest

**Swagger:**
- https://swagger.io/docs/

**TypeScript Migration:**
- https://www.typescriptlang.org/docs/handbook/migrating-from-javascript.html

---

**Next Session:** Start with Critical items (Rate Limiting + Error Handling)
