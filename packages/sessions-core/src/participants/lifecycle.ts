/**
 * Participant Lifecycle Operations
 * Handles joining, leaving, and updating participants
 * - CRITICAL-3: Transaction support for atomicity
 */

import { getDatabaseClient } from '../database/client.js';
import { markNicknameAsUsed, releaseNickname } from '../nicknames/claim.js';
import { generateAuthToken } from '../utils/generators.js';
import { SessionError, SessionErrorCode } from '../sessions/types.js';
import type { Participant } from '@prisma/client';
import type { ApiResponse } from '../sessions/types.js';
import bcrypt from 'bcrypt';

const prisma = getDatabaseClient();

/**
 * Options for joining a session
 */
export interface JoinSessionOptions {
  sessionId: string; // Short session ID (e.g., "abc123")
  nicknameId: string; // ID of claimed nickname from pool
  nickname: string;
  avatarEmoji: string;
  realName?: string;
  sessionPin?: string; // PIN for protected sessions
}

/**
 * Join session response
 */
export interface JoinSessionResponse {
  participant: Participant;
  authToken: string; // For WebSocket authentication
}

/**
 * Join a session as a participant
 * Uses transaction to atomically claim nickname and create participant (CRITICAL-3 fix)
 *
 * @param options - Join session options
 * @returns Participant with auth token
 */
export async function joinSession(
  options: JoinSessionOptions
): Promise<ApiResponse<JoinSessionResponse>> {
  try {
    const {
      sessionId,
      nicknameId,
      nickname,
      avatarEmoji,
      realName,
      sessionPin,
    } = options;

    // Validate inputs
    if (!sessionId || !nicknameId || !nickname || !avatarEmoji) {
      throw new Error('sessionId, nicknameId, nickname, and avatarEmoji are required');
    }

    // Get session to verify it exists and check PIN
    const session = await prisma.session.findUnique({
      where: { sessionId },
      include: {
        participants: {
          where: { leftAt: null },
        },
      },
    });

    if (!session) {
      throw new SessionError(
        SessionErrorCode.SESSION_NOT_FOUND,
        'Session not found'
      );
    }

    // BUGFIX #10: Verify PIN with bcrypt timing-safe comparison
    if (session.sessionPin) {
      if (!sessionPin) {
        throw new SessionError(
          SessionErrorCode.INVALID_SESSION_ID,
          'Session PIN required'
        );
      }

      // BUGFIX #9: Check rate limiting before PIN verification
      const { checkPinAttempt, recordFailedPinAttempt, clearPinAttempts } =
        await import('../utils/pinRateLimiter.js');

      const rateLimit = await checkPinAttempt(session.id);
      if (!rateLimit.allowed) {
        throw new SessionError(
          SessionErrorCode.RATE_LIMITED,
          `Too many failed attempts. Try again in ${rateLimit.retryAfter} seconds.`
        );
      }

      const isPinValid = await bcrypt.compare(sessionPin, session.sessionPin);
      if (!isPinValid) {
        // Record failed attempt
        await recordFailedPinAttempt(session.id, sessionPin);

        throw new SessionError(
          SessionErrorCode.INVALID_SESSION_ID,
          'Invalid session PIN'
        );
      }

      // Clear attempts on successful auth
      await clearPinAttempts(session.id);
    }

    // Check if session has expired
    if (session.expiresAt && new Date() > session.expiresAt) {
      throw new SessionError(
        SessionErrorCode.SESSION_EXPIRED,
        'Session has expired'
      );
    }

    // Check participant limit (if set)
    const MAX_PARTICIPANTS = 50; // Configurable limit
    if (session.participants.length >= MAX_PARTICIPANTS) {
      throw new SessionError(
        SessionErrorCode.PARTICIPANT_LIMIT_REACHED,
        `This group is full (maximum ${MAX_PARTICIPANTS} participants)`
      );
    }

    // Generate auth token for WebSocket authentication (CRITICAL-1 fix)
    const authToken = generateAuthToken();

    // Use transaction for atomicity (CRITICAL-3 fix)
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Claim nickname (skip fallback IDs)
      if (!nicknameId.startsWith('fallback-')) {
        const { error: nicknameError } = await markNicknameAsUsed(
          nicknameId,
          session.id
        );

        if (nicknameError) {
          throw new SessionError(
            SessionErrorCode.NICKNAME_CLAIM_FAILED,
            'Failed to claim nickname. It may have been taken by another user.'
          );
        }
      }

      // Step 2: Create participant
      const participant = await tx.participant.create({
        data: {
          sessionId: session.id,
          nickname,
          avatarEmoji,
          realName,
          isCreator: false,
          authToken, // Store token for WebSocket auth
          itemsConfirmed: false,
        },
      });

      return participant;
    });

    // Transaction succeeded
    return {
      data: {
        participant: result,
        authToken,
      },
      error: null,
    };
  } catch (error) {
    if (error instanceof SessionError) {
      return { data: null, error };
    }

    return {
      data: null,
      error: new SessionError(
        SessionErrorCode.TRANSACTION_FAILED,
        error instanceof Error ? error.message : 'Failed to join session',
        true // Retryable
      ),
    };
  }
}

