/**
 * Centralized error message dictionary
 * All messages are elderly-friendly and consistent
 */

export const ERROR_MESSAGES = {
  // Session errors
  SESSION_NOT_FOUND: 'This shopping list no longer exists. Please start a new one.',
  SESSION_EXPIRED: 'This shopping list has expired. Please start a new one.',
  SESSION_FULL: 'This shopping list is full. Only 20 people can shop together at once.',
  SESSION_CANCELLED: 'This shopping list was cancelled by the host.',
  SESSION_COMPLETED: 'This shopping list has already been completed.',
  SESSION_CLOSED: 'This session is closed and cannot accept new participants.',

  // Join errors
  NICKNAME_TAKEN: 'This nickname was just claimed by someone else. Please try again.',
  NICKNAME_ALREADY_TAKEN: 'This nickname was just claimed by someone else. Please try again.',
  NICKNAME_UNAVAILABLE: 'This nickname is no longer available or reserved by another session.',
  INVALID_PIN: 'Incorrect PIN. Please check your invite message and try again.',
  INVITE_EXPIRED: 'This invite link has expired. Please ask for a new one.',
  INVITE_CLAIMED: 'This invite has already been used.',
  INVITE_CLAIM_FAILED: 'Failed to claim invite. Please try again.',

  // Validation errors
  INVALID_PARTICIPANT_DATA: 'Something went wrong with your information. Please refresh and try again.',
  MISSING_NICKNAME_DATA: 'Something went wrong with nickname selection. Please refresh and try again.',
  INVALID_INVITE_TOKEN: 'Invalid invite link format. Please check your link and try again.',
  INVALID_NAME: 'Please enter a valid name (1-100 characters).',
  INVALID_NICKNAME: 'Please select a valid nickname.',
  MISSING_PIN: 'Please enter the session PIN.',
  INVALID_PIN_LENGTH: 'PIN must be 4-6 digits.',
  INVALID_PIN_FORMAT: 'PIN must contain only numbers.',

  // Network errors
  NETWORK_ERROR: 'No internet connection. Please check your Wi-Fi or mobile data.',
  TIMEOUT: 'Taking too long to connect. Please check your internet and try again.',
  REQUEST_FAILED: 'Request failed. Please check your connection and try again.',

  // Generic
  GENERIC_ERROR: 'Something went wrong. Please try again or check your internet connection.',
  TRY_AGAIN: 'Please try again in a moment.',
  REFRESH_AND_TRY: 'Please refresh the page and try again.'
};

/**
 * Get error message by code
 * @param {string} code - Error code from ERROR_MESSAGES
 * @param {string} fallback - Optional fallback message
 * @returns {string} Error message
 */
export function getErrorMessage(code, fallback = ERROR_MESSAGES.GENERIC_ERROR) {
  return ERROR_MESSAGES[code] || fallback;
}

/**
 * Map backend error codes to friendly messages
 * @param {string} backendError - Error message from backend
 * @returns {string} User-friendly error message
 */
export function mapBackendError(backendError) {
  if (!backendError) return ERROR_MESSAGES.GENERIC_ERROR;

  const errorLower = backendError.toLowerCase();

  // Session errors
  if (errorLower.includes('session not found') || errorLower.includes('no longer exists')) {
    return ERROR_MESSAGES.SESSION_NOT_FOUND;
  }
  if (errorLower.includes('cancelled')) {
    return ERROR_MESSAGES.SESSION_CANCELLED;
  }
  if (errorLower.includes('completed')) {
    return ERROR_MESSAGES.SESSION_COMPLETED;
  }
  if (errorLower.includes('full') || errorLower.includes('limit')) {
    return ERROR_MESSAGES.SESSION_FULL;
  }
  if (errorLower.includes('closed')) {
    return ERROR_MESSAGES.SESSION_CLOSED;
  }

  // Join errors
  if (errorLower.includes('nickname') && (errorLower.includes('taken') || errorLower.includes('claimed'))) {
    return ERROR_MESSAGES.NICKNAME_TAKEN;
  }
  if (errorLower.includes('nickname') && errorLower.includes('unavailable')) {
    return ERROR_MESSAGES.NICKNAME_UNAVAILABLE;
  }
  if (errorLower.includes('pin') && errorLower.includes('incorrect')) {
    return ERROR_MESSAGES.INVALID_PIN;
  }
  if (errorLower.includes('invite') && errorLower.includes('expired')) {
    return ERROR_MESSAGES.INVITE_EXPIRED;
  }
  if (errorLower.includes('invite') && errorLower.includes('claimed')) {
    return ERROR_MESSAGES.INVITE_CLAIMED;
  }

  // Network errors
  if (errorLower.includes('network') || errorLower.includes('connection')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }
  if (errorLower.includes('timeout')) {
    return ERROR_MESSAGES.TIMEOUT;
  }

  // Default
  return backendError;
}
