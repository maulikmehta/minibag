/**
 * Sessions API Routes
 * Endpoints for creating and managing shopping sessions
 */

import { supabase } from '../db/supabase.js';
import crypto from 'crypto';
import { setHostTokenCookie, getHostToken } from '../utils/cookies.js';
import logger from '../utils/logger.js';
import { SESSION_LIMITS, VALIDATION_LIMITS, NICKNAME_LIMITS } from '../constants/limits.js';
import { ERROR_MESSAGES } from '../constants/errorMessages.js';
import { buildPaymentMaps, buildCatalogMap } from '../utils/billCalculations.js';
import {
  getProductConfig,
  getMaxInvited,
  getMaxAbsolute,
  validateParticipantCount
} from '../constants/productTiers.js';
// BUGFIX #9: Import from sessions-core package (moved from shared/utils)
import {
  checkPinAttempt,
  recordFailedPinAttempt,
  clearPinAttempts,
  getPinAttemptCount,
  startPinRateLimiterCleanup
} from '@sessions/core';
import { sanitizeText, escapeHtml } from '../utils/sanitize.js';
import { CLEANUP_INTERVALS } from '../config/cleanup.js';

// Export for server initialization
export { startPinRateLimiterCleanup };

// SECURITY FIX: Singleton pattern for cleanup jobs to prevent memory leaks
// Track cleanup job state to prevent multiple intervals
let nicknameCleanupRunning = false;
let reservationCleanupInterval = null;
let sessionCleanupInterval = null;

/**
 * Generate a short, unique session ID (12 chars for strong collision resistance)
 * Security improvement: Increased from 8 to 12 characters
 * - 8 chars (4 bytes): 4.2 billion combinations (2^32)
 * - 12 chars (6 bytes): 281 trillion combinations (2^48)
 */
function generateSessionId() {
  return crypto.randomBytes(6).toString('hex'); // abc123def456 (12 chars = 281 trillion combinations)
}

/**
 * Generate unique session ID with collision detection
 * With 281 trillion possible combinations (2^48), collision probability is negligible:
 * - At 10,000 sessions: P(collision) ≈ 0.0000017%
 * - At 1,000,000 sessions: P(collision) ≈ 0.0017%
 * SECURITY FIX: Now includes retry logic to handle the rare collision case
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @returns {Promise<string>} - Unique session ID
 */
async function generateUniqueSessionId(maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const sessionId = generateSessionId();

    // Check if this ID already exists in the database
    const { data, error } = await supabase
      .from('sessions')
      .select('session_id')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (error) {
      logger.error({ err: error, sessionId, attempt }, 'Error checking session ID uniqueness');
      // On database error, continue to next attempt
      if (attempt < maxRetries) continue;
      throw new Error('Failed to verify session ID uniqueness after database errors');
    }

    // If no existing session found, this ID is unique!
    if (!data) {
      if (attempt > 1) {
        logger.warn({ sessionId, attempt }, 'Session ID collision detected and resolved');
      }
      return sessionId;
    }

    // Collision detected - log and retry
    logger.warn({
      sessionId,
      attempt,
      maxRetries
    }, 'Session ID collision detected - generating new ID');
  }

  // If we exhausted all retries, throw error
  throw new Error(`Failed to generate unique session ID after ${maxRetries} attempts`);
}

/**
 * Generate secure host token (64 hex chars)
 */
function generateHostToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a 4-6 digit numeric PIN for session authentication
 * Uses cryptographically secure random number generation
 * @param {number} length - Length of PIN (4-6 digits)
 * @returns {string} - Numeric PIN
 */
function generateSessionPin(length = 4) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  const range = max - min + 1;

  // Use crypto.randomInt for cryptographically secure randomness
  const randomValue = crypto.randomInt(0, range);
  return String(min + randomValue);
}

/**
 * Validate PIN format (4-6 digits)
 * @param {string} pin - PIN to validate
 * @returns {boolean}
 */
function isValidPinFormat(pin) {
  return /^\d{4,6}$/.test(pin);
}

/**
 * Validate UUID format (standard UUID v4 format)
 * @param {string} uuid - UUID to validate
 * @returns {boolean}
 */
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate session ID format (12-char hex string)
 * @param {string} sessionId - Session ID to validate
 * @returns {boolean}
 */
function isValidSessionId(sessionId) {
  return /^[a-f0-9]{12}$/i.test(sessionId);
}

/**
 * Sanitize and validate UUID for safe query usage
 * Throws error if UUID is invalid to prevent SQL injection
 * @param {string} uuid - UUID to validate
 * @param {string} paramName - Parameter name for error messages
 * @returns {string} - Validated UUID
 */
function validateUUID(uuid, paramName = 'uuid') {
  if (!uuid || typeof uuid !== 'string') {
    throw new Error(`${paramName} is required and must be a string`);
  }
  if (!isValidUUID(uuid)) {
    throw new Error(`Invalid ${paramName} format`);
  }
  return uuid;
}

/**
 * Check if a session has expired
 * Sessions expire 2 hours after scheduled time
 */
function isSessionExpired(session) {
  if (!session.expires_at) return false;
  return new Date() > new Date(session.expires_at);
}

/**
 * Generate a unique invite token (8 chars for readability)
 */
function generateInviteToken() {
  return crypto.randomBytes(4).toString('hex'); // abc12345 (8 chars)
}

/**
 * Create or regenerate invites for a session
 * Deletes existing invites and creates new ones
 * @param {string} sessionId - UUID of the session
 * @param {number} count - Number of invites to create (configurable per product/tier)
 */
async function regenerateInvites(sessionId, count) {
  // BUGFIX #13: Use SDK generateInvites instead of direct Supabase insert
  const { generateInvites } = await import('@sessions/core');

  // Get session short ID from UUID
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('session_id')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    throw new Error('Session not found');
  }

  // Generate invites in SDK (source of truth)
  const { data: sdkInvites, error: sdkError } = await generateInvites(session.session_id, count);

  if (sdkError) {
    throw sdkError;
  }

  // Sync to Supabase for frontend display (read-only)
  const invitesToSync = sdkInvites.map(inv => ({
    id: inv.id,
    session_id: sessionId,
    invite_token: inv.inviteToken,
    invite_number: inv.inviteNumber,
    status: inv.status,
    created_at: inv.createdAt,
    expires_at: inv.expiresAt
  }));

  const { data, error } = await supabase
    .from('invites')
    .upsert(invitesToSync, { onConflict: 'id' })
    .select();

  if (error) {
    logger.warn({ err: error }, 'Failed to sync invites to Supabase, but SDK has them');
  }

  return data || invitesToSync;
}

/**
 * Check if all items in a session are financially settled
 * (either paid or skipped)
 * Returns true if all participant items have corresponding payment records
 */
async function checkFinancialSettlement(sessionId) {
  try {
    // Get all participant items for this session
    const { data: participantItems, error: itemsError } = await supabase
      .from('participant_items')
      .select('item_id')
      .eq('session_id', sessionId);

    if (itemsError) {
      logger.error({ err: itemsError, sessionId }, 'Error fetching participant items');
      return false;
    }

    // If no items, consider it settled
    if (!participantItems || participantItems.length === 0) {
      return true;
    }

    // Get all payments for this session
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('item_id')
      .eq('session_id', sessionId);

    if (paymentsError) {
      logger.error({ err: paymentsError, sessionId }, 'Error fetching payments');
      return false;
    }

    // Create set of item IDs that have payment records
    const paidItemIds = new Set(payments?.map(p => p.item_id) || []);

    // Check if all participant items have payment records (paid or skipped)
    return participantItems.every(item => paidItemIds.has(item.item_id));
  } catch (error) {
    logger.error({ err: error, sessionId }, 'Error checking financial settlement');
    return false;
  }
}

/**
 * Perform session cleanup tasks asynchronously (non-blocking)
 * - Check and set financial settlement timestamp
 * - Release nicknames back to pool
 */
async function performSessionCleanup(session, status) {
  try {
    // Check if financially settled (all items paid or skipped) and set timestamp
    if (status === 'completed' && !session.financially_settled_at) {
      const isFinanciallySettled = await checkFinancialSettlement(session.id);
      if (isFinanciallySettled) {
        const { error: settlementError } = await supabase
          .from('sessions')
          .update({ financially_settled_at: new Date().toISOString() })
          .eq('id', session.id);

        if (settlementError) {
          logger.error({ err: settlementError, sessionId: session.id }, 'Error updating financially_settled_at');
        }
      }
    }

    // Release nicknames back to pool
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('id')
      .eq('session_id', session.id);

    if (participantsError) {
      logger.error({ err: participantsError, sessionId: session.id }, 'Error fetching participants for cleanup');
      return;
    }

    if (participants && participants.length > 0) {
      // Find which nicknames were from the pool (have nickname_pool_id)
      const { data: nicknamesUsed, error: nicknamesError } = await supabase
        .from('nicknames_pool')
        .select('id')
        .eq('currently_used_in', session.id);

      if (nicknamesError) {
        logger.error({ err: nicknamesError, sessionId: session.id }, 'Error fetching nicknames for cleanup');
        return;
      }

      if (nicknamesUsed && nicknamesUsed.length > 0) {
        const { error: releaseError } = await supabase
          .from('nicknames_pool')
          .update({
            is_available: true,
            currently_used_in: null
          })
          .eq('currently_used_in', session.id);

        if (releaseError) {
          logger.error({ err: releaseError, sessionId: session.id }, 'Error releasing nicknames');
        }
      }
    }
  } catch (error) {
    logger.error({ err: error, sessionId: session?.id }, 'Error in performSessionCleanup');
  }
}

