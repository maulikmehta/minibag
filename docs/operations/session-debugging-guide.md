# Session Debugging & Operations Playbook

**Version:** 1.0
**Last Updated:** 2025-11-07
**Maintainers:** Engineering Team

---

## Overview

This playbook provides step-by-step procedures for investigating and resolving common session-related issues in production. Use this as your first reference when debugging session failures, participant issues, or payment problems.

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Common Issues](#common-issues)
3. [Investigation Procedures](#investigation-procedures)
4. [Database Queries](#database-queries)
5. [Log Locations](#log-locations)
6. [WebSocket Debugging](#websocket-debugging)
7. [Incident Response](#incident-response)
8. [Preventive Measures](#preventive-measures)

---

## Quick Reference

### Emergency Contacts

- **On-Call Engineer:** Check PagerDuty rotation
- **Database Admin:** [Contact info]
- **Sentry Dashboard:** https://sentry.io/[your-org]/[your-project]

### Key Monitoring Dashboards

- **Active Sessions:** `GET /api/metrics` (see packages/shared/server.js:228-244)
- **Error Rates:** Sentry dashboard
- **WebSocket Health:** Check server logs for connection/disconnection patterns
- **Database Performance:** Supabase dashboard

### Most Common Issues (80% of tickets)

1. **"Session not found"** → Check session expiration (24 hours) or typo in session ID
2. **"Participant can't join"** → Check session capacity (10 max), PIN validity, expiration
3. **"Items not showing"** → Check WebSocket connection, browser cache, undefined items array
4. **"Payment calculation wrong"** → Check participant.items array, quantity values
5. **"Infinite loading"** → Check API response, network errors, race conditions

---

## Common Issues

### Issue 1: Session Not Found

**Symptoms:**
- User clicks invite link, sees "Session not found" error
- API returns 404 on `/api/sessions/:sessionId`

**Common Causes:**
1. Session expired (24 hours since creation)
2. Session ID typo in URL
3. Session deleted from database
4. Database connection issue

**Investigation Steps:**

```sql
-- Check if session exists
SELECT id, status, created_at, expires_at, host_id
FROM sessions
WHERE id = 'SESSION_ID_HERE';

-- Check if session expired
SELECT id, status,
       created_at,
       expires_at,
       NOW() > expires_at AS is_expired,
       EXTRACT(EPOCH FROM (NOW() - created_at))/3600 AS hours_since_creation
FROM sessions
WHERE id = 'SESSION_ID_HERE';
```

**Resolution:**
- **If expired:** Inform user session expired, they can create new one
- **If not found:** Check if typo in URL (session IDs are 12 chars, case-sensitive)
- **If database issue:** Check Supabase dashboard for outages

**Prevention:**
- Consider extending expiration to 48 hours for longer shopping trips
- Add "session about to expire" warning in UI (if > 23 hours old)

---

### Issue 2: Participant Can't Join

**Symptoms:**
- User enters name/PIN, clicks "Join Session"
- Gets error: "Session is full", "Invalid PIN", or generic error

**Common Causes:**
1. Session reached 10 participant limit
2. Incorrect PIN entered
3. Session already completed/expired
4. Nickname already in use (should auto-assign new one)
5. Database constraint violation

**Investigation Steps:**

```sql
-- Check session status and participant count
SELECT s.id, s.status, s.has_pin, s.max_participants,
       COUNT(p.id) AS current_participants,
       ARRAY_AGG(p.name) AS participant_names
FROM sessions s
LEFT JOIN participants p ON p.session_id = s.id AND p.status != 'declined'
WHERE s.id = 'SESSION_ID_HERE'
GROUP BY s.id;

-- Check if specific participant exists
SELECT id, name, nickname, status, created_at
FROM participants
WHERE session_id = 'SESSION_ID_HERE'
ORDER BY created_at DESC;
```

**Check Backend Logs:**
```bash
# Search for validation errors
grep "SESSION_ID_HERE" /var/log/app.log | grep -i "validation\|error"

# Or in Sentry, search for:
# - session: SESSION_ID_HERE
# - tag: validation_error
```

**Resolution:**
- **Session full:** Inform user, host can increase limit or create new session
- **Invalid PIN:** User should retry with correct PIN from host
- **Already completed:** Session closed, can't join anymore
- **Database error:** Check constraint violations, may need manual cleanup

**Prevention:**
- Show participant count in join screen ("5/10 spots filled")
- Allow host to increase max_participants if needed
- Clear error messages for each failure reason

---

### Issue 3: Items Not Displaying

**Symptoms:**
- Session screen loads but items list is empty
- Items were visible before but disappeared
- Some items show but others don't

**Common Causes:**
1. `items` array is `undefined` or `null` in API response
2. WebSocket disconnected, not receiving updates
3. Browser cache showing stale data
4. API transformation error (sessionTransformers.js)
5. Race condition: UI renders before data loaded

**Investigation Steps:**

**Check API Response:**
```bash
# Test session endpoint directly
curl https://your-domain.com/api/sessions/SESSION_ID_HERE \
  -H "Cookie: sessionAuth=COOKIE_VALUE"

# Look for items array in response
# Should be: { session: { items: [...] } }
```

**Check Database:**
```sql
-- Verify items exist in database
SELECT id, name, quantity, price, added_by
FROM session_items
WHERE session_id = 'SESSION_ID_HERE'
ORDER BY created_at;

-- Check if items linked to participants correctly
SELECT si.name AS item_name, si.quantity, si.price,
       p.name AS participant_name, pi.quantity AS participant_quantity
FROM session_items si
LEFT JOIN participant_items pi ON pi.item_id = si.id
LEFT JOIN participants p ON p.id = pi.participant_id
WHERE si.session_id = 'SESSION_ID_HERE'
ORDER BY si.name, p.name;
```

**Check Frontend Console:**
```javascript
// In browser console, inspect state
localStorage.getItem('minibag_session_SESSION_ID_HERE')

// Should show session object with items array
// If undefined or empty, issue is in frontend state management
```

**Resolution:**
- **Undefined items:** Bug in API or transformer, check server logs for errors
- **WebSocket issue:** Check connection status (see WebSocket Debugging section)
- **Cache issue:** Clear browser cache, refresh page with Ctrl+Shift+R
- **Race condition:** Check loading states, may need to add defensive checks

**Prevention:**
- Add null safety: `items?.filter(Boolean).map(...)` in all components
- Validate API responses with Zod schemas (planned improvement)
- Add error boundaries to catch rendering errors

---

### Issue 4: Payment Calculation Wrong

**Symptoms:**
- Bill total doesn't match expected amount
- Participant charged for items they didn't select
- Amounts don't add up correctly

**Common Causes:**
1. `participant.items` array has wrong quantities
2. Item prices changed after selection
3. Floating point rounding errors
4. Participant selected items but not reflected in database
5. Tax/tip calculation error

**Investigation Steps:**

```sql
-- Get complete payment breakdown for a participant
SELECT
  p.name AS participant_name,
  si.name AS item_name,
  pi.quantity AS selected_quantity,
  si.price AS item_price,
  (pi.quantity * si.price) AS line_total
FROM participants p
JOIN participant_items pi ON pi.participant_id = p.id
JOIN session_items si ON si.id = pi.item_id
WHERE p.id = 'PARTICIPANT_ID_HERE'
ORDER BY si.name;

-- Compare to expected total
SELECT
  p.id,
  p.name,
  SUM(pi.quantity * si.price) AS subtotal,
  p.tax_amount,
  p.tip_amount,
  (SUM(pi.quantity * si.price) + p.tax_amount + p.tip_amount) AS total
FROM participants p
LEFT JOIN participant_items pi ON pi.participant_id = p.id
LEFT JOIN session_items si ON si.id = pi.item_id
WHERE p.session_id = 'SESSION_ID_HERE'
GROUP BY p.id, p.name, p.tax_amount, p.tip_amount;
```

**Check API Calculation Logic:**
File: `packages/shared/api/bills.js`

Look for calculation in `calculateBill` or similar function.

**Resolution:**
- **Wrong quantities:** Update participant_items table, recalculate bill
- **Price mismatch:** Check if prices changed, may need to lock prices at session creation
- **Rounding:** Use `ROUND(amount, 2)` in calculations
- **Missing items:** Sync issue, check WebSocket events

**Prevention:**
- Lock item prices when session created (prevent changes mid-session)
- Add unit tests for bill calculation with various edge cases
- Display itemized breakdown to users before payment
- Add validation: total = sum of all participant subtotals + taxes + tips

---

### Issue 5: Infinite Loading / UI Frozen

**Symptoms:**
- Loading spinner never goes away
- Page stuck on "Loading session..."
- UI unresponsive, can't click anything

**Common Causes:**
1. API call never completes (network error, timeout)
2. Infinite loop in useEffect (missing dependency or circular update)
3. WebSocket connection stuck in retry loop
4. State update causing re-render loop
5. Promise never resolves (missing catch)

**Investigation Steps:**

**Check Browser Console:**
```
Open DevTools → Console
Look for:
- Red errors (failed API calls, JavaScript exceptions)
- Warning: "Maximum update depth exceeded" → Infinite render loop
- Pending network requests (Network tab) → API timeout
```

**Check Network Tab:**
```
1. Open DevTools → Network
2. Look for requests stuck in "Pending" state
3. Check response times (>10s indicates issue)
4. Look for failed requests (red, 4xx/5xx status)
```

**Check WebSocket Connection:**
```javascript
// In browser console
// If using socket.io
window.socket?.connected // Should be true
window.socket?.disconnected // Should be false

// Check event listeners
window.socket?.listeners('connect')
window.socket?.listeners('participant-joined')
// Should show registered handlers
```

**Check for Infinite Loops:**
```javascript
// Common patterns to look for in code:

// ❌ BAD: Missing dependency
useEffect(() => {
  setCount(count + 1); // Will run infinitely
}, []);

// ❌ BAD: Circular update
useEffect(() => {
  setData({...data, timestamp: Date.now()}); // New object every time
}, [data]);

// ✅ GOOD: Proper dependencies
useEffect(() => {
  fetchData(sessionId);
}, [sessionId]);
```

**Resolution:**
- **API timeout:** Check server logs, may be database lock or slow query
- **Infinite loop:** Identify problematic useEffect, fix dependencies
- **WebSocket stuck:** Reconnect or refresh page (backend should handle)
- **Promise never resolves:** Add timeout wrapper, show error after 10s

**Prevention:**
- Add timeout to all API calls (10s max)
- Add loading state timeout (if loading > 10s, show error)
- Review all useEffect dependencies in code review
- Use `useCallback` for functions used as dependencies

---

## Investigation Procedures

### Procedure 1: Full Session Lifecycle Trace

**Use Case:** User reports "something went wrong" with no specific error

**Steps:**

1. **Get Session ID** from user (from URL or localStorage)

2. **Check Database State:**
```sql
-- Get complete session overview
SELECT
  s.id,
  s.status,
  s.created_at,
  s.expires_at,
  s.has_pin,
  COUNT(DISTINCT p.id) AS participant_count,
  COUNT(DISTINCT si.id) AS item_count,
  SUM(CASE WHEN p.payment_status = 'completed' THEN 1 ELSE 0 END) AS paid_count
FROM sessions s
LEFT JOIN participants p ON p.session_id = s.id AND p.status != 'declined'
LEFT JOIN session_items si ON si.session_id = s.id
WHERE s.id = 'SESSION_ID_HERE'
GROUP BY s.id;
```

3. **Check Server Logs:**
```bash
# Find all logs related to this session
grep "SESSION_ID_HERE" /var/log/app.log | tail -100

# Or in centralized logging
# Search: session_id: "SESSION_ID_HERE"
# Time range: Last 24 hours
```

4. **Check Sentry:**
- Go to Sentry dashboard
- Search: `session:"SESSION_ID_HERE"` or `sessionId:"SESSION_ID_HERE"`
- Look for exceptions, performance issues

5. **Trace User Actions:**
```sql
-- Check participant actions (if activity log exists)
SELECT action, created_at, details
FROM activity_logs
WHERE session_id = 'SESSION_ID_HERE'
ORDER BY created_at DESC
LIMIT 50;

-- Or reconstruct from database state changes
SELECT
  'Session created' AS event,
  created_at AS timestamp
FROM sessions
WHERE id = 'SESSION_ID_HERE'
UNION ALL
SELECT
  'Participant ' || name || ' joined',
  created_at
FROM participants
WHERE session_id = 'SESSION_ID_HERE'
UNION ALL
SELECT
  'Item ' || name || ' added',
  created_at
FROM session_items
WHERE session_id = 'SESSION_ID_HERE'
ORDER BY timestamp;
```

6. **Identify Issue Pattern:**
- Session never created → Creation API failed
- Participants can't join → Validation or capacity issue
- Items not showing → Data sync or race condition
- Payment failed → Calculation or payment processor error

7. **Document Findings:**
Create incident report with:
- Timeline of events
- Root cause
- User impact
- Resolution steps taken
- Prevention measures

---

### Procedure 2: WebSocket Connection Issues

**Use Case:** Real-time updates not working (participants not seeing each other join, item updates not syncing)

**Steps:**

1. **Check Client Connection:**
```javascript
// In browser console on user's machine
console.log('Socket connected:', window.socket?.connected);
console.log('Socket ID:', window.socket?.id);
console.log('Session rooms:', window.socket?.rooms); // May not be exposed client-side
```

2. **Check Server-Side Connection:**
```bash
# Find socket connection logs
grep "socket.*connected\|socket.*disconnected" /var/log/app.log | tail -50

# Check for specific session room
grep "session-SESSION_ID_HERE" /var/log/app.log | grep "joined\|left"
```

3. **Test Event Emission:**
```javascript
// On client, manually emit test event
window.socket.emit('test-event', { message: 'test' });

// Check server logs for receipt
// Should see log entry about receiving 'test-event'
```

4. **Check Room Membership:**
```javascript
// Server-side code (add temporarily for debugging)
const io = getSocketIOInstance();
const room = io.sockets.adapter.rooms.get(`session-${sessionId}`);
console.log('Room size:', room?.size);
console.log('Socket IDs in room:', Array.from(room || []));
```

5. **Verify Event Handlers:**
```javascript
// In packages/minibag/src/services/socket.js
// Ensure handlers are registered:
console.log('Registered handlers:', {
  'participant-joined': socket.listeners('participant-joined').length,
  'participant-left': socket.listeners('participant-left').length,
  'item-updated': socket.listeners('item-updated').length,
});
```

6. **Common WebSocket Issues:**

| Issue | Symptom | Resolution |
|-------|---------|------------|
| Race condition | Events before join complete | Fix: Add handshake (see ADR) |
| Duplicate handlers | Event fires multiple times | Fix: Use `.once()` or cleanup |
| Handler not registered | Events not received | Fix: Check listener registration |
| Room join failed | User not in room | Fix: Check join logic, emit confirmation |
| Stale closure | Handler uses old state | Fix: Use refs or re-register |

---

### Procedure 3: Undefined Value Tracking

**Use Case:** Error mentions "Cannot read property 'X' of undefined"

**Steps:**

1. **Identify Error Location:**
```
Check error stack trace in Sentry or console:
- File name (e.g., useSession.js)
- Line number
- Property being accessed
```

2. **Trace Data Flow Backward:**
```
For example, if error is:
"Cannot read property 'items' of undefined in SessionActiveScreen.jsx:245"

Trace backwards:
1. SessionActiveScreen uses session.items
2. session comes from useSession(sessionId)
3. useSession gets data from API
4. API calls sessionTransformers
5. Transformers parse database response

Find where undefined originated.
```

3. **Check Each Layer:**

**API Response:**
```bash
curl https://your-domain.com/api/sessions/SESSION_ID \
  -H "Cookie: sessionAuth=..." \
  | jq '.'

# Check if response has expected structure
# Should have: { session: { items: [...] } }
```

**Database:**
```sql
-- Check if data exists
SELECT id, host_id, status, created_at
FROM sessions
WHERE id = 'SESSION_ID_HERE';

-- Check related data
SELECT COUNT(*) FROM session_items WHERE session_id = 'SESSION_ID_HERE';
```

**Transformer:**
File: `packages/minibag/src/utils/sessionTransformers.js`
```javascript
// Add defensive checks
console.log('Transform input:', JSON.stringify(apiResponse, null, 2));

if (!apiResponse) {
  console.error('API response is undefined/null');
  return null;
}

if (!apiResponse.session) {
  console.error('API response missing session key');
  return null;
}
```

4. **Add Null Safety:**
```javascript
// ❌ BEFORE
const itemCount = session.items.length;

// ✅ AFTER
const itemCount = session?.items?.length ?? 0;

// Or
const itemCount = (session && session.items) ? session.items.length : 0;
```

5. **Add Validation:**
```javascript
// Using Zod (planned improvement)
const SessionSchema = z.object({
  id: z.string(),
  items: z.array(z.object({
    id: z.string(),
    name: z.string(),
    quantity: z.number(),
  })),
});

const validated = SessionSchema.parse(apiResponse.session);
// Throws clear error if structure invalid
```

---

## Database Queries

### Quick Session Lookup

```sql
-- Get session with all related data
SELECT
  s.id,
  s.status,
  s.created_at,
  s.expires_at,
  s.host_id,
  s.has_pin,
  s.max_participants,
  h.name AS host_name,
  COUNT(DISTINCT p.id) FILTER (WHERE p.status != 'declined') AS active_participants,
  COUNT(DISTINCT si.id) AS item_count,
  SUM(si.quantity * si.price) AS total_value
FROM sessions s
LEFT JOIN participants h ON h.id = s.host_id
LEFT JOIN participants p ON p.session_id = s.id
LEFT JOIN session_items si ON si.session_id = s.id
WHERE s.id = 'SESSION_ID_HERE'
GROUP BY s.id, h.name;
```

### Find Recent Sessions

```sql
-- Sessions created in last 24 hours
SELECT id, status, created_at, host_id
FROM sessions
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;
```

### Find Problem Sessions

```sql
-- Sessions with no items (potential issue)
SELECT s.id, s.created_at, COUNT(si.id) AS item_count
FROM sessions s
LEFT JOIN session_items si ON si.session_id = s.id
WHERE s.status = 'active'
  AND s.created_at < NOW() - INTERVAL '10 minutes'
GROUP BY s.id
HAVING COUNT(si.id) = 0;

-- Sessions with no participants except host (abandoned)
SELECT s.id, s.created_at, COUNT(p.id) AS participant_count
FROM sessions s
LEFT JOIN participants p ON p.session_id = s.id
WHERE s.status = 'active'
  AND s.created_at < NOW() - INTERVAL '1 hour'
GROUP BY s.id
HAVING COUNT(p.id) <= 1;

-- Sessions stuck in active status (should be expired)
SELECT id, status, created_at, expires_at
FROM sessions
WHERE status = 'active'
  AND expires_at < NOW()
ORDER BY created_at DESC;
```

### Get Participant Details

```sql
-- All participants in a session with their items
SELECT
  p.id,
  p.name,
  p.nickname,
  p.status,
  p.payment_status,
  COALESCE(SUM(pi.quantity * si.price), 0) AS amount_owed,
  COUNT(DISTINCT pi.item_id) AS unique_items_selected
FROM participants p
LEFT JOIN participant_items pi ON pi.participant_id = p.id
LEFT JOIN session_items si ON si.id = pi.item_id
WHERE p.session_id = 'SESSION_ID_HERE'
GROUP BY p.id
ORDER BY p.created_at;
```

### Cleanup Queries (Use Carefully)

```sql
-- Mark expired sessions as expired (safe, should run automatically)
UPDATE sessions
SET status = 'expired'
WHERE status = 'active'
  AND expires_at < NOW();

-- Delete test sessions (DANGEROUS - add WHERE carefully)
DELETE FROM sessions
WHERE id = 'TEST_SESSION_ID'
  AND created_at > NOW() - INTERVAL '1 hour';  -- Safety: only recent

-- Release unused nicknames (if stuck)
UPDATE nickname_assignments
SET in_use = false, used_at = NULL
WHERE in_use = true
  AND used_at < NOW() - INTERVAL '24 hours';
```

---

## Log Locations

### Backend Logs

**Production:**
```bash
# Application logs
/var/log/app.log  # or wherever configured

# View live logs
tail -f /var/log/app.log | grep "SESSION_ID\|ERROR\|WARN"

# Or with systemd/pm2
pm2 logs api-server --lines 100
journalctl -u api-server -f
```

**Log Levels:**
- `TRACE`: Very detailed (usually disabled in production)
- `DEBUG`: Debugging info (enabled in dev, disabled in prod)
- `INFO`: General info (session created, participant joined)
- `WARN`: Warning (race condition detected, validation failed)
- `ERROR`: Errors (API failed, database error)
- `FATAL`: Critical errors (server crash)

**Key Log Patterns:**
```
INFO: Session SESSION_ID created by host HOST_ID
INFO: Participant PARTICIPANT_ID joined session SESSION_ID
WARN: ⚠️ Room empty (race condition), using global broadcast fallback
ERROR: Failed to create session: [details]
ERROR: Database error in /api/sessions: [SQL error]
```

### Frontend Logs (After Improvements)

**Browser Console:**
```javascript
// Current: console.log everywhere
// Future: Structured logging
logger.info('Session loaded', { sessionId, itemCount });
logger.warn('WebSocket disconnected', { sessionId, reason });
logger.error('Failed to join session', { sessionId, error });
```

**Sent to Backend:** (After implementation)
```
POST /api/logs
{
  "level": "error",
  "message": "Failed to restore session",
  "context": {
    "sessionId": "abc123def456",
    "error": "Session not found",
    "correlationId": "req-123-456"
  },
  "timestamp": "2025-11-07T10:30:00Z"
}
```

### Sentry Logs

**Dashboard:** https://sentry.io/[your-org]/[your-project]

**Useful Searches:**
```
# Find all errors for a session
session:"SESSION_ID_HERE"

# Find specific error types
message:"Cannot read property"
message:"ValidationError"

# Find errors in specific files
file:"useSession.js"
file:"sessions.js"

# Find errors for specific user
user.id:"USER_ID_HERE"
```

**Breadcrumbs:**
```
Sentry captures breadcrumbs showing actions before error:
1. User navigated to /session/abc123
2. API called: GET /api/sessions/abc123
3. WebSocket connected
4. ERROR: Cannot read property 'items' of undefined

Use breadcrumbs to reconstruct user journey.
```

---

## WebSocket Debugging

### Client-Side Debugging

**Check Connection Status:**
```javascript
// In browser console
const socket = window.socket; // or however it's exposed

console.log('Connected:', socket.connected);
console.log('Disconnected:', socket.disconnected);
console.log('Socket ID:', socket.id);
```

**Monitor Events:**
```javascript
// Log all incoming events
const originalOn = socket.on.bind(socket);
socket.on = function(event, handler) {
  console.log(`Registered handler for: ${event}`);
  return originalOn(event, function(...args) {
    console.log(`Received event: ${event}`, args);
    return handler(...args);
  });
};

// Or manually test
socket.on('participant-joined', (data) => {
  console.log('Participant joined:', data);
});
```

**Emit Test Events:**
```javascript
// Test if server receives events
socket.emit('ping', { message: 'test' });

// Expected: Server logs "Received: ping { message: 'test' }"
```

### Server-Side Debugging

**Check Connected Sockets:**
File: `packages/shared/websocket/handlers.js`

```javascript
// Add temporary debugging
io.on('connection', (socket) => {
  console.log('Socket connected:', {
    socketId: socket.id,
    handshake: socket.handshake.address,
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', {
      socketId: socket.id,
      reason,
    });
  });
});
```

**Check Room Membership:**
```javascript
// Get all sockets in a session room
const sessionRoom = `session-${sessionId}`;
const room = io.sockets.adapter.rooms.get(sessionRoom);

if (!room) {
  console.log(`Room ${sessionRoom} does not exist`);
} else {
  console.log(`Room ${sessionRoom} has ${room.size} sockets`);
  console.log('Socket IDs:', Array.from(room));
}
```

**Monitor All Events:**
```javascript
// Log all emitted events
socket.onAny((event, ...args) => {
  console.log('Event received:', event, args);
});

// Log all emitted events (server-side)
const originalEmit = io.to.bind(io);
io.to = function(room) {
  const emitter = originalEmit(room);
  const originalEmit2 = emitter.emit.bind(emitter);
  emitter.emit = function(event, ...args) {
    console.log(`Emitting to room ${room}:`, event, args);
    return originalEmit2(event, ...args);
  };
  return emitter;
};
```

### Common WebSocket Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Events not received | Handler not registered | Check `socket.on()` calls |
| Duplicate events | Handler registered multiple times | Use `socket.once()` or cleanup |
| Room empty | Socket didn't join room | Add join confirmation |
| Event before ready | Race condition | Queue events until connection ready |
| Connection drops | Network issue or server restart | Auto-reconnect (already implemented) |
| Stale data in handler | Closure over old state | Use refs or re-register handlers |

---

## Incident Response

### Severity Levels

**SEV 1 (Critical) - Resolve within 1 hour**
- All sessions broken (can't create or join)
- Database unavailable
- Payment processing completely down
- Security breach

**SEV 2 (High) - Resolve within 4 hours**
- Some sessions failing (>20% error rate)
- WebSocket not working
- Payment processing intermittent
- Major feature broken

**SEV 3 (Medium) - Resolve within 1 day**
- Individual sessions having issues
- UI bugs affecting usability
- Performance degradation
- Non-critical feature broken

**SEV 4 (Low) - Resolve in next sprint**
- Minor UI issues
- Edge case bugs
- Enhancement requests
- Technical debt

### Response Checklist

**Immediate (First 15 minutes):**
- [ ] Acknowledge incident in Slack/PagerDuty
- [ ] Assess severity and impact (how many users affected?)
- [ ] Check monitoring dashboards (Sentry, metrics, logs)
- [ ] Determine if rollback needed

**Investigation (First hour):**
- [ ] Identify root cause using investigation procedures
- [ ] Document timeline of events
- [ ] Check if recent deployment caused issue (rollback if yes)
- [ ] Communicate status update to stakeholders

**Resolution:**
- [ ] Implement fix (hotfix branch if production)
- [ ] Test fix in staging environment
- [ ] Deploy fix to production
- [ ] Monitor for recurrence

**Post-Incident:**
- [ ] Write postmortem document
- [ ] Identify prevention measures
- [ ] Create follow-up tasks (bug fixes, improvements)
- [ ] Share learnings with team

### Communication Template

**Initial Alert:**
```
INCIDENT: [SEV X] Session creation failing

Status: Investigating
Impact: Users cannot create new sessions since 10:30 AM
Users Affected: ~50
Workaround: None yet
Next Update: 11:00 AM
```

**Status Update:**
```
UPDATE: Root cause identified

Cause: Database migration broke session_items table constraint
Fix: Reverting migration, deploying hotfix
ETA: 11:30 AM
```

**Resolution:**
```
RESOLVED: Session creation restored

Resolution: Reverted bad migration, applied hotfix
Confirmed: All sessions working normally
Duration: 45 minutes (10:30 AM - 11:15 AM)
Postmortem: Will be shared by EOD
```

---

## Preventive Measures

### Before Deploying

- [ ] Run test suite (`npm test`)
- [ ] Check for console.logs/debuggers left in code
- [ ] Review database migrations (check for breaking changes)
- [ ] Test critical flows manually (create session, join, pay)
- [ ] Check Sentry for new error patterns in staging

### Monitoring Checklist

- [ ] Set up Sentry alerts for error rate > threshold
- [ ] Monitor active session count (sudden drop = issue)
- [ ] Track API response times (>2s = slow)
- [ ] Check database connection pool (exhaustion = problem)
- [ ] Review logs daily for WARN/ERROR patterns

### Code Review Checklist

- [ ] All API responses validated before use
- [ ] Null/undefined checks on all array operations
- [ ] Error handling in all async functions (try-catch)
- [ ] WebSocket events have registered handlers
- [ ] No infinite loop risks (useEffect dependencies correct)
- [ ] Tests added for new features
- [ ] Logging added for important operations

---

## Appendix: Tools & Resources

### Useful Commands

```bash
# Find sessions created in last hour
psql -U postgres -d database_name -c \
  "SELECT id, created_at FROM sessions WHERE created_at > NOW() - INTERVAL '1 hour'"

# Count active sessions
psql -U postgres -d database_name -c \
  "SELECT COUNT(*) FROM sessions WHERE status = 'active'"

# Find errors in logs (last 1000 lines)
tail -1000 /var/log/app.log | grep -i "error\|exception\|fail"

# Check WebSocket connections
lsof -i :3000 | grep ESTABLISHED | wc -l
```

### Browser DevTools Tips

**Performance Profiling:**
1. Open DevTools → Performance tab
2. Click Record
3. Reproduce slow action
4. Stop recording
5. Look for long tasks (>50ms) in flame graph

**Memory Leaks:**
1. Open DevTools → Memory tab
2. Take heap snapshot
3. Perform actions (join session, leave, etc.)
4. Take another snapshot
5. Compare - objects should be garbage collected

**Network Debugging:**
1. Open DevTools → Network tab
2. Filter: XHR to see API calls
3. Filter: WS to see WebSocket
4. Look for:
   - Failed requests (red)
   - Slow requests (>1s)
   - Blocked requests (CORS, CSP)

---

## Document Maintenance

**This playbook should be updated when:**
- New common issue identified
- New debugging technique discovered
- System architecture changes
- New monitoring tools added

**Review Schedule:** Monthly

**Owner:** Engineering Team Lead

---

**Questions or issues with this playbook?** Open a GitHub issue or Slack #engineering-help
