/**
 * PIN Rate Limiter
 * Prevents brute-force attacks on session PINs with exponential backoff
 * SECURITY: Per-session rate limiting with progressive delays
 * BUGFIX #9: Database-backed (was in-memory Map - lost on restart)
 */

import logger from './logger.js';
import { getDatabaseClient } from '../../sessions-core/src/database/client.js';

const prisma = getDatabaseClient();

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
 * BUGFIX #9: Database-backed rate limiting
 * @param {string} sessionId - Session UUID (not short sessionId)
 * @returns {Promise<Object>} - { allowed: boolean, retryAfter: number, reason: string }
 */
export async function checkPinAttempt(sessionId) {
  const now = new Date();
  const nowMs = now.getTime();

  // Get attempt record from database
  const attempt = await prisma.pinAttempt.findUnique({
    where: { sessionId },
  });

  if (!attempt) {
    // First attempt - always allow
    return { allowed: true, retryAfter: 0, reason: null };
  }

  const lastAttemptMs = attempt.lastAttempt.getTime();

  // Reset if expired (no activity for 1 hour)
  if (nowMs - lastAttemptMs > CONFIG.ATTEMPT_EXPIRY_MS) {
    await prisma.pinAttempt.delete({ where: { sessionId } });
    return { allowed: true, retryAfter: 0, reason: null };
  }

  // Check if currently blocked
  if (attempt.blockedUntil && now < attempt.blockedUntil) {
    const retryAfter = Math.ceil((attempt.blockedUntil.getTime() - nowMs) / 1000);
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
    const blockedUntil = new Date(lastAttemptMs + CONFIG.LONG_BLOCK_MS);
    await prisma.pinAttempt.update({
      where: { sessionId },
      data: { blockedUntil }
    });
    const retryAfter = Math.ceil((blockedUntil.getTime() - nowMs) / 1000);

    logger.warn({
      sessionId,
      attempts: attempt.attempts,
      blockedUntil: blockedUntil.toISOString()
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
    const nextAttemptTime = lastAttemptMs + backoffDelay;
    if (nowMs < nextAttemptTime) {
      const retryAfter = Math.ceil((nextAttemptTime - nowMs) / 1000);
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
 * BUGFIX #9: Database-backed rate limiting
 * @param {string} sessionId - Session UUID
 * @param {string} attemptedPin - The PIN that was attempted (for logging)
 */
export async function recordFailedPinAttempt(sessionId, attemptedPin = null) {
  const now = new Date();
  const nowMs = now.getTime();

  // Try to get existing attempt record
  const existing = await prisma.pinAttempt.findUnique({
    where: { sessionId },
  });

  if (!existing) {
    // First attempt - create record
    await prisma.pinAttempt.create({
      data: {
        sessionId,
        attempts: 1,
        lastAttempt: now,
        blockedUntil: null
      }
    });

    logger.info({
      sessionId,
      attempts: 1
    }, 'First failed PIN attempt');
  } else {
    // Increment attempts
    const newAttempts = existing.attempts + 1;
    const backoffDelay = calculateBackoff(newAttempts);

    await prisma.pinAttempt.update({
      where: { sessionId },
      data: {
        attempts: newAttempts,
        lastAttempt: now,
        blockedUntil: backoffDelay > 0 ? new Date(nowMs + backoffDelay) : null
      }
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
 * BUGFIX #9: Database-backed rate limiting
 * @param {string} sessionId - Session UUID
 */
export async function clearPinAttempts(sessionId) {
  try {
    const deleted = await prisma.pinAttempt.delete({
      where: { sessionId }
    });

    logger.info({ sessionId }, 'PIN attempts cleared after successful authentication');
  } catch (error) {
    // Record may not exist (first attempt was successful) - this is OK
    if (error.code !== 'P2025') {
      logger.error({ err: error, sessionId }, 'Failed to clear PIN attempts');
    }
  }
}

/**
 * Cleanup expired entries periodically
 * BUGFIX #9: Database-backed rate limiting
 */
async function cleanupExpiredEntries() {
  const now = new Date();
  const expiryThreshold = new Date(now.getTime() - CONFIG.ATTEMPT_EXPIRY_MS);

  try {
    const result = await prisma.pinAttempt.deleteMany({
      where: {
        lastAttempt: { lt: expiryThreshold }
      }
    });

    if (result.count > 0) {
      logger.debug({ cleanedCount: result.count }, 'Cleaned up expired PIN attempt records');
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to cleanup expired PIN attempts');
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
 * BUGFIX #9: Database-backed rate limiting
 * @param {string} sessionId - Session UUID
 * @returns {Promise<number>} - Current attempt count
 */
export async function getPinAttemptCount(sessionId) {
  const attempt = await prisma.pinAttempt.findUnique({
    where: { sessionId },
    select: { attempts: true }
  });

  return attempt?.attempts || 0;
}
