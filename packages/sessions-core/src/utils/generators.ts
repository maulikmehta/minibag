/**
 * ID and token generation utilities
 * Extracted from LocalLoops with security improvements
 */

import crypto from 'crypto';

/**
 * Generate a short, unique session ID (12 chars for strong collision resistance)
 * Security improvement: 12 characters (6 bytes) = 281 trillion combinations (2^48)
 *
 * Collision probability:
 * - At 10,000 sessions: P(collision) ≈ 0.0000017%
 * - At 1,000,000 sessions: P(collision) ≈ 0.0017%
 *
 * @returns {string} - Session ID (e.g., "abc123def456")
 */
export function generateSessionId(): string {
  return crypto.randomBytes(6).toString('hex'); // 12 chars
}

/**
 * Generate secure host token (64 hex chars)
 * Used for host authentication
 *
 * @returns {string} - Host token (32 bytes = 64 hex chars)
 */
export function generateHostToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate secure auth token for participant (64 hex chars)
 * Used for WebSocket authentication (CRITICAL-1 fix)
 *
 * @returns {string} - Auth token (32 bytes = 64 hex chars)
 */
export function generateAuthToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a 4-6 digit numeric PIN for session authentication
 * Uses cryptographically secure random number generation
 *
 * @param {number} length - Length of PIN (4-6 digits)
 * @returns {string} - Numeric PIN
 */
export function generateSessionPin(length: number = 4): string {
  if (length < 4 || length > 6) {
    throw new Error('PIN length must be between 4 and 6 digits');
  }

  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  const range = max - min + 1;

  // Use crypto.randomInt for cryptographically secure randomness
  const randomValue = crypto.randomInt(0, range);
  return String(min + randomValue);
}

/**
 * Validate PIN format (4-6 digits)
 *
 * @param {string} pin - PIN to validate
 * @returns {boolean}
 */
export function isValidPinFormat(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}

/**
 * Validate UUID format (standard UUID v4 format)
 *
 * @param {string} uuid - UUID to validate
 * @returns {boolean}
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate session ID format (12 hex chars)
 *
 * @param {string} sessionId - Session ID to validate
 * @returns {boolean}
 */
export function isValidSessionId(sessionId: string): boolean {
  return /^[0-9a-f]{12}$/.test(sessionId);
}

/**
 * Generate constant invite token for group mode (16 hex chars)
 * Used for shareable group invite links
 *
 * Security: 16 characters (8 bytes) = 18.4 quintillion combinations (2^64)
 * - Sufficient for public invite links
 * - Different from named invite tokens (8 chars) to distinguish link type
 *
 * @returns {string} - Constant invite token (8 bytes = 16 hex chars)
 */
export function generateConstantInviteToken(): string {
  return crypto.randomBytes(8).toString('hex'); // 16 chars
}
