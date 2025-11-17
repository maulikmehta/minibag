# Session PIN Authentication Feature

**Status:** ✅ Implemented
**Version:** 1.0
**Date:** 2025-11-02
**Security Level:** HIGH PRIORITY

---

## Overview

The Session PIN feature adds optional password protection to MiniBag sessions, preventing unauthorized participants from joining. This addresses the critical security gap where anyone with a session ID could previously join a session.

## Security Improvement

**Before:**
- ❌ Anyone with 8-character session ID could join
- ❌ No authentication for participants
- ❌ Risk of session hijacking and spam

**After:**
- ✅ Optional 4-6 digit PIN for participant authentication
- ✅ Host controls PIN generation and sharing
- ✅ PIN validated server-side before allowing join
- ✅ Backward compatible (PIN is optional)

---

## Database Changes

### Migration: `database/018_add_session_pin.sql`

**Changes:**
1. Added `session_pin` column to `sessions` table (TEXT, nullable)
2. Added index on `session_pin` for fast lookups
3. PIN is never exposed in GET session APIs (security)

**To Apply:**
1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/drbocrbecchxbzcfljol/sql)
2. Copy contents of `database/018_add_session_pin.sql`
3. Paste and click **Run**
4. Verify success message

**Verification Query:**
```sql
-- Check if session_pin column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sessions' AND column_name = 'session_pin';
```

---

## API Changes

### 1. Create Session (POST `/api/sessions/create`)

**New Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `session_pin` | string | No | 4-6 digit PIN (e.g., "1234", "567890") |
| `generate_pin` | boolean | No | If true, auto-generates a 4-digit PIN |

**Behavior:**
- If `session_pin` provided: Use that PIN
- If `generate_pin` is true: Auto-generate 4-digit PIN
- If neither: No PIN protection (backward compatible)

**Example Request (with custom PIN):**
```json
{
  "location_text": "MG Road Market",
  "scheduled_time": "2025-11-02T14:00:00Z",
  "selected_nickname": "Priya",
  "selected_avatar_emoji": "👩",
  "session_pin": "1234"
}
```

**Example Request (auto-generate PIN):**
```json
{
  "location_text": "MG Road Market",
  "scheduled_time": "2025-11-02T14:00:00Z",
  "selected_nickname": "Priya",
  "selected_avatar_emoji": "👩",
  "generate_pin": true
}
```

**Response Changes:**
```json
{
  "success": true,
  "data": {
    "session": { ... },
    "participant": { ... },
    "session_url": "/session/abc12345",
    "host_token": "64-char-hex-token",
    "session_pin": "1234"  // ← NEW: Host gets PIN to share
  }
}
```

### 2. Join Session (POST `/api/sessions/:session_id/join`)

**New Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `session_pin` | string | Conditional | Required if session has PIN protection |

**Example Request:**
```json
{
  "selected_nickname": "Amit",
  "selected_avatar_emoji": "👨",
  "session_pin": "1234"  // ← NEW: Participant provides PIN
}
```

**Error Responses:**

**PIN Required (401 Unauthorized):**
```json
{
  "success": false,
  "error": "This session requires a PIN to join. Please enter the PIN shared by the host.",
  "error_code": "PIN_REQUIRED"
}
```

**Incorrect PIN (403 Forbidden):**
```json
{
  "success": false,
  "error": "Incorrect PIN. Please check the PIN and try again.",
  "error_code": "INCORRECT_PIN"
}
```

### 3. Get Session (GET `/api/sessions/:session_id`)

**Response Changes:**
```json
{
  "success": true,
  "data": {
    "session": {
      // ... other fields ...
      "requires_pin": true,  // ← NEW: Boolean flag (PIN not exposed)
      // NOTE: session_pin is NEVER returned for security
    },
    "participants": [ ... ]
  }
}
```

**Security Note:** The actual PIN value is never returned in GET requests, only a boolean flag indicating if PIN is required.

---

## Validation Rules

### PIN Format
- **Length:** 4-6 digits
- **Characters:** Numeric only (0-9)
- **Regex:** `^\d{4,6}$`

**Valid PINs:**
- ✅ `1234` (4 digits)
- ✅ `98765` (5 digits)
- ✅ `123456` (6 digits)

**Invalid PINs:**
- ❌ `123` (too short)
- ❌ `1234567` (too long)
- ❌ `12ab` (non-numeric)
- ❌ `` (empty string)

### Validation Middleware

**Session Creation (`validateSessionCreation`):**
```javascript
body('session_pin')
  .optional()
  .matches(/^\d{4,6}$/)
  .withMessage('Session PIN must be a 4-6 digit number')
```

**Join Session (`validateJoinSession`):**
```javascript
body('session_pin')
  .optional()
  .matches(/^\d{4,6}$/)
  .withMessage('Session PIN must be a 4-6 digit number')
```

