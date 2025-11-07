/**
 * Sessions API Routes
 * Endpoints for creating and managing shopping sessions
 */

import { supabase } from '../db/supabase.js';
import crypto from 'crypto';
import { setHostTokenCookie, getHostToken } from '../utils/cookies.js';

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
 * Tries up to 3 times to find a unique ID
 */
async function generateUniqueSessionId(maxAttempts = 3) {
  for (let i = 0; i < maxAttempts; i++) {
    const sessionId = generateSessionId();

    const { data } = await supabase
      .from('sessions')
      .select('id')
      .eq('session_id', sessionId)
      .single();

    if (!data) return sessionId; // Unique ID found
  }

  throw new Error('Failed to generate unique session ID after multiple attempts');
}

/**
 * Generate secure host token (64 hex chars)
 */
function generateHostToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate a 4-6 digit numeric PIN for session authentication
 * @param {number} length - Length of PIN (4-6 digits)
 * @returns {string} - Numeric PIN
 */
function generateSessionPin(length = 4) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
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
 * @param {number} count - Number of invites to create (1-3)
 */
async function regenerateInvites(sessionId, count) {
  if (count < 1 || count > 3) {
    throw new Error('Invite count must be between 1 and 3');
  }

  // Delete existing invites for this session
  await supabase
    .from('invites')
    .delete()
    .eq('session_id', sessionId);

  // Generate new invites
  const invites = [];
  for (let i = 1; i <= count; i++) {
    invites.push({
      session_id: sessionId,
      invite_token: generateInviteToken(),
      invite_number: i,
      status: 'pending'
    });
  }

  // Insert all invites
  const { data, error } = await supabase
    .from('invites')
    .insert(invites)
    .select();

  if (error) throw error;

  return data;
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
      console.error('Error fetching participant items:', itemsError);
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
      console.error('Error fetching payments:', paymentsError);
      return false;
    }

    // Create set of item IDs that have payment records
    const paidItemIds = new Set(payments?.map(p => p.item_id) || []);

    // Check if all participant items have payment records (paid or skipped)
    return participantItems.every(item => paidItemIds.has(item.item_id));
  } catch (error) {
    console.error('Error checking financial settlement:', error);
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
          console.error('Error updating financially_settled_at:', settlementError);
        }
      }
    }

    // Release nicknames back to pool
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('id')
      .eq('session_id', session.id);

    if (participantsError) {
      console.error('Error fetching participants for cleanup:', participantsError);
      return;
    }

    if (participants && participants.length > 0) {
      // Find which nicknames were from the pool (have nickname_pool_id)
      const { data: nicknamesUsed, error: nicknamesError } = await supabase
        .from('nicknames_pool')
        .select('id')
        .eq('currently_used_in', session.id);

      if (nicknamesError) {
        console.error('Error fetching nicknames for cleanup:', nicknamesError);
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
          console.error('Error releasing nicknames:', releaseError);
        }
      }
    }
  } catch (error) {
    console.error('Error in performSessionCleanup:', error);
  }
}

/**
 * 3-letter names for participant fallback (if pool is empty)
 */
