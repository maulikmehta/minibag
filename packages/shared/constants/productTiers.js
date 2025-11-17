/**
 * Product Tier Configuration for Sessions SDK
 *
 * This module defines participant limits and capabilities for different products
 * and their tiers. Each product can configure:
 * - Maximum invited participants
 * - Maximum total participants (including host)
 * - UI behavior (tabs, labels)
 *
 * Usage:
 *   import { getProductConfig, validateParticipantCount } from './productTiers.js';
 *   const config = getProductConfig('minibag', 'group');
 *   const isValid = validateParticipantCount('minibag', 'group', 5);
 */

/**
 * Product Tier Definitions
 *
 * Structure:
 * {
 *   productName: {
 *     tierName: {
 *       max_invited: number | null,     // Max invited participants (null = unlimited)
 *       max_total: number | null,       // Max total including host (null = unlimited)
 *       max_absolute: number,           // Hard cap for database/performance
 *       ui_label: string,               // Display name for UI
 *       ui_description: string,         // Help text
 *       features: {...}                 // Optional tier-specific features
 *     }
 *   }
 * }
 */
export const PRODUCT_TIERS = {
  // ================================================================
  // MINIBAG - Grocery Shopping Sessions
  // ================================================================
  minibag: {
    // Solo mode: Shop alone
    solo: {
      max_invited: 0,
      max_total: 1,
      max_absolute: 1,
      ui_label: 'Solo',
      ui_description: 'Shop by yourself',
      features: {
        show_invites: false,
        allow_participants: false
      }
    },

    // Group mode: Shop with friends (dynamic participant count)
    group: {
      max_invited: null,        // Unlimited invited participants
      max_total: null,          // Unlimited total
      max_absolute: 20,         // Hard cap for performance (can be adjusted)
      ui_label: 'Group',
      ui_description: 'Shop with friends - share one link',
      features: {
        show_invites: true,
        allow_participants: true,
        dynamic_invites: true,  // One link, multiple people can join
        show_invite_count: true
      }
    }
  },

  // ================================================================
  // EXAMPLE: SaaS Product with Multiple Tiers
  // ================================================================
  example_saas: {
    // Free tier: Limited participants
    free: {
      max_invited: 3,
      max_total: 4,             // Host + 3 invited
      max_absolute: 4,
      ui_label: 'Free',
      ui_description: 'Up to 3 participants',
      features: {
        show_invites: true,
        allow_participants: true,
        show_upgrade_prompt: true
      }
    },

    // Pro tier: More participants
    pro: {
      max_invited: 10,
      max_total: 11,            // Host + 10 invited
      max_absolute: 11,
      ui_label: 'Pro',
      ui_description: 'Up to 10 participants',
      features: {
        show_invites: true,
        allow_participants: true
      }
    },

    // Enterprise tier: Unlimited participants
    enterprise: {
      max_invited: null,        // Unlimited
      max_total: null,          // Unlimited
      max_absolute: 100,        // Soft cap for performance
      ui_label: 'Enterprise',
      ui_description: 'Unlimited participants',
      features: {
        show_invites: true,
        allow_participants: true,
        priority_support: true
      }
    }
  },

  // ================================================================
  // EXAMPLE: Fixed Participant Count Product
  // ================================================================
  example_fixed: {
    // Standard: Always exactly 5 participants
    standard: {
      max_invited: 4,
      max_total: 5,             // Always 5 people
      max_absolute: 5,
      ui_label: 'Standard',
      ui_description: 'Teams of 5',
      features: {
        show_invites: true,
        allow_participants: true,
        fixed_count: true       // Must have exactly this many
      }
    }
  }
};

/**
 * Default configuration if product/tier not found
 */
export const DEFAULT_CONFIG = {
  max_invited: 3,
  max_total: 4,
  max_absolute: 20,
  ui_label: 'Default',
  ui_description: 'Standard session',
  features: {
    show_invites: true,
    allow_participants: true
  }
};

/**
 * Get configuration for a specific product and tier
 *
 * @param {string} product - Product name (e.g., 'minibag')
 * @param {string} tier - Tier name (e.g., 'solo', 'group', 'free', 'pro')
 * @returns {object} Configuration object
 *
 * @example
 * const config = getProductConfig('minibag', 'group');
 * console.log(config.max_invited); // null (unlimited)
 */
