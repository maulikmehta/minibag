/**
 * Test Mocks and Utilities
 *
 * Common mocks for testing MiniBag components
 */

import { vi } from 'vitest';

/**
 * Mock WebSocket/Socket.IO client
 */
export function createMockSocket() {
  return {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: true,
    id: 'mock-socket-id',
  };
}

/**
 * Mock session context
 */
export function createMockSessionContext({
  sessionId = 'TEST123',
  participants = [],
  items = [],
  isHost = false,
  hostToken = null,
} = {}) {
  return {
    sessionId,
    participants,
    items,
    isHost,
    hostToken,
    addParticipant: vi.fn(),
    removeParticipant: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    updateSession: vi.fn(),
  };
}

/**
 * Mock catalog context
 */
export function createMockCatalogContext({
  categories = [],
  items = [],
  loading = false,
} = {}) {
  return {
    categories,
    items,
    loading,
    refreshCatalog: vi.fn(),
  };
}

/**
 * Mock router
 */
export function createMockRouter({
  pathname = '/',
  navigate = vi.fn(),
  params = {},
} = {}) {
  return {
    pathname,
    navigate,
    params,
    location: { pathname, search: '', hash: '', state: null },
    navigate: vi.fn(),
  };
}

/**
 * Mock API responses
 */
export const mockApiResponses = {
  session: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    session_id: 'ABC123',
    session_type: 'minibag',
    host_name: 'Test Host',
    expected_participants: 5,
    status: 'waiting',
    created_at: new Date().toISOString(),
  },
  participant: {
    id: '223e4567-e89b-12d3-a456-426614174000',
    session_id: '123e4567-e89b-12d3-a456-426614174000',
    nickname: 'Test User',
    real_name: 'John Doe',
    is_host: false,
    joined_at: new Date().toISOString(),
  },
  item: {
    id: '323e4567-e89b-12d3-a456-426614174000',
    participant_id: '223e4567-e89b-12d3-a456-426614174000',
    item_name: 'Tomatoes',
    quantity: 2,
    price: 20,
    emoji: '🍅',
    created_at: new Date().toISOString(),
  },
  payment: {
    id: '423e4567-e89b-12d3-a456-426614174000',
    session_id: '123e4567-e89b-12d3-a456-426614174000',
    participant_id: '223e4567-e89b-12d3-a456-426614174000',
    amount_paid: 100,
    payment_method: 'cash',
    skip: false,
    recorded_at: new Date().toISOString(),
  },
};

/**
 * Mock fetch for API calls
 */
export function mockFetch(responses = {}) {
  return vi.fn((url, options) => {
    const method = options?.method || 'GET';
    const key = `${method} ${url}`;

    const response = responses[key] || responses[url];

    if (!response) {
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      });
    }

    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(response),
    });
  });
}

/**
 * Render hook wrapper with providers
 */
export function createWrapper(providers = {}) {
  return function Wrapper({ children }) {
    let content = children;

    // Wrap with provided contexts
    if (providers.session) {
      const SessionContext = providers.session;
      content = <SessionContext.Provider value={providers.sessionValue}>{content}</SessionContext.Provider>;
    }

    if (providers.catalog) {
      const CatalogContext = providers.catalog;
      content = <CatalogContext.Provider value={providers.catalogValue}>{content}</CatalogContext.Provider>;
    }

    return content;
  };
}

/**
 * Wait for async updates
 */
export function waitForAsync(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create mock i18n instance
 */
export function createMockI18n() {
  return {
    t: vi.fn((key) => key),
    changeLanguage: vi.fn(),
    language: 'en',
  };
}

/**
 * Mock local storage
 */
export function mockLocalStorage() {
  const store = {};

  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
    get store() {
      return { ...store };
    },
  };
}