const FALLBACK_NAMES = [
  // Hindi/Indian - Male
  'Raj', 'Avi', 'Tej', 'Ved', 'Jai', 'Adi', 'Dev', 'Sam', 'Sid', 'Vik',
  'Om', 'Yug', 'Nav', 'Arv', 'Mir',
  // Hindi/Indian - Female
  'Ria', 'Anu', 'Sia', 'Ira', 'Pia', 'Mia', 'Iva', 'Uma', 'Niv', 'Dia',
  'Eva', 'Ruh', 'Ara', 'Diy', 'Jia',
  // Gujarati - Male
  'Jay', 'Het', 'Mit', 'Vir', 'Nay', 'Ruj', 'Pax',
  // Gujarati - Female
  'Rit', 'Neh', 'Sar', 'Tia'
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
 */
async function getTwoNicknameOptions(firstLetter = null, sessionId = null) {
  let maleOption = null;
  let femaleOption = null;

  // Generate a temporary session ID if none provided (for reservation tracking)
  const tempSessionId = sessionId || `temp-${Date.now()}`;
  const now = new Date().toISOString();

  // If firstLetter provided, try to find matching nicknames
  if (firstLetter) {
    const upperLetter = firstLetter.toUpperCase();

    // Try to get male nickname starting with letter (not reserved or expired reservation)
    const { data: matchedMale } = await supabase
      .from('nicknames_pool')
      .select('*')
      .eq('is_available', true)
      .eq('gender', 'male')
      .ilike('nickname', `${upperLetter}%`)
      .or(`reserved_until.is.null,reserved_until.lt.${now}`)
      .limit(1)
      .single();

    // Immediately reserve if found
    if (matchedMale && sessionId) {
      const { data: reserved } = await reserveNickname(matchedMale.id, tempSessionId);
      if (reserved) maleOption = reserved;
    } else if (matchedMale) {
      maleOption = matchedMale;
    }

    // Try to get female nickname starting with letter (not reserved or expired reservation)
    const { data: matchedFemale } = await supabase
      .from('nicknames_pool')
      .select('*')
      .eq('is_available', true)
      .eq('gender', 'female')
      .ilike('nickname', `${upperLetter}%`)
      .or(`reserved_until.is.null,reserved_until.lt.${now}`)
      .limit(1)
      .single();

    // Immediately reserve if found
    if (matchedFemale && sessionId) {
      const { data: reserved } = await reserveNickname(matchedFemale.id, tempSessionId);
      if (reserved) femaleOption = reserved;
    } else if (matchedFemale) {
      femaleOption = matchedFemale;
    }
  }

  // Fallback: If we don't have both genders with matching letter, get any available
  if (!maleOption) {
    const { data: anyMale } = await supabase
      .from('nicknames_pool')
      .select('*')
      .eq('is_available', true)
      .eq('gender', 'male')
      .or(`reserved_until.is.null,reserved_until.lt.${now}`)
      .limit(1)
      .single();

    // Immediately reserve if found
    if (anyMale && sessionId) {
      const { data: reserved } = await reserveNickname(anyMale.id, tempSessionId);
      if (reserved) maleOption = reserved;
    } else if (anyMale) {
      maleOption = anyMale;
    }
  }

  if (!femaleOption) {
    const { data: anyFemale } = await supabase
      .from('nicknames_pool')
      .select('*')
      .eq('is_available', true)
      .eq('gender', 'female')
      .or(`reserved_until.is.null,reserved_until.lt.${now}`)
      .limit(1)
      .single();

    // Immediately reserve if found
    if (anyFemale && sessionId) {
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

  // If pool is running low, add fallback options
  if (options.length < 2) {
    const maleNames = FALLBACK_NAMES.filter((_, i) => i < 15); // First 15 are male
    const femaleNames = FALLBACK_NAMES.filter((_, i) => i >= 15); // Rest are female

    if (options.length === 0) {
      options.push({
        nickname: maleNames[Math.floor(Math.random() * maleNames.length)],
        avatar_emoji: '👨',
        gender: 'male',
        fallback: true
      });
    }

    options.push({
      nickname: femaleNames[Math.floor(Math.random() * femaleNames.length)],
      avatar_emoji: '👩',
      gender: 'female',
      fallback: true
    });
  }

  return options;
}

/**
 * Mark a nickname as used in the pool
 */
async function markNicknameAsUsed(nicknameId, sessionId) {
  if (!nicknameId) return { data: null, error: null }; // Return proper structure

  try {
    // Fetch current nickname data to get times_used value and verify reservation
    const { data: nickname, error: fetchError } = await supabase
      .from('nicknames_pool')
      .select('times_used, reserved_by_session, reserved_until')
      .eq('id', nicknameId)
      .single();

    if (fetchError) {
      return { data: null, error: fetchError };
    }

    // CRITICAL: Verify reservation belongs to this session (or is expired/null)
    // This prevents another session from claiming a reserved nickname
    const reservedByOtherSession = nickname.reserved_by_session &&
                                   nickname.reserved_by_session !== sessionId &&
                                   nickname.reserved_until &&
                                   new Date(nickname.reserved_until) > new Date();

    if (reservedByOtherSession) {
      return {
        data: null,
        error: new Error('Nickname is reserved by another session')
      };
    }

    // Convert reservation to permanent assignment
    const { data, error } = await supabase
      .from('nicknames_pool')
      .update({
        is_available: false,
        currently_used_in: sessionId,
        times_used: (nickname?.times_used || 0) + 1,
        last_used: new Date().toISOString(),
        // Clear reservation fields
        reserved_until: null,
        reserved_by_session: null
      })
      .eq('id', nicknameId)
      .eq('is_available', true); // Extra safety: only mark if still available

    if (error) {
      return { data: null, error };
    }

    // If no rows were updated, nickname was already taken
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return {
        data: null,
        error: new Error('Nickname no longer available')
      };
    }

    return { data, error };
  } catch (err) {
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
      console.error('Error cleaning up expired reservations:', error);
      return;
    }

    if (released > 0) {
      console.log(`✅ Released ${released} expired nickname reservations`);
    }
  } catch (error) {
    console.error('Unexpected error in releaseExpiredReservations:', error);
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
      console.error('Error fetching expired sessions:', fetchError);
      return;
    }

    if (!expiredSessions || expiredSessions.length === 0) {
      console.log('No expired sessions found for nickname cleanup');
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
      console.error('Error releasing nicknames:', updateError);
      return;
    }

    console.log(`✅ Nickname cleanup complete: Released ${releasedNicknames?.length || 0} nicknames from ${sessionIds.length} expired sessions`);
  } catch (error) {
    console.error('Unexpected error in releaseExpiredNicknames:', error);
  }
}

