# Rate Limiting Implementation - Security Enhancement

**Status:** ✅ Implemented
**Priority:** HIGH (Critical Security)
**Date:** 2025-11-02
**Security Impact:** Prevents brute force, DDoS, and resource exhaustion attacks

---

## Overview

Enabled rate limiting in **ALL environments** (development, staging, production) to prevent abuse and ensure security testing during development.

## Problem Fixed

### Before (INSECURE)
```javascript
// ❌ Rate limiting DISABLED in development
max: process.env.NODE_ENV === 'production' ? 100 : 999999, // Unlimited in dev!
skip: (req) => process.env.NODE_ENV !== 'production' // Completely skipped!
```

**Issues:**
1. ❌ Developers can't test rate limiting
2. ❌ Vulnerabilities slip into production
3. ❌ No protection in dev/staging environments
4. ❌ Brute force attacks possible during development

### After (SECURE)
```javascript
// ✅ Rate limiting ENABLED in all environments
max: process.env.NODE_ENV === 'production' ? 100 : 500, // Limited in all envs
// No skip function - always active
```

**Benefits:**
1. ✅ Protection in all environments
2. ✅ Developers can test rate limiting
3. ✅ Catches security issues early
4. ✅ Prevents abuse even in staging

---

## Rate Limiting Tiers

### 1. General API Limiter (All Endpoints)

**Purpose:** Prevent general API abuse and DDoS

```javascript
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: production ? 100 : 500,  // Requests per window
  message: 'Too many requests from this IP, please try again later.'
});
```

**Limits:**
| Environment | Limit | Window | Per Second |
|-------------|-------|--------|------------|
| **Production** | 100 requests | 15 min | ~0.11 req/s |
| **Development** | 500 requests | 15 min | ~0.55 req/s |

**Applied to:** All `/api/*` routes

**Protects against:**
- DDoS attacks
- API scraping
- Resource exhaustion
- Accidental infinite loops

---

### 2. Session Creation Limiter

**Purpose:** Prevent session spam and abuse

```javascript
const createSessionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: production ? 10 : 50,  // Sessions per hour
  message: 'Too many sessions created from this IP. Please try again in an hour.'
});
```

**Limits:**
| Environment | Limit | Window | Per Minute |
|-------------|-------|--------|------------|
| **Production** | 10 sessions | 1 hour | ~0.17 sessions/min |
| **Development** | 50 sessions | 1 hour | ~0.83 sessions/min |

**Applied to:** `POST /api/sessions/create`

**Protects against:**
- Session spam
- Database pollution
- Resource exhaustion
- Abuse of session creation

**Rationale:**
- Normal users create 1-2 sessions per day
- 10 per hour is extremely generous
- Prevents malicious bulk session creation

---

### 3. Authentication Limiter (NEW)

**Purpose:** Prevent brute force attacks on PIN authentication

```javascript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: production ? 5 : 20,  // Auth attempts per window
  message: 'Too many failed authentication attempts. Please try again later.',
  skipSuccessfulRequests: true  // Only count failures
});
```

**Limits:**
| Environment | Limit | Window | Protection |
|-------------|-------|--------|------------|
| **Production** | 5 attempts | 15 min | Very strict |
| **Development** | 20 attempts | 15 min | Allows testing |

**Applied to:** `POST /api/sessions/:session_id/join`

**Protects against:**
- PIN brute force attacks
- Session hijacking attempts
- Credential stuffing
- Automated attacks

**Rationale:**
- 4-digit PIN = 10,000 combinations
- 5 attempts per 15 minutes = ~480 attempts per day
- Would take 21 days to brute force
- Combined with session expiration (2 hours), attack window is tiny

---

## Security Improvements

### Attack Prevention

**1. PIN Brute Force (CRITICAL)**

**Before:** Attacker could try unlimited PINs
```
10,000 PINs ÷ ∞ attempts/min = crack in minutes ❌
```

**After:** Limited to 5 attempts per 15 minutes
```
10,000 PINs ÷ 5 attempts per 15 min = 21 days (if session lives forever)
Actually: Session expires in 2 hours, so attack impossible ✅
```

**2. Session Enumeration**

**Before:** Attacker could enumerate all session IDs
```
281 trillion IDs ÷ ∞ req/sec = eventually find active session ❌
```

