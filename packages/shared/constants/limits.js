/**
 * Application-wide limits and constraints
 * Centralized constants to replace magic numbers throughout the codebase
 */

/**
 * Session limits and constraints
 */
export const SESSION_LIMITS = {
  MAX_PARTICIPANTS: 20,
  MAX_JOIN_WITHOUT_HOST: 3,
  MAX_ITEMS_PER_PARTICIPANT: 100,
  PARTICIPANT_TIMEOUT_MINUTES: 20,
  SESSION_EXPIRY_HOURS: 2,
  MAX_SESSION_NAME_LENGTH: 100,
  MIN_SESSION_NAME_LENGTH: 1
};

/**
 * Nickname pool limits
 */
export const NICKNAME_LIMITS = {
  RESERVATION_TTL_MINUTES: 5,
  MIN_POOL_SIZE: 50,
  FALLBACK_OPTIONS: 2,
  MIN_NICKNAME_LENGTH: 2,
  MAX_NICKNAME_LENGTH: 20
};

/**
 * Validation limits for user input
 */
export const VALIDATION_LIMITS = {
  MIN_PIN_LENGTH: 4,
  MAX_PIN_LENGTH: 6,
  INVITE_TOKEN_LENGTH: 8,
  MIN_NAME_LENGTH: 1,
  MAX_NAME_LENGTH: 100,
  MIN_NICKNAME_LENGTH: 2,
  MAX_NICKNAME_LENGTH: 20,
  MAX_AVATAR_EMOJI_LENGTH: 10
};

/**
 * Timeout values for network operations (in milliseconds)
 */
export const TIMEOUTS = {
  SOCKET_JOIN_MS: 5000,
  SOCKET_EMIT_RETRY_MS: 100,
  SOCKET_EMIT_DELAY_MS: 50,
  API_REQUEST_MS: 10000,
  NICKNAME_FETCH_MS: 3000,
  JOIN_REFRESH_RECOVERY_MS: 5 * 60 * 1000, // 5 minutes
  NICKNAME_REFETCH_DEBOUNCE_MS: 300
};

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
  MAX_SOCKET_EMIT_ATTEMPTS: 3,
  MAX_API_RETRY_ATTEMPTS: 3,
  RETRY_BACKOFF_MS: 100
};

/**
 * Database limits
 */
export const DATABASE_LIMITS = {
  MAX_QUERY_RESULTS: 1000,
  NICKNAME_CLEANUP_BATCH_SIZE: 100,
  SESSION_CLEANUP_BATCH_SIZE: 50
};

/**
 * Feature flags and thresholds
 */
export const THRESHOLDS = {
  LOW_NICKNAME_POOL_WARNING: 10,
  HIGH_CONCURRENT_USERS_WARNING: 50,
  SESSION_NEAR_FULL_THRESHOLD: 18 // Warn when 18/20 participants
};
