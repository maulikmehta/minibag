/**
 * Nickname Cleanup Functions
 * Periodic jobs to release expired reservations and nicknames from old sessions
 */

import { getDatabaseClient } from '../database/client.js';

/**
 * Release expired nickname reservations
 * Runs every 5 minutes to free up reserved nicknames that were never claimed
 * Reservations expire after 5 minutes
 */
export async function releaseExpiredReservations(): Promise<{
  released: number;
  error: Error | null;
}> {
  const prisma = getDatabaseClient();

  try {
    const now = new Date();

    // Find and update all expired reservations
    const result = await prisma.nicknamesPool.updateMany({
      where: {
        reservedUntil: { lt: now },
        isAvailable: true // Only clear if still available (not claimed)
      },
      data: {
        reservedUntil: null,
        reservedBySession: null
      }
    });

    if (result.count > 0) {
      console.log(`✅ Released ${result.count} expired nickname reservations`);
    }

    return { released: result.count, error: null };
  } catch (error) {
    console.error('Error cleaning up expired reservations:', error);
    return { released: 0, error: error as Error };
  }
}

/**
 * Release nicknames from expired sessions
 * Runs periodically to prevent nickname pool depletion
 * Sessions older than 4 hours are considered expired
 */
export async function releaseExpiredNicknames(): Promise<{
  released: number;
  error: Error | null;
}> {
  const prisma = getDatabaseClient();

  try {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

    // This would need to query sessions table which we haven't extracted yet
    // For now, just release nicknames that haven't been used in 4 hours
    const result = await prisma.nicknamesPool.updateMany({
      where: {
        isAvailable: false,
        lastUsed: { lt: fourHoursAgo }
      },
      data: {
        isAvailable: true,
        currentlyUsedIn: null,
        reservedUntil: null,
        reservedBySession: null
      }
    });

    if (result.count > 0) {
      console.log(`✅ Released ${result.count} nicknames from expired sessions`);
    }

    return { released: result.count, error: null };
  } catch (error) {
    console.error('Error releasing expired nicknames:', error);
    return { released: 0, error: error as Error };
  }
}

/**
 * Start nickname cleanup jobs
 * - Reservation cleanup: Runs every 5 minutes
 * - Session cleanup: Runs every hour
 *
 * @returns Cleanup function for graceful shutdown
 */
export function startNicknameCleanup(): () => void {
  console.log('🔄 Starting nickname cleanup jobs...');

  // Run immediately on startup
  releaseExpiredReservations();
  releaseExpiredNicknames();

  // Run reservation cleanup every 5 minutes
  const reservationCleanupInterval = setInterval(
    releaseExpiredReservations,
    5 * 60 * 1000
  );

  // Run session cleanup every hour
  const sessionCleanupInterval = setInterval(
    releaseExpiredNicknames,
    60 * 60 * 1000
  );

  // Return cleanup function for graceful shutdown
  return () => {
    console.log('🛑 Stopping nickname cleanup jobs...');
    clearInterval(reservationCleanupInterval);
    clearInterval(sessionCleanupInterval);
  };
}
