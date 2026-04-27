/**
 * Sessions SDK Integration Layer
 * Wraps Sessions SDK adapter with feature flags
 * Provides gradual migration path from legacy to SDK
 */

import { USE_SESSIONS_SDK, DUAL_WRITE_MODE } from '../config/features.js';
import { sessionsAdapter } from '../adapters/SessionsAdapter.js';
import { setHostTokenCookie } from '../utils/cookies.js';
import logger from '../utils/logger.js';

/**
 * Create session using Sessions SDK (with feature flag)
 * Falls back to legacy if SDK disabled or fails
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} legacyCreateSession - Legacy implementation
 */
export async function createSessionWithSDK(req, res, legacyCreateSession) {
  // If SDK not enabled, use legacy immediately
  if (!USE_SESSIONS_SDK) {
    logger.debug('Using legacy session creation (SDK disabled)');
    return legacyCreateSession(req, res);
  }

  try {
    logger.info('[SDK] Creating session via Sessions SDK');

    // Extract request data
    const {
      location_text,
      neighborhood,
      scheduled_time,
      title,
      description,
      items = [],
      expected_participants = null,
      real_name,
      selected_nickname_id,
      selected_nickname,
      selected_avatar_emoji,
      session_pin = null,
      generate_pin = false, // Auto-generate PIN if true
    } = req.body;

    // Validation
    if (!location_text || !scheduled_time) {
      return res.status(400).json({
        success: false,
        error: 'location_text and scheduled_time are required'
      });
    }

    if (!selected_nickname || !selected_avatar_emoji) {
      return res.status(400).json({
        success: false,
        error: 'selected_nickname and selected_avatar_emoji are required'
      });
    }

    // Create session via adapter
    const result = await sessionsAdapter.createShoppingSession({
      location_text,
      neighborhood,
      scheduled_time,
      title,
      description,
      items,
      expected_participants,
      real_name,
      selected_nickname_id,
      selected_nickname,
      selected_avatar_emoji,
      session_pin,
      generate_pin, // Pass through to SDK
    });

    // DUAL-WRITE MODE: Also write to legacy system for comparison
    if (DUAL_WRITE_MODE) {
      logger.info('[SDK] Dual-write mode: Also creating via legacy system');
      try {
        await legacyCreateSession(req, { ...res, json: () => {} }); // Silent legacy write
      } catch (err) {
        logger.warn({ err }, '[SDK] Dual-write legacy creation failed (non-blocking)');
      }
    }

    // Set host token cookie for authentication
    setHostTokenCookie(res, result.session.host_token);

    // DEBUG: Log what we're sending to frontend
    logger.info('[DEBUG] API response tokens:', {
      sessionId: result.session.session_id,
      constantFromSessionSnake: result.session.constant_invite_token,
      constantFromSessionCamel: result.session.constantInviteToken,
      willSendToFrontend: result.session.constant_invite_token || result.session.constantInviteToken
    });

    // Return SDK result
    // CRITICAL: host_token must be at top level for frontend localStorage persistence
    // BUGFIX: Use snake_case constant_invite_token consistently (frontend expects snake_case)
    return res.status(201).json({
      success: true,
      data: {
        session: result.session,
        participant: result.participant,
        session_url: result.session_url,
        session_pin: result.session_pin, // Return PIN for sharing with participants
        host_token: result.session.host_token, // BUGFIX: Extract to top level for cross-domain auth
        // Include SDK-specific fields
        constant_invite_token: result.session.constant_invite_token, // BUGFIX: Use snake_case (frontend expects this)
        mode: result.session.mode,
        sdk_version: 'v1',
        auth_method: 'cookie_and_token', // Support both cookie (same-domain) and header (cross-domain)
      },
      message: 'Session created successfully (via Sessions SDK)'
    });

  } catch (error) {
    logger.error({ err: error }, '[SDK] Session creation failed, falling back to legacy');

    // Fallback to legacy on error
    return legacyCreateSession(req, res);
  }
}

/**
 * Join session using Sessions SDK (with feature flag)
 * Falls back to legacy if SDK disabled or fails
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} legacyJoinSession - Legacy implementation
 */
