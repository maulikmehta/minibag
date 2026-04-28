/**
 * Sessions SDK - Core Package
 * Real-time group coordination with anonymous participation
 *
 * @packageDocumentation
 */

// Export nickname pool functionality
export * from './nicknames/index.js';

// Export session management
export * from './sessions/index.js';

// Export participant management
export * from './participants/index.js';

// Export WebSocket support
export * from './websocket/index.js';

// Export invite system
export * from './invites/index.js';

// Export validation (Phase 2 Week 6)
export * from './validation/index.js';

// Export database utilities
export { getDatabaseClient, disconnectDatabase } from './database/client.js';

// Export utilities
export * from './utils/generators.js';
export * from './utils/pinRateLimiter.js';

// Export dashboard (optional monitoring)
export * from './dashboard/index.js';

// Version
export const VERSION = '0.3.0-alpha.0';
