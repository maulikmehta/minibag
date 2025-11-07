/**
 * MSW (Mock Service Worker) Setup for API Mocking
 *
 * Provides realistic API mocking for tests using MSW
 */

import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { mockApiResponses } from './mocks.js';

// Default API base URL (can be overridden in tests)
const API_BASE_URL = 'http://localhost:3000/api';

/**
 * MSW Request Handlers
 */
export const handlers = [
  // Session endpoints
  http.post(`${API_BASE_URL}/sessions`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: {
        ...mockApiResponses.session,
        ...body,
      },
    });
  }),

  http.get(`${API_BASE_URL}/sessions/:sessionId`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        ...mockApiResponses.session,
        session_id: params.sessionId,
      },
    });
  }),

  http.put(`${API_BASE_URL}/sessions/:sessionId`, async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: {
        ...mockApiResponses.session,
        session_id: params.sessionId,
        ...body,
      },
    });
  }),

  // Participant endpoints
  http.post(`${API_BASE_URL}/sessions/:sessionId/join`, async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: {
        participant: {
          ...mockApiResponses.participant,
          session_id: params.sessionId,
          ...body,
        },
        session: {
          ...mockApiResponses.session,
          session_id: params.sessionId,
        },
      },
    });
  }),

  http.get(`${API_BASE_URL}/sessions/:sessionId/participants`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          ...mockApiResponses.participant,
          session_id: params.sessionId,
        },
      ],
    });
  }),

  // Item endpoints
  http.post(`${API_BASE_URL}/items`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: {
        ...mockApiResponses.item,
        ...body,
      },
    });
  }),

  http.put(`${API_BASE_URL}/items/:itemId`, async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: {
        ...mockApiResponses.item,
        id: params.itemId,
        ...body,
      },
    });
  }),

  http.delete(`${API_BASE_URL}/items/:itemId`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: { id: params.itemId },
    });
  }),

  // Catalog endpoints
  http.get(`${API_BASE_URL}/catalog/categories`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: '1', name: 'Vegetables', emoji: '🥬', order_index: 1 },
        { id: '2', name: 'Fruits', emoji: '🍎', order_index: 2 },
      ],
    });
  }),

  http.get(`${API_BASE_URL}/catalog/items`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: '1',
          item_id: 'v001',
          name: 'Tomatoes',
          emoji: '🍅',
          category_id: '1',
          unit: 'kg',
          common_quantities: [0.5, 1, 2],
        },
        {
          id: '2',
          item_id: 'v002',
          name: 'Onions',
          emoji: '🧅',
          category_id: '1',
          unit: 'kg',
          common_quantities: [0.5, 1, 2],
        },
      ],
    });
  }),

  // Payment endpoints
  http.post(`${API_BASE_URL}/sessions/:sessionId/payments`, async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: {
        ...mockApiResponses.payment,
        session_id: params.sessionId,
        ...body,
      },
    });
  }),

  http.get(`${API_BASE_URL}/sessions/:sessionId/bill`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        session_id: params.sessionId,
        items: [],
        participants: [],
        totals: {
          subtotal: 0,
          total: 0,
        },
      },
    });
  }),
];

/**
 * Create MSW server instance
 */
export const server = setupServer(...handlers);

/**
 * Helper to create custom handler for specific test
 */
export function createHandler(method, path, response) {
  const fullPath = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

  const httpMethod = {
    GET: http.get,
    POST: http.post,
    PUT: http.put,
    DELETE: http.delete,
    PATCH: http.patch,
  }[method.toUpperCase()];

  return httpMethod(fullPath, () => {
    if (response instanceof Error) {
      return HttpResponse.json(
        { success: false, error: response.message },
        { status: response.status || 500 }
      );
    }
    return HttpResponse.json(response);
  });
}

/**
 * Helper to simulate API error
 */
export function createErrorHandler(method, path, statusCode = 500, message = 'Internal Server Error') {
  const fullPath = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

  const httpMethod = {
    GET: http.get,
    POST: http.post,
    PUT: http.put,
    DELETE: http.delete,
    PATCH: http.patch,
  }[method.toUpperCase()];

  return httpMethod(fullPath, () => {
    return HttpResponse.json(
      { success: false, error: message },
      { status: statusCode }
    );
  });
}

/**
 * Helper to simulate network error
 */
export function createNetworkErrorHandler(method, path) {
  const fullPath = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

  const httpMethod = {
    GET: http.get,
    POST: http.post,
    PUT: http.put,
    DELETE: http.delete,
    PATCH: http.patch,
  }[method.toUpperCase()];

  return httpMethod(fullPath, () => {
    return HttpResponse.error();
  });
}

export default server;
