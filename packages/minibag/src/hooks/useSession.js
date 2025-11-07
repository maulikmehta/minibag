/**
 * useSession Hook
 * Manages session state and real-time updates with localStorage persistence
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createSession, getSession, joinSession, updateSessionStatus } from '../services/api.js';
import socketService from '../services/socket.js';
import logger from '../../../shared/utils/frontendLogger.js';

const SESSION_STORAGE_KEY = 'minibag_active_session';

/**
 * Hook to manage a shopping session
 * @param {string} sessionId - Optional session ID to load
 */
export function useSession(sessionId = null) {
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [currentParticipant, setCurrentParticipant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);

  const socketConnectedRef = useRef(false);
  const restoredRef = useRef(false);

  /**
   * Persist session to localStorage
   * NOTE: Host token no longer stored - now handled via httpOnly cookie
   */
  const persistSession = useCallback((sessionData, participantData, hostToken = null) => {
    try {
      const dataToStore = {
        session: sessionData,
        currentParticipant: participantData,
        timestamp: Date.now()
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(dataToStore));

      // Host token management removed - now using httpOnly cookies for security
      // The server sets the cookie automatically, no client-side storage needed
    } catch (err) {
      logger.error('Failed to persist session', { error: err.message });
    }
  }, []);

  /**
   * Clear persisted session from localStorage
   * NOTE: Host token cookie cleared by server or via expiration
   */
  const clearPersistedSession = useCallback(() => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      // Host token cookie is httpOnly and managed by server
      // It will expire automatically or can be cleared via /api/logout endpoint
    } catch (err) {
      logger.error('Failed to clear persisted session', { error: err.message });
    }
  }, []);

  /**
   * Restore session from localStorage
   */
  const restoreSession = useCallback(async () => {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!stored) return false;

      const { session: storedSession, currentParticipant: storedParticipant, timestamp } = JSON.parse(stored);

      // Check if session is still valid (less than 2 hours old)
      const twoHours = 2 * 60 * 60 * 1000;
      if (Date.now() - timestamp > twoHours) {
        clearPersistedSession();
        return false;
      }

      // Try to reload the session from the server to verify it's still active
      const data = await getSession(storedSession.session_id);

      if (data.session && data.session.status !== 'completed' && data.session.status !== 'cancelled') {
        setSession(data.session);
        setParticipants(data.participants || []);
        setCurrentParticipant(storedParticipant);

        // Join WebSocket room and wait for confirmation
        await socketService.joinSessionRoom(storedSession.session_id);
        setConnected(true);

        return true;
      } else {
        // Session is no longer active
        clearPersistedSession();
        return false;
      }
    } catch (err) {
      logger.error('Failed to restore session', { error: err.message });
      clearPersistedSession();
      return false;
    }
  }, [clearPersistedSession]);

  // Initialize WebSocket connection and restore session
  useEffect(() => {
    if (!socketConnectedRef.current) {
      socketService.connect();
      socketConnectedRef.current = true;
    }

    // Try to restore session on mount (only once)
    if (!restoredRef.current && !sessionId) {
      restoredRef.current = true;
      restoreSession();
    }

    return () => {
      // Cleanup on unmount
      socketService.leaveSessionRoom();
    };
  }, [restoreSession, sessionId]);

  // Load session if sessionId is provided (moved below loadSession definition)

  /**
   * Load session data from API
   */
  const loadSession = useCallback(async (id) => {
    try {
      logger.debug('loadSession called for session', { sessionId: id });
      setLoading(true);
      setError(null);

      const data = await getSession(id);
      logger.info('getSession API response', {
        sessionId: data.session?.session_id,
        sessionStatus: data.session?.status,
        participantsCount: data.participants?.length,
        participantsWithItems: data.participants?.map(p => ({
          id: p.id,
          nickname: p.nickname,
          is_creator: p.is_creator,
          items_count: p.items?.length
        }))
      });
      setSession(data.session);
      setParticipants(data.participants || []);

      // Join WebSocket room and wait for confirmation
      await socketService.joinSessionRoom(id);
      setConnected(true);
    } catch (err) {
      setError(err.message);
      logger.error('Failed to load session', { sessionId: id, error: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new session
   */
  const create = async (sessionData) => {
    try {
      setLoading(true);
      setError(null);

      const result = await createSession(sessionData);

      setSession(result.session);
      setCurrentParticipant(result.participant);
      setParticipants([result.participant]);

      // Persist session to localStorage (including host_token for creator)
      persistSession(result.session, result.participant, result.host_token);

      // Join WebSocket room and wait for confirmation
      await socketService.joinSessionRoom(result.session.session_id);
      setConnected(true);

      return result;
    } catch (err) {
      setError(err.message);
      logger.error('Failed to create session', { error: err.message });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Join an existing session with optimistic updates
   */
  const join = async (id, items = [], nicknameData = {}) => {
    // Create optimistic participant data
    const optimisticParticipant = {
      id: `temp-${Date.now()}`, // Temporary ID
      session_id: id,
      nickname: nicknameData.selected_nickname || 'You',
      real_name: nicknameData.real_name,
      avatar_emoji: nicknameData.selected_avatar_emoji || '👤',
      is_creator: false,
      items: items,
      joined_at: new Date().toISOString(),
      marked_not_coming: nicknameData.marked_not_coming || false,
      _optimistic: true // Mark as optimistic for UI feedback
    };

    // Store previous state for rollback
    const previousSession = session;
    const previousParticipants = participants;
    const previousCurrentParticipant = currentParticipant;
    const previousConnected = connected;

    try {
      setLoading(true);
      setError(null);

      // OPTIMISTIC UPDATE: Immediately update UI before API call
      setCurrentParticipant(optimisticParticipant);

      // Only add to participants if not marked as not coming
      if (!nicknameData.marked_not_coming) {
        setParticipants(prev => [...prev, optimisticParticipant]);
      }

      logger.info('Optimistic join - UI updated immediately', {
        sessionId: id,
        nickname: nicknameData.selected_nickname
      });

      // Make actual API call
      const result = await joinSession(id, items, nicknameData);

      // API SUCCESS: Replace optimistic data with real data
      setSession(result.session);
      setCurrentParticipant(result.participant);

      // Replace optimistic participant with real participant in list
      setParticipants(prev => {
        const withoutOptimistic = prev.filter(p => p.id !== optimisticParticipant.id);
        // Only add real participant if not marked as not coming
        if (!nicknameData.marked_not_coming) {
          return [...withoutOptimistic, result.participant];
        }
        return withoutOptimistic;
      });

      // Persist session to localStorage
      persistSession(result.session, result.participant);

      // Join WebSocket room first and wait for confirmation
      await socketService.joinSessionRoom(id);
      setConnected(true);

      // Notify others via WebSocket (must be after room join is confirmed)
      if (!nicknameData.marked_not_coming) {
        socketService.emitParticipantJoined(result.participant);
      }

      // Reload full session data to ensure consistency
      await loadSession(id);

      logger.info('Join confirmed - real data received', {
        participantId: result.participant.id
      });

      return result;
    } catch (err) {
      // ROLLBACK: Revert optimistic updates on failure
      logger.error('Join failed - rolling back optimistic updates', {
        sessionId: id,
        error: err.message
      });

      setSession(previousSession);
      setParticipants(previousParticipants);
      setCurrentParticipant(previousCurrentParticipant);
      setConnected(previousConnected);

      setError(err.message);
      logger.error('Failed to join session', { sessionId: id, error: err.message });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update session status
   */
  const updateStatus = async (newStatus) => {
    if (!session) return;

    try {
      const result = await updateSessionStatus(session.session_id, newStatus);
      setSession(result);

      // Notify others via WebSocket
      socketService.emitSessionStatusChange(newStatus);

      return result;
    } catch (err) {
      setError(err.message);
      logger.error('Failed to update session status', { sessionId: session?.session_id, newStatus, error: err.message });
      throw err;
    }
  };

  /**
   * Leave current session
   */
  const leave = useCallback(() => {
    socketService.leaveSessionRoom();
    setSession(null);
    setParticipants([]);
    setCurrentParticipant(null);
    setConnected(false);
    clearPersistedSession();
  }, [clearPersistedSession]);

  // Set up real-time listeners
  useEffect(() => {
    if (!session) return;

    // Store listener references locally for proper cleanup
    const handleParticipantJoined = (participant) => {
      logger.info('participant-joined WebSocket event', {
        participantId: participant.id,
        sessionId: session?.session_id
      });
      setParticipants(prev => {
        // Avoid duplicates
        if (prev.some(p => p.id === participant.id)) {
          logger.warn('Duplicate participant, skipping', { participantId: participant.id });
          return prev;
        }
        logger.debug('Adding new participant to state', { participantId: participant.id });
        return [...prev, participant];
      });
    };

    const handleParticipantLeft = (participantId) => {
      setParticipants(prev => prev.filter(p => p && p.id !== participantId));
    };

    const handleSessionUpdated = (updatedSession) => {
      setSession(prev => ({ ...prev, ...updatedSession }));
    };

    const handleSessionStatusUpdated = (data) => {
      setSession(prev => ({ ...prev, status: data.status }));
    };

    // Register listeners
    socketService.onParticipantJoined(handleParticipantJoined);
    socketService.onParticipantLeft(handleParticipantLeft);
    socketService.onSessionUpdated(handleSessionUpdated);
    socketService.onSessionStatusUpdated(handleSessionStatusUpdated);

    // Cleanup: remove ONLY these specific listeners
    return () => {
      socketService.off('participant-joined', handleParticipantJoined);
      socketService.off('participant-left', handleParticipantLeft);
      socketService.off('session-updated', handleSessionUpdated);
      socketService.off('session-status-updated', handleSessionStatusUpdated);
    };
  }, [session?.session_id]); // Use stable dependency

  // Load session if sessionId is provided
  useEffect(() => {
    if (sessionId) {
      loadSession(sessionId);
    }
  }, [sessionId, loadSession]);

  return {
    session,
    participants,
    currentParticipant,
    loading,
    error,
    connected,
    create,
    join,
    updateStatus,
    leave,
    loadSession,
    reload: () => session && loadSession(session.session_id)
  };
}

/**
 * Hook to manage participant items within a session
 */
export function useParticipantItems(participantId) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Add item to participant's list
   */
  const addItem = async (item) => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Call API endpoint when backend is ready
      // const result = await addParticipantItem(participantId, item);

      // For now, update locally and emit via socket
      const newItem = {
        id: Date.now(), // Temporary ID
        participant_id: participantId,
        ...item
      };

      setItems(prev => [...prev, newItem]);
      socketService.emitItemAdded(newItem);

      return newItem;
    } catch (err) {
      setError(err.message);
      logger.error('Failed to add item', { error: err.message });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update item quantity or other fields
   */
  const updateItem = async (itemId, updates) => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Call API endpoint when backend is ready
      // const result = await updateParticipantItem(itemId, updates);

      setItems(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, ...updates } : item
        )
      );

      socketService.emitItemUpdated({ id: itemId, ...updates });
    } catch (err) {
      setError(err.message);
      logger.error('Failed to update item', { itemId, error: err.message });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Remove item from list
   */
  const removeItem = async (itemId) => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Call API endpoint when backend is ready
      // await deleteParticipantItem(itemId);

      setItems(prev => prev.filter(item => item.id !== itemId));
      socketService.emitItemRemoved(itemId);
    } catch (err) {
      setError(err.message);
      logger.error('Failed to remove item', { itemId, error: err.message });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Listen for real-time item updates
  useEffect(() => {
    // Store listener references locally for proper cleanup
    const handleItemAdded = (item) => {
      if (item.participant_id !== participantId) {
        setItems(prev => [...prev, item]);
      }
    };

    const handleItemUpdated = (updatedItem) => {
      setItems(prev =>
        prev.map(item =>
          item.id === updatedItem.id ? { ...item, ...updatedItem } : item
        )
      );
    };

    const handleItemRemoved = (itemId) => {
      setItems(prev => prev.filter(item => item.id !== itemId));
    };

    // Register listeners
    socketService.onItemAdded(handleItemAdded);
    socketService.onItemUpdated(handleItemUpdated);
    socketService.onItemRemoved(handleItemRemoved);

    // Cleanup: remove ONLY these specific listeners
    return () => {
      socketService.off('item-added', handleItemAdded);
      socketService.off('item-updated', handleItemUpdated);
      socketService.off('item-removed', handleItemRemoved);
    };
  }, [participantId]);

  return {
    items,
    loading,
    error,
    addItem,
    updateItem,
    removeItem
  };
}

export default useSession;
