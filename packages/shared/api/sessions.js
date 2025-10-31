/**
 * Sessions API Routes
 * Endpoints for creating and managing shopping sessions
 */

import { supabase } from '../db/supabase.js';
import crypto from 'crypto';

/**
 * Generate a short, unique session ID (8 chars - increased for collision resistance)
 */
function generateSessionId() {
  return crypto.randomBytes(4).toString('hex'); // abcd1234 (8 chars = 4.2 billion combinations)
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
 * Get 2 available nicknames from pool (1 male, 1 female)
 * Used to present options to user during join/create
 */
async function getTwoNicknameOptions() {
  // Get 1 male nickname
  const { data: maleOption, error: maleError } = await supabase
    .from('nicknames_pool')
    .select('*')
    .eq('is_available', true)
    .eq('gender', 'male')
    .limit(1)
    .single();

  // Get 1 female nickname
  const { data: femaleOption, error: femaleError } = await supabase
    .from('nicknames_pool')
    .select('*')
    .eq('is_available', true)
    .eq('gender', 'female')
    .limit(1)
    .single();

  // Prepare options array
  const options = [];

  if (!maleError && maleOption) {
    options.push({
      id: maleOption.id,
      nickname: maleOption.nickname,
      avatar_emoji: maleOption.avatar_emoji,
      gender: 'male'
    });
  }

  if (!femaleError && femaleOption) {
    options.push({
      id: femaleOption.id,
      nickname: femaleOption.nickname,
      avatar_emoji: femaleOption.avatar_emoji,
      gender: 'female'
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
  if (!nicknameId) return; // Skip if fallback was used

  await supabase
    .from('nicknames_pool')
    .update({
      is_available: false,
      currently_used_in: sessionId,
      times_used: supabase.raw('times_used + 1'),
      last_used: new Date().toISOString()
    })
    .eq('id', nicknameId);
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
      selected_avatar_emoji
    } = req.body;

    // Validation
    if (!location_text || !scheduled_time) {
      return res.status(400).json({
        success: false,
        error: 'location_text and scheduled_time are required'
      });
    }

    // Cleanup expired pending sessions (opportunistic cleanup)
    await supabase
      .from('sessions')
      .delete()
      .eq('status', 'open')
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // Check for duplicate session (same nickname + within 5 minutes)
    if (selected_nickname) {
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
    // Step 1: Create session with host_token
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
        host_token // Store host token for creator authentication
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
        is_creator: true
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

    res.json({
      success: true,
      data: {
        session: session,
        participant: participantWithItems || participant,
        session_url: `/session/${session_id}`,
        host_token: host_token // Return host token for creator to store locally
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

    // Get participants with their items
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select(`
        *,
        items:participant_items(
          *,
          catalog_item:catalog_items(*)
        )
      `)
      .eq('session_id', session.id);

    if (participantsError) throw participantsError;

    // Calculate if invite link has expired (20 minutes after expected_participants_set_at)
    const TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes in milliseconds
    const is_invite_expired = session.expected_participants_set_at
      ? (new Date() - new Date(session.expected_participants_set_at)) >= TIMEOUT_MS
      : false;

    res.json({
      success: true,
      data: {
        session: {
          ...session,
          is_invite_expired
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
      selected_avatar_emoji
    } = req.body;

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
    if (selected_nickname_id) {
      await markNicknameAsUsed(selected_nickname_id, session.id);
    }

    // Create participant
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .insert({
        session_id: session.id,
        nickname,
        avatar_emoji,
        real_name, // Store real name if provided
        is_creator: false
      })
      .select()
      .single();

    if (participantError) throw participantError;

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
    const host_token = req.headers['x-host-token']; // Host must send token

    // Verify host token
    if (!host_token) {
      return res.status(401).json({
        success: false,
        error: 'Host token required for this action'
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

    // Update session status
    const { data: updatedSession, error: updateError } = await supabase
      .from('sessions')
      .update({ status })
      .eq('session_id', session_id)
      .select()
      .single();

    if (updateError) throw updateError;

    // If session is completed, release nicknames back to pool
    if (status === 'completed' || status === 'cancelled') {
      const { data: participants } = await supabase
        .from('participants')
        .select('id')
        .eq('session_id', session.id);

      if (participants && participants.length > 0) {
        // Find which nicknames were from the pool (have nickname_pool_id)
        const { data: nicknamesUsed } = await supabase
          .from('nicknames_pool')
          .select('id')
          .eq('currently_used_in', session.id);

        if (nicknamesUsed && nicknamesUsed.length > 0) {
          await supabase
            .from('nicknames_pool')
            .update({
              is_available: true,
              currently_used_in: null
            })
            .eq('currently_used_in', session.id);

          console.log(`Released ${nicknamesUsed.length} nicknames from session ${session_id}`);
        }
      }
    }

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
    const { expected_participants } = req.body;

    // Validation - allow null, or number between 0 and 3
    if (expected_participants !== null &&
        (typeof expected_participants !== 'number' || expected_participants < 0 || expected_participants > 3)) {
      return res.status(400).json({
        success: false,
        error: 'expected_participants must be null or a number between 0 and 3'
      });
    }

    // Determine expected_participants_set_at timestamp
    // Timer starts when host sets to 1-3, clears when set to null or 0
    const expected_participants_set_at = (expected_participants >= 1 && expected_participants <= 3)
      ? new Date().toISOString()
      : null;

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

    res.json({
      success: true,
      data: session
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
 * GET /api/sessions/nickname-options
 * Get 2 available nickname options (1 male, 1 female) for user selection
 */
export async function getNicknameOptions(req, res) {
  try {
    const options = await getTwoNicknameOptions();

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