/**
 * Start nickname cleanup jobs
 * - Reservation cleanup: Runs every 5 minutes (releases expired reservations)
 * - Session cleanup: Runs every hour (releases nicknames from expired sessions)
 */
export function startNicknameCleanup() {
  console.log('🔄 Starting nickname cleanup jobs...');

  // Run immediately on startup
  releaseExpiredReservations();
  releaseExpiredNicknames();

  // Run reservation cleanup every 5 minutes (300000 milliseconds)
  const reservationCleanupInterval = setInterval(releaseExpiredReservations, 5 * 60 * 1000);

  // Run session cleanup every hour (3600000 milliseconds)
  const sessionCleanupInterval = setInterval(releaseExpiredNicknames, 60 * 60 * 1000);

  // Return cleanup function for graceful shutdown
  return () => {
    console.log('Stopping nickname cleanup jobs...');
    clearInterval(reservationCleanupInterval);
    clearInterval(sessionCleanupInterval);
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

    // Cleanup expired pending sessions (opportunistic cleanup)
    await supabase
      .from('sessions')
      .delete()
      .eq('status', 'open')
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // Check for duplicate session (same nickname + within 5 minutes)
    if (selected_nickname) {
      // SECURITY: Validate nickname format to prevent SQL injection
      // NOTE: NO spaces allowed to maintain data integrity
      const NICKNAME_REGEX = /^[a-zA-Z0-9]{2,20}$/;
      if (!NICKNAME_REGEX.test(selected_nickname)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid nickname format. Use 2-20 alphanumeric characters only (no spaces).'
        });
      }

      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentSessions } = await supabase
        .from('sessions')
        .select('session_id, creator_nickname')
        .gte('created_at', fiveMinutesAgo)
        .eq('status', 'open')
        .eq('creator_nickname', selected_nickname);

      if (recentSessions && recentSessions.length > 0) {
        // Return existing session instead of creating duplicate
        return res.status(200).json({
          success: true,
          data: {
            session: recentSessions[0],
            message: 'Returning existing session from last 5 minutes'
          }
        });
      }
    }

    // Generate unique session ID with collision detection
    const session_id = await generateUniqueSessionId();

    // Generate secure host token
    const host_token = generateHostToken();

    // Get nickname - either from user selection or auto-assign
    let nickname, avatar_emoji;
    if (selected_nickname && selected_avatar_emoji) {
      // User selected a nickname from the options
      nickname = selected_nickname;
      avatar_emoji = selected_avatar_emoji;
    } else {
      // Fallback to old auto-assign flow (for backward compatibility)
      const nicknameData = await getAvailableNickname(session_id);
      nickname = nicknameData.nickname;
      avatar_emoji = nicknameData.avatar_emoji;
    }

    // Calculate expiry (2 hours after scheduled time)
    const expiresAt = new Date(scheduled_time);
    expiresAt.setHours(expiresAt.getHours() + 2);

    // Transaction-like behavior with rollback capability
    // Step 1: Create session with host_token and optional PIN
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        session_id,
        session_type: 'minibag',
        creator_nickname: nickname,
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
        session_pin: finalPin // Store PIN for participant authentication (null if no PIN)
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Session creation failed:', sessionError);
      throw sessionError;
    }

    // Step 2: Mark nickname as used if it was selected from pool
    if (selected_nickname_id) {
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
        real_name, // Store real name if provided
        is_creator: true,
        items_confirmed: true // Host confirms when clicking "Start List"
      })
      .select()
      .single();

    if (participantError) {
      // Rollback: Delete session and release nickname
      await supabase.from('sessions').delete().eq('id', session.id);
      if (selected_nickname_id) {
        await supabase
          .from('nicknames_pool')
          .update({ is_available: true })
          .eq('id', selected_nickname_id);
      }
      throw participantError;
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

      const { error: itemsError } = await supabase
        .from('participant_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;
    }

    // Re-fetch participant with items to return complete data
    const { data: participantWithItems, error: refetchError } = await supabase
      .from('participants')
      .select(`
        *,
        items:participant_items(
          *,
          catalog_item:catalog_items(*)
        )
      `)
      .eq('id', participant.id)
      .single();

    if (refetchError) {
      console.error('Error refetching participant with items:', refetchError);
      // Fall back to participant without items if refetch fails
    }

    // Set host token as httpOnly cookie (secure authentication)
    setHostTokenCookie(res, host_token, session.id);

    res.json({
      success: true,
      data: {
        session: session,
        participant: participantWithItems || participant,
        session_url: `/session/${session_id}`,
        // host_token removed - now stored in httpOnly cookie
        session_pin: finalPin, // Return PIN for host to share with participants (null if no PIN)
        auth_method: 'cookie' // Indicate that authentication is via cookie
      }
    });
  } catch (error) {
    console.error('Error creating session:', error);
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
    console.log('🗄️ [getSession] Database returned participants:', {
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
    });

    // Calculate if invite link has expired (20 minutes after expected_participants_set_at)
    const TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes in milliseconds
    const is_invite_expired = session.expected_participants_set_at
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
    console.error('Error fetching session:', error);
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

    // Initialize participant item counts
    allParticipants.forEach(p => {
      participantItemCounts[p.id] = 0;
    });

    // Process each participant item
    participantItems.forEach(item => {
      if (!item.catalog_item) {
        console.warn('⚠️ [getShoppingItems] Missing catalog_item for item:', item);
        return;
      }

      const itemId = item.catalog_item.item_id;
      const participantId = item.participant?.id;

      if (!participantId) {
        console.warn('⚠️ [getShoppingItems] Missing participant for item:', item);
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

    console.log('✅ [getShoppingItems] Aggregated shopping items:', {
      sessionId: session_id,
      sessionStatus: session.status,
      totalUniqueItems: Object.keys(aggregatedItems).length,
      totalParticipants: participantSummaries.length,
      itemsSample: Object.values(aggregatedItems).slice(0, 3)
    });

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
    console.error('Error fetching shopping items:', error);
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

    // Get all participant items with catalog data and participant info
    // Note: participant_items doesn't have session_id, need to filter through participant
    const { data: participantItems, error: itemsError } = await supabase
      .from('participant_items')
      .select(`
        *,
        catalog_item:catalog_items(id, item_id, name, unit, base_price, emoji),
        participant:participants!inner(id, nickname, avatar_emoji, real_name, items_confirmed, is_creator, session_id)
      `)
      .eq('participant.session_id', session.id);

    if (itemsError) throw itemsError;

    // Get all participants (including those without items)
    const { data: allParticipants, error: participantsError } = await supabase
      .from('participants')
      .select('id, nickname, avatar_emoji, real_name, items_confirmed, is_creator')
      .eq('session_id', session.id);

    if (participantsError) throw participantsError;

    // Get all payments for this session
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('session_id', session_id);

    if (paymentsError) throw paymentsError;

    // Build payment map by item_id (catalog item UUID)
    const paymentMap = {};
    const skippedItems = {};
    (payments || []).forEach(p => {
      if (p.skipped) {
        skippedItems[p.item_id] = p;
      } else {
        paymentMap[p.item_id] = p;
      }
    });

    // Aggregate items by item_id and calculate quantities
    const itemTotals = {};
    const participantItemsMap = {}; // participantId -> { itemId -> quantity }

    // Initialize participant items map
    allParticipants.forEach(p => {
      participantItemsMap[p.id] = {};
    });

    // Process each participant item
    participantItems.forEach(item => {
      if (!item.catalog_item) {
        console.warn('⚠️ [getBillItems] Missing catalog_item for item:', item);
        return;
      }

      const catalogItemId = item.catalog_item.id; // UUID
      const itemId = item.catalog_item.item_id; // String ID (v001, etc.)
      const participantId = item.participant?.id;

      if (!participantId) {
        console.warn('⚠️ [getBillItems] Missing participant for item:', item);
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

      // Only count non-skipped items in totals
      if (!skippedItems[catalogItemId]) {
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

    console.log('✅ [getBillItems] Calculated bill items:', {
      sessionId: session_id,
      sessionStatus: session.status,
      totalParticipants: participantBills.length,
      totalPaid: Math.round(totalPaid),
      paymentsCount: payments?.length || 0,
      participantDetails: participantBills.map(p => ({
        nickname: p.nickname,
        total_cost: p.total_cost,
        items_count: p.items_count,
        items: p.items
      })),
      paymentMap: Object.keys(paymentMap),
      itemTotals: Object.keys(itemTotals)
    });

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
    console.error('Error fetching bill items:', error);
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

    // SECURITY: Validate nickname format to prevent SQL injection
    // NOTE: NO spaces allowed to maintain data integrity
    if (selected_nickname) {
      const NICKNAME_REGEX = /^[a-zA-Z0-9]{2,20}$/;
      if (!NICKNAME_REGEX.test(selected_nickname)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid nickname format. Use 2-20 alphanumeric characters only (no spaces).'
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
    if (session.session_pin) {
      // Session requires PIN
      if (!session_pin) {
        return res.status(401).json({
          success: false,
          error: 'This session requires a PIN to join. Please enter the PIN shared by the host.',
          error_code: 'PIN_REQUIRED'
        });
      }

      // Validate PIN matches
      if (session_pin !== session.session_pin) {
        return res.status(403).json({
          success: false,
          error: 'Incorrect PIN. Please check the PIN and try again.',
          error_code: 'INCORRECT_PIN'
        });
      }
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

    // Check if invite link has expired (20 minutes after expected_participants_set_at)
    const TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes in milliseconds
    if (session.expected_participants_set_at) {
      const elapsed = new Date() - new Date(session.expected_participants_set_at);
      if (elapsed >= TIMEOUT_MS) {
        return res.status(410).json({
          success: false,
          error: 'This invite link has expired. The host set a 20-minute timeout for participants to join.',
          error_code: 'INVITE_EXPIRED'
        });
      }
    }

    // Check participant limit (max 20 participants)
    const { data: participants, error: countError } = await supabase
      .from('participants')
      .select('id')
      .eq('session_id', session.id);

    if (countError) throw countError;

    if (participants && participants.length >= 20) {
      return res.status(403).json({
        success: false,
        error: 'This session is full. Maximum 20 participants allowed.'
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

    // Get nickname - either from user selection or auto-assign
    let nickname, avatar_emoji;
    if (selected_nickname && selected_avatar_emoji) {
      // User selected a nickname from the options
      nickname = selected_nickname;
      avatar_emoji = selected_avatar_emoji;
    } else {
      // Fallback to old auto-assign flow (for backward compatibility)
      const nicknameData = await getAvailableNickname(session.id);
      nickname = nicknameData.nickname;
      avatar_emoji = nicknameData.avatar_emoji;
    }

    // Mark nickname as used if it was selected from pool
    // BUT NOT if they're declining (no point wasting nicknames)
    if (selected_nickname_id && !marked_not_coming) {
      await markNicknameAsUsed(selected_nickname_id, session.id);
    }

    // Create participant
    const { data: participant, error: participantError} = await supabase
      .from('participants')
      .insert({
        session_id: session.id,
        nickname,
        avatar_emoji,
        real_name, // Store real name if provided
        is_creator: false,
        marked_not_coming, // If participant is declining the invitation
        marked_not_coming_at: marked_not_coming ? new Date().toISOString() : null,
        claimed_invite_id: invite?.id || null // Link to invite if used
      })
      .select()
      .single();

    if (participantError) throw participantError;

    // Update invite status if invite was used
    if (invite) {
      const newStatus = marked_not_coming ? 'declined' : 'claimed';
      await supabase
        .from('invites')
        .update({
          status: newStatus,
          claimed_by: participant.id,
          claimed_at: new Date().toISOString()
        })
        .eq('id', invite.id);
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
    console.error('Error joining session:', error);
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
        console.error('Error performing session cleanup:', err);
      });
    }

    // Return response immediately without waiting for cleanup
    res.json({
      success: true,
      data: updatedSession
    });
  } catch (error) {
    console.error('Error updating session status:', error);
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

    // Validation - allow null, or number between 0 and 3
    if (expected_participants !== null &&
        (typeof expected_participants !== 'number' || expected_participants < 0 || expected_participants > 3)) {
      return res.status(400).json({
        success: false,
        error: 'expected_participants must be null or a number between 0 and 3'
      });
    }

    // Get current session to preserve existing timestamp if needed
    const { data: currentSession, error: fetchError } = await supabase
      .from('sessions')
      .select('expected_participants_set_at')
      .eq('session_id', session_id)
      .single();

    if (fetchError) throw fetchError;

    // Determine expected_participants_set_at timestamp
    // Timer starts when host sets to 1-3 AND start_timeout is true
    // If start_timeout is false, preserve existing timestamp
    let expected_participants_set_at;
    if (expected_participants >= 1 && expected_participants <= 3) {
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

    // Update session
    const { data: session, error: updateError } = await supabase
      .from('sessions')
      .update({
        expected_participants,
        expected_participants_set_at,
        checkpoint_complete: expected_participants === 0
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
    if (expected_participants >= 1 && expected_participants <= 3) {
      // Generate individual invite links
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
    console.error('Error updating expected participants:', error);
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

    // Get session first
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('session_id', session_id)
      .single();

    if (sessionError) throw sessionError;

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Get all invites with participant info
    const { data: invites, error: invitesError } = await supabase
      .from('invites')
      .select(`
        *,
        participant:participants!invites_claimed_by_fkey(
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
    console.error('Error fetching invites:', error);
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
    const { firstLetter, sessionId } = req.query;

    // Pass sessionId to enable nickname reservation
    // If no sessionId provided, nicknames are returned without reservation
    const options = await getTwoNicknameOptions(firstLetter, sessionId);

    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    console.error('Error fetching nickname options:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
