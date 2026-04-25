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

    // Return SDK result
    // CRITICAL: host_token must be at top level for frontend localStorage persistence
    return res.status(201).json({
      success: true,
      data: {
        session: result.session,
        participant: result.participant,
        session_url: result.session_url,
        session_pin: result.session_pin, // Return PIN for sharing with participants
        host_token: result.session.host_token, // BUGFIX: Extract to top level for cross-domain auth
        // Include SDK-specific fields
        constant_invite_token: result.session.constantInviteToken,
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
      return res.status(400).json({
        success: false,
        error: 'invite_token is required for joining sessions',
        error_code: 'INVITE_TOKEN_REQUIRED'
      });
    }

    // Use ONLY atomic slot claiming (prevents race conditions)
    logger.info('[SDK] Using atomic slot claiming via constant invite link');
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
    logger.error({ err: error, sessionId: req.params.session_id }, '[SDK] Session join failed, falling back to legacy');

    // Fallback to legacy on error
    return legacyJoinSession(req, res);
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