export function getProductConfig(product, tier) {
  const productConfig = PRODUCT_TIERS[product];

  if (!productConfig) {
    console.warn(`Unknown product: ${product}. Using default config.`);
    return { ...DEFAULT_CONFIG };
  }

  const tierConfig = productConfig[tier];

  if (!tierConfig) {
    console.warn(`Unknown tier: ${tier} for product: ${product}. Using default config.`);
    return { ...DEFAULT_CONFIG };
  }

  return { ...tierConfig };
}

/**
 * Get maximum invited participants allowed for a product/tier
 *
 * @param {string} product - Product name
 * @param {string} tier - Tier name
 * @returns {number|null} Max invited (null = unlimited)
 */
export function getMaxInvited(product, tier) {
  const config = getProductConfig(product, tier);
  return config.max_invited;
}

/**
 * Get maximum total participants (including host) for a product/tier
 *
 * @param {string} product - Product name
 * @param {string} tier - Tier name
 * @returns {number|null} Max total (null = unlimited)
 */
export function getMaxTotal(product, tier) {
  const config = getProductConfig(product, tier);
  return config.max_total;
}

/**
 * Get absolute maximum (hard cap) for a product/tier
 *
 * @param {string} product - Product name
 * @param {string} tier - Tier name
 * @returns {number} Absolute maximum
 */
export function getMaxAbsolute(product, tier) {
  const config = getProductConfig(product, tier);
  return config.max_absolute;
}

/**
 * Validate if a participant count is allowed for a product/tier
 *
 * @param {string} product - Product name
 * @param {string} tier - Tier name
 * @param {number} count - Number of participants to validate
 * @param {boolean} includesHost - Whether count includes the host
 * @returns {object} { valid: boolean, reason: string|null, max: number|null }
 *
 * @example
 * const result = validateParticipantCount('minibag', 'solo', 2, true);
 * console.log(result.valid); // false
 * console.log(result.reason); // 'Solo mode allows only 1 participant (yourself)'
 */
export function validateParticipantCount(product, tier, count, includesHost = true) {
  const config = getProductConfig(product, tier);

  // Check absolute maximum (hard cap)
  if (count > config.max_absolute) {
    return {
      valid: false,
      reason: `Maximum ${config.max_absolute} participants allowed`,
      max: config.max_absolute
    };
  }

  // Check max_total if defined
  if (config.max_total !== null && includesHost && count > config.max_total) {
    return {
      valid: false,
      reason: `${config.ui_label} tier allows maximum ${config.max_total} total participants`,
      max: config.max_total
    };
  }

  // Check max_invited if defined
  if (config.max_invited !== null && !includesHost && count > config.max_invited) {
    return {
      valid: false,
      reason: `${config.ui_label} tier allows maximum ${config.max_invited} invited participants`,
      max: config.max_invited
    };
  }

  return {
    valid: true,
    reason: null,
    max: config.max_total || config.max_absolute
  };
}

/**
 * Get all available tiers for a product
 *
 * @param {string} product - Product name
 * @returns {Array<string>} Array of tier names
 *
 * @example
 * const tiers = getAvailableTiers('minibag');
 * console.log(tiers); // ['solo', 'group']
 */
export function getAvailableTiers(product) {
  const productConfig = PRODUCT_TIERS[product];

  if (!productConfig) {
    console.warn(`Unknown product: ${product}`);
    return [];
  }

  return Object.keys(productConfig);
}

/**
 * Check if a product/tier supports unlimited participants
 *
 * @param {string} product - Product name
 * @param {string} tier - Tier name
 * @returns {boolean} True if unlimited
 */
export function isUnlimitedTier(product, tier) {
  const config = getProductConfig(product, tier);
  return config.max_invited === null && config.max_total === null;
}

/**
 * Get UI configuration for a product/tier
 *
 * @param {string} product - Product name
 * @param {string} tier - Tier name
 * @returns {object} UI configuration
 */
export function getUIConfig(product, tier) {
  const config = getProductConfig(product, tier);
  return {
    label: config.ui_label,
    description: config.ui_description,
    features: config.features || {}
  };
}

/**
 * Helper to determine the tier based on session data
 * For now, this is a simple mapping. Can be extended to check
 * user subscriptions, product tiers, etc.
 *
 * @param {object} session - Session object
 * @returns {object} { product: string, tier: string }
 */
export function resolveTierFromSession(session) {
  // Default: Use session_type from database
  // session_type is 'minibag' currently
  const product = session.session_type || 'minibag';

  // Determine tier based on expected_participants
  let tier;
  if (session.expected_participants === null || session.expected_participants === 0) {
    tier = 'solo';
  } else {
    tier = 'group';
  }

  return { product, tier };
}