export async function joinSessionWithSDK(req, res, legacyJoinSession) {
  // If SDK not enabled, use legacy immediately
  if (!USE_SESSIONS_SDK) {
    logger.debug('Using legacy session join (SDK disabled)');
    return legacyJoinSession(req, res);
  }

  try {
    logger.info('[SDK] Joining session via Sessions SDK (atomic flow only)');

    const { session_id } = req.params;
    const {
      real_name,
      selected_nickname_id,
      selected_nickname,
      selected_avatar_emoji,
      session_pin = null,
      invite_token, // Constant invite token - REQUIRED for SDK flow
    } = req.body;

    // Validation
    if (!selected_nickname || !selected_avatar_emoji) {
      return res.status(400).json({
        success: false,
        error: 'selected_nickname and selected_avatar_emoji are required'
      });
    }

    // Invite token is REQUIRED for SDK atomic flow
    if (!invite_token) {
      logger.warn({
        sessionId: session_id,
        hasNickname: !!selected_nickname,
        hasRealName: !!real_name
      }, '[SDK] Join attempted without invite_token - this should not happen with group mode');

      return res.status(400).json({
        success: false,
        error: 'Invite link is required to join group sessions. Please use the invite link shared by the host.',
        error_code: 'INVITE_TOKEN_REQUIRED',
        userMessage: 'Missing invite link. Please click the link from your invite message.'
      });
    }

    // Validate invite token format (16-character hex string for constant invites)
    if (!/^[a-f0-9]{16}$/i.test(invite_token)) {
      logger.warn({
        sessionId: session_id,
        tokenFormat: 'invalid',
        tokenLength: invite_token.length
      }, '[SDK] Invalid invite token format');

      return res.status(400).json({
        success: false,
        error: 'Invalid invite link format. Please check your link and try again.',
        error_code: 'INVALID_INVITE_FORMAT'
      });
    }

    // Use ONLY atomic slot claiming (prevents race conditions)
    logger.info({
      sessionId: session_id,
      nickname: selected_nickname,
      hasNicknameId: !!selected_nickname_id,
      hasRealName: !!real_name,
      inviteTokenPresent: true
    }, '[SDK] Using atomic slot claiming via constant invite link');

    const result = await sessionsAdapter.claimSlotViaConstantLink({
      sessionId: session_id,
      constantToken: invite_token,
      nicknameId: selected_nickname_id,
      nickname: selected_nickname,
      avatarEmoji: selected_avatar_emoji,
      realName: real_name,
      sessionPin: session_pin,
    });

    // Return SDK result
    return res.status(200).json({
      success: true,
      data: {
        participant: result.participant,
        slot_number: result.slotNumber,
        sdk_version: 'v1',
      },
      message: 'Joined session successfully (via Sessions SDK atomic flow)'
    });

  } catch (error) {
    const { session_id } = req.params;
    const { selected_nickname, invite_token } = req.body;

    logger.error({
      err: error,
      sessionId: session_id,
      nickname: selected_nickname,
      inviteToken: invite_token ? 'present' : 'missing'
    }, '[SDK] Session join failed');

    // BUGFIX: Don't fall back to legacy when using group mode + SDK
    // Falling back causes nickname double-prompt because legacy auto-assigns different nickname
    // Instead, return clear error to frontend so user can retry with same selection

    // Determine error type and return appropriate message
    const errorMessage = error.message || error.error?.message || 'Failed to join session';
    const errorCode = error.error_code || error.error?.error_code || 'JOIN_FAILED';

    // Check if it's a specific SDK error we should surface
    if (errorMessage.includes('full') || errorMessage.includes('limit') || errorCode === 'SESSION_FULL') {
      return res.status(403).json({
        success: false,
        error: 'This group is full. The host can shop with up to 3 friends at once.',
        error_code: 'SESSION_FULL'
      });
    }

    if (errorMessage.includes('expired') || errorCode === 'SESSION_EXPIRED') {
      return res.status(410).json({
        success: false,
        error: 'This shopping session has expired.',
        error_code: 'SESSION_EXPIRED'
      });
    }

    if (errorMessage.includes('invalid invite') || errorMessage.includes('not found') || errorCode === 'INVALID_INVITE') {
      return res.status(404).json({
        success: false,
        error: 'Invalid invite link. Please check your link and try again.',
        error_code: 'INVALID_INVITE'
      });
    }

    if (errorMessage.includes('pin') || errorMessage.includes('incorrect') || errorCode === 'INCORRECT_PIN') {
      return res.status(403).json({
        success: false,
        error: 'Incorrect PIN. Please try again.',
        error_code: 'INCORRECT_PIN'
      });
    }

    // Generic error - but DON'T fall back to legacy
    return res.status(500).json({
      success: false,
      error: 'Unable to join session. Please try again.',
      error_code: errorCode,
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    });
  }
}

/**
 * Get nickname options (pass-through to SDK)
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} legacyGetNicknameOptions - Legacy implementation
 */
export async function getNicknameOptionsWithSDK(req, res, legacyGetNicknameOptions) {
  if (!USE_SESSIONS_SDK) {
    return legacyGetNicknameOptions(req, res);
  }

  try {
    const { firstLetter, sessionUuid } = req.query;
    const options = await sessionsAdapter.getNicknameOptions(firstLetter, sessionUuid);

    return res.json({
      success: true,
      data: options,
      sdk_version: 'v1',
    });
  } catch (error) {
    logger.error({ err: error }, '[SDK] Get nickname options failed, falling back to legacy');
    return legacyGetNicknameOptions(req, res);
  }
}
