/**
 * Session Data Transformers
 *
 * Utilities to transform API response data into frontend-compatible formats.
 * This centralizes data transformation logic to avoid duplication and maintain consistency.
 */

import {
  ParticipantSchema,
  FrontendParticipantSchema,
  ParticipantItemSchema,
  FrontendItemMapSchema
} from '../../../../shared/schemas/index.js';
import logger from '../../../../shared/utils/frontendLogger.js';

/**
 * Custom error class for validation failures
 */
export class ValidationError extends Error {
  constructor(message, zodError = null) {
    super(message);
    this.name = 'ValidationError';
    this.zodError = zodError;
    this.details = zodError?.issues || [];
  }

  /**
   * Get formatted error message with details
   */
  getFormattedMessage() {
    if (this.details.length === 0) {
      return this.message;
    }
    const detailsStr = this.details
      .map(issue => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    return `${this.message}\n${detailsStr}`;
  }
}

/**
 * Transform participant items from API format to frontend format
 *
 * API format: Array of { item_id: UUID, quantity: number, catalog_item: { item_id: string, ... } }
 * Frontend format: Object { [item_id: string]: quantity }
 *
 * @param {Array} apiItems - Array of participant items from API
 * @param {Array} catalogItems - Catalog items for defensive lookup (optional)
 * @returns {Object} Map of item_id to quantity (validated)
 */
export function transformParticipantItems(apiItems, catalogItems = []) {
  logger.debug('transformParticipantItems called', {
    apiItemsCount: apiItems?.length,
    catalogItemsCount: catalogItems?.length,
    apiItems: apiItems
  });

  if (!apiItems || !Array.isArray(apiItems)) {
    logger.warn('transformParticipantItems: apiItems is invalid', { apiItems });
    return {};
  }

  const itemsMap = apiItems.reduce((acc, item) => {
    // Defensive: Skip malformed items
    if (!item || typeof item !== 'object') {
      logger.warn('transformParticipantItems: skipping invalid item', { item });
      return acc;
    }

    // Try to get item_id from catalog_item relation (most reliable)
    let itemId = item.catalog_item?.item_id;
    logger.debug('Processing item', {
      item_id_uuid: item.item_id,
      catalog_item: item.catalog_item,
      resolved_itemId: itemId,
      quantity: item.quantity
    });

    // If missing, do a defensive lookup by UUID in catalog
    if (!itemId && item.item_id && catalogItems.length > 0) {
      const catalogItem = catalogItems.find(ci => ci.id === item.item_id);
      itemId = catalogItem?.item_id;
      logger.debug('Defensive lookup result', { found: !!catalogItem, itemId });
    }

    // CRITICAL: Only add to map if we have valid itemId
    if (!itemId) {
      logger.error('transformParticipantItems: Could not resolve item_id', {
        item_uuid: item.item_id,
        has_catalog_item: !!item.catalog_item
      });
      return acc; // Skip this item
    }

    // Validate quantity
    const quantity = parseFloat(item.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      logger.warn('transformParticipantItems: invalid quantity', { itemId, quantity: item.quantity });
      return acc; // Skip this item
    }

    acc[itemId] = quantity;
    return acc;
  }, {});

  // Validate output format with Zod
  try {
    return FrontendItemMapSchema.parse(itemsMap);
  } catch (error) {
    if (error.name === 'ZodError') {
      logger.error('transformParticipantItems: Output validation failed', {
        itemsMap,
        errors: error.issues
      });
      // Return empty object on validation failure (defensive)
      return {};
    }
    throw error;
  }
}

/**
 * Transform API participant to frontend participant format
 *
 * @param {Object} apiParticipant - Participant object from API
 * @param {Array} catalogItems - Catalog items for defensive lookup (optional)
 * @returns {Object} Frontend-compatible participant object
 * @throws {ValidationError} If participant data is invalid
 */
export function transformParticipant(apiParticipant, catalogItems = []) {
  // Defensive: Validate participant object
  if (!apiParticipant || typeof apiParticipant !== 'object') {
    logger.warn('transformParticipant: invalid participant', { apiParticipant });
    return null;
  }

  // Validate input with Zod schema
  try {
    const validatedInput = ParticipantSchema.parse(apiParticipant);

    // Transform to frontend format
    const frontendParticipant = {
      id: validatedInput.id,
      name: validatedInput.nickname || validatedInput.real_name || 'Participant',
      nickname: validatedInput.nickname,
      real_name: validatedInput.real_name,
      avatar_emoji: validatedInput.avatar_emoji,
      is_creator: validatedInput.is_creator || false,
      items: transformParticipantItems(validatedInput.items || [], catalogItems),
      marked_not_coming: validatedInput.marked_not_coming || false
    };

    // Validate output format
    const validatedOutput = FrontendParticipantSchema.parse(frontendParticipant);
    return validatedOutput;

  } catch (error) {
    if (error.name === 'ZodError') {
      logger.error('transformParticipant: Validation failed', {
        participant: apiParticipant,
        errors: error.issues
      });
      throw new ValidationError('Invalid participant data structure', error);
    }
    throw error;
  }
}

/**
 * Extract host items from participants list
 *
 * @param {Array} apiParticipants - Array of participants from API
 * @param {Array} catalogItems - Catalog items for defensive lookup (optional)
 * @returns {Object} Map of host's item_id to quantity
 */
export function extractHostItems(apiParticipants, catalogItems = []) {
  logger.debug('extractHostItems called', { participantsCount: apiParticipants?.length });

  if (!apiParticipants || !Array.isArray(apiParticipants)) {
    return {};
  }

  const hostParticipant = apiParticipants.find(p => p && p.is_creator);
  logger.debug('Host participant found', {
    found: !!hostParticipant,
    hasItems: !!hostParticipant?.items,
    itemsCount: hostParticipant?.items?.length
  });

  if (!hostParticipant || !hostParticipant.items || !Array.isArray(hostParticipant.items)) {
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
  logger.debug('extractNonHostParticipants called', {
    totalParticipants: apiParticipants?.length,
    nonHostCount: apiParticipants?.filter(p => p && !p.is_creator && !p.marked_not_coming).length
  });

  if (!apiParticipants || !Array.isArray(apiParticipants)) {
    return [];
  }

  const nonHostParticipants = apiParticipants.filter(p => p && !p.is_creator && !p.marked_not_coming);
  logger.debug('Non-host participants', {
    participants: nonHostParticipants.map(p => ({
      id: p?.id,
      nickname: p?.nickname,
      hasItems: !!p?.items,
      itemsCount: p?.items?.length
    }))
  });

  return nonHostParticipants
    .map(p => transformParticipant(p, catalogItems))
    .filter(Boolean); // Remove any null results from invalid participants
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
