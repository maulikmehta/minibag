/**
 * Invite System
 * Generate, claim, and manage session invitations
 * Extracted from LocalLoops
 */

import * as crypto from 'crypto';
import { getDatabaseClient } from '../database/client.js';
import { SessionError, SessionErrorCode } from '../sessions/types.js';
import type { Invite } from '@prisma/client';
import type { ApiResponse } from '../sessions/types.js';

const prisma = getDatabaseClient();

/**
 * Generate a unique invite token (8 chars for readability)
 * @returns 8-character hex string
 */
function generateInviteToken(): string {
  return crypto.randomBytes(4).toString('hex'); // abc12345 (8 chars)
}

/**
 * Invite with participant info
 */
export interface InviteWithParticipant extends Invite {
  participant?: {
    id: string;
    nickname: string;
    realName: string | null;
    markedNotComing: boolean;
    itemsConfirmed: boolean;
  } | null;
}

/**
 * Generate invites for a session
 * Deletes existing invites and creates new ones
 *
 * @param sessionId - Short session ID (e.g., "abc123def456")
 * @param count - Number of invites to create (1-3)
 * @returns Array of generated invites
 */
export async function generateInvites(
  sessionId: string,
  count: number
): Promise<ApiResponse<Invite[]>> {
  try {
    // Validate count
    if (count < 1 || count > 3) {
      throw new Error('Invite count must be between 1 and 3');
    }

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

    // Use transaction to atomically delete old and create new invites
    const invites = await prisma.$transaction(async (tx) => {
      // Delete existing invites for this session
      await tx.invite.deleteMany({
        where: { sessionId: session.id },
      });

      // Generate new invites
      const invitesToCreate = [];
      for (let i = 1; i <= count; i++) {
        invitesToCreate.push({
          sessionId: session.id,
          inviteToken: generateInviteToken(),
          inviteNumber: i,
          status: 'pending',
        });
      }

      // Insert all invites
      const created = await tx.invite.createMany({
        data: invitesToCreate,
      });

      // Fetch the created invites
      const invites = await tx.invite.findMany({
        where: { sessionId: session.id },
        orderBy: { inviteNumber: 'asc' },
      });

      return invites;
    });

    return { data: invites, error: null };
  } catch (error) {
    if (error instanceof SessionError) {
      return { data: null, error };
    }

    return {
      data: null,
      error: new SessionError(
        SessionErrorCode.TRANSACTION_FAILED,
        error instanceof Error ? error.message : 'Failed to generate invites'
      ),
    };
  }
}

/**
 * Get invites for a session
 *
 * @param sessionId - Short session ID
 * @returns Array of invites with participant info
 */
export async function getInvites(
  sessionId: string
): Promise<ApiResponse<InviteWithParticipant[]>> {
  try {
    // Get session UUID
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

    // Get all invites with participant info
    const invites = await prisma.invite.findMany({
      where: { sessionId: session.id },
      include: {
        claimedBy: {
          select: {
            id: true,
            nickname: true,
            realName: true,
            markedNotComing: true,
            itemsConfirmed: true,
          },
          take: 1, // Only get the first participant (should only be one)
        },
      },
      orderBy: { inviteNumber: 'asc' },
    });

    // Transform to match expected format
    const formattedInvites = invites.map((invite) => ({
      ...invite,
      participant: invite.claimedBy[0] || null,
      claimedBy: undefined, // Remove array format
    })) as any;

    return { data: formattedInvites, error: null };
  } catch (error) {
    if (error instanceof SessionError) {
      return { data: null, error };
    }

    return {
      data: null,
      error: new SessionError(
        SessionErrorCode.SESSION_NOT_FOUND,
        error instanceof Error ? error.message : 'Failed to fetch invites'
      ),
    };
  }
}

/**
 * Get invite by token
 *
 * @param sessionId - Short session ID
 * @param inviteToken - Invite token
 * @returns Invite or null
 */
export async function getInviteByToken(
  sessionId: string,
  inviteToken: string
): Promise<ApiResponse<Invite>> {
  try {
    // Get session UUID
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

    // Find invite by token
    const invite = await prisma.invite.findUnique({
      where: {
        sessionId_inviteToken: {
          sessionId: session.id,
          inviteToken,
        },
      },
    });

    if (!invite) {
      throw new Error('Invite not found');
    }

    return { data: invite, error: null };
  } catch (error) {
    return {
      data: null,
      error: new SessionError(
        SessionErrorCode.SESSION_NOT_FOUND,
        error instanceof Error ? error.message : 'Failed to fetch invite'
      ),
    };
  }
}