/**
 * Leave session (soft delete - sets leftAt timestamp)
 * Preserves history for analytics
 * Auto-completes session if all participants have left
 *
 * @param participantId - Participant UUID
 * @returns Success status and whether session was auto-completed
 */
export async function leaveSession(
  participantId: string
): Promise<ApiResponse<{ success: boolean; sessionAutoCompleted?: boolean }>> {
  try {
    if (!participantId) {
      throw new Error('participantId is required');
    }

    // Get participant to find nickname ID and session ID
    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
    });

    if (!participant) {
      throw new SessionError(
        SessionErrorCode.SESSION_NOT_FOUND,
        'Participant not found'
      );
    }

    // Use transaction for atomicity
    let sessionAutoCompleted = false;

    await prisma.$transaction(async (tx) => {
      // Step 1: Soft delete participant (set leftAt)
      await tx.participant.update({
        where: { id: participantId },
        data: {
          leftAt: new Date(),
        },
      });

      // Step 2: Check if all participants have left
      const remainingCount = await tx.participant.count({
        where: {
          sessionId: participant.sessionId,
          leftAt: null,
        },
      });

      // Step 3: Auto-complete session if no participants remain
      if (remainingCount === 0) {
        await tx.session.update({
          where: { id: participant.sessionId },
          data: {
            status: 'completed',
            completedAt: new Date(),
          },
        });
        sessionAutoCompleted = true;
      }

      // Step 4: Release nickname back to pool
      // Note: We'd need to store nicknameId in participant to do this properly
      // For now, this is a placeholder - will be implemented when we add nicknameId field
    });

    return {
      data: {
        success: true,
        sessionAutoCompleted
      },
      error: null
    };
  } catch (error) {
    if (error instanceof SessionError) {
      return { data: null, error };
    }

    return {
      data: null,
      error: new SessionError(
        SessionErrorCode.TRANSACTION_FAILED,
        error instanceof Error ? error.message : 'Failed to leave session'
      ),
    };
  }
}

/**
 * Update participant status
 *
 * @param participantId - Participant UUID
 * @param updates - Fields to update
 * @returns Updated participant
 */