**After:** Limited to 100 requests per 15 minutes
```
281 trillion IDs ÷ 100 req per 15 min = 8 million years ✅
```

**3. DDoS / Resource Exhaustion**

**Before:** Unlimited requests could crash server
```
∞ requests → server overload → downtime ❌
```

**After:** Max 100 req/15 min per IP
```
100 req/15 min → manageable load → uptime maintained ✅
```

---

## Configuration by Environment

### Development
```javascript
{
  general: 500 requests / 15 min,    // More generous for testing
  sessionCreate: 50 / 1 hour,        // Allow multiple test sessions
  auth: 20 attempts / 15 min         // Allow PIN testing
}
```

**Purpose:** Enable development without frustration while still testing limits

### Production
```javascript
{
  general: 100 requests / 15 min,    // Strict protection
  sessionCreate: 10 / 1 hour,        // Prevent spam
  auth: 5 attempts / 15 min          // Strong brute force protection
}
```

**Purpose:** Maximum security for real users

---

## Response Headers

Rate limit information returned in standard headers:

```http
RateLimit-Limit: 100          # Max requests allowed
RateLimit-Remaining: 95       # Requests left in window
RateLimit-Reset: 1699024800   # Unix timestamp when limit resets
```

**When limit exceeded:**
```http
HTTP/1.1 429 Too Many Requests
RateLimit-Limit: 100
RateLimit-Remaining: 0
RateLimit-Reset: 1699024800

{
  "error": "Too many requests from this IP, please try again later."
}
```

---

## Testing

### Manual Testing

**Test 1: Verify rate limiting is active in development**
```bash
# Run in development mode
NODE_ENV=development npm start

# Send 501 requests to any API endpoint
for i in {1..501}; do
  curl http://localhost:3000/api/catalog/categories
done

# Expected: Request #501 returns 429 Too Many Requests
```

**Test 2: Test session creation rate limit**
```bash
# Try to create 11 sessions in production
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/sessions/create \
    -H "Content-Type: application/json" \
    -d '{"location_text":"Test","scheduled_time":"2025-11-03T10:00:00Z"}'
done

# Expected: Request #11 returns 429
```

**Test 3: Test PIN brute force protection**
```bash
# Try to join with wrong PIN 6 times
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/sessions/abc123def456/join \
    -H "Content-Type: application/json" \
    -d '{"session_pin":"9999","selected_nickname":"Test"}'
done

# Expected: Request #6 returns 429 (after 5 failed attempts)
```

**Test 4: Verify rate limit headers**
```bash
curl -v http://localhost:3000/api/catalog/categories

# Check headers:
# RateLimit-Limit: 100
# RateLimit-Remaining: 99
# RateLimit-Reset: <timestamp>
```

### Automated Tests (To Be Written)

```javascript
describe('Rate Limiting', () => {
  describe('General API Limiter', () => {
    test('allows 100 requests in production', async () => {
      // Test implementation
    });

    test('blocks 101st request', async () => {
      // Test implementation
    });

    test('returns proper rate limit headers', async () => {
      // Test implementation
    });

    test('resets after window expires', async () => {
      // Test implementation
    });
  });

  describe('Session Creation Limiter', () => {
    test('allows 10 sessions in production', async () => {
      // Test implementation
    });

    test('blocks 11th session creation', async () => {
      // Test implementation
    });
  });

  describe('Authentication Limiter', () => {
    test('allows 5 join attempts in production', async () => {
      // Test implementation
    });

    test('blocks 6th failed join attempt', async () => {
      // Test implementation
    });

    test('does not count successful joins', async () => {
      // skipSuccessfulRequests should work
    });
  });
});
```

---

## Monitoring

### Metrics to Track

**1. Rate Limit Hit Rate**
```
rate_limit_hits_total / total_requests * 100
```
- Target: <1% (mostly legitimate traffic)
- Alert if >5% (possible attack)

**2. Blocked Requests by Endpoint**
```
blocked_requests{endpoint="/api/sessions/:id/join"}
```
- Monitor for brute force patterns

**3. Rate Limit Resets**
```
rate_limit_resets{ip="x.x.x.x"}
```
- Track which IPs hit limits frequently

### Logging

All rate limit events should be logged:

```javascript
// When limit exceeded
{
  level: 'warn',
  message: 'Rate limit exceeded',
  ip: '192.168.1.1',
  endpoint: '/api/sessions/abc123/join',
  limit: 5,
  window: '15 minutes',
  timestamp: '2025-11-02T10:30:00Z'
}
```

