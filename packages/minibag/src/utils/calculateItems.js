/**
 * Shared calculation utilities for MiniBag
 * Centralizes item aggregation and price calculations to improve performance
 */

/**
 * Aggregates all items from host and participants into a single object
 * @param {Object} hostItems - Host's items { itemId: quantity }
 * @param {Array} participants - Array of participant objects with items property
 * @returns {Object} Aggregated items { itemId: totalQuantity }
 */
export const aggregateAllItems = (hostItems = {}, participants = []) => {
  const allItems = { ...hostItems };

  participants.forEach(participant => {
    const items = participant.items || {};
    Object.entries(items).forEach(([itemId, quantity]) => {
      allItems[itemId] = (allItems[itemId] || 0) + quantity;
    });
  });

  return allItems;
};

/**
 * Calculates total cost for a set of items
 * @param {Object} items - Items object { itemId: quantity }
 * @param {Array} catalog - Catalog items array
 * @returns {number} Total cost
 */
export const calculateTotalCost = (items = {}, catalog = []) => {
  return Object.entries(items).reduce((total, [itemId, quantity]) => {
    const item = catalog.find(v => v.id === itemId);
    if (!item) return total;
    return total + (item.price_per_kg * quantity);
  }, 0);
};

/**
 * Calculates cost per participant with item details
 * @param {Object} participantItems - Participant's items { itemId: quantity }
 * @param {Array} catalog - Catalog items array
 * @returns {Object} { total: number, items: Array<{ name, quantity, cost, pricePerKg }> }
 */
export const calculateParticipantCost = (participantItems = {}, catalog = []) => {
  const items = [];
  let total = 0;

  Object.entries(participantItems).forEach(([itemId, quantity]) => {
    const catalogItem = catalog.find(v => v.id === itemId);
    if (!catalogItem) return;

    const cost = catalogItem.price_per_kg * quantity;
    total += cost;

    items.push({
      id: itemId,
      name: catalogItem.name,
      quantity,
      cost,
      pricePerKg: catalogItem.price_per_kg,
      emoji: catalogItem.emoji || '🥬'
    });
  });

  return { total, items };
};

/**
 * Calculates costs for all participants
 * @param {Array} participants - Array of participant objects
 * @param {Array} catalog - Catalog items array
 * @returns {Object} Map of participant name to cost details
 */
export const calculateAllParticipantCosts = (participants = [], catalog = []) => {
  const costs = {};

  participants.forEach(participant => {
    const name = participant.nickname || participant.name || 'Participant';
    costs[name] = calculateParticipantCost(participant.items, catalog);
  });

  return costs;
};

/**
 * Separates skipped items from regular items
 * @param {Object} allItems - All items aggregated
 * @param {Object} confirmedItems - Only confirmed items
 * @returns {Object} { regular: {}, skipped: {} }
 */
export const separateSkippedItems = (allItems = {}, confirmedItems = {}) => {
  const regular = {};
  const skipped = {};

  Object.entries(allItems).forEach(([itemId, quantity]) => {
    if (confirmedItems[itemId]) {
      regular[itemId] = confirmedItems[itemId];
    } else {
      skipped[itemId] = quantity;
    }
  });

  return { regular, skipped };
};

/**
 * Formats price for display
 * @param {number} price - Price to format
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} Formatted price string
 */
export const formatPrice = (price, decimals = 0) => {
  return `₹${price.toFixed(decimals)}`;
};

/**
 * Calculates price per kg display string
 * @param {number} pricePerKg - Price per kg
 * @returns {string} Formatted string like "₹40/kg"
 */
export const formatPricePerKg = (pricePerKg) => {
  return `₹${pricePerKg}/kg`;
};
