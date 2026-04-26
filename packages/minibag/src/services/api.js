/**
 * API Service Layer
 * Handles all communication with the backend API
 */

import logger from '../../../shared/utils/frontendLogger.js';

// Use empty string to leverage Vite proxy (relative URLs)
// In production, set VITE_API_URL to the actual API URL
const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

// Export for direct fetch calls (when not using apiFetch wrapper)
export { API_BASE_URL };

/**
 * User-friendly error messages for common API errors
 */
const ERROR_MESSAGES = {
  NETWORK_ERROR: 'No internet connection. Please check your network.',
  SERVER_ERROR: 'Something went wrong on our end. Please try again.',
  NOT_FOUND: 'Resource not found. The link may be expired.',
  FORBIDDEN: 'You don\'t have permission to do that.',
  TIMEOUT: 'Request timed out. Please check your connection.',
  INVALID_DATA: 'Invalid data provided. Please check your input.',
  UNKNOWN: 'An unexpected error occurred. Please try again.'
};

/**
 * Custom API Error class with user-friendly messages
 */
class APIError extends Error {
  constructor(message, statusCode, userMessage) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.userMessage = userMessage || message;
  }
}

/**
 * Get user-friendly error message based on status code
 */
function getUserFriendlyMessage(statusCode, defaultMessage) {
  switch (statusCode) {
    case 404:
      return ERROR_MESSAGES.NOT_FOUND;
    case 403:
      return ERROR_MESSAGES.FORBIDDEN;
    case 500:
    case 502:
    case 503:
      return ERROR_MESSAGES.SERVER_ERROR;
    default:
      return defaultMessage || ERROR_MESSAGES.UNKNOWN;
  }
}

/**
 * Base fetch wrapper with error handling
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  // Get host token from localStorage for cross-domain auth
  const hostToken = typeof window !== 'undefined' ? localStorage.getItem('minibag_host_token') : null;

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      // Send host token in Authorization header (cross-domain fallback)
      ...(hostToken ? { 'Authorization': `Bearer ${hostToken}` } : {})
    },
    credentials: 'include', // IMPORTANT: Send cookies for httpOnly authentication (same-domain)
  };

  // Properly merge options while preserving both default and custom headers
  const config = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {})
    }
  };

  try {
    const response = await fetch(url, config);

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    let data;
    try {
      data = isJson ? await response.json() : await response.text();
    } catch (parseError) {
      logger.error('Failed to parse response', { endpoint, error: parseError.message });
      throw new APIError(
        'Invalid response from server',
        response.status,
        ERROR_MESSAGES.SERVER_ERROR
      );
    }

    if (!response.ok) {
      // Log full error details for debugging
      logger.error('API Error', {
        endpoint,
        status: response.status,
        error: data.error || data,
        details: data.details
      });

      const errorMessage = data.error || data.message || `HTTP error! status: ${response.status}`;
      const userMessage = getUserFriendlyMessage(response.status, errorMessage);

      throw new APIError(errorMessage, response.status, userMessage);
    }

    return data;
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      logger.error('Network Error', { endpoint, error: error.message });
      throw new APIError('Network error', 0, ERROR_MESSAGES.NETWORK_ERROR);
    }

    // Handle timeout errors
    if (error.name === 'AbortError') {
      logger.error('Timeout Error', { endpoint, error: error.message });
      throw new APIError('Request timeout', 0, ERROR_MESSAGES.TIMEOUT);
    }

    // Re-throw APIError instances
    if (error instanceof APIError) {
      throw error;
    }

    // Handle other errors
    logger.error('API Error', { endpoint, error: error.message });
    throw new APIError(
      error.message || 'Unknown error',
      0,
      ERROR_MESSAGES.UNKNOWN
    );
  }
}

// ============================================================================
// CATALOG API
// ============================================================================

/**
 * Get all categories
 * @returns {Promise<Array>} List of categories
 */
export async function getCategories() {
  const response = await apiFetch('/api/catalog/categories');
  return response.data;
}

/**
 * Get catalog items
 * @param {string} categoryId - Optional category filter
 * @returns {Promise<Array>} List of items
 */
export async function getItems(categoryId = null) {
  const endpoint = categoryId
    ? `/api/catalog/items?category_id=${categoryId}`
    : '/api/catalog/items';

  const response = await apiFetch(endpoint);
  return response.data;
}

/**
 * Get a specific item by ID
 * @param {string} itemId - Item ID
 * @returns {Promise<Object>} Item details
 */
export async function getItem(itemId) {
  const response = await apiFetch(`/api/catalog/items/${itemId}`);
  return response.data;
}

/**
 * Get popular items (for quick add)
 * @returns {Promise<Array>} List of popular items
 */
export async function getPopularItems() {
  const response = await apiFetch('/api/catalog/popular');
  return response.data;
}

// ============================================================================
// SESSIONS API
// ============================================================================

