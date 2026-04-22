/**
 * Rate Limiting Utility
 * Simple in-memory rate limiter for API endpoints
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests allowed in window
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * In-memory rate limiter
 * For production, use Redis-based rate limiter
 */
export class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: RateLimitConfig) {
    this.config = config;

    // Cleanup old entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  /**
   * Check if request is allowed
   *
   * @param key - Unique identifier (e.g., IP address, user ID)
   * @returns True if request is allowed
   */
  check(key: string): { allowed: boolean; resetTime: number; remaining: number } {
    const now = Date.now();
    const entry = this.requests.get(key);

    // No entry or expired - allow and create new entry
    if (!entry || now >= entry.resetTime) {
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.config.windowMs,
      });

      return {
        allowed: true,
        resetTime: now + this.config.windowMs,
        remaining: this.config.maxRequests - 1,
      };
    }

    // Entry exists and not expired
    if (entry.count < this.config.maxRequests) {
      // Increment count
      entry.count++;
      this.requests.set(key, entry);

      return {
        allowed: true,
        resetTime: entry.resetTime,
        remaining: this.config.maxRequests - entry.count,
      };
    }

    // Rate limit exceeded
    return {
      allowed: false,
      resetTime: entry.resetTime,
      remaining: 0,
    };
  }

  /**
   * Reset rate limit for a key
   *
   * @param key - Unique identifier
   */
  reset(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.requests.entries()) {
      if (now >= entry.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

/**
 * Pre-configured rate limiters for common use cases
 */

/**
 * Rate limiter for session creation
 * Limit: 10 sessions per 15 minutes per IP
 */
export const sessionCreateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
});

/**
 * Rate limiter for participant joins
 * Limit: 20 joins per 5 minutes per IP
 */
export const participantJoinLimiter = new RateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 20,
});

/**
 * Rate limiter for invite generation
 * Limit: 5 regenerations per 10 minutes per session
 */
export const inviteGenerateLimiter = new RateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequests: 5,
});

/**
 * Helper function to create rate limit error
 *
 * @param resetTime - When rate limit resets (unix timestamp)
 * @returns Error object with retry information
 */
export function createRateLimitError(resetTime: number): Error {
  const secondsRemaining = Math.ceil((resetTime - Date.now()) / 1000);
  const error = new Error(
    `Rate limit exceeded. Try again in ${secondsRemaining} seconds.`
  );
  (error as any).code = 'RATE_LIMIT_EXCEEDED';
  (error as any).retryAfter = secondsRemaining;
  return error;
}
