/**
 * Session CRUD Operations
 * Extracted from LocalLoops with critical fixes:
 * - CRITICAL-3: Transaction support for atomicity
 * - Generic implementation (no shopping-specific logic)
 * - Phase 2 Week 6: Added session modes (solo/group) with Zod validation
 */

import { getDatabaseClient } from '../database/client.js';
import { markNicknameAsUsed } from '../nicknames/claim.js';
import {
  generateSessionId,
  generateHostToken,
  generateAuthToken,
  generateSessionPin,
  generateConstantInviteToken,
  isValidPinFormat,
  isValidSessionId,
} from '../utils/generators.js';
import type {
  CreateSessionOptions,
  CreateSessionResponse,
  SessionWithParticipants,
  UpdateSessionOptions,
  ApiResponse,
  SessionStatus,
} from './types.js';
import { SessionError, SessionErrorCode } from './types.js';
import bcrypt from 'bcrypt';

const prisma = getDatabaseClient();

// BUGFIX #10: Bcrypt rounds for PIN hashing
const BCRYPT_ROUNDS = 10;

/**
 * Create a new session with host participant
 * Uses database transaction for atomicity (CRITICAL-3 fix)
 * Phase 2 Week 6: Added support for solo/group modes with constant invites
 *
 * @param options - Session creation options
 * @returns Session with creator participant and auth tokens
 */
export async function createSession(
  options: CreateSessionOptions
): Promise<ApiResponse<CreateSessionResponse>> {
  try {
    const {
      creatorNickname,
      creatorRealName,
      creatorAvatarEmoji,
      nicknameId,
      expectedParticipants = null,
      sessionPin = null,
      generatePin = false,
      expiresInHours = 24,
      // NEW: Phase 2 Week 6 fields
      mode = 'solo',
      maxParticipants,
    } = options as CreateSessionOptions & { mode?: string; maxParticipants?: number };

    // Validate inputs
    if (!creatorNickname || !creatorAvatarEmoji) {
      throw new SessionError(
        SessionErrorCode.INVALID_SESSION_ID,
        'creatorNickname and creatorAvatarEmoji are required'
      );
    }

    // Validate PIN if provided
    if (sessionPin && !isValidPinFormat(sessionPin)) {
      throw new Error('session_pin must be a 4-6 digit number');
    }

    // Generate PIN if requested
    let plainPin = sessionPin;
    if (generatePin && !sessionPin) {
      plainPin = generateSessionPin(4); // Generate 4-digit PIN
    }

    // BUGFIX #10: Hash PIN with bcrypt before storing
    let hashedPin: string | null = null;
    if (plainPin) {
      hashedPin = await bcrypt.hash(plainPin, BCRYPT_ROUNDS);
    }

    // Generate IDs and tokens
    const sessionId = generateSessionId();
    const hostToken = generateHostToken();
    const authToken = generateAuthToken(); // CRITICAL-1 fix: Token-based auth

    // NEW: Generate constant invite token for group mode
    const constantInviteToken = mode === 'group' ? generateConstantInviteToken() : null;

    // DEBUG: Verify token length
    if (constantInviteToken) {
      console.log('[DEBUG] Generated constantInviteToken:', {
        token: constantInviteToken,
        length: constantInviteToken.length,
        expected: 16
      });
    }

    // NEW: Determine maxParticipants (default 4 for free tier)
    const finalMaxParticipants = maxParticipants || 4;

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    // Use transaction for atomicity (CRITICAL-3 fix)
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Create session
      const session = await tx.session.create({
        data: {
          sessionId,
          creatorNickname,
          creatorRealName,
          status: 'open',
          hostToken,
          sessionPin: hashedPin, // BUGFIX #10: Store hashed PIN
          expectedParticipants,
          checkpointComplete: expectedParticipants === 0,
          expiresAt,
          // NEW: Phase 2 Week 6 fields
          mode,
          maxParticipants: finalMaxParticipants,
          constantInviteToken,
        },
      });

      // Step 2: Create constant invite if group mode
      console.log('[DEBUG] Session creation:', {
        sessionId: session.sessionId,
        mode,
        constantInviteToken,
        willCreateInvite: mode === 'group' && !!constantInviteToken
      });

      if (mode === 'group' && constantInviteToken) {
        const invite = await tx.invite.create({
          data: {
            sessionId: session.id,
            inviteToken: constantInviteToken,
            inviteType: 'constant',
            isConstantLink: true,
            status: 'active',
            // BUGFIX: Constant invite links never expire independently
            // They remain valid as long as session.status === 'open'
            // Setting expiresAt to session.expiresAt breaks sessions created with past scheduled_time
            expiresAt: null,
            slotAssignments: [],
            declinedBy: [],
          },
        });
        console.log('[DEBUG] Created constant invite:', {
          inviteId: invite.id,
          token: invite.inviteToken,
          sessionId: session.sessionId
        });
      }

      // Step 3: Mark nickname as used if from pool (not fallback)
      if (nicknameId && !nicknameId.startsWith('fallback-')) {
        const { error: nicknameError } = await markNicknameAsUsed(
          nicknameId,
          session.id
        );

        if (nicknameError) {
          throw new SessionError(
            SessionErrorCode.NICKNAME_CLAIM_FAILED,
            'Failed to allocate nickname'
          );
        }
      }

      // Step 4: Create participant (creator)
      const participant = await tx.participant.create({
        data: {
          sessionId: session.id,
          nickname: creatorNickname,
          avatarEmoji: creatorAvatarEmoji,
          realName: creatorRealName,
          isCreator: true,
          authToken, // CRITICAL-1 fix: Store auth token
          itemsConfirmed: true, // Host confirms when creating
        },
      });

      return { session, participant };
    });

    // Transaction succeeded - all-or-nothing guarantee
    return {
      data: {
        session: result.session,
        participant: result.participant,
        sessionUrl: `/session/${sessionId}`,
        sessionPin: plainPin, // BUGFIX #10: Return plain PIN (only time it's visible)
        hostToken,
        authToken,
        constantInviteToken, // NEW: Return token for products to sync to their databases
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
        error instanceof Error ? error.message : 'Failed to create session',
        true // Retryable
      ),
    };
  }
}

