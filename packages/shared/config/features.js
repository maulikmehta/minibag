/**
 * Feature Flags for Minibag-2
 * Controls gradual rollout of Sessions SDK integration
 */

/**
 * Feature: Use Sessions SDK for session management
 * When enabled: Uses @sessions/core via SessionsAdapter
 * When disabled: Uses legacy Supabase-based session management
 *
 * Default: false (start with legacy for safety)
 * Set USE_SESSIONS_SDK=true in .env to enable
 */
export const USE_SESSIONS_SDK = process.env.USE_SESSIONS_SDK === 'true';

/**
 * Feature: Dual-write mode
 * When enabled: Writes to both old and new systems for comparison
 * Requires USE_SESSIONS_SDK=true
 *
 * Default: false
 * Set DUAL_WRITE_MODE=true in .env to enable
 */
export const DUAL_WRITE_MODE = process.env.DUAL_WRITE_MODE === 'true' && USE_SESSIONS_SDK;

/**
 * Feature: Enable group mode (constant invite links)
 * When disabled: Only solo mode works
 * When enabled: Both solo and group modes available
 *
 * Default: true (if using SDK)
 * Set ENABLE_GROUP_MODE=false to disable
 */
export const ENABLE_GROUP_MODE = USE_SESSIONS_SDK
  ? process.env.ENABLE_GROUP_MODE !== 'false'
  : false;

/**
 * Log feature flags on startup
 */
export function logFeatureFlags() {
  console.log('[Feature Flags]');
  console.log(`  USE_SESSIONS_SDK: ${USE_SESSIONS_SDK}`);
  console.log(`  DUAL_WRITE_MODE: ${DUAL_WRITE_MODE}`);
  console.log(`  ENABLE_GROUP_MODE: ${ENABLE_GROUP_MODE}`);
}