/**
 * Create a new shopping session
 * @param {Object} sessionData - Session details
 * @param {string} sessionData.location_text - Location description
 * @param {string} sessionData.scheduled_time - ISO timestamp
 * @param {string} sessionData.neighborhood - Optional neighborhood
 * @param {string} sessionData.title - Optional session title
 * @param {string} sessionData.description - Optional description
 * @param {Array} sessionData.items - Optional initial items [{item_id, quantity, unit}]
 * @returns {Promise<Object>} Created session and participant data
 */
export async function createSession(sessionData) {
  const response = await apiFetch('/api/sessions/create', {
    method: 'POST',
    body: JSON.stringify(sessionData),
  });
  return response.data;
}

/**
 * Get session details with participants
 * @param {string} sessionId - Session ID (6 chars)
 * @returns {Promise<Object>} Session details with participants and items
 */
export async function getSession(sessionId) {
  // Debug: Log sessionId to catch URL construction issues
  logger.debug('getSession called', {
    sessionId,
    endpoint: `/api/sessions/${sessionId}`,
    sessionIdType: typeof sessionId,
    sessionIdLength: sessionId?.length
  });

  const response = await apiFetch(`/api/sessions/${sessionId}`);

  // DEBUG: Log what we received from API
  logger.debug('getSession API Response', {
    sessionId,
    sessionStatus: response.data?.session?.status,
    participantsCount: response.data?.participants?.length
  });

  return response.data;
}

/**
 * Join an existing session
 * @param {string} sessionId - Session ID to join
 * @param {Array} items - Optional initial items [{item_id, quantity, unit}]
 * @param {Object} nicknameData - Optional nickname selection {real_name, selected_nickname, selected_avatar_emoji, selected_nickname_id}
 * @returns {Promise<Object>} Participant data and session info
 */
export async function joinSession(sessionId, items = [], nicknameData = {}) {
  // Debug: Log sessionId and endpoint to catch URL construction issues
  logger.debug('joinSession called', {
    sessionId,
    endpoint: `/api/sessions/${sessionId}/join`,
    sessionIdType: typeof sessionId,
    sessionIdLength: sessionId?.length,
    hasInviteToken: !!nicknameData.invite_token
  });

  const response = await apiFetch(`/api/sessions/${sessionId}/join`, {
    method: 'POST',
    body: JSON.stringify({ items, ...nicknameData }),
  });
  return response.data;
}

/**
 * Update session status
 * @param {string} sessionId - Session ID
 * @param {string} status - New status (open, active, shopping, completed, expired, cancelled)
 * @returns {Promise<Object>} Updated session data
 *
 * NOTE: Host authentication now handled via httpOnly cookie automatically
 */
