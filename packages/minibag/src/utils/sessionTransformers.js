/**
 * Session Data Transformers
 *
 * Utilities to transform API response data into frontend-compatible formats.
 * This centralizes data transformation logic to avoid duplication and maintain consistency.
 */

/**
 * Transform participant items from API format to frontend format
 *
 * API format: Array of { item_id: UUID, quantity: number, catalog_item: { item_id: string, ... } }
 * Frontend format: Object { [item_id: string]: quantity }
 *
 * @param {Array} apiItems - Array of participant items from API
 * @returns {Object} Map of item_id to quantity
 */
export function transformParticipantItems(apiItems) {
  if (!apiItems || !Array.isArray(apiItems)) {
    return {};
  }

  return apiItems.reduce((acc, item) => {
    // Use catalog_item.item_id as the key (matches local catalog IDs)
    // Fallback to item.item_id if catalog_item is not populated
    const itemId = item.catalog_item?.item_id || item.item_id;
    acc[itemId] = item.quantity;
    return acc;
  }, {});
}

/**
 * Transform API participant to frontend participant format
 *
 * @param {Object} apiParticipant - Participant object from API
 * @returns {Object} Frontend-compatible participant object
 */
export function transformParticipant(apiParticipant) {
  return {
    id: apiParticipant.id,
    name: apiParticipant.nickname || apiParticipant.real_name || 'Participant',
    nickname: apiParticipant.nickname,
    real_name: apiParticipant.real_name,
    avatar_emoji: apiParticipant.avatar_emoji,
    is_creator: apiParticipant.is_creator,
    items: transformParticipantItems(apiParticipant.items)
  };
}

/**
 * Extract host items from participants list
 *
 * @param {Array} apiParticipants - Array of participants from API
 * @returns {Object} Map of host's item_id to quantity
 */
export function extractHostItems(apiParticipants) {
  if (!apiParticipants || !Array.isArray(apiParticipants)) {
    return {};
  }

  const hostParticipant = apiParticipants.find(p => p.is_creator);

  if (!hostParticipant || !hostParticipant.items) {
    return {};
  }

  return transformParticipantItems(hostParticipant.items);
}

/**
 * Extract non-host participants from participants list
 *
 * @param {Array} apiParticipants - Array of participants from API
 * @returns {Array} Array of transformed non-host participants
 */
export function extractNonHostParticipants(apiParticipants) {
  if (!apiParticipants || !Array.isArray(apiParticipants)) {
    return [];
  }

  return apiParticipants
    .filter(p => !p.is_creator)
    .map(transformParticipant);
}

/**
 * Transform complete session data from API to frontend format
 *
 * @param {Object} session - Session object from API
 * @param {Array} apiParticipants - Array of participants from API
 * @returns {Object} { hostItems, participants }
 */
export function transformSessionData(session, apiParticipants) {
  return {
    hostItems: extractHostItems(apiParticipants),
    participants: extractNonHostParticipants(apiParticipants)
  };
}
