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
 * @param {Array} catalogItems - Catalog items for defensive lookup (optional)
 * @returns {Object} Map of item_id to quantity
 */
export function transformParticipantItems(apiItems, catalogItems = []) {
  console.log('🔄 transformParticipantItems called:', {
    apiItemsCount: apiItems?.length,
    catalogItemsCount: catalogItems?.length,
    apiItems: apiItems
  });

  if (!apiItems || !Array.isArray(apiItems)) {
    console.log('⚠️ transformParticipantItems: apiItems is invalid', apiItems);
    return {};
  }

  return apiItems.reduce((acc, item) => {
    // Try to get item_id from catalog_item relation (most reliable)
    let itemId = item.catalog_item?.item_id;
    console.log(`  📦 Processing item:`, {
      item_id_uuid: item.item_id,
      catalog_item: item.catalog_item,
      resolved_itemId: itemId,
      quantity: item.quantity
    });

    // If missing, do a defensive lookup by UUID in catalog
    if (!itemId && item.item_id && catalogItems.length > 0) {
      const catalogItem = catalogItems.find(ci => ci.id === item.item_id);
      itemId = catalogItem?.item_id;
      console.log(`  🔍 Defensive lookup result:`, { found: !!catalogItem, itemId });
    }

    // Last resort: use the UUID (will likely fail downstream, but log warning)
    if (!itemId) {
      console.warn('⚠️ Could not resolve item_id for participant item:', item);
      itemId = item.item_id;
    }

    acc[itemId] = item.quantity;
    return acc;
  }, {});
}

/**
 * Transform API participant to frontend participant format
 *
 * @param {Object} apiParticipant - Participant object from API
 * @param {Array} catalogItems - Catalog items for defensive lookup (optional)
 * @returns {Object} Frontend-compatible participant object
 */
export function transformParticipant(apiParticipant, catalogItems = []) {
  return {
    id: apiParticipant.id,
    name: apiParticipant.nickname || apiParticipant.real_name || 'Participant',
    nickname: apiParticipant.nickname,
    real_name: apiParticipant.real_name,
    avatar_emoji: apiParticipant.avatar_emoji,
    is_creator: apiParticipant.is_creator,
    items: transformParticipantItems(apiParticipant.items, catalogItems)
  };
}

/**
 * Extract host items from participants list
 *
 * @param {Array} apiParticipants - Array of participants from API
 * @param {Array} catalogItems - Catalog items for defensive lookup (optional)
 * @returns {Object} Map of host's item_id to quantity
 */
export function extractHostItems(apiParticipants, catalogItems = []) {
  console.log('👑 extractHostItems called:', { participantsCount: apiParticipants?.length });

  if (!apiParticipants || !Array.isArray(apiParticipants)) {
    return {};
  }

  const hostParticipant = apiParticipants.find(p => p.is_creator);
  console.log('👑 Host participant found:', {
    found: !!hostParticipant,
    hasItems: !!hostParticipant?.items,
    itemsCount: hostParticipant?.items?.length
  });

  if (!hostParticipant || !hostParticipant.items) {
    return {};
  }

  return transformParticipantItems(hostParticipant.items, catalogItems);
}

/**
 * Extract non-host participants from participants list
 *
 * @param {Array} apiParticipants - Array of participants from API
 * @param {Array} catalogItems - Catalog items for defensive lookup (optional)
 * @returns {Array} Array of transformed non-host participants
 */
export function extractNonHostParticipants(apiParticipants, catalogItems = []) {
  console.log('👥 extractNonHostParticipants called:', {
    totalParticipants: apiParticipants?.length,
    nonHostCount: apiParticipants?.filter(p => !p.is_creator).length
  });

  if (!apiParticipants || !Array.isArray(apiParticipants)) {
    return [];
  }

  const nonHostParticipants = apiParticipants.filter(p => !p.is_creator);
  console.log('👥 Non-host participants:', nonHostParticipants.map(p => ({
    id: p.id,
    nickname: p.nickname,
    hasItems: !!p.items,
    itemsCount: p.items?.length
  })));

  return nonHostParticipants.map(p => transformParticipant(p, catalogItems));
}

/**
 * Transform complete session data from API to frontend format
 *
 * @param {Object} session - Session object from API
 * @param {Array} apiParticipants - Array of participants from API
 * @param {Array} catalogItems - Catalog items for defensive lookup (optional)
 * @returns {Object} { hostItems, participants }
 */
export function transformSessionData(session, apiParticipants, catalogItems = []) {
  return {
    hostItems: extractHostItems(apiParticipants, catalogItems),
    participants: extractNonHostParticipants(apiParticipants, catalogItems)
  };
}

/**
 * Extract first name from full name
 *
 * @param {string} real_name - Full name (e.g., "Maulik Patel")
 * @returns {string|null} First name (e.g., "Maulik") or null if undefined
 */
export function extractFirstName(real_name) {
  if (!real_name) return null;
  return real_name.split(' ')[0];
}