/**
 * Claim an invite (mark as used by a participant)
 * This is called when a participant joins via invite link
 *
 * @param inviteId - Invite UUID
 * @param participantId - Participant UUID who is claiming
 * @returns Updated invite
 */
export async function claimInvite(
  inviteId: string,
  participantId: string
): Promise<ApiResponse<Invite>> {
  try {
    // Update invite status and claimed info
    const invite = await prisma.invite.update({
      where: { id: inviteId },
      data: {
        status: 'claimed',
        claimedAt: new Date(),
      },
    });

    // Also update participant to link to invite
    await prisma.participant.update({
      where: { id: participantId },
      data: {
        claimedInviteId: inviteId,
      },
    });

    return { data: invite, error: null };
  } catch (error) {
    return {
      data: null,
      error: new SessionError(
        SessionErrorCode.TRANSACTION_FAILED,
        error instanceof Error ? error.message : 'Failed to claim invite'
      ),
    };
  }
}

/**
 * Verify an invite token (check if valid and not claimed)
 *
 * @param sessionId - Short session ID
 * @param inviteToken - Invite token to verify
 * @returns True if valid and available
 */
export async function verifyInviteToken(
  sessionId: string,
  inviteToken: string
): Promise<ApiResponse<{ valid: boolean; invite: Invite | null }>> {
  try {
    const { data: invite, error } = await getInviteByToken(
      sessionId,
      inviteToken
    );

    if (error || !invite) {
      return { data: { valid: false, invite: null }, error: null };
    }

    // Check if invite is still pending (not claimed or expired)
    const valid = invite.status === 'pending';

    // Check expiry if set
    if (valid && invite.expiresAt && new Date() > invite.expiresAt) {
      // Mark as expired
      await prisma.invite.update({
        where: { id: invite.id },
        data: { status: 'expired' },
      });

      return { data: { valid: false, invite }, error: null };
    }

    return { data: { valid, invite }, error: null };
  } catch (error) {
    return {
      data: null,
      error: new SessionError(
        SessionErrorCode.SESSION_NOT_FOUND,
        error instanceof Error ? error.message : 'Failed to verify invite'
      ),
    };
  }
}

/**
 * Expire old invites for a session
 * Marks invites as expired if they've exceeded the expiry time
 *
 * @param sessionId - Short session ID
 * @returns Number of invites expired
 */
export async function expireOldInvites(
  sessionId: string
): Promise<ApiResponse<{ expired: number }>> {
  try {
    // Get session UUID
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

    // Update expired invites
    const result = await prisma.invite.updateMany({
      where: {
        sessionId: session.id,
        status: 'pending',
        expiresAt: {
          lte: new Date(),
        },
      },
      data: {
        status: 'expired',
      },
    });

    return { data: { expired: result.count }, error: null };
  } catch (error) {
    if (error instanceof SessionError) {
      return { data: null, error };
    }

    return {
      data: null,
      error: new SessionError(
        SessionErrorCode.TRANSACTION_FAILED,
        error instanceof Error ? error.message : 'Failed to expire invites'
      ),
    };
  }
}

/**
 * Claim next available slot from a constant invite link (Phase 2 Week 6)
 * For group mode sessions with dynamic participant tracking
 *
 * @param sessionId - Short session ID
 * @param constantToken - Constant invite token (16 chars)
 * @param nicknameId - ID of nickname from pool
 * @param nickname - Selected nickname
 * @param avatarEmoji - Selected avatar emoji
 * @param realName - Optional real name
 * @param sessionPin - Optional PIN for protected sessions
 * @returns Slot number, participant, and auth token
 */