export async function updateSessionStatus(sessionId, status) {
  const response = await apiFetch(`/api/sessions/${sessionId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
    // Host token sent automatically via httpOnly cookie (credentials: 'include')
  });
  return response.data;
}

/**
 * Get pre-aggregated shopping items with participant summaries
 * Uses server-side aggregation to eliminate empty items issue
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Aggregated items and participant summaries
 */
export async function getShoppingItems(sessionId) {
  const response = await apiFetch(`/api/sessions/${sessionId}/shopping-items`);

  logger.debug('getShoppingItems API Response', {
    sessionId,
    itemsCount: Object.keys(response.data?.aggregatedItems || {}).length,
    participantsCount: response.data?.participants?.length
  });

  return response.data;
}

/**
 * Get pre-aggregated bill items with payment information
 * Uses server-side aggregation for accurate bill calculations
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Bill items with participant costs and payments
 */
export async function getBillItems(sessionId) {
  const response = await apiFetch(`/api/sessions/${sessionId}/bill-items`);

  logger.debug('getBillItems API Response', {
    sessionId,
    participantsCount: response.data?.participants?.length,
    totalCost: response.data?.totalCost
  });

  return response.data;
}

/**
 * Generate a time-limited access token for viewing a bill
 * @param {string} sessionId - Session ID
 * @param {string|null} participantId - Optional participant ID (null for host/solo)
 * @returns {Promise<Object>} Token data with access_token and expires_at
 */
export async function generateBillToken(sessionId, participantId = null) {
  const response = await apiFetch(`/api/sessions/${sessionId}/bill-token`, {
    method: 'POST',
    body: JSON.stringify({ participant_id: participantId })
  });

  logger.debug('generateBillToken API Response', {
    sessionId,
    participantId,
    hasToken: !!response.token
  });

  return response;
}

// ============================================================================
// PAYMENTS API
// ============================================================================

/**
 * Record a payment for an item
 * @param {string} sessionId - Session ID
 * @param {Object} paymentData - Payment details
 * @param {string} paymentData.item_id - Item ID
 * @param {number} paymentData.amount - Payment amount
 * @param {string} paymentData.method - Payment method ('upi' or 'cash')
 * @param {number} paymentData.recorded_by - Participant ID who recorded payment
 * @param {string} paymentData.vendor_name - Optional vendor name
 * @returns {Promise<Object>} Created payment record
 */
export async function recordPayment(sessionId, paymentData) {
  const response = await apiFetch(`/api/sessions/${sessionId}/payments`, {
    method: 'POST',
    body: JSON.stringify(paymentData),
  });
  return response.payment;
}

/**
 * Get all payments for a session
 * @param {string} sessionId - Session ID
 * @returns {Promise<Array>} List of payments
 */
export async function getSessionPayments(sessionId) {
  const response = await apiFetch(`/api/sessions/${sessionId}/payments`);
  return response.payments;
}

/**
 * Get payment summary for a session
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Payment summary with totals
 */
export async function getPaymentSummary(sessionId) {
  const response = await apiFetch(`/api/sessions/${sessionId}/payments/summary`);
  return response.summary;
}

/**
 * Get payment split calculation for all participants
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Split calculation with participant breakdowns
 */
export async function getPaymentSplit(sessionId) {
  const response = await apiFetch(`/api/sessions/${sessionId}/split`);
  return response;
}

/**
 * Update a payment record
 * @param {number} paymentId - Payment ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated payment record
 */
export async function updatePayment(paymentId, updates) {
  const response = await apiFetch(`/api/payments/${paymentId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return response.payment;
}

/**
 * Delete a payment record
 * @param {number} paymentId - Payment ID
 * @returns {Promise<Object>} Success response
 */
export async function deletePayment(paymentId) {
  const response = await apiFetch(`/api/payments/${paymentId}`, {
    method: 'DELETE',
  });
  return response;
}

// ============================================================================
// PARTICIPANT ITEMS API
// ============================================================================

/**
 * Update participant status (items_confirmed, marked_not_coming)
 * @param {string} participantId - Participant ID (UUID)
 * @param {Object} status - Status to update {items_confirmed, marked_not_coming}
 * @returns {Promise<Object>} Updated participant data
 */
export async function updateParticipantStatus(participantId, status) {
  const response = await apiFetch(`/api/participants/${participantId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(status),
  });
  return response.data;
}

/**
 * Update all items for a participant (bulk update)
 * @param {string} participantId - Participant ID (UUID)
 * @param {Object} items - Object map of {item_id: quantity}
 * @returns {Promise<Object>} Updated participant data
 */
export async function updateParticipantItems(participantId, items) {
  // Convert items object to array format for API
  const itemsArray = Object.entries(items).map(([itemId, quantity]) => ({
    item_id: itemId,
    quantity: parseFloat(quantity),
    unit: 'kg'
  }));

  const response = await apiFetch(`/api/participants/${participantId}/items`, {
    method: 'PUT',
    body: JSON.stringify({ items: itemsArray }),
  });
  return response.data;
}

/**
 * Add item to participant's list
 * Note: This endpoint may need to be created on backend
 * @param {number} participantId - Participant ID
 * @param {Object} item - Item data {item_id, quantity, unit}
 * @returns {Promise<Object>} Added item data
 */
export async function addParticipantItem(participantId, item) {
  // TODO: Backend endpoint needed
  const response = await apiFetch(`/api/participants/${participantId}/items`, {
    method: 'POST',
    body: JSON.stringify(item),
  });
  return response.data;
}

/**
 * Update participant item
 * @param {number} participantItemId - Participant item ID
 * @param {Object} updates - Updated fields {quantity, unit, purchased, etc.}
 * @returns {Promise<Object>} Updated item data
 */
export async function updateParticipantItem(participantItemId, updates) {
  // TODO: Backend endpoint needed
  const response = await apiFetch(`/api/participant-items/${participantItemId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return response.data;
}

/**
 * Delete participant item
 * @param {number} participantItemId - Participant item ID
 * @returns {Promise<Object>} Success response
 */
export async function deleteParticipantItem(participantItemId) {
  // TODO: Backend endpoint needed
  const response = await apiFetch(`/api/participant-items/${participantItemId}`, {
    method: 'DELETE',
  });
  return response.data;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format items for API submission
 * @param {Array} items - Items from UI [{id, name, qty, unit}]
 * @returns {Array} API-formatted items [{item_id, quantity, unit}]
 */
export function formatItemsForAPI(items) {
  return items.map(item => ({
    item_id: item.id || item.item_id,
    quantity: parseFloat(item.qty || item.quantity || 1),
    unit: item.unit || 'kg'
  }));
}

/**
 * Format session time to ISO string
 * @param {Date|string} datetime - Date object or string
 * @returns {string} ISO timestamp
 */
export function formatSessionTime(datetime) {
  if (datetime instanceof Date) {
    return datetime.toISOString();
  }
  return new Date(datetime).toISOString();
}

export default {
  // Catalog
  getCategories,
  getItems,
  getItem,
  getPopularItems,

  // Sessions
  createSession,
  getSession,
  joinSession,
  updateSessionStatus,

  // Payments
  recordPayment,
  getSessionPayments,
  getPaymentSummary,
  getPaymentSplit,
  updatePayment,
  deletePayment,

  // Participant Items
  updateParticipantStatus,
  updateParticipantItems,
  addParticipantItem,
  updateParticipantItem,
  deleteParticipantItem,

  // Helpers
  formatItemsForAPI,
  formatSessionTime,
};
