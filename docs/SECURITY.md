# Security Guidelines

## Overview

This document outlines security best practices and guidelines for the LocalLoops platform, focusing on protecting user privacy and data security.

## Recent Security Enhancements (Phase 3 - Day 7)

**Last Updated:** 2025-11-02

### Implemented ✅
1. **Session PIN Authentication** (commit: adce88c)
   - Optional 4-6 digit PIN protection for sessions
   - Hashed storage (bcrypt)
   - Rate limited to prevent brute force attacks

2. **httpOnly Cookie Authentication** (commit: a7024e4)
   - Migrated host tokens from localStorage to httpOnly cookies
   - Prevents XSS-based token theft
   - SameSite=Strict for CSRF protection

3. **Enhanced Session ID Security** (commit: 87cc734)
   - Increased from 8 to 12 characters
   - Cryptographically secure random generation
   - Collision probability: ~4.7 × 10^-18

4. **Rate Limiting** (commit: 2ef6473)
   - Enabled in ALL environments (including development)
   - Three-tier system: general API, session creation, authentication
   - Standard RateLimit-* headers for client awareness

5. **Content Security Policy (CSP)**
   - Configured via Helmet.js
   - Restricts script sources to prevent XSS
   - WebSocket and Supabase connections whitelisted

6. **CORS Configuration**
   - Restricted to specific frontend origin
   - Credentials enabled for httpOnly cookies
   - Environment-specific configuration

7. **Performance Optimization** (commit: 1cc5090)
   - Eliminated blocking localStorage operations on session completion
   - Improved user experience on low-end devices

## Core Security Principles

### 1. Anonymity First
- **No personal data collection** - Only 3-letter nicknames and emoji avatars
- **No phone number storage** - OTP verification without retention
- **No location tracking** - Text-based locations only
- **Session-based identity** - Nicknames auto-release after session ends

### 2. Data Minimization
- Collect only essential data for coordination
- Auto-expire sessions after 24 hours
- Delete participant data when sessions complete
- No persistent user profiles

### 3. Secure Communication
- HTTPS/WSS for all communications
- JWT tokens for session authentication
- No sensitive data in URLs
- Encrypted WebSocket connections

## Authentication & Authorization

### JWT Implementation
```javascript
// Token structure (minimal claims)
{
  "session_id": "abc123",
  "nickname": "Avi",
  "participant_id": "uuid",
  "exp": 1234567890
}
```

### Session Security
- Tokens expire with sessions (max 24 hours)
- No refresh tokens (simplicity over persistence)
- Server-side session validation
- Rate limiting on session creation

## Data Security

### Environment Variables
```bash
# Required secrets in .env
JWT_SECRET=          # 32+ character random string
ENCRYPTION_KEY=      # For sensitive operations
SUPABASE_SERVICE_KEY # Backend only, never exposed
```

### Database Security (Supabase RLS)
```sql
-- Example RLS policy
CREATE POLICY "Users can only read active sessions"
ON sessions FOR SELECT
USING (status = 'open' AND expires_at > NOW());
```

### Input Validation
- Sanitize all user inputs
- Validate session_type enum values
- Limit string lengths (nicknames: 3 chars, location: 100 chars)
- Validate item quantities and prices

## Privacy Protection

### Nickname System
- Pool of pre-approved 3-letter names
- Auto-rotation to prevent tracking
- No connection to phone numbers
- Temporary assignments only

### Location Privacy
- Text descriptions only (no GPS coordinates)
- Neighborhood-level granularity
- User controls visibility

### Data Retention
- Active sessions: Duration + 2 hours
- Completed sessions: 7 days for vendor reconciliation
- Expired sessions: Immediate deletion
- Participant data: Deleted with session

## WebSocket Security

### Connection Security
```javascript
// Secure WebSocket configuration
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS.split(','),
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// JWT verification on connection
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.participant_id;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});
```

### Room Isolation
- Participants can only join their session rooms
- Server validates session membership
- No cross-session data leakage

## API Security

### Rate Limiting
```javascript
// Basic rate limiting
const rateLimit = {
  sessionCreation: '5 per hour per IP',
  itemUpdates: '100 per hour per session',
  catalogFetch: '50 per minute per IP'
};
```

### CORS Configuration
```javascript
app.use(cors({
  origin: [
    'https://minibag.in',
    'https://partybag.in',
    'https://fitbag.in',
    process.env.NODE_ENV === 'development' && 'http://localhost:5173'
  ].filter(Boolean),
  credentials: true
}));
```

### Input Sanitization
```javascript
// Example sanitization
function sanitizeInput(input, maxLength = 100) {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/<[^>]*>/g, ''); // Remove HTML tags
}
```

## Payment Security

### Razorpay Integration
- Payment processing delegated to Razorpay
- No credit card data stored
- Webhook signature verification
- Secure payment callbacks

### Split Payment Logic
```javascript
// Server-side calculation only
function calculateSplits(session, participants) {
  // Validate all inputs
  // Calculate on server (never trust client)
  // Verify totals before payment
  // Log all transactions
}
```

## Security Checklist

### Development
- [ ] Never commit .env files
- [ ] Use environment variables for secrets
- [ ] Enable ESLint security plugins
- [ ] Review dependencies for vulnerabilities

### Deployment
- [ ] Enable HTTPS/WSS only
- [ ] Set secure headers (Helmet.js)
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set up monitoring/alerts

### Database
- [ ] Enable Supabase RLS policies
- [ ] Use parameterized queries
- [ ] Limit database user permissions
- [ ] Regular backup schedule

### Testing
- [ ] Test authentication flows
- [ ] Validate input sanitization
- [ ] Test rate limiting
- [ ] Security audit before launch

## Incident Response

### If Security Issue Detected
1. **Immediate**: Disable affected functionality
2. **Assess**: Determine scope and impact
3. **Notify**: Inform affected users if data exposed
4. **Fix**: Deploy patch immediately
5. **Review**: Post-mortem and prevention

### Contact
- Security issues: Report immediately to project maintainers
- No public disclosure until patched

## Dependencies

### Regular Updates
```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update
```

### Trusted Packages Only
- Review package permissions
- Use lockfiles (package-lock.json)
- Verify package signatures
- Monitor for compromised packages

## Compliance

### Data Protection
- **GDPR-friendly**: Minimal data collection
- **Right to deletion**: Auto-deletion after sessions
- **Data portability**: Export session data
- **Transparency**: Clear privacy policy

### Regional Considerations
- India-focused initially
- Comply with local data laws
- Consider data residency requirements

## Best Practices

### Code Security
```javascript
// ✅ Good: Parameterized queries
db.collection('sessions').doc(sessionId).get();

// ❌ Bad: String concatenation
db.query(`SELECT * FROM sessions WHERE id = '${sessionId}'`);

// ✅ Good: Validate enums
const validTypes = ['minibag', 'partybag', 'fitbag'];
if (!validTypes.includes(sessionType)) throw new Error('Invalid type');

// ❌ Bad: Trust user input
const session = { session_type: userInput };
```

### Error Handling
```javascript
// ✅ Good: Generic error messages
catch (error) {
  console.error('Internal error:', error); // Log details
  res.status(500).json({ error: 'Server error' }); // Generic to user
}

// ❌ Bad: Expose internals
catch (error) {
  res.status(500).json({ error: error.stack }); // Leaks info
}
```

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Node.js Security Checklist](https://github.com/goldbergyoni/nodebestpractices#6-security-best-practices)

---

**Last Updated**: October 2025
**Version**: 0.1.0
