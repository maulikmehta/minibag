/**
 * Unit Tests for useSession Hook
 * Week 2 Day 7: Comprehensive hook testing with mocks
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSession } from '../../../hooks/useSession.js';

// Mock API services
vi.mock('../../../services/api.js', () => ({
  createSession: vi.fn(),
  getSession: vi.fn(),
  joinSession: vi.fn(),
  updateSessionStatus: vi.fn(),
}));

// Mock socket service
vi.mock('../../../services/socket.js', () => ({
  default: {
    connect: vi.fn(),
    joinSessionRoom: vi.fn().mockResolvedValue(undefined),
    leaveSessionRoom: vi.fn(),
    emitParticipantJoined: vi.fn(),
    emitSessionStatusChange: vi.fn(),
    onParticipantJoined: vi.fn(),
    onParticipantLeft: vi.fn(),
    onSessionUpdated: vi.fn(),
    onSessionStatusUpdated: vi.fn(),
    off: vi.fn(),
  },
}));

// Mock logger
vi.mock('@shared/utils/frontendLogger.js', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Import mocked modules after mocking
import { createSession, getSession, joinSession, updateSessionStatus } from '../../../services/api.js';
import socketService from '../../../services/socket.js';

describe('useSession', () => {
  const mockSession = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    session_id: 'ABC123',
    status: 'open',
    created_at: new Date().toISOString(),
  };

  const mockParticipant = {
    id: '223e4567-e89b-12d3-a456-426614174000',
    session_id: '123e4567-e89b-12d3-a456-426614174000',
    nickname: 'TestUser',
    is_creator: false,
    items: [],
  };

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Clear localStorage
    localStorage.clear();

    // Reset socket service mocks
    socketService.joinSessionRoom.mockResolvedValue(undefined);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useSession());

      expect(result.current.session).toBeNull();
      expect(result.current.participants).toEqual([]);
      expect(result.current.currentParticipant).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.connected).toBe(false);
    });

    it('should connect to socket service on mount', () => {
      renderHook(() => useSession());

      expect(socketService.connect).toHaveBeenCalled();
    });

    it('should cleanup socket on unmount', () => {
      const { unmount } = renderHook(() => useSession());

      unmount();

      expect(socketService.leaveSessionRoom).toHaveBeenCalled();
    });
  });

  describe('create session', () => {
    it('should create a new session successfully', async () => {
      const createResponse = {
        session: mockSession,
        participant: mockParticipant,
        host_token: 'test-token',
      };

      createSession.mockResolvedValue(createResponse);

      const { result } = renderHook(() => useSession());

      let createdSession;
      await act(async () => {
        createdSession = await result.current.create({
          session_type: 'minibag',
          expected_participants: 5,
        });
      });

      await waitFor(() => {
        expect(result.current.session).toEqual(mockSession);
        expect(result.current.currentParticipant).toEqual(mockParticipant);
        expect(result.current.participants).toEqual([mockParticipant]);
        expect(result.current.loading).toBe(false);
        expect(result.current.connected).toBe(true);
      });

      expect(createSession).toHaveBeenCalled();
      expect(socketService.joinSessionRoom).toHaveBeenCalledWith('ABC123');
      expect(createdSession).toEqual(createResponse);
    });

    it('should persist session to localStorage after creation', async () => {
      const createResponse = {
        session: mockSession,
        participant: mockParticipant,
        host_token: 'test-token',
      };

      createSession.mockResolvedValue(createResponse);

      const { result } = renderHook(() => useSession());

      await act(async () => {
        await result.current.create({ session_type: 'minibag' });
      });

      await waitFor(() => {
        const stored = localStorage.getItem('minibag_active_session');
        expect(stored).toBeTruthy();

        const parsedStored = JSON.parse(stored);
        expect(parsedStored.session).toEqual(mockSession);
        expect(parsedStored.currentParticipant).toEqual(mockParticipant);
        expect(parsedStored.timestamp).toBeDefined();
      });
    });

    it('should handle creation errors', async () => {
      const errorMessage = 'Failed to create session';
      createSession.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useSession());

      await act(async () => {
        try {
          await result.current.create({ session_type: 'minibag' });
        } catch (err) {
          expect(err.message).toBe(errorMessage);
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('join session', () => {
    it('should join an existing session successfully', async () => {
      const joinResponse = {
        session: mockSession,
        participant: mockParticipant,
      };

      joinSession.mockResolvedValue(joinResponse);
      getSession.mockResolvedValue({
        session: mockSession,
        participants: [mockParticipant],
      });

      const { result } = renderHook(() => useSession());

      await act(async () => {
        await result.current.join('ABC123', [], { nickname: 'TestUser' });
      });

      await waitFor(() => {
        expect(result.current.session).toEqual(mockSession);
        expect(result.current.currentParticipant).toEqual(mockParticipant);
        expect(result.current.connected).toBe(true);
      });

      expect(joinSession).toHaveBeenCalledWith('ABC123', [], { nickname: 'TestUser' });
      expect(socketService.joinSessionRoom).toHaveBeenCalledWith('ABC123');
      expect(socketService.emitParticipantJoined).toHaveBeenCalledWith(mockParticipant);
    });

    it('should persist session to localStorage after joining', async () => {
      const joinResponse = {
        session: mockSession,
        participant: mockParticipant,
      };

      joinSession.mockResolvedValue(joinResponse);
      getSession.mockResolvedValue({
        session: mockSession,
        participants: [mockParticipant],
      });

      const { result } = renderHook(() => useSession());

      await act(async () => {
        await result.current.join('ABC123');
      });

      await waitFor(() => {
        const stored = localStorage.getItem('minibag_active_session');
        expect(stored).toBeTruthy();
      });
    });

    it('should handle join errors', async () => {
      const errorMessage = 'Session not found';
      joinSession.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useSession());

      await act(async () => {
        try {
          await result.current.join('ABC123');
        } catch (err) {
          expect(err.message).toBe(errorMessage);
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('load session', () => {
    it('should load session data successfully', async () => {
      getSession.mockResolvedValue({
        session: mockSession,
        participants: [mockParticipant],
      });

      const { result } = renderHook(() => useSession());

      await act(async () => {
        await result.current.loadSession('ABC123');
      });

      await waitFor(() => {
        expect(result.current.session).toEqual(mockSession);
        expect(result.current.participants).toEqual([mockParticipant]);
        expect(result.current.loading).toBe(false);
        expect(result.current.connected).toBe(true);
      });

      expect(getSession).toHaveBeenCalledWith('ABC123');
      expect(socketService.joinSessionRoom).toHaveBeenCalledWith('ABC123');
    });

    it('should handle load errors', async () => {
      const errorMessage = 'Failed to load session';
      getSession.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useSession());

      await act(async () => {
        await result.current.loadSession('ABC123');
      });

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
        expect(result.current.loading).toBe(false);
      });
    });

    it('should load session when sessionId prop is provided', async () => {
      getSession.mockResolvedValue({
        session: mockSession,
        participants: [mockParticipant],
      });

      renderHook(() => useSession('ABC123'));

      await waitFor(() => {
        expect(getSession).toHaveBeenCalledWith('ABC123');
      });
    });
  });

  describe('update session status', () => {
    it('should update session status successfully', async () => {
      const updatedSession = { ...mockSession, status: 'active' };

      // Mock initial session load
      getSession.mockResolvedValue({
        session: mockSession,
        participants: [mockParticipant],
      });

      updateSessionStatus.mockResolvedValue(updatedSession);

      const { result } = renderHook(() => useSession());

      // Load the session first
      await act(async () => {
        await result.current.loadSession('ABC123');
      });

      // Now update the status
      await act(async () => {
        await result.current.updateStatus('active');
      });

      await waitFor(() => {
        expect(updateSessionStatus).toHaveBeenCalledWith('ABC123', 'active');
        expect(socketService.emitSessionStatusChange).toHaveBeenCalledWith('active');
      });
    });

    it('should handle update status errors', async () => {
      const errorMessage = 'Failed to update status';

      // Mock initial session load
      getSession.mockResolvedValue({
        session: mockSession,
        participants: [mockParticipant],
      });

      updateSessionStatus.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useSession());

      // Load the session first
      await act(async () => {
        await result.current.loadSession('ABC123');
      });

      // Now try to update (should fail)
      await act(async () => {
        try {
          await result.current.updateStatus('active');
        } catch (err) {
          expect(err.message).toBe(errorMessage);
        }
      });

      await waitFor(() => {
        expect(result.current.error).toBe(errorMessage);
      });
    });

    it('should not update if no session exists', async () => {
      const { result } = renderHook(() => useSession());

      await act(async () => {
        const result_value = await result.current.updateStatus('active');
        expect(result_value).toBeUndefined();
      });

      expect(updateSessionStatus).not.toHaveBeenCalled();
    });
  });

  describe('leave session', () => {
    it('should leave session and clear state', async () => {
      const createResponse = {
        session: mockSession,
        participant: mockParticipant,
        host_token: 'test-token',
      };

      createSession.mockResolvedValue(createResponse);

      const { result } = renderHook(() => useSession());

      // First create a session
      await act(async () => {
        await result.current.create({ session_type: 'minibag' });
      });

      // Then leave it
      await act(() => {
        result.current.leave();
      });

      expect(result.current.session).toBeNull();
      expect(result.current.participants).toEqual([]);
      expect(result.current.currentParticipant).toBeNull();
      expect(result.current.connected).toBe(false);
      expect(socketService.leaveSessionRoom).toHaveBeenCalled();
      expect(localStorage.getItem('minibag_active_session')).toBeNull();
    });
  });

  describe('localStorage persistence', () => {
    it('should restore session from localStorage on mount', async () => {
      const storedData = {
        session: mockSession,
        currentParticipant: mockParticipant,
        timestamp: Date.now(),
      };

      localStorage.setItem('minibag_active_session', JSON.stringify(storedData));

      getSession.mockResolvedValue({
        session: mockSession,
        participants: [mockParticipant],
      });

      const { result } = renderHook(() => useSession());

      await waitFor(() => {
        expect(result.current.session).toEqual(mockSession);
        expect(result.current.currentParticipant).toEqual(mockParticipant);
      });

      expect(getSession).toHaveBeenCalledWith('ABC123');
    });

    it('should clear expired session from localStorage', async () => {
      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000 + 1000);
      const storedData = {
        session: mockSession,
        currentParticipant: mockParticipant,
        timestamp: twoHoursAgo,
      };

      localStorage.setItem('minibag_active_session', JSON.stringify(storedData));

      renderHook(() => useSession());

      await waitFor(() => {
        expect(localStorage.getItem('minibag_active_session')).toBeNull();
      });
    });

    it('should clear session if server status is completed', async () => {
      const storedData = {
        session: mockSession,
        currentParticipant: mockParticipant,
        timestamp: Date.now(),
      };

      localStorage.setItem('minibag_active_session', JSON.stringify(storedData));

      getSession.mockResolvedValue({
        session: { ...mockSession, status: 'completed' },
        participants: [mockParticipant],
      });

      renderHook(() => useSession());

      await waitFor(() => {
        expect(localStorage.getItem('minibag_active_session')).toBeNull();
      });
    });

    it('should handle corrupted localStorage data', async () => {
      localStorage.setItem('minibag_active_session', 'invalid-json');

      const { result } = renderHook(() => useSession());

      await waitFor(() => {
        expect(result.current.session).toBeNull();
        expect(localStorage.getItem('minibag_active_session')).toBeNull();
      });
    });
  });

  describe('real-time updates', () => {
    it('should register WebSocket listeners when session is active', async () => {
      getSession.mockResolvedValue({
        session: mockSession,
        participants: [mockParticipant],
      });

      renderHook(() => useSession('ABC123'));

      await waitFor(() => {
        expect(socketService.onParticipantJoined).toHaveBeenCalled();
        expect(socketService.onParticipantLeft).toHaveBeenCalled();
        expect(socketService.onSessionUpdated).toHaveBeenCalled();
        expect(socketService.onSessionStatusUpdated).toHaveBeenCalled();
      });
    });

    it('should cleanup WebSocket listeners on unmount', async () => {
      getSession.mockResolvedValue({
        session: mockSession,
        participants: [mockParticipant],
      });

      const { unmount } = renderHook(() => useSession('ABC123'));

      await waitFor(() => {
        expect(socketService.onParticipantJoined).toHaveBeenCalled();
      });

      unmount();

      expect(socketService.off).toHaveBeenCalledWith('participant-joined', expect.any(Function));
      expect(socketService.off).toHaveBeenCalledWith('participant-left', expect.any(Function));
      expect(socketService.off).toHaveBeenCalledWith('session-updated', expect.any(Function));
      expect(socketService.off).toHaveBeenCalledWith('session-status-updated', expect.any(Function));
    });
  });

  describe('reload function', () => {
    it('should reload current session', async () => {
      getSession.mockResolvedValue({
        session: mockSession,
        participants: [mockParticipant],
      });

      const { result } = renderHook(() => useSession());

      await act(async () => {
        await result.current.loadSession('ABC123');
      });

      getSession.mockClear();

      await act(async () => {
        result.current.reload();
      });

      await waitFor(() => {
        expect(getSession).toHaveBeenCalledWith('ABC123');
      });
    });

    it('should not reload if no session exists', () => {
      const { result } = renderHook(() => useSession());

      result.current.reload();

      expect(getSession).not.toHaveBeenCalled();
    });
  });

  describe('optimistic updates', () => {
    it('should immediately add optimistic participant before API call', async () => {
      const joinResponse = {
        session: mockSession,
        participant: mockParticipant,
      };

      // Delay the API response to observe optimistic state
      let resolveJoin;
      const joinPromise = new Promise(resolve => {
        resolveJoin = resolve;
      });
      joinSession.mockReturnValue(joinPromise);

      getSession.mockResolvedValue({
        session: mockSession,
        participants: [mockParticipant],
      });

      const { result } = renderHook(() => useSession());

      // Start the join operation
      let joinResult;
      act(() => {
        joinResult = result.current.join('ABC123', [], {
          real_name: 'John Doe',
          selected_nickname: 'TestUser',
          selected_avatar_emoji: '👤'
        });
      });

      // Check optimistic state immediately (before API resolves)
      await waitFor(() => {
        expect(result.current.currentParticipant).toBeDefined();
        expect(result.current.currentParticipant?._optimistic).toBe(true);
        expect(result.current.currentParticipant?.nickname).toBe('TestUser');
        expect(result.current.participants.some(p => p._optimistic)).toBe(true);
      });

      // Now resolve the API call
      await act(async () => {
        resolveJoin(joinResponse);
        await joinResult;
      });

      // Check that optimistic data is replaced with real data
      await waitFor(() => {
        expect(result.current.currentParticipant?._optimistic).toBeUndefined();
        expect(result.current.currentParticipant?.id).toBe(mockParticipant.id);
        expect(result.current.participants.some(p => p._optimistic)).toBe(false);
      });
    });

    it('should rollback optimistic updates on API failure', async () => {
      const errorMessage = 'Session is full';
      joinSession.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useSession());

      // Initial state should be empty
      expect(result.current.currentParticipant).toBeNull();
      expect(result.current.participants).toEqual([]);

      // Attempt to join
      await act(async () => {
        try {
          await result.current.join('ABC123', [], {
            real_name: 'John Doe',
            selected_nickname: 'TestUser'
          });
        } catch (err) {
          expect(err.message).toBe(errorMessage);
        }
      });

      // State should be rolled back to initial
      await waitFor(() => {
        expect(result.current.currentParticipant).toBeNull();
        expect(result.current.participants).toEqual([]);
        expect(result.current.error).toBe(errorMessage);
      });
    });

    it('should mark optimistic participant with temporary ID', async () => {
      // Delay API response to capture optimistic state
      let resolveJoin;
      const joinPromise = new Promise(resolve => {
        resolveJoin = resolve;
      });
      joinSession.mockReturnValue(joinPromise);

      getSession.mockResolvedValue({
        session: mockSession,
        participants: [mockParticipant],
      });

      const { result } = renderHook(() => useSession());

      // Start join operation
      let joinResult;
      act(() => {
        joinResult = result.current.join('ABC123', [], {
          real_name: 'Test',
          selected_nickname: 'User'
        });
      });

      // Wait for optimistic participant to be set
      await waitFor(() => {
        expect(result.current.currentParticipant).not.toBeNull();
      });

      // Verify optimistic participant has temporary ID
      const optimisticParticipant = result.current.currentParticipant;
      expect(optimisticParticipant.id).toMatch(/^temp-/);
      expect(optimisticParticipant._optimistic).toBe(true);

      // Now resolve the API call
      await act(async () => {
        resolveJoin({
          session: mockSession,
          participant: mockParticipant,
        });
        await joinResult;
      });

      // Verify final participant has real ID
      await waitFor(() => {
        expect(result.current.currentParticipant.id).toBe(mockParticipant.id);
        expect(result.current.currentParticipant._optimistic).toBeUndefined();
      });
    });

    it('should not add optimistic participant if marked_not_coming', async () => {
      joinSession.mockResolvedValue({
        session: mockSession,
        participant: { ...mockParticipant, marked_not_coming: true },
      });

      getSession.mockResolvedValue({
        session: mockSession,
        participants: [],
      });

      const { result } = renderHook(() => useSession());

      await act(async () => {
        await result.current.join('ABC123', [], {
          real_name: 'Declined User',
          selected_nickname: 'User',
          marked_not_coming: true
        });
      });

      // Participant should not be in participants list
      await waitFor(() => {
        expect(result.current.participants).toEqual([]);
        expect(result.current.currentParticipant.marked_not_coming).toBe(true);
      });
    });

    it('should replace only the optimistic participant when API succeeds', async () => {
      const existingParticipant = {
        ...mockParticipant,
        id: 'existing-participant-id',
        nickname: 'ExistingUser'
      };

      // Initial state with existing participant
      getSession.mockResolvedValueOnce({
        session: mockSession,
        participants: [existingParticipant],
      });

      const { result } = renderHook(() => useSession('ABC123'));

      await waitFor(() => {
        expect(result.current.participants).toHaveLength(1);
      });

      const newParticipant = {
        ...mockParticipant,
        id: 'new-participant-id',
        nickname: 'NewUser'
      };

      joinSession.mockResolvedValue({
        session: mockSession,
        participant: newParticipant,
      });

      getSession.mockResolvedValue({
        session: mockSession,
        participants: [existingParticipant, newParticipant],
      });

      await act(async () => {
        await result.current.join('ABC123', [], {
          real_name: 'New User',
          selected_nickname: 'NewUser'
        });
      });

      // Should have both participants after join completes
      await waitFor(() => {
        expect(result.current.participants).toHaveLength(2);
        expect(result.current.participants.find(p => p.id === 'existing-participant-id')).toBeDefined();
        expect(result.current.participants.find(p => p.id === 'new-participant-id')).toBeDefined();
        expect(result.current.participants.find(p => p.id?.startsWith('temp-'))).toBeUndefined();
      });
    });
  });
});