/**
 * 4-letter names for participant fallback (if pool is empty)
 */
const FALLBACK_NAMES = [
  // 4-Letter Names - Male (15 total)
  'Aadi', 'Ajay', 'Amar', 'Amit', 'Anil', 'Ansh', 'Arun', 'Arya',
  'Ashu', 'Atul', 'Ravi', 'Veer', 'Yash', 'Neel', 'Manu',
  // 4-Letter Names - Female (15 total)
  'Adya', 'Anvi', 'Anya', 'Arti', 'Asha', 'Diya', 'Maya', 'Neha',
  'Riya', 'Sara', 'Tara', 'Usha', 'Vani', 'Zara', 'Isha'
];

const AVATAR_EMOJIS = ['👨', '👩', '🧑', '👨‍🦱', '👩‍🦱', '👨‍🦰', '👩‍🦰', '👨‍🦲', '👩‍🦲'];

/**
 * Reserve a nickname with 5-minute TTL
 * @param {UUID} nicknameId - Nickname to reserve
 * @param {UUID} sessionId - Session reserving the nickname
 * @returns {Promise<{data, error}>}
 */
async function reserveNickname(nicknameId, sessionId) {
  if (!nicknameId || !sessionId) {
    return { data: null, error: new Error('nicknameId and sessionId required') };
  }

  const reservationExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  const { data, error } = await supabase
    .from('nicknames_pool')
    .update({
      reserved_until: reservationExpiry.toISOString(),
      reserved_by_session: sessionId
    })
    .eq('id', nicknameId)
    .eq('is_available', true)
    .or(`reserved_until.is.null,reserved_until.lt.${new Date().toISOString()}`)
    .select()
    .single();

  return { data, error };
}

/**
 * Get 2 available nicknames from pool (1 male, 1 female)
 * Optionally matches first letter of user's name for personalization
 * Used to present options to user during join/create
 * NOW WITH RESERVATION: Nicknames are reserved for 5 minutes to prevent race conditions
 * @param {string|null} firstLetter - First letter of user's name for personalization
 * @param {string|null} sessionUuid - Session UUID (primary key) for reservation, not text session_id
 */
async function getTwoNicknameOptions(firstLetter = null, sessionUuid = null) {
  let maleOption = null;
  let femaleOption = null;

  // Generate a temporary session ID if none provided (for reservation tracking)
  const tempSessionId = sessionUuid || `temp-${Date.now()}`;
  const now = new Date().toISOString();

  // FILTER: Only use 4-letter nicknames (better recognition, consistent length)
  const NICKNAME_LENGTH = 4;

  // If firstLetter provided, try to find matching nicknames
  if (firstLetter) {
    const upperLetter = firstLetter.toUpperCase();

    // Try to get male nickname starting with letter
    // Note: We fetch multiple candidates and filter by length in JS (Supabase doesn't support length() in query)
    const { data: matchedMales } = await supabase
      .from('nicknames_pool')
      .select('*')
      .eq('is_available', true)
      .eq('gender', 'male')
      .ilike('nickname', `${upperLetter}%`)
      .limit(10); // Fetch multiple to filter by length

    // Filter for 4-letter names only
    const matchedMale = matchedMales?.find(n => n.nickname.length === NICKNAME_LENGTH);

    // Immediately reserve if found
    if (matchedMale && sessionUuid) {
      const { data: reserved } = await reserveNickname(matchedMale.id, tempSessionId);
      if (reserved) maleOption = reserved;
    } else if (matchedMale) {
      maleOption = matchedMale;
    }

    // Try to get female nickname starting with letter
    const { data: matchedFemales } = await supabase
      .from('nicknames_pool')
      .select('*')
      .eq('is_available', true)
      .eq('gender', 'female')
      .ilike('nickname', `${upperLetter}%`)
      .limit(10); // Fetch multiple to filter by length

    // Filter for 4-letter names only
    const matchedFemale = matchedFemales?.find(n => n.nickname.length === NICKNAME_LENGTH);

    // Immediately reserve if found
    if (matchedFemale && sessionUuid) {
      const { data: reserved } = await reserveNickname(matchedFemale.id, tempSessionId);
      if (reserved) femaleOption = reserved;
    } else if (matchedFemale) {
      femaleOption = matchedFemale;
    }
  }

  // Fallback: If we don't have both genders with matching letter, get any available
  if (!maleOption) {
    const { data: anyMales } = await supabase
      .from('nicknames_pool')
      .select('*')
      .eq('is_available', true)
      .eq('gender', 'male')
      .limit(10); // Fetch multiple to filter by length

    // Filter for 4-letter names only
    const anyMale = anyMales?.find(n => n.nickname.length === NICKNAME_LENGTH);

    // Immediately reserve if found
    if (anyMale && sessionUuid) {
      const { data: reserved } = await reserveNickname(anyMale.id, tempSessionId);
      if (reserved) maleOption = reserved;
    } else if (anyMale) {
      maleOption = anyMale;
    }
  }

  if (!femaleOption) {
    const { data: anyFemales } = await supabase
      .from('nicknames_pool')
      .select('*')
      .eq('is_available', true)
      .eq('gender', 'female')
      .limit(10); // Fetch multiple to filter by length

    // Filter for 4-letter names only
    const anyFemale = anyFemales?.find(n => n.nickname.length === NICKNAME_LENGTH);

    // Immediately reserve if found
    if (anyFemale && sessionUuid) {
      const { data: reserved } = await reserveNickname(anyFemale.id, tempSessionId);
      if (reserved) femaleOption = reserved;
    } else if (anyFemale) {
      femaleOption = anyFemale;
    }
  }

  // Build options array
  const options = [];

  if (maleOption) {
    options.push({
      id: maleOption.id,
      nickname: maleOption.nickname,
      avatar_emoji: maleOption.avatar_emoji,
      gender: maleOption.gender
    });
  }

  if (femaleOption) {
    options.push({
      id: femaleOption.id,
      nickname: femaleOption.nickname,
      avatar_emoji: femaleOption.avatar_emoji,
      gender: femaleOption.gender
    });
  }

  // If pool is running low, add fallback options (Issue #7)
  if (options.length < 2) {
    const maleNames = FALLBACK_NAMES.filter((_, i) => i < 15); // First 15 are male
    const femaleNames = FALLBACK_NAMES.filter((_, i) => i >= 15); // Rest are female

    if (options.length === 0) {
      options.push({
        id: `fallback-male-${crypto.randomBytes(8).toString('hex')}`, // Truly unique ID
        nickname: maleNames[Math.floor(Math.random() * maleNames.length)],
        avatar_emoji: '👨',
        gender: 'male',
        fallback: true
      });
    }

    options.push({
      id: `fallback-female-${crypto.randomBytes(8).toString('hex')}`, // Truly unique ID
      nickname: femaleNames[Math.floor(Math.random() * femaleNames.length)],
      avatar_emoji: '👩',
      gender: 'female',
      fallback: true
    });
  }

  return options;
}

/**
 * Mark nickname as used in the pool using atomic database function
 * CRITICAL FIX: Uses PostgreSQL advisory locks to prevent race conditions
 * @param {string} nicknameId - UUID of the nickname to claim
 * @param {string} sessionId - Session ID claiming the nickname
 * @returns {Object} {data, error} - Updated nickname data or error
 */
async function markNicknameAsUsed(nicknameId, sessionId) {
  if (!nicknameId) return { data: null, error: null }; // Return proper structure

  try {
    // CRITICAL FIX: Use atomic PostgreSQL function with advisory locks
    // This prevents TOCTOU (Time-Of-Check-Time-Of-Use) race conditions
    const { data: result, error } = await supabase
      .rpc('claim_nickname_atomic', {
        p_nickname_id: nicknameId,
        p_session_id: sessionId
      });

    if (error) {
      logger.error({ err: error, nicknameId, sessionId }, 'Failed to call claim_nickname_atomic');
      return { data: null, error };
    }

    // Check if the function returned results
    if (!result || result.length === 0) {
      return {
        data: null,
        error: new Error('Unexpected response from claim_nickname_atomic')
      };
    }

    const claimResult = Array.isArray(result) ? result[0] : result;

    // Check if claim was successful
    if (!claimResult.success) {
      return {
        data: null,
        error: new Error(claimResult.error_message || 'Nickname is no longer available')
      };
    }

    // Return the claimed nickname data
    return {
      data: [claimResult.nickname_data], // Wrap in array for consistency with original format
      error: null
    };
  } catch (err) {
    logger.error({ err, nicknameId, sessionId }, 'Exception in markNicknameAsUsed');
    return { data: null, error: err };
  }
}

