/**
 * API Service Layer
 * Handles all communication with the backend API
 */

// Use empty string to leverage Vite proxy (relative URLs)
// In production, set VITE_API_URL to the actual API URL
const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

/**
 * Base fetch wrapper with error handling
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const config = { ...defaultOptions, ...options };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
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
  const response = await apiFetch(`/api/sessions/${sessionId}`);
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
 */
export async function updateSessionStatus(sessionId, status) {
  const response = await apiFetch(`/api/sessions/${sessionId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
  return response.data;
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
// PARTICIPANT ITEMS API (for future use)
// ============================================================================

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
  addParticipantItem,
  updateParticipantItem,
  deleteParticipantItem,

  // Helpers
  formatItemsForAPI,
  formatSessionTime,
};