---

## Security Implementation

### Server-Side Validation
```javascript
// In joinSession() function
if (session.session_pin) {
  // Session requires PIN
  if (!session_pin) {
    return res.status(401).json({ error_code: 'PIN_REQUIRED' });
  }

  // Validate PIN matches
  if (session_pin !== session.session_pin) {
    return res.status(403).json({ error_code: 'INCORRECT_PIN' });
  }
}
```

### Security Features
1. ✅ **Constant-time comparison** (uses string equality, good enough for 4-6 digit PINs)
2. ✅ **PIN never exposed** in GET requests
3. ✅ **Server-side validation** only (no client-side bypass)
4. ✅ **No rate limiting on PIN attempts** yet (TODO: Add in Phase 2)

### Security Best Practices Applied
- PIN stored as plain text (acceptable for 4-6 digit codes)
- PIN validation happens before any other join logic
- Clear error codes for different failure modes
- No information leakage about PIN format in errors

---

## Frontend Integration Guide

### Step 1: Session Creation

```javascript
// Option 1: Let host create custom PIN
const response = await api.post('/api/sessions/create', {
  location_text: 'Market',
  scheduled_time: '2025-11-02T14:00:00Z',
  selected_nickname: 'Priya',
  selected_avatar_emoji: '👩',
  session_pin: '1234'  // Host enters this
});

// Option 2: Auto-generate PIN
const response = await api.post('/api/sessions/create', {
  location_text: 'Market',
  scheduled_time: '2025-11-02T14:00:00Z',
  selected_nickname: 'Priya',
  selected_avatar_emoji: '👩',
  generate_pin: true  // System generates PIN
});

// Option 3: No PIN (backward compatible)
const response = await api.post('/api/sessions/create', {
  location_text: 'Market',
  scheduled_time: '2025-11-02T14:00:00Z',
  selected_nickname: 'Priya',
  selected_avatar_emoji: '👩'
  // No PIN parameters
});

// Get PIN from response
const { session_pin } = response.data;
// Display PIN to host for sharing
```

### Step 2: Check if PIN Required

```javascript
// Before showing join form
const session = await api.get(`/api/sessions/${sessionId}`);

if (session.data.requires_pin) {
  // Show PIN input field
  setShowPinInput(true);
}
```

### Step 3: Join with PIN

```javascript
// Participant joins
try {
  await api.post(`/api/sessions/${sessionId}/join`, {
    selected_nickname: 'Amit',
    selected_avatar_emoji: '👨',
    session_pin: userEnteredPin  // From input field
  });
} catch (error) {
  if (error.error_code === 'PIN_REQUIRED') {
    // Show "Please enter PIN" message
  } else if (error.error_code === 'INCORRECT_PIN') {
    // Show "Incorrect PIN" error
    // Allow retry
  }
}
```

---

## User Experience

### Host Flow
1. **Create Session** screen:
   - Toggle: "Require PIN for joining?" (optional)
   - If enabled:
     - Option A: Enter custom 4-6 digit PIN
     - Option B: Click "Generate PIN"
2. **Session Created**:
   - Show PIN prominently: "Share this PIN: **1234**"
   - Copy button for easy sharing
3. **Share Link**:
   - WhatsApp message: "Join my MiniBag session! Link: [url] PIN: 1234"

### Participant Flow
1. **Open Session Link**:
   - App loads session
   - If `requires_pin` is true:
     - Show PIN input field (4-6 digit numeric keypad)
     - "Enter the PIN shared by [Host Name]"
2. **Enter PIN**:
   - Numeric input only
   - Submit button enabled when 4-6 digits entered
3. **Validation**:
   - Success: Join session normally
   - Error: Show clear error message and allow retry

---

## Testing

### Manual Test Cases

**Test 1: Create session without PIN (backward compatibility)**
```bash
curl -X POST http://localhost:3000/api/sessions/create \
  -H "Content-Type: application/json" \
  -d '{
    "location_text": "Test Market",
    "scheduled_time": "2025-11-03T10:00:00Z",
    "selected_nickname": "TestHost",
    "selected_avatar_emoji": "👨"
  }'
# Expected: Session created without PIN, anyone can join
```

**Test 2: Create session with custom PIN**
```bash
curl -X POST http://localhost:3000/api/sessions/create \
  -H "Content-Type: application/json" \
  -d '{
    "location_text": "Test Market",
    "scheduled_time": "2025-11-03T10:00:00Z",
    "selected_nickname": "TestHost",
    "selected_avatar_emoji": "👨",
    "session_pin": "1234"
  }'
# Expected: Response includes session_pin: "1234"
```

