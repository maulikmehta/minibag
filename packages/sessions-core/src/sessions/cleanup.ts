/**
 * Session Cleanup Functions
 * Periodic jobs to expire sessions that have exceeded their time limit
 */

import { getDatabaseClient } from '../database/client.js';

/**
 * Expire sessions that have exceeded their expiresAt time
 * Runs periodically to transition open/active sessions to 'expired' status
 * BUGFIX #16: Also releases nicknames for expired sessions
 */
export async function expireOverdueSessions(): Promise<{
  expired: number;
  error: Error | null;
}> {
  const prisma = getDatabaseClient();

  try {
    const now = new Date();

    // BUGFIX #16: First find sessions to expire (to get their IDs for nickname release)
    const sessionsToExpire = await prisma.session.findMany({
      where: {
        expiresAt: { lt: now },
        status: { in: ['open', 'active'] }
      },
      select: { id: true, sessionId: true }
    });

    if (sessionsToExpire.length === 0) {
      return { expired: 0, error: null };
    }

    // Update sessions to expired status
    const result = await prisma.session.updateMany({
      where: {
        expiresAt: { lt: now },
        status: { in: ['open', 'active'] }
      },
      data: {
        status: 'expired',
        completedAt: now
      }
    });

    // BUGFIX #16: Release nicknames for all expired sessions
    const sessionIds = sessionsToExpire.map(s => s.id);
    const nicknameResult = await prisma.nicknamesPool.updateMany({
      where: { currentlyUsedIn: { in: sessionIds } },
      data: {
        isAvailable: true,
        currentlyUsedIn: null,
        reservedUntil: null,
        reservedBySession: null,
      }
    });

    if (result.count > 0) {
      console.log(`✅ Expired ${result.count} sessions that exceeded their time limit (released ${nicknameResult.count} nicknames)`);
    }

    return { expired: result.count, error: null };
  } catch (error) {
    console.error('Error expiring overdue sessions:', error);
    return { expired: 0, error: error as Error };
  }
}

/**
 * Start session cleanup jobs
 * - Session expiry: Runs every 5 minutes
 *
 * @returns Cleanup function for graceful shutdown
 */
export function startSessionCleanup(): () => void {
  console.log('🔄 Starting session cleanup jobs...');

  // Run immediately on startup
  expireOverdueSessions();

  // Run session expiry cleanup every 5 minutes
  const expiryCleanupInterval = setInterval(
    expireOverdueSessions,
    5 * 60 * 1000
  );

  // Return cleanup function for graceful shutdown
  return () => {
    console.log('🛑 Stopping session cleanup jobs...');
    clearInterval(expiryCleanupInterval);
  };
}
