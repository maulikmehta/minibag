/**
 * Nickname Claiming Functions
 * Mark nicknames as used when participants join sessions
 */

import { getDatabaseClient } from '../database/client.js';
import { MarkNicknameUsedResult } from './types.js';

/**
 * Mark nickname as used in the pool
 * CRITICAL: Verifies reservation belongs to this session to prevent race conditions
 *
 * @param nicknameId - UUID of the nickname to claim
 * @param sessionId - Session ID claiming the nickname
 * @returns Updated nickname data or error
 */
export async function markNicknameAsUsed(
  nicknameId: string,
  sessionId: string
): Promise<MarkNicknameUsedResult> {
  if (!nicknameId) {
    return { data: null, error: null }; // Return proper structure for consistency
  }

  const prisma = getDatabaseClient();

  try {
    // Step 1: Fetch current nickname data to verify reservation
    const nickname = await prisma.nicknamesPool.findUnique({
      where: { id: nicknameId },
      select: {
        id: true,
        nickname: true,
        avatarEmoji: true,
        timesUsed: true,
        reservedBySession: true,
        reservedUntil: true
      }
    });

    if (!nickname) {
      return { data: null, error: new Error('Nickname not found') };
    }

    // CRITICAL: Verify reservation belongs to this session (or is expired/null)
    // This prevents another session from claiming a reserved nickname
    const now = new Date();
    const reservedByOtherSession =
      nickname.reservedBySession &&
      nickname.reservedBySession !== sessionId &&
      nickname.reservedUntil &&
      new Date(nickname.reservedUntil) > now;

    if (reservedByOtherSession) {
      return {
        data: null,
        error: new Error('Nickname is reserved by another session')
      };
    }

    // Step 2: Mark as used (atomic update with proper conditions)
    const updated = await prisma.nicknamesPool.updateMany({
      where: {
        id: nicknameId,
        isAvailable: true, // Only claim if still available
        OR: [
          { reservedBySession: sessionId }, // Reserved by this session
          { reservedUntil: null }, // Not reserved
          { reservedUntil: { lt: now } } // Reservation expired
        ]
      },
      data: {
        isAvailable: false,
        currentlyUsedIn: sessionId,
        timesUsed: { increment: 1 },
        lastUsed: now,
        reservedUntil: null, // Clear reservation
        reservedBySession: null
      }
    });

    if (updated.count === 0) {
      // Nickname was already claimed by someone else
      return {
        data: null,
        error: new Error('Nickname already claimed')
      };
    }

    // Step 3: Fetch the updated nickname to return
    const claimed = await prisma.nicknamesPool.findUnique({
      where: { id: nicknameId }
    });

    return { data: claimed ? [claimed] : null, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Release a nickname back to the pool
 * Used when a participant leaves a session
 *
 * @param nicknameId - UUID of the nickname to release
 * @returns Success status
 */
export async function releaseNickname(
  nicknameId: string
): Promise<{ success: boolean; error: Error | null }> {
  if (!nicknameId) {
    return { success: false, error: new Error('nicknameId required') };
  }

  const prisma = getDatabaseClient();

  try {
    await prisma.nicknamesPool.update({
      where: { id: nicknameId },
      data: {
        isAvailable: true,
        currentlyUsedIn: null,
        reservedUntil: null,
        reservedBySession: null
      }
    });

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
