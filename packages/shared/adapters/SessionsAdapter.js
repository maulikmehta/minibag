/**
 * Sessions SDK Adapter for Minibag
 * Bridges Sessions SDK (coordination) with Minibag logic (shopping)
 *
 * Responsibilities:
 * - SDK handles: session lifecycle, participants, invites, WebSocket coordination
 * - Minibag handles: shopping items, bills, payments, catalog
 */

import {
  createSession as sdkCreateSession,
  leaveSession as sdkLeaveSession,
  updateSession as sdkUpdateSession,
  getTwoNicknameOptions,
  claimNextAvailableSlot,
  declineInvite,
} from '@sessions/core';
import { supabase } from '../db/supabase.js';
import logger from '../utils/logger.js';

/**
 * Minibag Sessions Adapter
 * Maps shopping session concepts to Sessions SDK
 */
export class MinibagSessionsAdapter {
  /**
   * Create a shopping session using Sessions SDK
   *
   * @param {Object} options - Session creation options
   * @param {string} options.location_text - Shopping location
   * @param {string} options.scheduled_time - When to shop
   * @param {Array} options.items - Shopping items [{item_id, quantity, unit}]
   * @param {number} options.expected_participants - Expected participant count
   * @param {string} options.real_name - Creator's real name
   * @param {string} options.selected_nickname_id - Nickname ID from pool
   * @param {string} options.selected_nickname - Nickname text
   * @param {string} options.selected_avatar_emoji - Avatar emoji
   * @param {string} options.session_pin - Optional PIN
   * @param {boolean} options.generate_pin - Auto-generate 4-digit PIN
   * @param {string} options.title - Session title
   * @param {string} options.description - Session description
   * @returns {Promise<Object>} Created session with shopping data
   */
  async createShoppingSession(options) {
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
      generate_pin = false,
    } = options;

    // Track SDK session for compensating transaction if Supabase fails
    let sdkSessionCreated = null;

