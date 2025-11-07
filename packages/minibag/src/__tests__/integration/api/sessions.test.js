/**
 * Integration Tests for Session API Endpoints
 * Week 2 Day 7: API integration testing with MSW
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  createSession,
  getSession,
  joinSession,
  updateSessionStatus,
  getShoppingItems,
  getBillItems,
  generateBillToken,
} from '../../../services/api.js';

// Mock data
const mockSession = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  session_id: 'ABC123',
  session_type: 'minibag',
  host_id: '223e4567-e89b-12d3-a456-426614174000',
  creator_nickname: 'HostUser',
  expected_participants: 5,
  status: 'open',
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
};

const mockParticipant = {
  id: '323e4567-e89b-12d3-a456-426614174000',
  session_id: '123e4567-e89b-12d3-a456-426614174000',
  nickname: 'TestUser',
  is_creator: false,
  items: [],
  joined_at: new Date().toISOString(),
};

// Setup MSW server
const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe('Session API Integration Tests', () => {
  describe('createSession', () => {
    it('should create a new session successfully', async () => {
      const responseData = {
        session: mockSession,
        participant: { ...mockParticipant, is_creator: true },
        host_token: 'test-host-token',
      };

      server.use(
        http.post('/api/sessions/create', () => {
          return HttpResponse.json({ data: responseData });
        })
      );

      const result = await createSession({
        location_text: 'Test Market',
        scheduled_time: new Date().toISOString(),
        expected_participants: 5,
      });

      expect(result).toEqual(responseData);
      expect(result.session.session_id).toBe('ABC123');
      expect(result.participant.is_creator).toBe(true);
      expect(result.host_token).toBe('test-host-token');
    });

    it('should handle validation errors', async () => {
      server.use(
        http.post('/api/sessions/create', () => {
          return HttpResponse.json(
            { error: 'Invalid data provided' },
            { status: 400 }
          );
        })
      );

      await expect(
        createSession({ invalid: 'data' })
      ).rejects.toThrow('Invalid data provided');
    });

    it('should handle server errors', async () => {
      server.use(
        http.post('/api/sessions/create', () => {
          return HttpResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        })
      );

      await expect(
        createSession({ location_text: 'Test' })
      ).rejects.toThrow();
    });

    it('should send correct request payload', async () => {
      let receivedBody;

      server.use(
        http.post('/api/sessions/create', async ({ request }) => {
          receivedBody = await request.json();
          return HttpResponse.json({
            data: {
              session: mockSession,
              participant: mockParticipant,
              host_token: 'token',
            },
          });
        })
      );

      const sessionData = {
        location_text: 'Test Market',
        scheduled_time: new Date().toISOString(),
        expected_participants: 5,
        title: 'Weekly Shopping',
      };

      await createSession(sessionData);

      expect(receivedBody).toEqual(sessionData);
    });
  });

  describe('getSession', () => {
    it('should fetch session details successfully', async () => {
      const responseData = {
        session: mockSession,
        participants: [mockParticipant],
      };

      server.use(
        http.get('/api/sessions/ABC123', () => {
          return HttpResponse.json({ data: responseData });
        })
      );

      const result = await getSession('ABC123');

      expect(result).toEqual(responseData);
      expect(result.session.session_id).toBe('ABC123');
      expect(result.participants).toHaveLength(1);
    });

    it('should handle session not found', async () => {
      server.use(
        http.get('/api/sessions/INVALID', () => {
          return HttpResponse.json(
            { error: 'Session not found' },
            { status: 404 }
          );
        })
      );

      await expect(getSession('INVALID')).rejects.toThrow();
    });

    it('should handle expired sessions', async () => {
      const expiredSession = {
        ...mockSession,
        status: 'expired',
      };

      server.use(
        http.get('/api/sessions/ABC123', () => {
          return HttpResponse.json({
            data: {
              session: expiredSession,
              participants: [],
            },
          });
        })
      );

      const result = await getSession('ABC123');

      expect(result.session.status).toBe('expired');
    });

    it('should return session with multiple participants', async () => {
      const participants = [
        mockParticipant,
        { ...mockParticipant, id: 'participant-2', nickname: 'User2' },
        { ...mockParticipant, id: 'participant-3', nickname: 'User3' },
      ];

      server.use(
        http.get('/api/sessions/ABC123', () => {
          return HttpResponse.json({
            data: {
              session: mockSession,
              participants,
            },
          });
        })
      );

      const result = await getSession('ABC123');

      expect(result.participants).toHaveLength(3);
      expect(result.participants[0].nickname).toBe('TestUser');
      expect(result.participants[1].nickname).toBe('User2');
    });
  });

  describe('joinSession', () => {
    it('should join a session successfully', async () => {
      const responseData = {
        session: mockSession,
        participant: mockParticipant,
      };

      server.use(
        http.post('/api/sessions/ABC123/join', () => {
          return HttpResponse.json({ data: responseData });
        })
      );

      const result = await joinSession('ABC123', [], {
        real_name: 'John Doe',
        selected_nickname: 'TestUser',
      });

      expect(result).toEqual(responseData);
      expect(result.participant.nickname).toBe('TestUser');
    });

    it('should join with initial items', async () => {
      let receivedBody;

      server.use(
        http.post('/api/sessions/ABC123/join', async ({ request }) => {
          receivedBody = await request.json();
          return HttpResponse.json({
            data: {
              session: mockSession,
              participant: mockParticipant,
            },
          });
        })
      );

      const items = [
        { item_id: 'v001', quantity: 2, unit: 'kg' },
        { item_id: 'v002', quantity: 1, unit: 'kg' },
      ];

      await joinSession('ABC123', items, { real_name: 'John' });

      expect(receivedBody.items).toEqual(items);
      expect(receivedBody.real_name).toBe('John');
    });

    it('should handle full session error', async () => {
      server.use(
        http.post('/api/sessions/ABC123/join', () => {
          return HttpResponse.json(
            { error: 'Session is full' },
            { status: 403 }
          );
        })
      );

      await expect(
        joinSession('ABC123', [], { real_name: 'John' })
      ).rejects.toThrow();
    });

    it('should handle closed session error', async () => {
      server.use(
        http.post('/api/sessions/ABC123/join', () => {
          return HttpResponse.json(
            { error: 'Session is not accepting new participants' },
            { status: 403 }
          );
        })
      );

      await expect(
        joinSession('ABC123', [], { real_name: 'John' })
      ).rejects.toThrow();
    });
  });

  describe('updateSessionStatus', () => {
    it('should update session status successfully', async () => {
      const updatedSession = {
        ...mockSession,
        status: 'active',
      };

      server.use(
        http.put('/api/sessions/ABC123/status', () => {
          return HttpResponse.json({ data: updatedSession });
        })
      );

      const result = await updateSessionStatus('ABC123', 'active');

      expect(result.status).toBe('active');
    });

    it('should send correct status in request', async () => {
      let receivedBody;

      server.use(
        http.put('/api/sessions/ABC123/status', async ({ request }) => {
          receivedBody = await request.json();
          return HttpResponse.json({
            data: { ...mockSession, status: receivedBody.status },
          });
        })
      );

      await updateSessionStatus('ABC123', 'shopping');

      expect(receivedBody).toEqual({ status: 'shopping' });
    });

    it('should handle unauthorized status update', async () => {
      server.use(
        http.put('/api/sessions/ABC123/status', () => {
          return HttpResponse.json(
            { error: 'Only the host can update status' },
            { status: 403 }
          );
        })
      );

      await expect(
        updateSessionStatus('ABC123', 'active')
      ).rejects.toThrow();
    });

    it('should handle invalid status transition', async () => {
      server.use(
        http.put('/api/sessions/ABC123/status', () => {
          return HttpResponse.json(
            { error: 'Invalid status transition' },
            { status: 400 }
          );
        })
      );

      await expect(
        updateSessionStatus('ABC123', 'invalid')
      ).rejects.toThrow();
    });
  });

  describe('getShoppingItems', () => {
    it('should fetch aggregated shopping items', async () => {
      const responseData = {
        aggregatedItems: {
          v001: {
            item_id: 'v001',
            name: 'Tomatoes',
            totalQuantity: 5,
            participants: ['User1', 'User2'],
          },
        },
        participants: [mockParticipant],
      };

      server.use(
        http.get('/api/sessions/ABC123/shopping-items', () => {
          return HttpResponse.json({ data: responseData });
        })
      );

      const result = await getShoppingItems('ABC123');

      expect(result).toEqual(responseData);
      expect(result.aggregatedItems.v001.totalQuantity).toBe(5);
    });

    it('should handle empty shopping list', async () => {
      server.use(
        http.get('/api/sessions/ABC123/shopping-items', () => {
          return HttpResponse.json({
            data: {
              aggregatedItems: {},
              participants: [],
            },
          });
        })
      );

      const result = await getShoppingItems('ABC123');

      expect(result.aggregatedItems).toEqual({});
      expect(result.participants).toEqual([]);
    });
  });

  describe('getBillItems', () => {
    it('should fetch bill items with payment info', async () => {
      const responseData = {
        participants: [
          {
            id: 'p1',
            nickname: 'User1',
            totalCost: 100,
            amountPaid: 80,
          },
        ],
        totalCost: 100,
      };

      server.use(
        http.get('/api/sessions/ABC123/bill-items', () => {
          return HttpResponse.json({ data: responseData });
        })
      );

      const result = await getBillItems('ABC123');

      expect(result).toEqual(responseData);
      expect(result.totalCost).toBe(100);
      expect(result.participants[0].amountPaid).toBe(80);
    });
  });

  describe('generateBillToken', () => {
    it('should generate bill access token', async () => {
      const responseData = {
        access_token: 'test-token-12345',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      };

      server.use(
        http.post('/api/sessions/ABC123/bill-token', () => {
          return HttpResponse.json({ data: responseData });
        })
      );

      const result = await generateBillToken('ABC123', 'participant-1');

      expect(result.access_token).toBe('test-token-12345');
      expect(result.expires_at).toBeDefined();
    });

    it('should send participant_id in request', async () => {
      let receivedBody;

      server.use(
        http.post('/api/sessions/ABC123/bill-token', async ({ request }) => {
          receivedBody = await request.json();
          return HttpResponse.json({
            data: {
              access_token: 'token',
              expires_at: new Date().toISOString(),
            },
          });
        })
      );

      await generateBillToken('ABC123', 'p1');

      expect(receivedBody).toEqual({ participant_id: 'p1' });
    });

    it('should handle null participant_id for host', async () => {
      let receivedBody;

      server.use(
        http.post('/api/sessions/ABC123/bill-token', async ({ request }) => {
          receivedBody = await request.json();
          return HttpResponse.json({
            data: {
              access_token: 'host-token',
              expires_at: new Date().toISOString(),
            },
          });
        })
      );

      await generateBillToken('ABC123', null);

      expect(receivedBody.participant_id).toBeNull();
    });
  });

  describe('Network and Error Handling', () => {
    it('should handle network errors', async () => {
      server.use(
        http.get('/api/sessions/ABC123', () => {
          return HttpResponse.error();
        })
      );

      await expect(getSession('ABC123')).rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      server.use(
        http.get('/api/sessions/ABC123', async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json({ data: {} });
        })
      );

      // This would need an AbortController in the API implementation
      // For now, just verify the endpoint responds
      const result = await getSession('ABC123');
      expect(result).toBeDefined();
    });

    it('should handle non-JSON responses', async () => {
      server.use(
        http.get('/api/sessions/ABC123', () => {
          return new HttpResponse('Plain text error', {
            status: 500,
            headers: { 'Content-Type': 'text/plain' },
          });
        })
      );

      await expect(getSession('ABC123')).rejects.toThrow();
    });

    it('should handle malformed JSON responses', async () => {
      server.use(
        http.get('/api/sessions/ABC123', () => {
          return new HttpResponse('{ invalid json', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        })
      );

      await expect(getSession('ABC123')).rejects.toThrow();
    });
  });

  describe('Request Headers', () => {
    it('should send correct Content-Type header', async () => {
      let receivedHeaders;

      server.use(
        http.post('/api/sessions/create', ({ request }) => {
          receivedHeaders = Object.fromEntries(request.headers.entries());
          return HttpResponse.json({
            data: {
              session: mockSession,
              participant: mockParticipant,
              host_token: 'token',
            },
          });
        })
      );

      await createSession({ location_text: 'Test' });

      expect(receivedHeaders['content-type']).toBe('application/json');
    });

    it('should send credentials for authentication', async () => {
      let requestCredentials;

      server.use(
        http.get('/api/sessions/ABC123', ({ request }) => {
          requestCredentials = request.credentials;
          return HttpResponse.json({
            data: {
              session: mockSession,
              participants: [],
            },
          });
        })
      );

      await getSession('ABC123');

      // Credentials are set to 'include' for httpOnly cookies
      expect(requestCredentials).toBe('include');
    });
  });
});
