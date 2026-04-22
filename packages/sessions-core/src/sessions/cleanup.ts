/**
 * Session Cleanup Functions
 * Periodic jobs to expire sessions that have exceeded their time limit
 */

import { getDatabaseClient } from '../database/client.js';

/**
 * Expire sessions that have exceeded their expiresAt time
 * Runs periodically to transition open/active sessions to 'expired' status
 */
export async function expireOverdueSessions(): Promise<{
  expired: number;
  error: Error | null;
}> {
  const prisma = getDatabaseClient();

  try {
    const now = new Date();

    // Find and update all sessions that have passed their expiry time
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

    if (result.count > 0) {
      console.log(`✅ Expired ${result.count} sessions that exceeded their time limit`);
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