/**
 * Get an available nickname from the pool (LEGACY - for backward compatibility)
 */
async function getAvailableNickname(sessionId) {
  const { data, error } = await supabase
    .from('nicknames_pool')
    .select('*')
    .eq('is_available', true)
    .limit(1)
    .single();

  if (error || !data) {
    // Fallback if pool is empty - use random 3-letter name
    const randomName = FALLBACK_NAMES[Math.floor(Math.random() * FALLBACK_NAMES.length)];
    const randomEmoji = AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];
    return {
      nickname: randomName,
      avatar_emoji: randomEmoji
    };
  }

  // Mark as used
  await supabase
    .from('nicknames_pool')
    .update({
      is_available: false,
      currently_used_in: sessionId,
      times_used: data.times_used + 1,
      last_used: new Date().toISOString()
    })
    .eq('id', data.id);

  return {
    nickname: data.nickname,
    avatar_emoji: data.avatar_emoji
  };
}

/**
 * Release expired nickname reservations
 * Runs every 5 minutes to free up reserved nicknames that were never claimed
 * Reservations expire after 5 minutes
 */
export async function releaseExpiredReservations() {
  try {
    const { data: released, error } = await supabase
      .rpc('cleanup_expired_nickname_reservations');

    if (error) {
      logger.error({ err: error }, 'Error cleaning up expired reservations');
      return;
    }

    if (released > 0) {
      logger.info({ count: released }, '✅ Released expired nickname reservations');
    }
  } catch (error) {
    logger.error({ err: error }, 'Unexpected error in releaseExpiredReservations');
  }
}

/**
 * Release nicknames from expired sessions
 * Runs periodically to prevent nickname pool depletion
 * Sessions older than 4 hours are considered expired
 */
export async function releaseExpiredNicknames() {
  try {
    const FOUR_HOURS_AGO = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

    // Find sessions that are still open/active but created more than 4 hours ago
    const { data: expiredSessions, error: fetchError } = await supabase
      .from('sessions')
      .select('id, session_id, created_at')
      .lt('created_at', FOUR_HOURS_AGO)
      .in('status', ['open', 'active']);

    if (fetchError) {
      logger.error({ err: fetchError }, 'Error fetching expired sessions');
      return;
    }

    if (!expiredSessions || expiredSessions.length === 0) {
      logger.debug('No expired sessions found for nickname cleanup');
      return;
    }

    const sessionIds = expiredSessions.map(s => s.id);

    // Release nicknames from these expired sessions
    const { data: releasedNicknames, error: updateError } = await supabase
      .from('nicknames_pool')
      .update({
        is_available: true,
        currently_used_in: null
      })
      .in('currently_used_in', sessionIds)
      .select();

    if (updateError) {
      logger.error({ err: updateError }, 'Error releasing nicknames');
      return;
    }

    logger.info({
      nicknamesReleased: releasedNicknames?.length || 0,
      expiredSessionsCount: sessionIds.length
    }, '✅ Nickname cleanup complete');
  } catch (error) {
    logger.error({ err: error }, 'Unexpected error in releaseExpiredNicknames');
  }
}

/**
 * Start nickname cleanup jobs
 * - Reservation cleanup: Runs every 5 minutes (releases expired reservations)
 * - Session cleanup: Runs every hour (releases nicknames from expired sessions)
 *
 * SECURITY FIX: Implements singleton pattern to prevent memory leaks
 * If called multiple times, clears existing intervals before starting new ones
 */
export function startNicknameCleanup() {
  // SECURITY FIX: If cleanup is already running, clear existing intervals first
  if (nicknameCleanupRunning) {
    logger.warn('Nickname cleanup jobs already running - restarting...');
    if (reservationCleanupInterval) {
      clearInterval(reservationCleanupInterval);
      reservationCleanupInterval = null;
    }
    if (sessionCleanupInterval) {
      clearInterval(sessionCleanupInterval);
      sessionCleanupInterval = null;
    }
  }

  logger.info('🔄 Starting nickname cleanup jobs...');
  nicknameCleanupRunning = true;

  // Run immediately on startup
  releaseExpiredReservations();
  releaseExpiredNicknames();

  // IMPROVEMENT: Use configurable intervals from config/cleanup.js
  // Can be overridden via environment variables for different deployment environments
  reservationCleanupInterval = setInterval(
    releaseExpiredReservations,
    CLEANUP_INTERVALS.RESERVATION_CLEANUP_MS
  );

  sessionCleanupInterval = setInterval(
    releaseExpiredNicknames,
    CLEANUP_INTERVALS.SESSION_CLEANUP_MS
  );

  logger.info('✅ Nickname cleanup jobs started successfully', {
    reservationCleanupInterval: `${CLEANUP_INTERVALS.RESERVATION_CLEANUP_MS / 1000 / 60} minutes`,
    sessionCleanupInterval: `${CLEANUP_INTERVALS.SESSION_CLEANUP_MS / 1000 / 60} minutes`
  });

  // Return cleanup function for graceful shutdown
  return () => {
    logger.info('Stopping nickname cleanup jobs...');
    if (reservationCleanupInterval) {
      clearInterval(reservationCleanupInterval);
      reservationCleanupInterval = null;
    }
    if (sessionCleanupInterval) {
      clearInterval(sessionCleanupInterval);
      sessionCleanupInterval = null;
    }
    nicknameCleanupRunning = false;
    logger.info('✅ Nickname cleanup jobs stopped');
  };
}

/**
 * POST /api/sessions/create
 * Create a new shopping session
 */
