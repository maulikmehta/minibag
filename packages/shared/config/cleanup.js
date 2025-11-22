/**
 * Cleanup Configuration
 * Configurable intervals for cleanup jobs
 * Can be overridden via environment variables
 */

export const CLEANUP_INTERVALS = {
  // Nickname reservation cleanup: 5 minutes (releases expired reservations)
  RESERVATION_CLEANUP_MS: parseInt(process.env.RESERVATION_CLEANUP_MS) || 5 * 60 * 1000,

  // Session cleanup: 1 hour (releases nicknames from expired sessions)
  SESSION_CLEANUP_MS: parseInt(process.env.SESSION_CLEANUP_MS) || 60 * 60 * 1000
};
