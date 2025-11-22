/**
 * PIN Rate Limiter
 * Prevents brute-force attacks on session PINs with exponential backoff
 * SECURITY: Per-session rate limiting with progressive delays
 */

import logger from './logger.js';

// Track PIN attempts per session
// Structure: Map<sessionId, { attempts: number, lastAttempt: timestamp, blockedUntil: timestamp }>
const pinAttempts = new Map();

// Configuration
const CONFIG = {
  MAX_ATTEMPTS_BEFORE_BACKOFF: 3, // Allow 3 attempts before introducing delays
  MAX_TOTAL_ATTEMPTS: 10, // Maximum attempts before long block
  BACKOFF_BASE_MS: 2000, // Base delay: 2 seconds
  BACKOFF_MAX_MS: 5 * 60 * 1000, // Max delay: 5 minutes
  LONG_BLOCK_MS: 30 * 60 * 1000, // 30 minutes block after max attempts
  CLEANUP_INTERVAL_MS: 10 * 60 * 1000, // Cleanup old entries every 10 minutes
  ATTEMPT_EXPIRY_MS: 60 * 60 * 1000 // Reset after 1 hour of inactivity
};

/**
 * Calculate exponential backoff delay
 * @param {number} attemptCount - Number of failed attempts
 * @returns {number} - Delay in milliseconds
 */
function calculateBackoff(attemptCount) {
  if (attemptCount <= CONFIG.MAX_ATTEMPTS_BEFORE_BACKOFF) {
    return 0; // No delay for first few attempts
  }

  // Exponential backoff: 2^(n-3) * base delay
  // Attempt 4: 2 sec, Attempt 5: 4 sec, Attempt 6: 8 sec, etc.
  const exponent = attemptCount - CONFIG.MAX_ATTEMPTS_BEFORE_BACKOFF;
  const delay = Math.pow(2, exponent - 1) * CONFIG.BACKOFF_BASE_MS;

  return Math.min(delay, CONFIG.BACKOFF_MAX_MS);
}

/**
 * Check if PIN attempt is allowed for a session
 * @param {string} sessionId - Session ID
 * @returns {Object} - { allowed: boolean, retryAfter: number, reason: string }
 */
export function checkPinAttempt(sessionId) {
  const now = Date.now();
  const attempt = pinAttempts.get(sessionId);

  if (!attempt) {
    // First attempt - always allow
    return { allowed: true, retryAfter: 0, reason: null };
  }

  // Reset if expired (no activity for 1 hour)
  if (now - attempt.lastAttempt > CONFIG.ATTEMPT_EXPIRY_MS) {
    pinAttempts.delete(sessionId);
    return { allowed: true, retryAfter: 0, reason: null };
  }

  // Check if currently blocked
  if (attempt.blockedUntil && now < attempt.blockedUntil) {
    const retryAfter = Math.ceil((attempt.blockedUntil - now) / 1000);
    return {
      allowed: false,
      retryAfter,
      reason: attempt.attempts >= CONFIG.MAX_TOTAL_ATTEMPTS
        ? 'too_many_attempts'
        : 'rate_limited'
    };
  }

  // Check if exceeded maximum attempts
  if (attempt.attempts >= CONFIG.MAX_TOTAL_ATTEMPTS) {
    const blockedUntil = attempt.lastAttempt + CONFIG.LONG_BLOCK_MS;
    pinAttempts.set(sessionId, { ...attempt, blockedUntil });
    const retryAfter = Math.ceil((blockedUntil - now) / 1000);

    logger.warn({
      sessionId,
      attempts: attempt.attempts,
      blockedUntil: new Date(blockedUntil).toISOString()
    }, 'Session PIN blocked due to too many failed attempts');

    return {
      allowed: false,
      retryAfter,
      reason: 'too_many_attempts'
    };
  }

  // Calculate backoff for this attempt
  const backoffDelay = calculateBackoff(attempt.attempts);
  if (backoffDelay > 0) {
    const nextAttemptTime = attempt.lastAttempt + backoffDelay;
    if (now < nextAttemptTime) {
      const retryAfter = Math.ceil((nextAttemptTime - now) / 1000);
      return {
        allowed: false,
        retryAfter,
        reason: 'rate_limited'
      };
    }
  }

  return { allowed: true, retryAfter: 0, reason: null };
}

/**
 * Record a failed PIN attempt
 * @param {string} sessionId - Session ID
 * @param {string} attemptedPin - The PIN that was attempted (for logging)
 */
export function recordFailedPinAttempt(sessionId, attemptedPin = null) {
  const now = Date.now();
  const attempt = pinAttempts.get(sessionId);

  if (!attempt) {
    pinAttempts.set(sessionId, {
      attempts: 1,
      lastAttempt: now,
      blockedUntil: null
    });

    logger.info({
      sessionId,
      attempts: 1
    }, 'First failed PIN attempt');
  } else {
    const newAttempts = attempt.attempts + 1;
    const backoffDelay = calculateBackoff(newAttempts);

    pinAttempts.set(sessionId, {
      attempts: newAttempts,
      lastAttempt: now,
      blockedUntil: backoffDelay > 0 ? now + backoffDelay : null
    });

    logger.warn({
      sessionId,
      attempts: newAttempts,
      backoffDelay: backoffDelay > 0 ? `${backoffDelay / 1000}s` : 'none'
    }, 'Failed PIN attempt recorded');
  }
}

/**
 * Clear PIN attempts for a session (on successful authentication)
 * @param {string} sessionId - Session ID
 */
export function clearPinAttempts(sessionId) {
  const hadAttempts = pinAttempts.has(sessionId);
  pinAttempts.delete(sessionId);

  if (hadAttempts) {
    logger.info({ sessionId }, 'PIN attempts cleared after successful authentication');
  }
}

/**
 * Cleanup expired entries periodically
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [sessionId, attempt] of pinAttempts.entries()) {
    if (now - attempt.lastAttempt > CONFIG.ATTEMPT_EXPIRY_MS) {
      pinAttempts.delete(sessionId);
      cleanedCount++;
    }
  }

  if (cleanedCount > 0) {
    logger.debug({ cleanedCount }, 'Cleaned up expired PIN attempt records');
  }
}

/**
 * Start periodic cleanup
 * @returns {Function} - Cleanup function to stop the interval
 */
export function startPinRateLimiterCleanup() {
  logger.info('Starting PIN rate limiter cleanup job...');

  // Run immediately
  cleanupExpiredEntries();

  // Then run periodically
  const interval = setInterval(cleanupExpiredEntries, CONFIG.CLEANUP_INTERVAL_MS);

  return () => {
    clearInterval(interval);
    logger.info('Stopped PIN rate limiter cleanup job');
  };
}

/**
 * Get current attempt count for a session (for testing/debugging)
 * @param {string} sessionId - Session ID
 * @returns {number} - Current attempt count
 */
export function getPinAttemptCount(sessionId) {
  return pinAttempts.get(sessionId)?.attempts || 0;
}