---

## Troubleshooting

### Issue: Legitimate users getting blocked

**Symptoms:**
- User reports "Too many requests" error
- User is legitimate, not attacking

**Causes:**
1. Shared IP address (office, school)
2. Aggressive refresh behavior
3. Mobile app retrying too fast

**Solutions:**
1. Increase limits slightly
2. Add IP whitelist for known good IPs
3. Implement user-based (not IP-based) limiting
4. Add exponential backoff in frontend

### Issue: Rate limit not working

**Check:**
1. `NODE_ENV` is set correctly
2. No proxy/load balancer hiding real IP
3. Express middleware order correct
4. Rate limiter applied to correct routes

**Debug:**
```javascript
// Add logging to rate limiter
const apiLimiter = rateLimit({
  // ... config
  handler: (req, res) => {
    console.log('Rate limit exceeded:', req.ip, req.path);
    res.status(429).json({ error: 'Rate limit exceeded' });
  }
});
```

### Issue: Headers not showing

**Cause:** `standardHeaders: false` or old express-rate-limit version

**Solution:**
```javascript
const apiLimiter = rateLimit({
  standardHeaders: true,  // Must be true
  legacyHeaders: false
});
```

---

## Future Enhancements

### 1. Redis-Based Rate Limiting
For distributed systems (multiple servers):

```javascript
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const client = createClient({ url: process.env.REDIS_URL });

const apiLimiter = rateLimit({
  store: new RedisStore({
    client: client,
    prefix: 'rl:'
  }),
  // ... rest of config
});
```

### 2. User-Based Rate Limiting
Rate limit by user ID instead of IP:

```javascript
const userLimiter = rateLimit({
  keyGenerator: (req) => {
    return req.session?.userId || req.ip;
  }
});
```

### 3. Dynamic Rate Limits
Adjust limits based on time of day, user reputation:

```javascript
const dynamicLimiter = rateLimit({
  max: (req) => {
    if (isHighTrafficHour()) return 50;
    if (req.user?.reputation === 'trusted') return 200;
    return 100;
  }
});
```

### 4. Gradual Backoff
Increase penalty for repeat offenders:

```javascript
const backoffLimiter = rateLimit({
  max: 100,
  skipFailedRequests: false,
  onLimitReached: (req) => {
    // Double the window for next violation
    blacklistIP(req.ip, 30 * 60 * 1000); // 30 min
  }
});
```

---

## Files Modified

1. ✅ `packages/shared/server.js`
   - Removed `skip` function (was disabling in dev)
   - Reduced dev limit from 999999 to 500
   - Added `authLimiter` for PIN brute force protection
   - Applied `authLimiter` to join endpoint
   - Added comments explaining each limiter

2. ✅ `docs/RATE_LIMITING_IMPLEMENTATION.md` (this file)
   - Comprehensive documentation

---

## Security Impact

| Attack Type | Before | After | Improvement |
|-------------|--------|-------|-------------|
| **PIN Brute Force** | ❌ Unlimited | ✅ 5 per 15 min | **∞ → 21 days** |
| **Session Enum** | ❌ Unlimited | ✅ 100 per 15 min | **∞ → 8M years** |
| **DDoS** | ❌ Vulnerable | ✅ Protected | **Uptime maintained** |
| **Session Spam** | ❌ Unlimited | ✅ 10 per hour | **Database safe** |
| **Dev Testing** | ❌ No protection | ✅ Protected | **Early detection** |

---

## References

**Express Rate Limit Documentation:**
- https://www.npmjs.com/package/express-rate-limit

**OWASP Guidelines:**
- https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks

**Implementation:**
- `packages/shared/server.js:73-101` - Rate limiters
- `packages/shared/server.js:177` - Applied to join endpoint

---

**Status:** ✅ Complete and Active
**Security Rating:** **HIGH** (Major protection against multiple attack vectors)
**Environment Coverage:** ✅ Development, Staging, Production
**Testing Required:** Manual verification, automated tests pending

**Next Steps:**
1. ✅ Code deployed
2. 🔄 Monitor rate limit metrics for 24 hours
3. 📝 Write automated tests
4. 📊 Set up alerts for excessive rate limit hits
5. 🔄 Consider Redis store for production scale