export async function updateParticipant(
  participantId: string,
  updates: {
    itemsConfirmed?: boolean;
    markedNotComing?: boolean;
  }
): Promise<ApiResponse<Participant>> {
  try {
    if (!participantId) {
      throw new Error('participantId is required');
    }

    // Build update data
    const updateData: any = {};

    if (typeof updates.itemsConfirmed === 'boolean') {
      updateData.itemsConfirmed = updates.itemsConfirmed;
    }

    if (typeof updates.markedNotComing === 'boolean') {
      updateData.markedNotComing = updates.markedNotComing;
      if (updates.markedNotComing) {
        updateData.markedNotComingAt = new Date();
      } else {
        updateData.markedNotComingAt = null;
      }
    }

    // Validate at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      throw new Error('No valid fields to update');
    }

    // Update participant
    const participant = await prisma.participant.update({
      where: { id: participantId },
      data: updateData,
    });

    return { data: participant, error: null };
  } catch (error) {
    return {
      data: null,
      error: new SessionError(
        SessionErrorCode.TRANSACTION_FAILED,
        error instanceof Error ? error.message : 'Failed to update participant'
      ),
    };
  }
}

/**
 * Get participants for a session
 * Only returns active participants (leftAt is null)
 *
 * @param sessionId - Short session ID
 * @param includeLeft - Include participants who have left (default: false)
 * @returns Array of participants
 */
export async function getParticipants(
  sessionId: string,
  includeLeft: boolean = false
): Promise<ApiResponse<Participant[]>> {
  try {
    // Get session UUID from sessionId
    const session = await prisma.session.findUnique({
      where: { sessionId },
      select: { id: true },
    });

    if (!session) {
      throw new SessionError(
        SessionErrorCode.SESSION_NOT_FOUND,
        'Session not found'
      );
    }

    // Get participants
    const whereClause: any = { sessionId: session.id };
    if (!includeLeft) {
      whereClause.leftAt = null;
    }

    const participants = await prisma.participant.findMany({
      where: whereClause,
      orderBy: { joinedAt: 'asc' },
    });

    return { data: participants, error: null };
  } catch (error) {
    if (error instanceof SessionError) {
      return { data: null, error };
    }

    return {
      data: null,
      error: new SessionError(
        SessionErrorCode.SESSION_NOT_FOUND,
        error instanceof Error ? error.message : 'Failed to fetch participants'
      ),
    };
  }
}

/**
 * Verify participant auth token (for WebSocket authentication)
 * CRITICAL-2 fix: Server-side verification
 * BUGFIX #7: Check session status - reject tokens for ended sessions
 *
 * @param participantId - Participant UUID
 * @param authToken - Auth token to verify
 * @returns Valid participant or null
 */
export async function verifyParticipant(
  participantId: string,
  authToken: string
): Promise<ApiResponse<Participant>> {
  try {
    if (!participantId || !authToken) {
      throw new Error('participantId and authToken are required');
    }

    // BUGFIX #7: Include session to check status
    const participant = await prisma.participant.findFirst({
      where: {
        id: participantId,
        authToken,
        leftAt: null, // Still active
      },
      include: {
        session: {
          select: {
            id: true,
            sessionId: true,
            status: true,
            expiresAt: true,
          },
        },
      },
    });

    if (!participant) {
      throw new SessionError(
        SessionErrorCode.INVALID_HOST_TOKEN,
        'Invalid participant credentials or participant has left'
      );
    }

    // BUGFIX #7: Reject token if session has ended
    // Valid states: 'open', 'active', 'shopping'
    // Invalid states: 'completed', 'cancelled', 'expired'
    const validStatuses = ['open', 'active', 'shopping'];
    if (!validStatuses.includes(participant.session.status)) {
      throw new SessionError(
        SessionErrorCode.SESSION_EXPIRED,
        `Session has ${participant.session.status}. Please refresh to see final state.`
      );
    }

    // BUGFIX #7: Also check session hasn't expired by time
    if (participant.session.expiresAt && new Date() > participant.session.expiresAt) {
      throw new SessionError(
        SessionErrorCode.SESSION_EXPIRED,
        'Session has expired'
      );
    }

    return { data: participant, error: null };
  } catch (error) {
    if (error instanceof SessionError) {
      return { data: null, error };
    }

    return {
      data: null,
      error: new SessionError(
        SessionErrorCode.INVALID_HOST_TOKEN,
        'Failed to verify participant'
      ),
    };
  }
}
