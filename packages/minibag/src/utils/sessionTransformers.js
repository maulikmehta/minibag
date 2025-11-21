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
} from '@shared/schemas/index.js';
import logger from '@shared/utils/frontendLogger.js';

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
 * Normalize a timestamp value to valid ISO 8601 format
 * Handles malformed timestamps by attempting to parse and normalize them
 *
 * @param {*} value - Timestamp value to normalize
 * @param {string} fieldName - Name of the field (for logging)
 * @param {string} participantId - Participant ID (for logging)
 * @returns {string} - Valid ISO 8601 timestamp string
 */
function normalizeTimestamp(value, fieldName = 'timestamp', participantId = 'unknown') {
  // If null/undefined, use current time
  if (!value) {
    return new Date().toISOString();
  }

  // If it's already a string, try to fix common malformations
  if (typeof value === 'string') {
    let processedValue = value;

    // FIX: Handle the specific ":00:00" malformation where + was replaced with :
    // Pattern: "2025-11-10T15:22:30.187:00:00"
    //          Should be: "2025-11-10T15:22:30.187+00:00"
    const malformedPattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}):(\d{2}:\d{2})$/;
    const match = processedValue.match(malformedPattern);

    if (match) {
      // Reconstruct with proper + sign
      processedValue = `${match[1]}+${match[2]}`;
      logger.warn('Fixed malformed timestamp (: → +)', {
        participantId,
        fieldName,
        originalValue: value,
        fixedValue: processedValue
      });
    }

    try {
      // Attempt to parse the (potentially fixed) date
      const date = new Date(processedValue);

      // Check if parsing succeeded
      if (!isNaN(date.getTime())) {
        // Successfully parsed - normalize to ISO format
        return date.toISOString();
      } else {
        logger.error('Date parsing returned Invalid Date', {
          participantId,
          fieldName,
          originalValue: value,
          processedValue,
          result: 'Invalid Date'
        });
      }
    } catch (e) {
      logger.error('Failed to parse timestamp', {
        participantId,
        fieldName,
        value,
        processedValue,
        error: e.message
      });
    }
  }

  // If it's a Date object, convert to ISO
  if (value instanceof Date) {
    if (!isNaN(value.getTime())) {
      return value.toISOString();
    }
  }

  // Fallback: use current time for completely unparseable values
  // This should rarely happen now that we fix the malformed format
  logger.error('Timestamp completely unparseable, using current time fallback', {
    participantId,
    fieldName,
    value,
    valueType: typeof value
  });
  return new Date().toISOString();
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

  // Handle optimistic updates BEFORE validation (temporary participant objects before API confirmation)
  if (apiParticipant._optimistic ||
      apiParticipant.participant_id?.startsWith('temp-') ||
      apiParticipant.id?.startsWith('temp-')) {
    logger.debug('transformParticipant: Skipping validation for optimistic update', {
      participant_id: apiParticipant.participant_id || apiParticipant.id,
      is_optimistic: apiParticipant._optimistic
    });

    // Return simplified participant object without full validation
    return {
      id: apiParticipant.participant_id || apiParticipant.id,
      name: apiParticipant.nickname || apiParticipant.real_name || 'Participant',
      nickname: apiParticipant.nickname,
      real_name: apiParticipant.real_name,
      avatar_emoji: apiParticipant.avatar_emoji || '👤',
      is_creator: apiParticipant.is_creator || false,
      items: apiParticipant.items || {},
      items_confirmed: apiParticipant.items_confirmed || false, // CRITICAL: Preserve items_confirmed for checkpoint logic
      marked_not_coming: apiParticipant.marked_not_coming || false
    };
  }

  // Validate input with Zod schema (only for real API data)
  // Declare sanitizedParticipant outside try block so it's accessible in catch
  let sanitizedParticipant = { ...apiParticipant };

  try {
    // 🔍 DIAGNOSTIC: Log participant structure before validation
    console.log('🔍 DIAGNOSTIC - Participant before validation:', {
      participant_id: apiParticipant?.id,
      nickname: apiParticipant?.nickname,
      has_joined_at: 'joined_at' in apiParticipant,
      has_created_at: 'created_at' in apiParticipant,
      joined_at_value: apiParticipant?.joined_at,
      created_at_value: apiParticipant?.created_at,
      joined_at_type: typeof apiParticipant?.joined_at,
      created_at_type: typeof apiParticipant?.created_at,
      joined_at_length: apiParticipant?.joined_at?.length,
      all_keys: Object.keys(apiParticipant || {})
    });

    // 🛡️ DEFENSIVE: Sanitize timestamps before validation to handle corruption
    sanitizedParticipant = { ...apiParticipant };

    // Normalize joined_at timestamp
    if (sanitizedParticipant.joined_at) {
      const normalized = normalizeTimestamp(sanitizedParticipant.joined_at, 'joined_at', sanitizedParticipant.id);
      if (normalized !== sanitizedParticipant.joined_at) {
        logger.warn('Malformed joined_at timestamp sanitized', {
          participantId: sanitizedParticipant.id,
          originalValue: sanitizedParticipant.joined_at,
          normalizedValue: normalized
        });
      }
      sanitizedParticipant.joined_at = normalized;
    }

    // Remove created_at if undefined (column doesn't exist in DB schema)
    if (sanitizedParticipant.created_at === undefined) {
      delete sanitizedParticipant.created_at;
    } else if (sanitizedParticipant.created_at) {
      // Normalize if present
      const normalized = normalizeTimestamp(sanitizedParticipant.created_at, 'created_at', sanitizedParticipant.id);
      sanitizedParticipant.created_at = normalized;
    }

    // 🔍 DIAGNOSTIC: Log after sanitization
    console.log('🛡️ After sanitization:', {
      participant_id: sanitizedParticipant?.id,
      joined_at_sanitized: sanitizedParticipant?.joined_at,
      created_at_sanitized: sanitizedParticipant?.created_at,
      joined_at_changed: apiParticipant?.joined_at !== sanitizedParticipant?.joined_at
    });

    const validatedInput = ParticipantSchema.parse(sanitizedParticipant);

    // Transform to frontend format
    const frontendParticipant = {
      id: validatedInput.id,
      name: validatedInput.nickname || validatedInput.real_name || 'Participant',
      nickname: validatedInput.nickname,
      real_name: validatedInput.real_name,
      avatar_emoji: validatedInput.avatar_emoji,
      is_creator: validatedInput.is_creator || false,
      items: transformParticipantItems(validatedInput.items || [], catalogItems),
      items_confirmed: validatedInput.items_confirmed || false, // CRITICAL: Preserve items_confirmed for checkpoint logic
      marked_not_coming: validatedInput.marked_not_coming || false
    };

    // Validate output format
    const validatedOutput = FrontendParticipantSchema.parse(frontendParticipant);
    return validatedOutput;

  } catch (error) {
    if (error.name === 'ZodError') {
      // Enhanced error details for debugging
      const errorDetails = error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        received: issue.received,
        expected: issue.expected,
        code: issue.code
      }));

      logger.error('transformParticipant: Validation failed', {
        participant: apiParticipant,
        sanitizedParticipant: sanitizedParticipant,
        errors: error.issues,
        errorDetails
      });

      // Log to console for immediate visibility
      console.error('❌ VALIDATION FAILURE DETAILS:', {
        participantId: apiParticipant?.id,
        nickname: apiParticipant?.nickname,
        errorDetails,
        fullErrors: error.issues
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
    nonHostCount: apiParticipants?.filter(p => p && !p.is_creator).length
  });

  if (!apiParticipants || !Array.isArray(apiParticipants)) {
    return [];
  }

  // Include ALL non-host participants (active AND declined) for checkpoint calculation
  // UI components will filter for display using SessionParticipantList filter
  const nonHostParticipants = apiParticipants.filter(p => p && !p.is_creator);
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
