/**
 * Cookie Utilities
 * Centralized cookie management for secure authentication
 */

/**
 * Cookie names used in the application
 */
export const COOKIE_NAMES = {
  HOST_TOKEN: 'minibag_host_token', // Host authentication token
  SESSION_ID: 'minibag_session_id'  // Current session ID (for convenience)
};

/**
 * Get cookie options based on environment
 * @param {Object} options - Additional cookie options
 * @returns {Object} Cookie configuration
 */
export function getCookieOptions(options = {}) {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true, // Cannot be accessed via JavaScript (XSS protection)
    secure: isProduction, // HTTPS only in production
    sameSite: 'strict', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/', // Available across all routes
    ...options
  };
}

/**
 * Set host token cookie
 * @param {Object} res - Express response object
 * @param {string} token - Host token to store
 * @param {string} sessionId - Session ID (optional, for convenience)
 */
export function setHostTokenCookie(res, token, sessionId = null) {
  // Set host token cookie (httpOnly, secure in production)
  res.cookie(COOKIE_NAMES.HOST_TOKEN, token, getCookieOptions({
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }));

  // Optionally set session ID cookie (for convenience, not security-critical)
  if (sessionId) {
    res.cookie(COOKIE_NAMES.SESSION_ID, sessionId, getCookieOptions({
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: false // Allow JavaScript access for convenience
    }));
  }
}

/**
 * Get host token from cookies or headers (backward compatibility)
 * @param {Object} req - Express request object
 * @returns {string|null} Host token or null if not found
 */
export function getHostToken(req) {
  // Priority 1: Check httpOnly cookie (new secure method)
  if (req.cookies && req.cookies[COOKIE_NAMES.HOST_TOKEN]) {
    return req.cookies[COOKIE_NAMES.HOST_TOKEN];
  }

  // Priority 2: Check Authorization header (backward compatibility)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Priority 3: Check X-Host-Token header (backward compatibility)
  if (req.headers['x-host-token']) {
    return req.headers['x-host-token'];
  }

  return null;
}

/**
 * Clear host token cookie (logout)
 * @param {Object} res - Express response object
 */
export function clearHostTokenCookie(res) {
  res.clearCookie(COOKIE_NAMES.HOST_TOKEN, getCookieOptions({
    maxAge: 0
  }));

  res.clearCookie(COOKIE_NAMES.SESSION_ID, getCookieOptions({
    maxAge: 0,
    httpOnly: false
  }));
}

/**
 * Verify if request has valid host token (middleware helper)
 * @param {Object} req - Express request object
 * @returns {boolean} True if host token present
 */
export function hasHostToken(req) {
  return getHostToken(req) !== null;
}