/**
 * Get session with participants
 *
 * @param sessionId - Short session ID (e.g., "abc123")
 * @returns Session with participants array
 */
export async function getSession(
  sessionId: string
): Promise<ApiResponse<SessionWithParticipants>> {
  try {
    // Validate session ID format
    if (!isValidSessionId(sessionId)) {
      throw new SessionError(
        SessionErrorCode.INVALID_SESSION_ID,
        'Invalid session ID format'
      );
    }

    // Fetch session with participants using Prisma include (fix N+1 query)
    const session = await prisma.session.findUnique({
      where: { sessionId },
      include: {
        participants: {
          where: { leftAt: null }, // Only active participants
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!session) {
      throw new SessionError(
        SessionErrorCode.SESSION_NOT_FOUND,
        'Session not found'
      );
    }

    // Check if session has expired
    const isExpired = session.expiresAt && new Date() > session.expiresAt;

    return {
      data: {
        ...session,
        // Add computed fields
        status: isExpired ? 'expired' : session.status,
      } as SessionWithParticipants,
      error: null,
    };
  } catch (error) {
    if (error instanceof SessionError) {
      return { data: null, error };
    }

    return {
      data: null,
      error: new SessionError(
        SessionErrorCode.SESSION_NOT_FOUND,
        error instanceof Error ? error.message : 'Failed to fetch session'
      ),
    };
  }
}

/**
 * BUGFIX #16: Release all nicknames used in a session back to the pool
 * Called when session is cancelled, completed, or expired
 *
 * @param sessionUuid - Session UUID (primary key, not short sessionId)
 */
async function releaseSessionNicknames(sessionUuid: string): Promise<void> {
  try {
    // Find all nicknames currently used in this session
    const result = await prisma.nicknamesPool.updateMany({
      where: { currentlyUsedIn: sessionUuid },
      data: {
        isAvailable: true,
        currentlyUsedIn: null,
        reservedUntil: null,
        reservedBySession: null,
      },
    });

    if (result.count > 0) {
      console.log(`[releaseSessionNicknames] Released ${result.count} nicknames for session ${sessionUuid}`);
    }
  } catch (error) {
    console.error(`[releaseSessionNicknames] Failed to release nicknames for session ${sessionUuid}:`, error);
    // Don't throw - this is a cleanup operation that shouldn't block the main flow
  }
}

/**
 * Update session status or metadata
 * Requires host token verification
 *
 * @param sessionId - Short session ID
 * @param hostToken - Host authentication token
 * @param updates - Fields to update
 * @returns Updated session
 */
export async function updateSession(
  sessionId: string,
  hostToken: string,
  updates: UpdateSessionOptions
): Promise<ApiResponse<SessionWithParticipants>> {
  try {
    // Validate inputs
    if (!isValidSessionId(sessionId)) {
      throw new SessionError(
        SessionErrorCode.INVALID_SESSION_ID,
        'Invalid session ID format'
      );
    }

    if (!hostToken) {
      throw new SessionError(
        SessionErrorCode.INVALID_HOST_TOKEN,
        'Host token required for this action'
      );
    }

    // Verify host token matches session
    const session = await prisma.session.findUnique({
      where: { sessionId },
    });

    if (!session || session.hostToken !== hostToken) {
      throw new SessionError(
        SessionErrorCode.INVALID_HOST_TOKEN,
        'Invalid host token or session not found'
      );
    }

    // Check if session has expired
    if (session.expiresAt && new Date() > session.expiresAt) {
      throw new SessionError(
        SessionErrorCode.SESSION_EXPIRED,
        'Cannot update expired session'
      );
    }

    // Build update data
    const updateData: any = {};

    if (updates.status) {
      updateData.status = updates.status;

      // Set completed_at timestamp
      if (updates.status === 'completed' && !session.completedAt) {
        updateData.completedAt = new Date();
      }

      // Set cancelled_at timestamp
      if (updates.status === 'cancelled' && !session.cancelledAt) {
        updateData.cancelledAt = new Date();
      }

      // BUGFIX #16: Release nicknames when session terminates
      // This frees up nicknames immediately instead of waiting 4 hours
      if (['cancelled', 'completed', 'expired'].includes(updates.status)) {
        await releaseSessionNicknames(session.id);
        console.log(`✅ Released nicknames for ${updates.status} session ${sessionId}`);
      }
    }

    if (updates.expectedParticipants !== undefined) {
      updateData.expectedParticipants = updates.expectedParticipants;
    }

    if (updates.checkpointComplete !== undefined) {
      updateData.checkpointComplete = updates.checkpointComplete;
    }

    // Update session
    const updatedSession = await prisma.session.update({
      where: { sessionId },
      data: updateData,
      include: {
        participants: {
          where: { leftAt: null },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    return { data: updatedSession as SessionWithParticipants, error: null };
  } catch (error) {
    if (error instanceof SessionError) {
      return { data: null, error };
    }

    return {
      data: null,
      error: new SessionError(
        SessionErrorCode.TRANSACTION_FAILED,
        error instanceof Error ? error.message : 'Failed to update session'
      ),
    };
  }
}

/**
 * Delete session (soft delete by marking as cancelled)
 * Requires host token verification
 *
 * @param sessionId - Short session ID
 * @param hostToken - Host authentication token
 * @returns Success status
 */
export async function deleteSession(
  sessionId: string,
  hostToken: string
): Promise<ApiResponse<{ success: boolean }>> {
  try {
    // Use updateSession with cancelled status
    const { data, error } = await updateSession(sessionId, hostToken, {
      status: 'cancelled',
    });

    if (error) {
      return { data: null, error };
    }

    return { data: { success: true }, error: null };
  } catch (error) {
    return {
      data: null,
      error: new SessionError(
        SessionErrorCode.TRANSACTION_FAILED,
        error instanceof Error ? error.message : 'Failed to delete session'
      ),
    };
  }
}

/**
 * Complete session (mark as completed)
 * Requires host token verification
 *
 * @param sessionId - Short session ID
 * @param hostToken - Host authentication token
 * @returns Updated session
 */
export async function completeSession(
  sessionId: string,
  hostToken: string
): Promise<ApiResponse<SessionWithParticipants>> {
  return updateSession(sessionId, hostToken, { status: 'completed' });
}

/**
 * Check if a session has expired
 *
 * @param session - Session object
 * @returns True if expired
 */
export function isSessionExpired(session: { expiresAt: Date | null }): boolean {
  if (!session.expiresAt) return false;
  return new Date() > new Date(session.expiresAt);
}
