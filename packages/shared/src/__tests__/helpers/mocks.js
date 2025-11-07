/**
 * Test Mocks and Utilities for Backend Tests
 *
 * Common mocks for testing API endpoints and services
 */

import { vi } from 'vitest';

/**
 * Mock Supabase Client
 */
export function createMockSupabaseClient() {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  return {
    from: vi.fn(() => mockQuery),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        download: vi.fn(),
        remove: vi.fn(),
      })),
    },
  };
}

/**
 * Mock Express Request
 */
export function createMockRequest({
  body = {},
  params = {},
  query = {},
  headers = {},
  session = {},
  user = null,
} = {}) {
  return {
    body,
    params,
    query,
    headers,
    session,
    user,
    get: vi.fn((header) => headers[header.toLowerCase()]),
  };
}

/**
 * Mock Express Response
 */
export function createMockResponse() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
    sendStatus: vi.fn().mockReturnThis(),
    locals: {},
  };
  return res;
}

/**
 * Mock Express Next Function
 */
export function createMockNext() {
  return vi.fn();
}

/**
 * Mock Socket.IO instance
 */
export function createMockSocketIO() {
  const mockSocket = {
    id: 'test-socket-id',
    join: vi.fn(),
    leave: vi.fn(),
    emit: vi.fn(),
    to: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
    rooms: new Set(),
  };

  const mockIO = {
    on: vi.fn(),
    emit: vi.fn(),
    to: vi.fn(() => ({ emit: vi.fn() })),
    in: vi.fn(() => ({ emit: vi.fn() })),
    sockets: {
      adapter: {
        rooms: new Map(),
      },
    },
  };

  return { mockSocket, mockIO };
}

/**
 * Mock Database Responses
 */
export const mockDbResponses = {
  session: {
    id: '123e4567-e89b-12d3-a456-426614174000',
    session_id: 'ABC123',
    session_type: 'minibag',
    host_id: '223e4567-e89b-12d3-a456-426614174000',
    creator_nickname: 'HostUser',
    expected_participants: 5,
    status: 'open',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  },

  participant: {
    id: '323e4567-e89b-12d3-a456-426614174000',
    session_id: '123e4567-e89b-12d3-a456-426614174000',
    nickname: 'TestUser',
    real_name: 'John Doe',
    is_host: false,
    joined_at: new Date().toISOString(),
  },

  catalogItem: {
    id: '423e4567-e89b-12d3-a456-426614174000',
    item_id: 'v001',
    name: 'Tomatoes',
    emoji: '🍅',
    category: 'vegetables',
    unit: 'kg',
    common_quantities: [0.5, 1, 2],
  },

  participantItem: {
    id: '523e4567-e89b-12d3-a456-426614174000',
    participant_id: '323e4567-e89b-12d3-a456-426614174000',
    item_id: '423e4567-e89b-12d3-a456-426614174000',
    quantity: 2,
    created_at: new Date().toISOString(),
  },

  payment: {
    id: '623e4567-e89b-12d3-a456-426614174000',
    session_id: '123e4567-e89b-12d3-a456-426614174000',
    participant_id: '323e4567-e89b-12d3-a456-426614174000',
    item_id: '423e4567-e89b-12d3-a456-426614174000',
    amount_paid: 100,
    skip: false,
    recorded_at: new Date().toISOString(),
  },

  nickname: {
    id: 1,
    nickname: 'CoolCat',
    gender: 'male',
    is_available: true,
    currently_used_in: null,
    reserved_until: null,
    reserved_by_session: null,
  },
};

/**
 * Helper to create successful Supabase response
 */
export function createSuccessResponse(data) {
  return { data, error: null };
}

/**
 * Helper to create error Supabase response
 */
export function createErrorResponse(message, code = 'PGRST000') {
  return {
    data: null,
    error: {
      message,
      code,
      details: null,
      hint: null,
    },
  };
}

/**
 * Wait for async operations
 */
export function waitForAsync(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate UUID for tests
 */
export function generateTestUUID() {
  return '12345678-1234-1234-1234-123456789012';
}

/**
 * Generate session ID for tests
 */
export function generateTestSessionId() {
  return 'TEST123';
}

/**
 * Mock logger
 */
export function createMockLogger() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
}
