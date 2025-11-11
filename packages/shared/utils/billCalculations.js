/**
 * Bill Calculation Utilities
 * Shared logic for bill calculations across bills.js and sessions.js
 */

import logger from './logger.js';

/**
 * Build payment map and skipped items map from payments array
 * @param {Array} payments - Array of payment objects
 * @returns {Object} { paymentMap, skippedItems }
 * - paymentMap: Map of item_id (TEXT) -> payment object (for paid items)
 * - skippedItems: Map of item_id (TEXT) -> payment object (for skipped items)
 */
export function buildPaymentMaps(payments) {
  const paymentMap = {};
  const skippedItems = {};

  (payments || []).forEach(p => {
    if (p.skipped) {
      skippedItems[p.item_id] = p;
    } else {
      paymentMap[p.item_id] = p;
    }
  });

  return { paymentMap, skippedItems };
}

/**
 * Build catalog map keyed by item_id (TEXT) or id (UUID)
 * @param {Array} catalogItems - Array of catalog item objects
 * @param {String} keyField - Field to use as key ('item_id' for TEXT, 'id' for UUID)
 * @returns {Object} Map of key -> catalog item
 */
export function buildCatalogMap(catalogItems, keyField = 'item_id') {
  const catalogMap = {};
  catalogItems.forEach(item => {
    catalogMap[item[keyField]] = item;
  });
  return catalogMap;
}

/**
 * Calculate total quantities per item, excluding skipped items
 * @param {Array} participantItems - Array of participant_items
 * @param {Object} catalogMap - Map of item UUID -> catalog item
 * @param {Object} skippedItems - Map of TEXT item_id -> skipped payment
 * @returns {Object} Map of item UUID -> total quantity
 */
export function calculateItemTotals(participantItems, catalogMap, skippedItems) {
  const itemTotals = {};

  participantItems.forEach(item => {
    const catalog = catalogMap[item.item_id]; // UUID lookup
    if (catalog && !skippedItems[catalog.item_id]) { // TEXT check against skipped items
      itemTotals[item.item_id] = (itemTotals[item.item_id] || 0) + item.quantity;
    }
  });

  return itemTotals;
}

/**
 * Validate participant item data
 * @param {Object} item - Participant item object
 * @param {Object} catalog - Catalog item object
 * @returns {Object} { isValid, errors }
 */
export function validateParticipantItem(item, catalog) {
  const errors = [];

  if (!catalog) {
    errors.push('Missing catalog_item');
    return { isValid: false, errors };
  }

  if (!catalog.name || !catalog.item_id) {
    errors.push('Missing required catalog fields (name or item_id)');
  }

  if (typeof item.quantity !== 'number' || item.quantity <= 0) {
    errors.push('Invalid quantity');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Calculate bill for a participant
 * @param {Object} params
 * @param {Array} params.participantItems - Participant's items
 * @param {Object} params.catalogMap - Catalog map (UUID -> catalog item)
 * @param {Object} params.paymentMap - Payment map (TEXT item_id -> payment)
 * @param {Object} params.skippedItems - Skipped items map (TEXT item_id -> payment)
 * @param {Object} params.itemTotals - Total quantities per item (UUID -> quantity)
 * @returns {Object} { billItems, totalAmount, skippedCount }
 */
export function calculateParticipantBill({
  participantItems,
  catalogMap,
  paymentMap,
  skippedItems,
  itemTotals
}) {
  const billItems = [];
  let totalAmount = 0;
  let skippedCount = 0;

  participantItems.forEach(item => {
    const catalog = catalogMap[item.item_id]; // UUID lookup

    // Validate item
    const validation = validateParticipantItem(item, catalog);
    if (!validation.isValid) {
      logger.warn({
        item,
        errors: validation.errors
      }, '[calculateParticipantBill] Invalid item data');
      return;
    }

    // Use TEXT item_id from catalog for payment lookup
    const textItemId = catalog.item_id;
    const payment = paymentMap[textItemId];

    // Skip if item was skipped or has no payment
    if (!payment || skippedItems[textItemId]) {
      if (skippedItems[textItemId]) {
        skippedCount++;
      }
      logger.debug({
        textItemId,
        catalogName: catalog.name,
        hasPayment: !!payment,
        isSkipped: !!skippedItems[textItemId]
      }, '[calculateParticipantBill] Item excluded from bill');
      return;
    }

    // Calculate cost
    const totalQty = itemTotals[item.item_id]; // UUID lookup for totals
    const pricePerKg = payment.amount / totalQty;
    const itemCost = pricePerKg * item.quantity;

    billItems.push({
      item_id: textItemId,
      catalog_item_id: item.item_id, // UUID
      name: catalog.name,
      emoji: catalog.emoji,
      quantity: item.quantity,
      unit: catalog.unit,
      price_per_kg: Math.round(pricePerKg),
      item_cost: Math.round(itemCost)
    });

    totalAmount += itemCost;
  });

  return {
    billItems,
    totalAmount: Math.round(totalAmount),
    skippedCount
  };
}