export async function createSession(req, res) {
  try {
    const {
      location_text,
      neighborhood,
      scheduled_time,
      title,
      description,
      items = [], // Array of {item_id, quantity, unit}
      expected_participants = null, // Number of participants host expects (null = not set, forces choice)
      // New fields for nickname selection
      real_name,
      selected_nickname_id,
      selected_nickname,
      selected_avatar_emoji,
      // Security: Optional PIN for participant authentication
      session_pin = null, // 4-6 digit PIN, or null for no PIN protection
      generate_pin = false // If true, auto-generate a 4-digit PIN
    } = req.body;

    // Validation
    if (!location_text || !scheduled_time) {
      return res.status(400).json({
        success: false,
        error: 'location_text and scheduled_time are required'
      });
    }

    // Validate PIN if provided
    if (session_pin && !isValidPinFormat(session_pin)) {
      return res.status(400).json({
        success: false,
        error: 'session_pin must be a 4-6 digit number'
      });
    }

    // Generate PIN if requested
    let finalPin = session_pin;
    if (generate_pin && !session_pin) {
      finalPin = generateSessionPin(4); // Generate 4-digit PIN
    }

    // Cleanup expired pending sessions (opportunistic cleanup - non-blocking)
    // Fire and forget to avoid blocking session creation
    supabase
      .from('sessions')
      .delete()
      .eq('status', 'open')
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .then(() => logger.debug('Background cleanup completed'))
      .catch(err => logger.error({ err }, 'Background cleanup failed'));

    // Parallelize independent operations: duplicate check and ID generation
    const [recentSession, session_id] = await Promise.all([
      // Check for duplicate session (same nickname + within 5 minutes)
      selected_nickname
        ? (async () => {
            // SECURITY: Validate nickname format to prevent SQL injection
            // NOTE: NO spaces allowed to maintain data integrity
            const NICKNAME_REGEX = new RegExp(`^[a-zA-Z0-9]{${VALIDATION_LIMITS.MIN_NICKNAME_LENGTH},${VALIDATION_LIMITS.MAX_NICKNAME_LENGTH}}$`);
            if (!NICKNAME_REGEX.test(selected_nickname)) {
              throw new Error(`Invalid nickname format. Use ${VALIDATION_LIMITS.MIN_NICKNAME_LENGTH}-${VALIDATION_LIMITS.MAX_NICKNAME_LENGTH} alphanumeric characters only (no spaces).`);
            }

            const reservationCutoff = new Date(Date.now() - NICKNAME_LIMITS.RESERVATION_TTL_MINUTES * 60 * 1000).toISOString();
            const { data } = await supabase
              .from('sessions')
              .select('session_id, creator_nickname')
              .eq('creator_nickname', selected_nickname)
              .eq('status', 'open')
              .gte('created_at', reservationCutoff)
              .limit(1)
              .maybeSingle();

            return data;
          })()
        : Promise.resolve(null),

      // Generate unique session ID with collision detection
      generateUniqueSessionId()
    ]);

    // Early return if duplicate session found
    if (recentSession) {
      return res.status(200).json({
        success: true,
        data: {
          session: recentSession,
          message: `Returning existing session from last ${NICKNAME_LIMITS.RESERVATION_TTL_MINUTES} minutes`
        }
      });
    }

    // Generate secure host token (fast operation, no need to parallelize)
    const host_token = generateHostToken();

    // SECURITY FIX: Sanitize user inputs to prevent XSS attacks
    // Sanitize real name (if provided)
    const sanitizedRealName = real_name ? sanitizeText(real_name, 100) : null;

    // Get nickname - either from user selection or auto-assign
    let nickname, avatar_emoji;
    if (selected_nickname && selected_avatar_emoji) {
      // User selected a nickname from the options
      // SECURITY: Sanitize nickname and emoji (already validated with regex above)
      nickname = escapeHtml(selected_nickname);
      avatar_emoji = escapeHtml(selected_avatar_emoji);
    } else {
      // Fallback to old auto-assign flow (for backward compatibility)
      const nicknameData = await getAvailableNickname(session_id);
      nickname = nicknameData.nickname;
      avatar_emoji = nicknameData.avatar_emoji;
    }

    // Calculate expiry (2 hours after scheduled time)
    const expiresAt = new Date(scheduled_time);
    expiresAt.setHours(expiresAt.getHours() + 2);

    // Determine tier and calculate max_participants based on product configuration
    const product = 'minibag';
    const tier = (expected_participants === null || expected_participants === 0) ? 'solo' : 'group';
    const tierConfig = getProductConfig(product, tier);
    const max_participants = tierConfig.max_absolute;

    // Transaction-like behavior with rollback capability
    // Step 1: Create session with host_token, optional PIN, and max_participants
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        session_id,
        session_type: 'minibag',
        creator_nickname: nickname,
        creator_real_name: sanitizedRealName, // SECURITY: Use sanitized real name
        location_text,
        neighborhood,
        scheduled_time,
        expires_at: expiresAt.toISOString(),
        title,
        description,
        status: 'open',
        expected_participants, // Number of participants expected (for checkpoint)
        checkpoint_complete: expected_participants === 0, // Auto-complete if no participants expected
        host_token, // Store host token for creator authentication
        session_pin: finalPin, // Store PIN for participant authentication (null if no PIN)
        max_participants // Dynamic limit based on product tier configuration
      })
      .select()
      .single();

    if (sessionError) {
      logger.error({ err: sessionError, session_id }, 'Session creation failed');
      throw sessionError;
    }

    // Step 2: Mark nickname as used if it was selected from pool
    // Skip fallback IDs (those aren't in the database pool)
    if (selected_nickname_id && !selected_nickname_id.startsWith('fallback-')) {
      const { error: nicknameError } = await markNicknameAsUsed(selected_nickname_id, session.id);
      if (nicknameError) {
        // Rollback: Delete session
        await supabase.from('sessions').delete().eq('id', session.id);
        throw new Error('Failed to allocate nickname');
      }
    }

    // Step 3: Create participant (creator)
    const { data: participant, error: participantError} = await supabase
      .from('participants')
      .insert({
        session_id: session.id,
        nickname,
        avatar_emoji,
        real_name: sanitizedRealName, // SECURITY: Use sanitized real name
        is_creator: true,
        items_confirmed: true // Host confirms when clicking "Start List"
      })
      .select()
      .single();

    if (participantError) {
      logger.error({ err: participantError, sessionId: session.id }, 'Participant creation failed - initiating comprehensive rollback');

      // SECURITY FIX: Comprehensive rollback with retry logic
      const rollbackResults = {
        session: { attempted: false, success: false, error: null },
        nickname: { attempted: false, success: false, error: null }
      };

      // Rollback Step 1: Delete session (with retry)
      for (let attempt = 1; attempt <= 3; attempt++) {
        rollbackResults.session.attempted = true;
        const { error: deleteError } = await supabase
          .from('sessions')
          .delete()
          .eq('id', session.id);

        if (!deleteError) {
          rollbackResults.session.success = true;
          logger.info({ sessionId: session.id, attempt }, 'Session rollback successful');
          break;
        }

        rollbackResults.session.error = deleteError.message;
        logger.warn({ sessionId: session.id, attempt, error: deleteError.message },
          'Session rollback attempt failed, retrying...');

        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, 100 * attempt));
        }
      }

      // Rollback Step 2: Release nickname (if it was from pool)
      if (selected_nickname_id && !selected_nickname_id.startsWith('fallback-')) {
        for (let attempt = 1; attempt <= 3; attempt++) {
          rollbackResults.nickname.attempted = true;
          const { error: releaseError } = await supabase
            .from('nicknames_pool')
            .update({
              is_available: true,
              reserved_until: null,
              reserved_by_session: null,
              currently_used_in: null
              // Don't decrement times_used - keep for audit trail
            })
            .eq('id', selected_nickname_id);

          if (!releaseError) {
            rollbackResults.nickname.success = true;
            logger.info({ nicknameId: selected_nickname_id, attempt }, 'Nickname rollback successful');
            break;
          }

          rollbackResults.nickname.error = releaseError.message;
          logger.warn({ nicknameId: selected_nickname_id, attempt, error: releaseError.message },
            'Nickname rollback attempt failed, retrying...');

          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 100 * attempt));
          }
        }
      }

      // Log final rollback status
      if (!rollbackResults.session.success ||
          (rollbackResults.nickname.attempted && !rollbackResults.nickname.success)) {
        logger.error({
          sessionId: session.id,
          nicknameId: selected_nickname_id,
          rollbackResults
        }, 'CRITICAL: Rollback incomplete - manual cleanup required');
      } else {
        logger.info({ sessionId: session.id, rollbackResults }, 'Rollback completed successfully');
      }

      throw participantError;
    }

    // Add items if provided
    let participantWithItems = { ...participant, items: [] };

    if (items.length > 0) {
      // First, get the UUID for each item_id
      const itemIds = items.map(item => item.item_id);
      const { data: catalogItems, error: catalogError } = await supabase
        .from('catalog_items')
        .select('id, item_id')
        .in('item_id', itemIds);

      if (catalogError) throw catalogError;

      // Validate all items exist
      if (catalogItems.length !== itemIds.length) {
        const foundIds = new Set(catalogItems.map(item => item.item_id));
        const missingIds = itemIds.filter(id => !foundIds.has(id));
        throw new Error(`Invalid item IDs: ${missingIds.join(', ')}`);
      }

      // Use Map instead of object for better performance
      const itemIdMap = new Map(
        catalogItems.map(item => [item.item_id, item.id])
      );

      // Convert to database format with UUIDs
      const itemsToInsert = items.map(item => {
        const uuid = itemIdMap.get(item.item_id);
        if (!uuid) throw new Error(`Missing UUID for item ${item.item_id}`);

        return {
          participant_id: participant.id,
          item_id: uuid,
          quantity: item.quantity,
          unit: item.unit
        };
      });

      // Insert and get back the data with catalog items in one query
      const { data: insertedItems, error: itemsError } = await supabase
        .from('participant_items')
        .insert(itemsToInsert)
        .select(`
          *,
          catalog_item:catalog_items(*)
        `);

      if (itemsError) throw itemsError;

      // Build response from inserted data - no re-fetch needed
      participantWithItems = {
        ...participant,
        items: insertedItems || []
      };
    }

    // Set host token as httpOnly cookie (secure authentication)
    // Set cookie (works for same-domain) and return token (for cross-domain)
    setHostTokenCookie(res, host_token, session.id);

    res.json({
      success: true,
      data: {
        session: session,
        participant: participantWithItems || participant,
        session_url: `/join/${session_id}`, // Changed from /session/ to /join/ to match App.jsx route
        host_token: host_token, // Return for cross-domain deployments (Vercel → Render)
        session_pin: finalPin, // Return PIN for host to share with participants (null if no PIN)
        auth_method: 'cookie_and_token' // Support both cookie (same-domain) and header (cross-domain)
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error creating session');
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/sessions/:session_id
 * Get session details with participants and items
 */
export async function getSession(req, res) {
  try {
    const { session_id } = req.params;

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_id', session_id)
      .single();

    if (sessionError) throw sessionError;

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Check if session has expired
    const is_session_expired = isSessionExpired(session);

    // Get participants with their items and invite info
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select(`
        *,
        items:participant_items(
          *,
          catalog_item:catalog_items(*)
        ),
        invite:invites!participants_claimed_invite_id_fkey(
          id,
          invite_number,
          invite_token,
          status
        )
      `)
      .eq('session_id', session.id);

    if (participantsError) throw participantsError;

    // DEBUG: Log what we got from database
    logger.debug({
      sessionId: session_id,
      sessionStatus: session.status,
      participantsCount: participants?.length,
      participantsDetail: participants?.map(p => ({
        id: p.id,
        nickname: p.nickname,
        is_creator: p.is_creator,
        items_count: p.items?.length,
        items_sample: p.items?.slice(0, 2) // Show first 2 items
      }))
    }, '[getSession] Database returned participants');

    // Calculate if invite link has expired
    // BUGFIX: Constant invite token never expires (shareable link for group mode)
    const TIMEOUT_MS = SESSION_LIMITS.PARTICIPANT_TIMEOUT_MINUTES * 60 * 1000;
    const hasConstantToken = !!session.constant_invite_token;
    const is_invite_expired = session.expected_participants_set_at && !hasConstantToken
      ? (new Date() - new Date(session.expected_participants_set_at)) >= TIMEOUT_MS
      : false;

    // Remove session_pin from response for security (don't expose PIN)
    // But include boolean flag indicating if PIN is required
    const { session_pin, ...sessionWithoutPin } = session;

    res.json({
      success: true,
      data: {
        session: {
          ...sessionWithoutPin,
          is_invite_expired,
          is_session_expired,
          requires_pin: !!session_pin // Boolean flag: does session require PIN?
        },
        participants
      }
    });
  } catch (error) {
    logger.error({ err: error, sessionId: req.params.session_id }, 'Error fetching session');
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/sessions/:session_id/shopping-items
 * Get pre-aggregated shopping items with participant summaries
 * Optimized endpoint that eliminates empty items issue
 */
export async function getShoppingItems(req, res) {
  try {
    const { session_id } = req.params;

    // Get session to verify it exists
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, session_id, status')
      .eq('session_id', session_id)
      .single();

    if (sessionError) throw sessionError;

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Get all participant items with catalog data and participant info
    // Note: participant_items doesn't have session_id, need to filter through participant
    const { data: participantItems, error: itemsError } = await supabase
      .from('participant_items')
      .select(`
        *,
        catalog_item:catalog_items(id, item_id, name, unit, base_price, emoji),
        participant:participants!inner(id, nickname, avatar_emoji, items_confirmed, session_id)
      `)
      .eq('participant.session_id', session.id);

    if (itemsError) throw itemsError;

    // Get all participants (including those without items)
    const { data: allParticipants, error: participantsError } = await supabase
      .from('participants')
      .select('id, nickname, avatar_emoji, items_confirmed, is_creator')
      .eq('session_id', session.id);

    if (participantsError) throw participantsError;

    // Aggregate items by item_id
    const aggregatedItems = {};
    const participantItemCounts = {};

    // PERFORMANCE NOTE: In-memory aggregation with O(N*M) complexity
    // For large sessions (50+ participants, 100+ items), consider using session_item_totals view (migration 036)
    // Or create a PostgreSQL function for server-side aggregation
    // TODO: Optimize with database-level aggregation if performance becomes an issue
    //
    // Initialize participant item counts
    allParticipants.forEach(p => {
      participantItemCounts[p.id] = 0;
    });

    // Process each participant item
    participantItems.forEach(item => {
      if (!item.catalog_item) {
        logger.warn({ item }, '[getShoppingItems] Missing catalog_item for item');
        return;
      }

      const itemId = item.catalog_item.item_id;
      const participantId = item.participant?.id;

      if (!participantId) {
        logger.warn({ item }, '[getShoppingItems] Missing participant for item');
        return;
      }

      // Count items per participant
      participantItemCounts[participantId]++;

      // Aggregate by item_id
      if (!aggregatedItems[itemId]) {
        aggregatedItems[itemId] = {
          item_id: itemId,
          name: item.catalog_item.name,
          unit: item.catalog_item.unit,
          base_price: item.catalog_item.base_price,
          emoji: item.catalog_item.emoji,
          totalQuantity: 0,
          participantQuantities: [] // Array of {nickname, quantity}
        };
      }

      aggregatedItems[itemId].totalQuantity += item.quantity;

      // Add participant with their quantity
      const participantNickname = item.participant.nickname;
      aggregatedItems[itemId].participantQuantities.push({
        nickname: participantNickname,
        quantity: item.quantity
      });
    });

    // Create participant summaries
    const participantSummaries = allParticipants.map(p => ({
      id: p.id,
      nickname: p.nickname,
      avatar_emoji: p.avatar_emoji,
      items_confirmed: p.items_confirmed,
      is_creator: p.is_creator,
      itemsCount: participantItemCounts[p.id] || 0
    }));

    logger.info({
      sessionId: session_id,
      sessionStatus: session.status,
      totalUniqueItems: Object.keys(aggregatedItems).length,
      totalParticipants: participantSummaries.length,
      itemsSample: Object.values(aggregatedItems).slice(0, 3)
    }, '✅ [getShoppingItems] Aggregated shopping items');

    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          session_id: session.session_id,
          status: session.status
        },
        aggregatedItems,
        participants: participantSummaries
      }
    });
  } catch (error) {
    logger.error({ err: error, sessionId: req.params.session_id }, 'Error fetching shopping items');
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/sessions/:session_id/bill-items
 * Get pre-aggregated bill items with payment information
 * Used for bill/payment screens to avoid empty items issue
 */
export async function getBillItems(req, res) {
  try {
    const { session_id } = req.params;

    // Get session to verify it exists
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, session_id, status')
      .eq('session_id', session_id)
      .single();

    if (sessionError) throw sessionError;

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // PERFORMANCE FIX: Fetch participant items and extract unique participants from results
    // Eliminates redundant query by reusing participant data from items query
    const { data: participantItems, error: itemsError } = await supabase
      .from('participant_items')
      .select(`
        *,
        catalog_item:catalog_items(id, item_id, name, unit, base_price, emoji),
        participant:participants!inner(id, nickname, avatar_emoji, real_name, items_confirmed, is_creator, session_id)
      `)
      .eq('participant.session_id', session.id);

    if (itemsError) throw itemsError;

    // PERFORMANCE FIX: Extract unique participants from items query result
    // This avoids a second database round trip
    const participantMap = new Map();
    participantItems.forEach(item => {
      if (item.participant && !participantMap.has(item.participant.id)) {
        const { session_id, ...participantData } = item.participant; // Remove session_id from response
        participantMap.set(item.participant.id, participantData);
      }
    });

    const allParticipants = Array.from(participantMap.values());

    // Get all payments for this session
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('session_id', session_id);

    if (paymentsError) throw paymentsError;

    // Build payment map and skipped items map using shared utility
    // NOTE: payments.item_id contains TEXT item_id (e.g., "v001"), NOT catalog UUID
    const { paymentMap, skippedItems } = buildPaymentMaps(payments);

    // PERFORMANCE NOTE: This aggregation happens in Node.js for flexibility
    // For large sessions (>100 participants), consider creating a PostgreSQL view or function
    // TODO: Optimize with database-level aggregation if performance becomes an issue
    // Aggregate items by item_id and calculate quantities
    const itemTotals = {};
    const participantItemsMap = {}; // participantId -> { itemId -> quantity }

    // Initialize participant items map
    allParticipants.forEach(p => {
      participantItemsMap[p.id] = {};
    });

    // Process each participant item
    participantItems.forEach(item => {
      // Defensive validation: Ensure catalog_item exists
      if (!item.catalog_item) {
        logger.warn({ item }, '[getBillItems] Missing catalog_item for item');
        return;
      }

      // Defensive validation: Ensure required catalog fields exist
      if (!item.catalog_item.name || !item.catalog_item.item_id) {
        logger.warn({ item }, '[getBillItems] Missing required catalog fields (name or item_id)');
        return;
      }

      const catalogItemId = item.catalog_item.id; // UUID
      const itemId = item.catalog_item.item_id; // String ID (v001, etc.)
      const participantId = item.participant?.id;

      if (!participantId) {
        logger.warn({ item }, '[getBillItems] Missing participant for item');
        return;
      }

      // Defensive validation: Ensure quantity is valid
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        logger.warn({ item, quantity: item.quantity }, '[getBillItems] Invalid quantity for item');
        return;
      }

      // Track participant's items
      if (!participantItemsMap[participantId][itemId]) {
        participantItemsMap[participantId][itemId] = {
          quantity: 0,
          catalogItemId
        };
      }
      participantItemsMap[participantId][itemId].quantity += item.quantity;

      // Only count non-skipped items in totals (use TEXT item_id to match payment map keys)
      if (!skippedItems[itemId]) {
        if (!itemTotals[catalogItemId]) {
          itemTotals[catalogItemId] = {
            itemId,
            name: item.catalog_item.name,
            unit: item.catalog_item.unit,
            base_price: item.catalog_item.base_price,
            emoji: item.catalog_item.emoji,
            totalQuantity: 0
          };
        }
        itemTotals[catalogItemId].totalQuantity += item.quantity;
      } else {
        // Validation logging: Confirm skipped items are excluded from totals
        logger.debug({
          itemId,
          catalogItemId,
          name: item.catalog_item.name,
          quantity: item.quantity,
          skipReason: skippedItems[itemId]?.skip_reason
        }, '[getBillItems] Item excluded from totals (skipped)');
      }
    });

    // Calculate splits for each participant
    const participantBills = allParticipants.map(participant => {
      let totalCost = 0;
      const itemBreakdown = [];

      Object.entries(participantItemsMap[participant.id]).forEach(([itemId, data]) => {
        const catalogItemId = data.catalogItemId;
        const payment = paymentMap[itemId];  // FIX: Use string itemId to match payment map keys

        if (payment && itemTotals[catalogItemId]) {
          const totalQty = itemTotals[catalogItemId].totalQuantity;
          const pricePerKg = payment.amount / totalQty;
          const itemCost = pricePerKg * data.quantity;

          totalCost += itemCost;
          itemBreakdown.push({
            item_id: itemId,
            catalog_item_id: catalogItemId,
            name: itemTotals[catalogItemId].name,
            emoji: itemTotals[catalogItemId].emoji,
            quantity: data.quantity,
            unit: itemTotals[catalogItemId].unit,
            price_per_kg: Math.round(pricePerKg),
            item_cost: Math.round(itemCost)
          });
        }
      });

      return {
        participant_id: participant.id,
        nickname: participant.nickname,
        avatar_emoji: participant.avatar_emoji,
        real_name: participant.real_name,
        is_creator: participant.is_creator,
        items_confirmed: participant.items_confirmed,
        total_cost: Math.round(totalCost),
        items_count: Object.keys(participantItemsMap[participant.id]).length,
        items: itemBreakdown
      };
    });

    const totalPaid = (payments || []).reduce((sum, p) => p.skipped ? sum : sum + p.amount, 0);
    const skippedItemsCount = Object.keys(skippedItems).length;

    logger.info({
      sessionId: session_id,
      sessionStatus: session.status,
      totalParticipants: participantBills.length,
      totalPaid: Math.round(totalPaid),
      paymentsCount: payments?.length || 0,
      skippedItemsCount,
      skippedItemsList: Object.keys(skippedItems),
      participantDetails: participantBills.map(p => ({
        nickname: p.nickname,
        total_cost: p.total_cost,
        items_count: p.items_count,
        items: p.items
      })),
      paymentMap: Object.keys(paymentMap),
      itemTotals: Object.keys(itemTotals)
    }, '✅ [getBillItems] Calculated bill items');

    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          session_id: session.session_id,
          status: session.status
        },
        participants: participantBills,
        total_paid: Math.round(totalPaid),
        payments_count: payments?.length || 0,
        skipped_items: Object.keys(skippedItems).map(catalog_item_id => ({
          catalog_item_id,
          item_id: itemTotals[catalog_item_id]?.itemId,
          skip_reason: skippedItems[catalog_item_id].skip_reason
        }))
      }
    });
  } catch (error) {
    logger.error({ err: error, sessionId: req.params.session_id }, 'Error fetching bill items');
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/sessions/:session_id/join
 * Join an existing session
 */
export async function joinSession(req, res) {
  try {
    const { session_id } = req.params;
    const {
      items = [], // Optional initial items
      // New fields for nickname selection
      real_name,
      selected_nickname_id,
      selected_nickname,
      selected_avatar_emoji,
      // Security: PIN for authentication
      session_pin = null, // Required if session has PIN protection
      // Decline invitation flag
      marked_not_coming = false, // If true, participant is declining the invitation
      // Invite tracking
      invite_token = null // Token from invite link URL parameter
    } = req.body;

    // Debug logging for decline requests
    logger.debug('joinSession request', {
      session_id,
      marked_not_coming,
      has_real_name: !!real_name,
      has_nickname: !!selected_nickname,
      has_avatar: !!selected_avatar_emoji,
      nickname: selected_nickname,
      avatar: selected_avatar_emoji
    });

    // SECURITY: Validate nickname format to prevent SQL injection
    // NOTE: NO spaces allowed to maintain data integrity
    if (selected_nickname) {
      const NICKNAME_REGEX = new RegExp(`^[a-zA-Z0-9]{${VALIDATION_LIMITS.MIN_NICKNAME_LENGTH},${VALIDATION_LIMITS.MAX_NICKNAME_LENGTH}}$`);
      if (!NICKNAME_REGEX.test(selected_nickname)) {
        return res.status(400).json({
          success: false,
          error: ERROR_MESSAGES.INVALID_NICKNAME
        });
      }
    }

    // Validate required data based on flow (decline vs join)
    if (marked_not_coming) {
      // Declining - require minimal data (nickname and avatar for host notification)
      if (!selected_nickname || !selected_avatar_emoji) {
        return res.status(400).json({
          success: false,
          error: 'Nickname and avatar are required to decline invitation',
          error_code: 'MISSING_DECLINE_DATA'
        });
      }
    } else {
      // Joining - require full data
      if (!real_name || !selected_nickname || !selected_avatar_emoji) {
        return res.status(400).json({
          success: false,
          error: ERROR_MESSAGES.MISSING_REQUIRED_FIELDS,
          error_code: 'MISSING_JOIN_DATA'
        });
      }
    }

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_id', session_id)
      .single();

    if (sessionError) throw sessionError;

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // **CRITICAL SECURITY CHECK: Validate PIN if session is PIN-protected**
    // BUT skip PIN validation if user is declining (marked_not_coming)
    if (session.session_pin && !marked_not_coming) {
      // SECURITY FIX: Check rate limiting before validating PIN
      const rateLimit = checkPinAttempt(session_id);

      if (!rateLimit.allowed) {
        const errorMessages = {
          rate_limited: `Too many incorrect PIN attempts. Please wait ${rateLimit.retryAfter} seconds before trying again.`,
          too_many_attempts: `This session has been temporarily locked due to too many failed PIN attempts. Please try again in ${Math.ceil(rateLimit.retryAfter / 60)} minutes.`
        };

        logger.warn({
          sessionId: session_id,
          reason: rateLimit.reason,
          retryAfter: rateLimit.retryAfter
        }, 'PIN attempt blocked by rate limiter');

        return res.status(429).json({
          success: false,
          error: errorMessages[rateLimit.reason] || 'Please wait before trying again',
          error_code: 'PIN_RATE_LIMITED',
          retry_after: rateLimit.retryAfter
        });
      }

      // Session requires PIN for joining (not for declining)
      if (!session_pin) {
        return res.status(401).json({
          success: false,
          error: 'This session requires a PIN to join. Please enter the PIN shared by the host.',
          error_code: 'PIN_REQUIRED'
        });
      }

      // Validate PIN matches
      if (session_pin !== session.session_pin) {
        // SECURITY FIX: Record failed attempt for rate limiting
        recordFailedPinAttempt(session_id, session_pin);

        logger.warn({
          sessionId: session_id,
          attemptedPin: '***', // Don't log actual PIN
          attemptsCount: getPinAttemptCount(session_id)
        }, 'Incorrect PIN attempt');

        return res.status(403).json({
          success: false,
          error: 'Incorrect PIN. Please check the PIN and try again.',
          error_code: 'INCORRECT_PIN'
        });
      }

      // PIN correct - clear any failed attempts
      clearPinAttempts(session_id);

      logger.info({
        sessionId: session_id
      }, 'Correct PIN provided - access granted');
    }

    // Check if session has expired (2 hours after scheduled time)
    if (isSessionExpired(session)) {
      return res.status(410).json({
        success: false,
        error: 'This session has expired. Sessions are only valid for 2 hours after the scheduled time.',
        error_code: 'SESSION_EXPIRED'
      });
    }

    // Check if session is still open
    if (session.status !== 'open') {
      return res.status(400).json({
        success: false,
        error: 'Session is not accepting new participants'
      });
    }

    // BUGFIX #3: Validate session mode allows joining
    // Solo mode sessions should only have the creator (no joins allowed)
    // Group mode or null (legacy) allow joins
    if (session.mode === 'solo') {
      return res.status(400).json({
        success: false,
        error: 'This is a solo shopping session. Only the creator can participate.',
        error_code: 'SOLO_MODE_NO_JOINS'
      });
    }

    // Check if invite link has expired
    // BUGFIX: Skip timeout for constant invite token (shareable link for group mode)
    // Constant token allows multiple users to join using the same link beyond 20min timeout
    const TIMEOUT_MS = SESSION_LIMITS.PARTICIPANT_TIMEOUT_MINUTES * 60 * 1000;
    const hasConstantToken = !!session.constant_invite_token;

    if (session.expected_participants_set_at && !hasConstantToken) {
      const elapsed = new Date() - new Date(session.expected_participants_set_at);
      if (elapsed >= TIMEOUT_MS) {
        return res.status(410).json({
          success: false,
          error: ERROR_MESSAGES.INVITE_EXPIRED,
          error_code: 'INVITE_EXPIRED'
        });
      }
    }

    // Check participant limit against session's configured max (not hardcoded limit)
    const { data: participants, error: countError } = await supabase
      .from('participants')
      .select('id')
      .eq('session_id', session.id);

    if (countError) throw countError;

    // Use session's max_participants (from SessionsAdapter) instead of hardcoded constant
    const maxAllowed = session.max_participants || SESSION_LIMITS.MAX_PARTICIPANTS;
    if (participants && participants.length >= maxAllowed) {
      return res.status(403).json({
        success: false,
        error: `This group is full (maximum ${maxAllowed} participants)`
      });
    }

    // Validate and claim invite if invite_token provided
    let invite = null;
    if (invite_token) {
      // Lookup invite
      const { data: inviteData, error: inviteError } = await supabase
        .from('invites')
        .select('*')
        .eq('session_id', session.id)
        .eq('invite_token', invite_token)
        .single();

      if (inviteError || !inviteData) {
        return res.status(404).json({
          success: false,
          error: 'Invalid invite link. Please check the link and try again.'
        });
      }

      invite = inviteData;

      // Check if invite already claimed or expired
      if (invite.status === 'claimed') {
        return res.status(400).json({
          success: false,
          error: 'This invite has already been used by someone else.'
        });
      }

      if (invite.status === 'expired') {
        return res.status(410).json({
          success: false,
          error: 'This invite has expired. Please ask the host for a new invite link.'
        });
      }
    }

    // SECURITY FIX: Sanitize user inputs to prevent XSS attacks
    // Sanitize real name (if provided)
    const sanitizedRealName = real_name ? sanitizeText(real_name, 100) : null;

    // Get nickname - either from user selection or auto-assign
    let nickname, avatar_emoji;
    if (selected_nickname && selected_avatar_emoji) {
      // User selected a nickname from the options
      // SECURITY: Sanitize nickname and emoji (already validated with regex above)
      nickname = escapeHtml(selected_nickname);
      avatar_emoji = escapeHtml(selected_avatar_emoji);
    } else {
      // Fallback to old auto-assign flow (for backward compatibility)
      const nicknameData = await getAvailableNickname(session.id);
      nickname = nicknameData.nickname;
      avatar_emoji = nicknameData.avatar_emoji;
    }

    // Mark nickname as used if it was selected from pool (Issue #1)
    // BUT NOT if they're declining (no point wasting nicknames)
    // AND NOT if it's a fallback ID (those aren't in the database pool)
    if (selected_nickname_id && !marked_not_coming && !selected_nickname_id.startsWith('fallback-')) {
      const { data: nicknameData, error: nicknameError } = await markNicknameAsUsed(
        selected_nickname_id,
        session.id
      );

      // Check: error OR empty/null data array means nickname wasn't claimed
      if (nicknameError || !nicknameData || (Array.isArray(nicknameData) && nicknameData.length === 0)) {
        return res.status(409).json({
          success: false,
          error: ERROR_MESSAGES.NICKNAME_ALREADY_TAKEN,
          error_code: 'NICKNAME_ALREADY_TAKEN'
        });
      }
    }

    // Create participant
    const { data: participant, error: participantError} = await supabase
      .from('participants')
      .insert({
        session_id: session.id,
        nickname,
        avatar_emoji,
        real_name: sanitizedRealName, // SECURITY: Use sanitized real name
        is_creator: false,
        marked_not_coming, // If participant is declining the invitation
        marked_not_coming_at: marked_not_coming ? new Date().toISOString() : null,
        claimed_invite_id: invite?.id || null, // Link to invite if used
        joined_at: new Date().toISOString() // Explicitly set to avoid null
      })
      .select()
      .single();

    if (participantError) throw participantError;

    // Update invite status if invite was used (Issue #5)
    if (invite) {
      const newStatus = marked_not_coming ? 'declined' : 'claimed';
      const { error: inviteUpdateError } = await supabase
        .from('invites')
        .update({
          status: newStatus,
          claimed_by: participant.id,
          claimed_at: new Date().toISOString()
        })
        .eq('id', invite.id);

      if (inviteUpdateError) {
        logger.error('Invite claim failed - initiating comprehensive rollback', {
          participantId: participant.id,
          inviteId: invite.id,
          sessionId: session.id,
          nicknameId: selected_nickname_id,
          error: inviteUpdateError.message
        });

        // SECURITY FIX: Comprehensive rollback with retry logic
        const rollbackResults = {
          participant: { attempted: false, success: false, error: null },
          nickname: { attempted: false, success: false, error: null }
        };

        // Rollback Step 1: Delete participant (with retry)
        for (let attempt = 1; attempt <= 3; attempt++) {
          rollbackResults.participant.attempted = true;
          const { error: deleteError } = await supabase
            .from('participants')
            .delete()
            .eq('id', participant.id);

          if (!deleteError) {
            rollbackResults.participant.success = true;
            logger.info({ participantId: participant.id, attempt }, 'Participant rollback successful');
            break;
          }

          rollbackResults.participant.error = deleteError.message;
          logger.warn({ participantId: participant.id, attempt, error: deleteError.message },
            'Participant rollback attempt failed, retrying...');

          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 100 * attempt)); // Exponential backoff
          }
        }

        // Rollback Step 2: Release nickname (if it was from pool and not marked_not_coming)
        if (selected_nickname_id && !marked_not_coming && !selected_nickname_id.startsWith('fallback-')) {
          for (let attempt = 1; attempt <= 3; attempt++) {
            rollbackResults.nickname.attempted = true;
            const { error: releaseError } = await supabase
              .from('nicknames_pool')
              .update({
                is_available: true,
                currently_used_in: null,
                reserved_until: null,
                reserved_by_session: null
                // Don't decrement times_used - keep audit trail
              })
              .eq('id', selected_nickname_id);

            if (!releaseError) {
              rollbackResults.nickname.success = true;
              logger.info({ nicknameId: selected_nickname_id, attempt }, 'Nickname rollback successful');
              break;
            }

            rollbackResults.nickname.error = releaseError.message;
            logger.warn({ nicknameId: selected_nickname_id, attempt, error: releaseError.message },
              'Nickname rollback attempt failed, retrying...');

            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 100 * attempt)); // Exponential backoff
            }
          }
        }

        // Log final rollback status
        if (!rollbackResults.participant.success ||
            (rollbackResults.nickname.attempted && !rollbackResults.nickname.success)) {
          logger.error({
            participantId: participant.id,
            nicknameId: selected_nickname_id,
            rollbackResults
          }, 'CRITICAL: Rollback incomplete - manual cleanup required');
        } else {
          logger.info({ participantId: participant.id, rollbackResults }, 'Rollback completed successfully');
        }

        return res.status(500).json({
          success: false,
          error: ERROR_MESSAGES.INVITE_CLAIM_FAILED,
          error_code: 'INVITE_CLAIM_FAILED'
        });
      }
    }

    // Add items if provided
    if (items.length > 0) {
      // First, get the UUID for each item_id
      const itemIds = items.map(item => item.item_id);
      const { data: catalogItems, error: catalogError } = await supabase
        .from('catalog_items')
        .select('id, item_id')
        .in('item_id', itemIds);

      if (catalogError) throw catalogError;

      // Create a map of item_id -> UUID
      const itemIdMap = {};
      catalogItems.forEach(item => {
        itemIdMap[item.item_id] = item.id;
      });

      // Convert to database format with UUIDs
      const itemsToInsert = items.map(item => ({
        participant_id: participant.id,
        item_id: itemIdMap[item.item_id], // Use UUID instead of text
        quantity: item.quantity,
        unit: item.unit
      }));

      await supabase
        .from('participant_items')
        .insert(itemsToInsert);
    }

    res.json({
      success: true,
      data: {
        participant,
        session
      }
    });
  } catch (error) {
    logger.error({ err: error, sessionId: req.params.session_id }, 'Error joining session');
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * PUT /api/sessions/:session_id/status
 * Update session status (host-only action)
 */
export async function updateSessionStatus(req, res) {
  try {
    const { session_id } = req.params;
    const { status } = req.body;

    // Get host token from cookie or headers (backward compatibility)
    const host_token = getHostToken(req);

    // Verify host token
    if (!host_token) {
      return res.status(401).json({
        success: false,
        error: 'Host token required for this action. Please log in as session host.',
        error_code: 'HOST_TOKEN_REQUIRED'
      });
    }

    const validStatuses = ['open', 'active', 'shopping', 'completed', 'expired', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    // Verify host token matches session
    const { data: session, error: authError } = await supabase
      .from('sessions')
      .select('*')
      .eq('session_id', session_id)
      .eq('host_token', host_token)
      .single();

    if (authError || !session) {
      return res.status(403).json({
        success: false,
        error: 'Invalid host token or session not found'
      });
    }

    // Check if session has expired (allow setting to 'expired' status even if already expired)
    if (isSessionExpired(session) && status !== 'expired') {
      return res.status(410).json({
        success: false,
        error: 'Cannot update expired session. Sessions expire 2 hours after scheduled time.',
        error_code: 'SESSION_EXPIRED'
      });
    }

    // Prepare update data
    const updateData = { status };

    // Set completed_at timestamp when status changes to 'completed'
    if (status === 'completed' && !session.completed_at) {
      updateData.completed_at = new Date().toISOString();
    }

    // Set cancelled_at timestamp when status changes to 'cancelled'
    if (status === 'cancelled' && !session.cancelled_at) {
      updateData.cancelled_at = new Date().toISOString();
    }

    // Update session status
    const { data: updatedSession, error: updateError } = await supabase
      .from('sessions')
      .update(updateData)
      .eq('session_id', session_id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Run cleanup tasks asynchronously (non-blocking)
    if (status === 'completed' || status === 'cancelled') {
      performSessionCleanup(session, status).catch(err => {
        logger.error({ err, sessionId: session_id }, 'Error performing session cleanup');
      });
    }

    // Return response immediately without waiting for cleanup
    res.json({
      success: true,
      data: updatedSession
    });
  } catch (error) {
    logger.error({ err: error, sessionId: req.params.session_id }, 'Error updating session status');
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * PATCH /api/sessions/:session_id/expected
 * Update expected participants count (host-only action)
 */
export async function updateExpectedParticipants(req, res) {
  try {
    const { session_id } = req.params;
    const { expected_participants, start_timeout = true } = req.body;

    // Validation - allow null, or non-negative number (max determined by product tier)
    if (expected_participants !== null &&
        (typeof expected_participants !== 'number' || expected_participants < 0)) {
      return res.status(400).json({
        success: false,
        error: 'expected_participants must be null or a non-negative number'
      });
    }

    // Validate against product tier limits
    if (expected_participants !== null && expected_participants > 0) {
      const product = 'minibag';
      const tier = 'group';
      const tierConfig = getProductConfig(product, tier);
      const maxInvited = tierConfig.max_invited;

      if (maxInvited !== null && expected_participants > maxInvited) {
        return res.status(400).json({
          success: false,
          error: `${tierConfig.ui_label} mode allows maximum ${maxInvited} invited participants`
        });
      }
    }

    // Get current session to preserve existing timestamp if needed
    const { data: currentSession, error: fetchError } = await supabase
      .from('sessions')
      .select('expected_participants_set_at')
      .eq('session_id', session_id)
      .single();

    if (fetchError) throw fetchError;

    // Determine expected_participants_set_at timestamp
    // Timer starts when host sets to 1+ (group mode) AND start_timeout is true
    // If start_timeout is false, preserve existing timestamp
    let expected_participants_set_at;
    if (expected_participants >= 1) {
      if (start_timeout) {
        // Start or restart the timer
        expected_participants_set_at = new Date().toISOString();
      } else {
        // Preserve existing timestamp (or null if not set yet)
        expected_participants_set_at = currentSession.expected_participants_set_at;
      }
    } else {
      // Clear timer for solo mode (0) or null
      expected_participants_set_at = null;
    }

    // Recalculate max_participants based on new tier
    // SDK Enhancement: Update participant limit when tier changes (solo ↔ group)
    const product = 'minibag';
    const newTier = (expected_participants === null || expected_participants === 0) ? 'solo' : 'group';
    const tierConfig = getProductConfig(product, newTier);
    const max_participants = tierConfig.max_absolute;

    // Update session with BOTH expected_participants AND max_participants
    const { data: session, error: updateError } = await supabase
      .from('sessions')
      .update({
        expected_participants,
        expected_participants_set_at,
        checkpoint_complete: expected_participants === 0,
        max_participants  // Update limit when tier changes
      })
      .eq('session_id', session_id)
      .select()
      .single();

    if (updateError) throw updateError;

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Generate/delete invites based on expected_participants
    let invites = [];
    if (expected_participants >= 1) {
      // Group mode - generate numbered invites (1 for simple group, N for multi-participant)
      invites = await regenerateInvites(session.id, expected_participants);
    } else {
      // Delete all invites when switching to solo (0) or null
      await supabase
        .from('invites')
        .delete()
        .eq('session_id', session.id);
    }

    res.json({
      success: true,
      data: {
        ...session,
        invites // Include invites in response
      }
    });
  } catch (error) {
    logger.error({ err: error, sessionId: req.params.session_id }, 'Error updating expected participants');
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * PATCH /api/sessions/:session_id/participant-limit
 * Update participant limit (host-only, product-driven)
 * This endpoint allows products to dynamically adjust the max_participants
 * based on tier changes or business logic
 */
export async function updateParticipantLimit(req, res) {
  try {
    const { session_id } = req.params;
    const { max_participants } = req.body;

    // Validation - must be a positive integer
    if (typeof max_participants !== 'number' || max_participants < 1 || !Number.isInteger(max_participants)) {
      return res.status(400).json({
        success: false,
        error: 'max_participants must be a positive integer'
      });
    }

    // Update session
    const { data: session, error: updateError } = await supabase
      .from('sessions')
      .update({ max_participants })
      .eq('session_id', session_id)
      .select()
      .single();

    if (updateError) throw updateError;

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    logger.info({ sessionId: session_id, max_participants }, 'Updated participant limit');

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    logger.error({ err: error, sessionId: req.params.session_id }, 'Error updating participant limit');
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/sessions/:session_id/invites
 * Get all invite links for a session with their status
 */
export async function getSessionInvites(req, res) {
  try {
    const { session_id } = req.params;

    // Get session first (maybeSingle handles 0 or 1 row gracefully)
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('session_id', session_id)
      .maybeSingle();

    if (sessionError) {
      logger.error({ err: sessionError, sessionId: session_id }, 'Error fetching session for invites');
      throw sessionError;
    }

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Get all invites with participant info
    // Note: FK is participants.claimed_invite_id -> invites.id (reverse direction)
    const { data: invites, error: invitesError } = await supabase
      .from('invites')
      .select(`
        *,
        participant:participants!participants_claimed_invite_id_fkey(
          id,
          nickname,
          real_name,
          marked_not_coming,
          items_confirmed
        )
      `)
      .eq('session_id', session.id)
      .order('invite_number');

    if (invitesError) throw invitesError;

    res.json({
      success: true,
      data: invites || []
    });
  } catch (error) {
    logger.error({ err: error, sessionId: req.params.session_id }, 'Error fetching invites');
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/sessions/:session_id/invites/resolved
 * BUGFIX #3: Check if all invites for a session have been resolved
 * An invite is resolved if it's claimed, declined, or expired (not pending/active)
 * Used by host to determine if they can proceed to "start shopping" state
 */
export async function checkInvitesResolved(req, res) {
  try {
    const { session_id } = req.params;

    // Import SDK function
    const { areAllInvitesResolved } = await import('@sessions/core');

    // Call SDK function to check resolution
    const { data, error } = await areAllInvitesResolved(session_id);

    if (error) {
      logger.error({ err: error, sessionId: session_id }, 'Error checking invite resolution');
      return res.status(404).json({
        success: false,
        error: error.message || 'Session not found'
      });
    }

    res.json({
      success: true,
      data: {
        allResolved: data.allResolved,
        pendingCount: data.pendingCount,
        totalCount: data.totalCount,
        // Include invite details for debugging (can be removed in production)
        invites: data.invites.map(inv => ({
          id: inv.id,
          inviteNumber: inv.inviteNumber,
          status: inv.status,
          isConstantLink: inv.isConstantLink
        }))
      }
    });
  } catch (error) {
    logger.error({ err: error, sessionId: req.params.session_id }, 'Error checking invite resolution');
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * POST /api/sessions/:session_id/invites/:invite_id/decline
 * BUGFIX #1: Decline a named invite without creating a participant
 * Used when invited user clicks "I can't make it" button
 */
export async function declineInvite(req, res) {
  try {
    const { session_id, invite_id } = req.params;
    const { reason } = req.body || {};

    // Import SDK function
    const { declineNamedInvite } = await import('@sessions/core');

    // Call SDK function to decline invite
    const { data, error } = await declineNamedInvite(invite_id, reason);

    if (error) {
      logger.error({ err: error, inviteId: invite_id }, 'Error declining invite');

      // Return appropriate status code based on error
      const statusCode = error.code === 'SESSION_NOT_FOUND' ? 404
        : error.code === 'INVALID_OPERATION' ? 400
        : 500;

      return res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to decline invite'
      });
    }

    res.json({
      success: true,
      data: {
        invite: {
          id: data.id,
          inviteNumber: data.inviteNumber,
          status: data.status,
          declinedAt: data.declinedAt,
          declineReason: data.declineReason
        }
      }
    });
  } catch (error) {
    logger.error({ err: error, inviteId: req.params.invite_id }, 'Error declining invite');
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * GET /api/sessions/nickname-options?firstLetter=R
 * Get 2 available nickname options (1 male, 1 female) for user selection
 * Optionally pass firstLetter query param for personalized nickname matching
 */
export async function getNicknameOptions(req, res) {
  try {
    const { firstLetter, sessionUuid } = req.query;

    // Validate sessionUuid format if provided
    if (sessionUuid && !isValidUUID(sessionUuid)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid session UUID format'
      });
    }

    // Pass sessionUuid to enable nickname reservation
    // sessionUuid is the database primary key (UUID), not the text session_id
    // If no sessionUuid provided, nicknames are returned without reservation
    const options = await getTwoNicknameOptions(firstLetter, sessionUuid);

    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    logger.error({ err: error, firstLetter: req.query.firstLetter }, 'Error fetching nickname options');
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
