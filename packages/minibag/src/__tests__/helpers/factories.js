/**
 * Test Factories
 *
 * Factory functions for creating test data with sensible defaults
 * Based on Week 2 Day 6 testing infrastructure requirements
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Counter for generating unique IDs
 */
let counter = 0;
function nextId() {
  counter += 1;
  return counter;
}

/**
 * Generate random session ID (ABC123 format)
 */
function generateSessionId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Session Factory
 */
export function buildSession(overrides = {}) {
  const id = nextId();
  return {
    id: uuidv4(),
    session_id: generateSessionId(),
    session_type: 'minibag',
    host_id: uuidv4(),
    host_name: `Test Host ${id}`,
    creator_nickname: `Host${id}`,
    expected_participants: 0,
    status: 'open',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
    pin: null,
    settings: {},
    ...overrides,
  };
}

/**
 * Participant Factory
 */
export function buildParticipant(overrides = {}) {
  const id = nextId();
  return {
    id: uuidv4(),
    session_id: overrides.session_id || uuidv4(),
    nickname: `TestUser${id}`,
    real_name: overrides.real_name || null,
    is_host: false,
    joined_at: new Date().toISOString(),
    items: {},
    ...overrides,
  };
}

/**
 * Catalog Item Factory
 */
export function buildCatalogItem(overrides = {}) {
  const id = nextId();
  return {
    id: uuidv4(),
    item_id: `v${String(id).padStart(3, '0')}`,
    name: `Test Item ${id}`,
    emoji: '🥬',
    category_id: overrides.category_id || uuidv4(),
    category_name: 'Vegetables',
    unit: 'kg',
    common_quantities: [0.5, 1, 2],
    price_per_unit: 20,
    is_active: true,
    ...overrides,
  };
}

/**
 * Participant Item Factory
 */
export function buildParticipantItem(overrides = {}) {
  return {
    id: uuidv4(),
    participant_id: overrides.participant_id || uuidv4(),
    item_id: overrides.item_id || uuidv4(),
    catalog_item: overrides.catalog_item || null,
    quantity: 1,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Payment Factory
 */
export function buildPayment(overrides = {}) {
  return {
    id: uuidv4(),
    session_id: overrides.session_id || uuidv4(),
    participant_id: overrides.participant_id || uuidv4(),
    amount_paid: 100,
    payment_method: 'cash',
    skip: false,
    recorded_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Category Factory
 */
export function buildCategory(overrides = {}) {
  const id = nextId();
  return {
    id: uuidv4(),
    name: `Category ${id}`,
    emoji: '🥬',
    order_index: id,
    is_active: true,
    ...overrides,
  };
}

/**
 * Invite Factory
 */
export function buildInvite(overrides = {}) {
  return {
    id: uuidv4(),
    session_id: overrides.session_id || uuidv4(),
    invite_token: uuidv4().substring(0, 8),
    status: 'pending',
    claimed_by: null,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(), // 20 minutes
    ...overrides,
  };
}

/**
 * Nickname Factory
 */
export function buildNickname(overrides = {}) {
  const id = nextId();
  return {
    id: uuidv4(),
    name: `Nickname${id}`,
    gender: 'neutral',
    is_available: true,
    currently_used_in: null,
    ...overrides,
  };
}

/**
 * Bill Item Factory (for bill calculation)
 */
export function buildBillItem(overrides = {}) {
  const catalogItem = buildCatalogItem();
  return {
    item_id: catalogItem.item_id,
    name: catalogItem.name,
    emoji: catalogItem.emoji,
    total_quantity: 1,
    price_per_unit: 20,
    participants: [],
    ...overrides,
  };
}

/**
 * API Response Factories
 */
export function buildApiResponse(data, success = true) {
  return {
    success,
    data,
    error: success ? null : 'An error occurred',
  };
}

export function buildErrorResponse(error = 'An error occurred', statusCode = 500) {
  return {
    success: false,
    error,
    statusCode,
  };
}

/**
 * Complex Scenario Builders
 */

/**
 * Build a complete session with participants and items
 */
export function buildCompleteSession({
  participantCount = 2,
  itemsPerParticipant = 2,
  ...sessionOverrides
} = {}) {
  const session = buildSession(sessionOverrides);
  const catalogItems = Array.from({ length: itemsPerParticipant }, (_, i) =>
    buildCatalogItem({ item_id: `v${String(i + 1).padStart(3, '0')}` })
  );

  const participants = Array.from({ length: participantCount }, (_, i) => {
    const participant = buildParticipant({
      session_id: session.id,
      nickname: `User${i + 1}`,
    });

    // Create items for this participant
    const items = catalogItems.reduce((acc, catalogItem, idx) => {
      acc[catalogItem.item_id] = (idx + 1) * 0.5; // Varying quantities
      return acc;
    }, {});

    return {
      ...participant,
      items,
    };
  });

  return {
    session,
    participants,
    catalogItems,
  };
}

/**
 * Build a session with bill data
 */
export function buildSessionWithBill({
  participantCount = 2,
  itemCount = 3,
  ...sessionOverrides
} = {}) {
  const session = buildSession(sessionOverrides);
  const participants = Array.from({ length: participantCount }, (_, i) =>
    buildParticipant({
      session_id: session.id,
      nickname: `User${i + 1}`,
    })
  );

  const billItems = Array.from({ length: itemCount }, (_, i) => {
    const catalogItem = buildCatalogItem({ item_id: `v${String(i + 1).padStart(3, '0')}` });
    return buildBillItem({
      item_id: catalogItem.item_id,
      name: catalogItem.name,
      emoji: catalogItem.emoji,
      total_quantity: participantCount * 0.5,
      participants: participants.map(p => ({
        participant_id: p.id,
        nickname: p.nickname,
        quantity: 0.5,
        amount: 10,
      })),
    });
  });

  const totals = {
    subtotal: billItems.reduce((sum, item) => sum + item.total_quantity * item.price_per_unit, 0),
    total: billItems.reduce((sum, item) => sum + item.total_quantity * item.price_per_unit, 0),
  };

  return {
    session,
    participants,
    items: billItems,
    totals,
  };
}

/**
 * Reset the ID counter (useful between tests)
 */
export function resetFactories() {
  counter = 0;
}