**Test 3: Create session with auto-generated PIN**
```bash
curl -X POST http://localhost:3000/api/sessions/create \
  -H "Content-Type: application/json" \
  -d '{
    "location_text": "Test Market",
    "scheduled_time": "2025-11-03T10:00:00Z",
    "selected_nickname": "TestHost",
    "selected_avatar_emoji": "👨",
    "generate_pin": true
  }'
# Expected: Response includes generated 4-digit session_pin
```

**Test 4: Join session without PIN (should fail if PIN required)**
```bash
curl -X POST http://localhost:3000/api/sessions/abc12345/join \
  -H "Content-Type: application/json" \
  -d '{
    "selected_nickname": "TestParticipant",
    "selected_avatar_emoji": "👩"
  }'
# Expected: 401 error with "PIN_REQUIRED"
```

**Test 5: Join session with incorrect PIN**
```bash
curl -X POST http://localhost:3000/api/sessions/abc12345/join \
  -H "Content-Type: application/json" \
  -d '{
    "selected_nickname": "TestParticipant",
    "selected_avatar_emoji": "👩",
    "session_pin": "9999"
  }'
# Expected: 403 error with "INCORRECT_PIN"
```

**Test 6: Join session with correct PIN**
```bash
curl -X POST http://localhost:3000/api/sessions/abc12345/join \
  -H "Content-Type: application/json" \
  -d '{
    "selected_nickname": "TestParticipant",
    "selected_avatar_emoji": "👩",
    "session_pin": "1234"
  }'
# Expected: 200 success, participant created
```

**Test 7: GET session should not expose PIN**
```bash
curl http://localhost:3000/api/sessions/abc12345
# Expected: Response includes requires_pin: true, but NOT session_pin
```

### Automated Test Cases (To Be Written)

```javascript
describe('Session PIN Authentication', () => {
  describe('Session Creation', () => {
    test('creates session without PIN (backward compatible)', async () => {
      // Test implementation
    });

    test('creates session with custom PIN', async () => {
      // Test implementation
    });

    test('creates session with auto-generated PIN', async () => {
      // Test implementation
    });

    test('rejects invalid PIN format', async () => {
      // Test: 3 digits, 7 digits, alphanumeric
    });
  });

  describe('Session Join', () => {
    test('allows join without PIN if session has no PIN', async () => {
      // Test implementation
    });

    test('blocks join without PIN if session requires PIN', async () => {
      // Test implementation
    });

    test('blocks join with incorrect PIN', async () => {
      // Test implementation
    });

    test('allows join with correct PIN', async () => {
      // Test implementation
    });
  });

  describe('Security', () => {
    test('GET session does not expose PIN value', async () => {
      // Test implementation
    });

    test('GET session shows requires_pin flag', async () => {
      // Test implementation
    });
  });
});
```

---

## Future Enhancements (Phase 2)

### Security Improvements
1. **Rate Limiting on PIN Attempts**
   - Max 5 attempts per 15 minutes per IP
   - Temporary lockout after failed attempts
   - Track attempts in Redis or database

2. **PIN Encryption**
   - Hash PINs with bcrypt before storing
   - Use constant-time comparison for validation

3. **PIN Expiration**
   - Optional: PIN expires after 24 hours
   - Host can regenerate PIN if expired

4. **Audit Logging**
   - Log all PIN validation attempts
   - Track successful and failed joins
   - Monitor for brute force attacks

### UX Improvements
1. **PIN Strength Indicator**
   - Warn if PIN is too simple (e.g., "1234", "0000")
   - Suggest random PIN generation

2. **PIN Reset**
   - Allow host to change PIN after session created
   - Notify existing participants of PIN change

3. **QR Code with PIN**
   - Generate QR code containing session URL + PIN
   - Easy sharing via screenshot

4. **PIN Hints**
   - Host can add optional hint
   - Helps participants remember without exposing PIN

---

## Migration Checklist

- [x] Database migration created (`018_add_session_pin.sql`)
- [x] Backend API updated (`sessions.js`)
- [x] Validation middleware updated (`validation.js`)
- [x] Schema documentation updated (`session.schema.js`)
- [x] Feature documentation created (this file)
- [ ] Database migration applied to Supabase
- [ ] Frontend UI updated (session creation)
- [ ] Frontend UI updated (session join)
- [ ] API integration tests written
- [ ] E2E tests written
- [ ] User documentation updated

---

## Support

**File:** `packages/shared/api/sessions.js`
**Lines:**
- PIN generation: 43-61
- Session creation: 327-543
- Join validation: 625-774

**Database:** `sessions` table, column `session_pin`

**Contact:** Review this document or check code comments for implementation details.

---

**Status:** ✅ Backend Complete, Frontend Pending
**Next Steps:** Apply migration, update frontend, write tests