    try {
      // Determine session mode based on expected participants
      // null = mode not chosen yet (default to group with reasonable limit)
      // 0 = explicitly solo
      // 1+ = group mode with that many expected
      const mode = expected_participants === 0 ? 'solo' : 'group';
      const maxParticipants = expected_participants === 0
        ? 1 // Solo mode: only host
        : expected_participants && expected_participants > 0
          ? Math.min(expected_participants + 1, 4) // Group with expected count: host + N invited, cap at 4 (free tier)
          : 4; // Group mode not yet chosen: default to 4 participants max (free tier)

      // Step 1: Create session via Sessions SDK
      const sdkResult = await sdkCreateSession({
        mode,
        maxParticipants,
        creatorNickname: selected_nickname,
        creatorAvatarEmoji: selected_avatar_emoji,
        creatorRealName: real_name,
        nicknameId: selected_nickname_id,
        scheduledTime: scheduled_time, // BUGFIX: Pass scheduled_time for correct expiry calculation
        expiresInHours: 2, // Standard 2-hour expiry AFTER scheduled_time
        sessionPin: session_pin,
        generatePin: generate_pin, // Auto-generate PIN if requested
      });

      if (sdkResult.error) {
        throw sdkResult.error;
      }

      const { session, participant, authToken, constantInviteToken, sessionPin } = sdkResult.data;
      sdkSessionCreated = { sessionId: session.sessionId, hostToken: session.hostToken };

      // Step 2: Store minibag-specific data in sessions table
      // We'll keep using Supabase for shopping metadata (location, schedule, etc.)
      // BUGFIX #11: Wrapped in try-catch for compensating transaction
      const { data: minibagSession, error: minibagError } = await supabase
        .from('sessions')
        .insert({
          id: session.id, // Use same UUID from SDK
          session_id: session.sessionId, // Short ID (abc123)
          location_text,
          neighborhood,
          scheduled_time,
          title,
          description,
          creator_nickname: selected_nickname,
          creator_avatar_emoji: selected_avatar_emoji,
          creator_real_name: real_name,
          host_token: session.hostToken,
          session_pin: sessionPin || session_pin, // Use SDK-generated PIN or original value
          expected_participants,
          status: session.status,
          expires_at: session.expiresAt,
          created_at: session.createdAt,
          // NEW: Store SDK mode for tracking
          mode: session.mode,
          max_participants: session.maxParticipants,
          constant_invite_token: constantInviteToken,
        })
        .select()
        .single();

      if (minibagError) {
        logger.error({ err: minibagError, sessionId: session.sessionId }, 'Failed to store minibag session data - initiating rollback');

        // BUGFIX #11: Compensating transaction - delete SDK session
        try {
          const { deleteSession } = await import('@sessions/core');
          await deleteSession(session.sessionId, session.hostToken);
          logger.info({ sessionId: session.sessionId }, 'Successfully rolled back SDK session');
        } catch (rollbackError) {
          logger.error({ err: rollbackError, sessionId: session.sessionId }, 'Failed to rollback SDK session - manual cleanup required');
        }

        throw new Error('Failed to create shopping session - transaction rolled back');
      }

      // Step 3: Create participant record in Supabase (for minibag frontend)
      // The SDK creates participant in Postgres, but minibag frontend queries Supabase
      // BUGFIX #11: Also protected with compensating transaction
      const { data: minibagParticipant, error: participantError } = await supabase
        .from('participants')
        .insert({
          id: participant.id, // Use same UUID from SDK
          session_id: session.id, // Session UUID
          nickname: participant.nickname,
          avatar_emoji: participant.avatarEmoji,
          real_name: participant.realName,
          is_creator: participant.isCreator,
          items_confirmed: true, // Host confirms when creating session
          joined_at: participant.joinedAt,
        })
        .select()
        .single();

      if (participantError) {
        logger.error({ err: participantError, participantId: participant.id }, 'Failed to create participant in Supabase - initiating rollback');

        // BUGFIX #11: Compensating transaction - delete both Supabase session and SDK session
        try {
          // Delete Supabase session first
          await supabase.from('sessions').delete().eq('id', session.id);

          // Then delete SDK session
          const { deleteSession } = await import('@sessions/core');
          await deleteSession(session.sessionId, session.hostToken);

          logger.info({ sessionId: session.sessionId }, 'Successfully rolled back both SDK and Supabase session');
        } catch (rollbackError) {
          logger.error({ err: rollbackError, sessionId: session.sessionId }, 'Failed to rollback sessions - manual cleanup required');
        }

        throw new Error('Failed to create participant record - transaction rolled back');
      }

      // Step 3.5: Sync constant invite to Supabase (for frontend queries)
      // SDK creates invite in PostgreSQL, we mirror to Supabase for frontend
      if (mode === 'group' && constantInviteToken) {
        const crypto = await import('crypto');
        const inviteId = crypto.randomUUID();

        const { error: inviteError } = await supabase
          .from('invites')
          .insert({
            id: inviteId, // Explicit UUID required
            session_id: session.id,
            invite_token: constantInviteToken,
            invite_type: 'constant',
            is_constant_link: true,
            status: 'active',
            expires_at: null, // Constant invites never expire independently
            slot_assignments: [],
            declined_by: []
          });

        if (inviteError) {
          logger.error({ err: inviteError, sessionId: session.sessionId, token: constantInviteToken }, 'Failed to sync constant invite to Supabase - initiating rollback');

          // BUGFIX: Compensating transaction - delete all created records
          try {
            await supabase.from('participants').delete().eq('id', participant.id);
            await supabase.from('sessions').delete().eq('id', session.id);

            const { deleteSession } = await import('@sessions/core');
            await deleteSession(session.sessionId, session.hostToken);

            logger.info({ sessionId: session.sessionId }, 'Successfully rolled back session, participant, and SDK session');
          } catch (rollbackError) {
            logger.error({ err: rollbackError, sessionId: session.sessionId }, 'Failed to rollback after invite sync failure - manual cleanup required');
          }

          throw new Error('Failed to sync invite to Supabase - transaction rolled back');
        }

        logger.info({ sessionId: session.sessionId, inviteToken: constantInviteToken }, 'Successfully synced constant invite to Supabase');
      }

      // Step 4: Store creator's shopping items (if any)
      let participantItems = [];
      if (items && items.length > 0) {
        await this.storeParticipantItems(participant.id, items);

        // Fetch the stored items with catalog data for response
        const { data: storedItems, error: itemsError } = await supabase
          .from('participant_items')
          .select(`
            *,
            catalog_item:catalog_items(*)
          `)
          .eq('participant_id', participant.id);

        if (!itemsError && storedItems) {
          participantItems = storedItems;
        }
      }

      // Step 5: Return combined response with items
      // DEBUG: Log what tokens we're returning
      logger.info('[DEBUG] SessionsAdapter returning:', {
        sessionId: session.sessionId,
        mode,
        constantInviteTokenFromSDK: constantInviteToken,
        constantTokenInSupabase: minibagSession.constant_invite_token,
        tokensMatch: constantInviteToken === minibagSession.constant_invite_token
      });

      return {
        session: {
          ...minibagSession,
          // BUGFIX: Override with correct token to ensure consistency
          constant_invite_token: constantInviteToken, // Ensure snake_case has correct value
          constantInviteToken: mode === 'group' ? constantInviteToken : null, // Also provide camelCase
        },
        participant: {
          id: participant.id,
          nickname: participant.nickname,
          avatar_emoji: participant.avatarEmoji,
          real_name: participant.realName,
          is_creator: participant.isCreator,
          items: participantItems, // Include items in response
        },
        authToken, // For WebSocket auth
        session_url: `/join/${session.sessionId}`, // BUGFIX: Changed from /session/ to /join/ to match App.jsx route
        session_pin: sessionPin || session_pin, // Return PIN for sharing
      };
    } catch (error) {
      logger.error({ err: error }, 'SessionsAdapter.createShoppingSession failed');

      // BUGFIX #11: Final safety net - ensure SDK session is cleaned up if any error occurred after creation
      if (sdkSessionCreated && error.message?.includes('rolled back')) {
        // Already handled in specific error blocks above
      } else if (sdkSessionCreated) {
        // Unexpected error after SDK session created - attempt cleanup
        try {
          const { deleteSession } = await import('@sessions/core');
          await deleteSession(sdkSessionCreated.sessionId, sdkSessionCreated.hostToken);
          logger.info({ sessionId: sdkSessionCreated.sessionId }, 'Emergency cleanup: rolled back SDK session after unexpected error');
        } catch (cleanupError) {
          logger.error({ err: cleanupError, sessionId: sdkSessionCreated.sessionId }, 'Emergency cleanup failed - manual intervention required');
        }
      }

      throw error;
    }
  }

  /**
   * Store shopping items for a participant
   * This is minibag-specific (not handled by Sessions SDK)
   *
   * @param {string} participantId - Participant UUID
   * @param {Array} items - Shopping items [{item_id, quantity, unit}]
   */
  async storeParticipantItems(participantId, items) {
    if (!items || items.length === 0) return;

    try {
      // First, get the UUID for each item_id (participant_items.item_id is a UUID FK to catalog_items.id)
      const itemIds = items.map(item => item.item_id);
      const { data: catalogItems, error: catalogError } = await supabase
        .from('catalog_items')
        .select('id, item_id')
        .in('item_id', itemIds);

      if (catalogError) {
        logger.error({ err: catalogError, participantId }, 'Failed to lookup catalog items');
        throw catalogError;
      }

      // Create a map of item_id (text) -> UUID
      const itemIdMap = new Map(
        catalogItems.map(item => [item.item_id, item.id])
      );

      // Validate all items exist in catalog
      const missingIds = itemIds.filter(id => !itemIdMap.has(id));
      if (missingIds.length > 0) {
        throw new Error(`Invalid item IDs: ${missingIds.join(', ')}`);
      }

      // Convert to database format with UUIDs
      const itemsToInsert = items.map(item => ({
        participant_id: participantId,
        item_id: itemIdMap.get(item.item_id), // Use UUID instead of text
        quantity: item.quantity,
        unit: item.unit,
      }));

      const { error } = await supabase
        .from('participant_items')
        .insert(itemsToInsert);

      if (error) {
        logger.error({ err: error, participantId }, 'Failed to store participant items');
        throw error;
      }
    } catch (error) {
      logger.error({ err: error, participantId }, 'SessionsAdapter.storeParticipantItems failed');
      throw error;
    }
  }

  /**
   * Get nickname options (pass-through to SDK)
   *
   * @param {string} firstLetter - First letter of user's name
   * @param {string} sessionUuid - Session UUID for reservation
   * @returns {Promise<Array>} Two nickname options
   */
  async getNicknameOptions(firstLetter = null, sessionUuid = null) {
    try {
      const options = await getTwoNicknameOptions(firstLetter, sessionUuid);
      return options;
    } catch (error) {
      logger.error({ err: error }, 'SessionsAdapter.getNicknameOptions failed');
      throw error;
    }
  }

  /**
   * Claim slot via constant invite (group mode)
   *
   * @param {Object} options - Claim options
   * @param {string} options.sessionId - Short session ID
   * @param {string} options.constantToken - Constant invite token
   * @param {string} options.nicknameId - Nickname ID
   * @param {string} options.nickname - Nickname
   * @param {string} options.avatarEmoji - Avatar
   * @param {string} options.realName - Real name (optional)
   * @param {string} options.sessionPin - Session PIN (if required)
   * @returns {Promise<Object>} Claimed slot data
   */
  async claimSlotViaConstantLink(options) {
    const {
      sessionId,
      constantToken,
      nicknameId,
      nickname,
      avatarEmoji,
      realName,
      sessionPin,
    } = options;

    try {
      const sdkResult = await claimNextAvailableSlot(
        sessionId,
        constantToken,
        nicknameId,
        nickname,
        avatarEmoji,
        realName,
        sessionPin // Pass PIN for validation
      );

      if (sdkResult.error) {
        throw sdkResult.error;
      }

      const { slotNumber, participant, authToken } = sdkResult.data;

      // CRITICAL: Sync participant to Supabase (frontend reads from Supabase)
      // SDK creates participant in Postgres, but frontend queries Supabase
      // BUGFIX #12: Use upsert for idempotency - handles duplicate participant scenarios gracefully
      const participantData = {
        id: participant.id,
        session_id: participant.sessionId,
        nickname: participant.nickname,
        avatar_emoji: participant.avatarEmoji,
        real_name: participant.realName,
        is_creator: false,
        items_confirmed: false,
        joined_at: participant.joinedAt,
        claimed_invite_id: participant.claimedInviteId,
      };

      let { data: minibagParticipant, error: participantError } = await supabase
        .from('participants')
        .upsert(participantData, {
          onConflict: 'id', // If participant exists with same ID, update it
          ignoreDuplicates: false // Return the row even if it existed
        })
        .select()
        .single();

      // BUGFIX #12: Retry once on failure (network blip, connection pool exhaustion)
      if (participantError && participantError.code !== '23505') {
        logger.warn({ err: participantError, participantId: participant.id }, 'First attempt failed, retrying participant sync...');

        // Wait 500ms before retry
        await new Promise(resolve => setTimeout(resolve, 500));

        const retryResult = await supabase
          .from('participants')
          .upsert(participantData, {
            onConflict: 'id',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (retryResult.error) {
          logger.error({ err: retryResult.error, participantId: participant.id }, 'Failed to sync participant after retry');

          // Don't throw - participant exists in SDK which is source of truth
          // Frontend will eventually sync via polling/refresh
          logger.info({ participantId: participant.id }, 'Participant exists in SDK, frontend will sync via polling');

          // Return with SDK data even if Supabase sync failed
          minibagParticipant = participantData;
        } else {
          minibagParticipant = retryResult.data;
          logger.info({ participantId: participant.id }, 'Successfully synced participant on retry');
        }
      } else if (participantError && participantError.code === '23505') {
        // Duplicate key - participant already exists, this is OK with upsert
        logger.info({ participantId: participant.id }, 'Participant already synced to Supabase');
      }

      return {
        slotNumber,
        participant: {
          id: participant.id,
          session_id: participant.sessionId,
          nickname: participant.nickname,
          avatar_emoji: participant.avatarEmoji,
          real_name: participant.realName,
        },
        authToken,
      };
    } catch (error) {
      logger.error({ err: error, sessionId }, 'SessionsAdapter.claimSlotViaConstantLink failed');
      throw error;
    }
  }

  /**
   * Decline invitation
   *
   * @param {string} sessionId - Short session ID
   * @param {string} constantToken - Constant invite token
   * @param {string} reason - Decline reason
   * @returns {Promise<Object>} Success status
   */
  async declineInvitation(sessionId, constantToken, reason = null) {
    try {
      const sdkResult = await declineInvite(sessionId, constantToken, reason);

      if (sdkResult.error) {
        throw sdkResult.error;
      }

      return sdkResult.data;
    } catch (error) {
      logger.error({ err: error, sessionId }, 'SessionsAdapter.declineInvitation failed');
      throw error;
    }
  }
}

// Export singleton instance
export const sessionsAdapter = new MinibagSessionsAdapter();