export async function claimNextAvailableSlot(
  sessionId: string,
  constantToken: string,
  nicknameId: string,
  nickname: string,
  avatarEmoji: string,
  realName?: string,
  sessionPin?: string
): Promise<ApiResponse<{ slotNumber: number; participant: any; authToken: string }>> {
  try {
    // Import dependencies needed for this function
    const { markNicknameAsUsed } = await import('../nicknames/claim.js');
    const { generateAuthToken } = await import('../utils/generators.js');

    // Use transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Verify constant invite link exists and is valid
      const invite = await tx.invite.findFirst({
        where: {
          inviteToken: constantToken,
          session: {
            sessionId,
          },
        },
        include: {
          session: true,
        },
      });

      if (!invite) {
        throw new SessionError(
          SessionErrorCode.SESSION_NOT_FOUND,
          'Invalid or expired invite link'
        );
      }

      if (invite.status !== 'active') {
        throw new SessionError(
          SessionErrorCode.SESSION_EXPIRED,
          'Invite link has expired'
        );
      }

      if (!invite.isConstantLink) {
        throw new Error('This invite link is not a group invite');
      }

      // Step 2: Verify PIN if session requires it
      if (invite.session.sessionPin && invite.session.sessionPin !== sessionPin) {
        throw new SessionError(
          SessionErrorCode.INVALID_SESSION_ID,
          'Invalid session PIN'
        );
      }

      // Step 3: Check current participant count vs maxParticipants
      const currentCount = await tx.participant.count({
        where: {
          sessionId: invite.session.id,
          leftAt: null, // Only count active participants
        },
      });

      const maxParticipants = invite.session.maxParticipants || 4;
      if (currentCount >= maxParticipants) {
        throw new SessionError(
          SessionErrorCode.PARTICIPANT_LIMIT_REACHED,
          `This group is full (maximum ${maxParticipants} participants)`
        );
      }

      // Step 4: Dynamic slot assignment (next available number)
      const slotNumber = currentCount + 1;

      // Step 5: Claim nickname from pool (if not fallback)
      if (nicknameId && !nicknameId.startsWith('fallback-')) {
        const nicknameResult = await markNicknameAsUsed(nicknameId, invite.session.id);

        if (nicknameResult.error) {
          throw new SessionError(
            SessionErrorCode.NICKNAME_CLAIM_FAILED,
            'Failed to claim nickname'
          );
        }
      }

      // Step 6: Generate auth token
      const authToken = generateAuthToken();

      // Step 7: Create participant
      const participant = await tx.participant.create({
        data: {
          sessionId: invite.session.id,
          nickname,
          avatarEmoji,
          realName,
          isCreator: false,
          authToken,
          claimedInviteId: invite.id,
          joinedAt: new Date(),
        },
      });

      // Step 8: Update slot assignments in invite
      const slotAssignments = (invite.slotAssignments as any[]) || [];
      slotAssignments.push({
        slotNumber,
        participantId: participant.id,
        nickname: participant.nickname,
        claimedAt: new Date().toISOString(),
      });

      await tx.invite.update({
        where: { id: invite.id },
        data: { slotAssignments },
      });

      return { slotNumber, participant, authToken };
    });

    return { data: result, error: null };
  } catch (error) {
    if (error instanceof SessionError) {
      return { data: null, error };
    }

    return {
      data: null,
      error: new SessionError(
        SessionErrorCode.TRANSACTION_FAILED,
        error instanceof Error ? error.message : 'Failed to claim slot'
      ),
    };
  }
}

/**
 * Decline a constant invite link (Phase 2 Week 6)
 * Tracks who declined for host visibility
 *
 * @param sessionId - Short session ID
 * @param constantToken - Constant invite token (16 chars)
 * @param reason - Optional reason for declining
 * @returns Success status
 */
export async function declineInvite(
  sessionId: string,
  constantToken: string,
  reason?: string
): Promise<ApiResponse<{ success: boolean }>> {
  try {
    // Find the invite
    const invite = await prisma.invite.findFirst({
      where: {
        inviteToken: constantToken,
        session: {
          sessionId,
        },
      },
    });

    if (!invite) {
      throw new SessionError(
        SessionErrorCode.SESSION_NOT_FOUND,
        'Invite not found'
      );
    }

    if (!invite.isConstantLink) {
      throw new Error('Can only decline constant invite links');
    }

    // Track decline in JSON field
    const declinedBy = (invite.declinedBy as any[]) || [];
    declinedBy.push({
      declinedAt: new Date().toISOString(),
      reason: reason || 'Not specified',
    });

    // Update invite
    await prisma.invite.update({
      where: { id: invite.id },
      data: { declinedBy },
    });

    return { data: { success: true }, error: null };
  } catch (error) {
    if (error instanceof SessionError) {
      return { data: null, error };
    }

    return {
      data: null,
      error: new SessionError(
        SessionErrorCode.TRANSACTION_FAILED,
        error instanceof Error ? error.message : 'Failed to decline invite'
      ),
    };
  }
}
