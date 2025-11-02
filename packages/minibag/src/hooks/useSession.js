/**
 * useSession Hook
 * Manages session state and real-time updates with localStorage persistence
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createSession, getSession, joinSession, updateSessionStatus } from '../services/api.js';
import socketService from '../services/socket.js';

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
   */
  const persistSession = useCallback((sessionData, participantData, hostToken = null) => {
    try {
      const dataToStore = {
        session: sessionData,
        currentParticipant: participantData,
        timestamp: Date.now()
      };
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(dataToStore));

      // Store host token separately if provided (for session creator only)
      if (hostToken) {
        localStorage.setItem(`host_token_${sessionData.session_id}`, hostToken);
      }
    } catch (err) {
      console.error('Failed to persist session:', err);
    }
  }, []);

  /**
   * Clear persisted session from localStorage
   */
  const clearPersistedSession = useCallback(() => {
    try {
      // Get session ID before clearing, to also remove host token
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const { session: storedSession } = JSON.parse(stored);
        if (storedSession?.session_id) {
          localStorage.removeItem(`host_token_${storedSession.session_id}`);
        }
      }
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (err) {
      console.error('Failed to clear persisted session:', err);
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

      // Check if session is still valid (less than 4 hours old)
      const fourHours = 4 * 60 * 60 * 1000;
      if (Date.now() - timestamp > fourHours) {
        clearPersistedSession();
        return false;
      }

      // Try to reload the session from the server to verify it's still active
      const data = await getSession(storedSession.session_id);

      if (data.session && data.session.status !== 'completed' && data.session.status !== 'cancelled') {
        setSession(data.session);
        setParticipants(data.participants || []);
        setCurrentParticipant(storedParticipant);

        // Join WebSocket room
        socketService.joinSessionRoom(storedSession.session_id);
        setConnected(true);

        return true;
      } else {
        // Session is no longer active
        clearPersistedSession();
        return false;
      }
    } catch (err) {
      console.error('Failed to restore session:', err);
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
      setLoading(true);
      setError(null);

      const data = await getSession(id);
      setSession(data.session);
      setParticipants(data.participants || []);

      // Join WebSocket room
      socketService.joinSessionRoom(id);
      setConnected(true);
    } catch (err) {
      setError(err.message);
      console.error('Failed to load session:', err);
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

      // Join WebSocket room
      socketService.joinSessionRoom(result.session.session_id);
      setConnected(true);

      return result;
    } catch (err) {
      setError(err.message);
      console.error('Failed to create session:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Join an existing session
   */
  const join = async (id, items = [], nicknameData = {}) => {
    try {
      setLoading(true);
      setError(null);

      const result = await joinSession(id, items, nicknameData);

      setSession(result.session);
      setCurrentParticipant(result.participant);

      // Persist session to localStorage
      persistSession(result.session, result.participant);

      // Join WebSocket room first (sets currentSessionId needed for emit)
      socketService.joinSessionRoom(id);
      setConnected(true);

      // Notify others via WebSocket (must be after joinSessionRoom)
      socketService.emitParticipantJoined(result.participant);

      // Reload full session data
      await loadSession(id);

      return result;
    } catch (err) {
      setError(err.message);
      console.error('Failed to join session:', err);
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
      console.error('Failed to update session status:', err);
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

    // Listen for participant joins
    socketService.onParticipantJoined((participant) => {
      setParticipants(prev => {
        // Avoid duplicates
        if (prev.some(p => p.id === participant.id)) {
          return prev;
        }
        return [...prev, participant];
      });
    });

    // Listen for participant leaving
    socketService.onParticipantLeft((participantId) => {
      setParticipants(prev => prev.filter(p => p.id !== participantId));
    });

    // Listen for session updates
    socketService.onSessionUpdated((updatedSession) => {
      setSession(prev => ({ ...prev, ...updatedSession }));
    });

    // Listen for status changes
    socketService.onSessionStatusUpdated((data) => {
      setSession(prev => ({ ...prev, status: data.status }));
    });

    return () => {
      socketService.removeAllListeners();
    };
  }, [session]);

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
      console.error('Failed to add item:', err);
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
      console.error('Failed to update item:', err);
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
      console.error('Failed to remove item:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Listen for real-time item updates
  useEffect(() => {
    socketService.onItemAdded((item) => {
      if (item.participant_id !== participantId) {
        setItems(prev => [...prev, item]);
      }
    });

    socketService.onItemUpdated((updatedItem) => {
      setItems(prev =>
        prev.map(item =>
          item.id === updatedItem.id ? { ...item, ...updatedItem } : item
        )
      );
    });

    socketService.onItemRemoved((itemId) => {
      setItems(prev => prev.filter(item => item.id !== itemId));
    });

    return () => {
      socketService.removeAllListeners();
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
