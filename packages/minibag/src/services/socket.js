/**
 * WebSocket Service Layer
 * Handles real-time communication via Socket.IO
 */

import { io } from 'socket.io-client';

// Use empty string to connect to same origin (works with Vite proxy)
const SOCKET_URL = import.meta.env.VITE_WS_URL || '';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
    this.currentSessionId = null;
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      this.connected = true;

      // Rejoin session if we were in one (wait for confirmation)
      if (this.currentSessionId) {
        this.joinSessionRoom(this.currentSessionId).catch(err => {
          console.error('Failed to rejoin session room on reconnect:', err);
        });
      }
    });

    this.socket.on('disconnect', (reason) => {
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    return this.socket;
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.currentSessionId = null;
      this.listeners.clear();
    }
  }

  /**
   * Join a session room for real-time updates
   * Returns a Promise that resolves when the server confirms the join
   * @param {string} sessionId - Session ID to join
   * @returns {Promise<{sessionId: string, participantCount: number}>}
   */
  joinSessionRoom(sessionId) {
    if (!this.socket || !sessionId) {
      console.error('Cannot join room: socket not connected or no sessionId');
      return Promise.reject(new Error('Socket not connected or no sessionId'));
    }

    this.currentSessionId = sessionId;

    return new Promise((resolve, reject) => {
      // Set a timeout in case server doesn't respond
      const timeout = setTimeout(() => {
        reject(new Error('Join session timeout - no confirmation received'));
      }, 5000);

      // Wait for confirmation from server
      this.socket.once('joined-session', (data) => {
        clearTimeout(timeout);
        console.log('✅ Successfully joined session room', {
          sessionId: data.sessionId,
          participantCount: data.participantCount
        });
        resolve(data);
      });

      // Emit the join request
      this.socket.emit('join-session', { sessionId });
    });
  }

  /**
   * Leave the current session room
   */
  leaveSessionRoom() {
    if (!this.socket || !this.currentSessionId) return;

    this.socket.emit('leave-session', { sessionId: this.currentSessionId });
    this.currentSessionId = null;
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  /**
   * Listen for participant joins
   * @param {Function} callback - (participant) => void
   */
  onParticipantJoined(callback) {
    this.on('participant-joined', callback);
  }

  /**
   * Listen for participant leaving
   * @param {Function} callback - (participantId) => void
   */
  onParticipantLeft(callback) {
    this.on('participant-left', callback);
  }

  /**
   * Listen for item additions
   * @param {Function} callback - (item) => void
   */
  onItemAdded(callback) {
    this.on('item-added', callback);
  }

  /**
   * Listen for item updates (quantity, purchased status, etc.)
   * @param {Function} callback - (item) => void
   */
  onItemUpdated(callback) {
    this.on('item-updated', callback);
  }

  /**
   * Listen for item removals
   * @param {Function} callback - (itemId) => void
   */
  onItemRemoved(callback) {
    this.on('item-removed', callback);
  }

  /**
   * Listen for session status changes (legacy)
   * @param {Function} callback - (status) => void
   */
  onSessionStatusChanged(callback) {
    this.on('session-status-changed', callback);
  }

  /**
   * Listen for session status updates (active → shopping → completed)
   * @param {Function} callback - (data) => void, data = { status }
   */
  onSessionStatusUpdated(callback) {
    this.on('session-status-updated', callback);
  }

  /**
   * Listen for payment updates
   * @param {Function} callback - (payment) => void
   */
  onPaymentUpdated(callback) {
    this.on('payment-updated', callback);
  }

  /**
   * Listen for general session updates
   * @param {Function} callback - (session) => void
   */
  onSessionUpdated(callback) {
    this.on('session-updated', callback);
  }

  // ============================================================================
  // EVENT EMITTERS
  // ============================================================================

  /**
   * Notify that user has joined the session
   * @param {Object} participant - Participant data
   */
  emitParticipantJoined(participant) {
    if (!this.currentSessionId) {
      console.error('Cannot emit participant-joined: no session');
      return;
    }
    // emit() helper automatically adds sessionId and timestamp
    this.emit('participant-joined', { participant });
  }

  /**
   * Notify that participant items have been updated
   * @param {string} participantId - Participant ID
   * @param {Object} items - Updated items map
   * @param {Object} metadata - Optional participant metadata (real_name, nickname, items_confirmed)
   */
  emitParticipantItemsUpdated(participantId, items, metadata = {}) {
    if (!this.currentSessionId) {
      console.error('Cannot emit participant-items-updated: no session');
      return;
    }
    this.emit('participant-items-updated', {
      participantId,
      items,
      ...metadata // Include real_name, nickname, items_confirmed for notifications
    });
  }

  /**
   * Notify that an item was added
   * @param {Object} item - Item data
   */
  emitItemAdded(item) {
    this.emit('item-added', item);
  }

  /**
   * Notify that an item was updated
   * @param {Object} item - Updated item data
   */
  emitItemUpdated(item) {
    this.emit('item-updated', item);
  }

  /**
   * Notify that an item was removed
   * @param {number} itemId - Item ID
   */
  emitItemRemoved(itemId) {
    this.emit('item-removed', itemId);
  }

  /**
   * Notify session status change (legacy)
   * @param {string} status - New status
   */
  emitSessionStatusChange(status) {
    this.emit('session-status-changed', status);
  }

  /**
   * Notify session status update (active → shopping → completed)
   * @param {string} status - New status ('active', 'shopping', 'completed')
   */
  emitSessionStatusUpdate(status) {
    if (!this.currentSessionId) {
      console.warn('Cannot emit session-status-updated: session not joined yet');

      // Queue the emit for when socket reconnects
      const retryEmit = () => {
        if (this.currentSessionId) {
          this.emit('session-status-updated', { status });
        }
      };

      // Retry once after 500ms (gives socket time to reconnect)
      setTimeout(() => {
        if (this.currentSessionId) {
          retryEmit();
        }
      }, 500);

      return;
    }

    this.emit('session-status-updated', { status });
  }

  /**
   * Send payment update
   * @param {string} sessionId - Session ID
   * @param {Object} payment - Payment data
   */
  emitPaymentUpdate(sessionId, payment) {
    this.emit('payment-recorded', { sessionId, payment });
  }

  // ============================================================================
  // GENERIC HELPERS
  // ============================================================================

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  on(event, callback) {
    if (!this.socket) {
      console.error('Socket not initialized. Call connect() first.');
      return;
    }

    // Wrap callback with logging for better debugging
    const wrappedCallback = (...args) => {
      console.log(`📥 [SocketService] Received event: "${event}"`, args);
      callback(...args);
    };

    // Store BOTH original and wrapped versions for proper cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push({
      original: callback,
      wrapped: wrappedCallback
    });

    // Register the wrapped version with socket.io
    this.socket.on(event, wrappedCallback);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Event handler to remove
   */
  off(event, callback) {
    if (!this.socket) return;

    // Find the listener object by comparing original callbacks
    const eventListeners = this.listeners.get(event) || [];
    const listener = eventListeners.find(l => l.original === callback);

    if (listener) {
      // Remove the WRAPPED version from socket.io (this is critical!)
      this.socket.off(event, listener.wrapped);

      // Remove from our listeners map
      const index = eventListeners.indexOf(listener);
      eventListeners.splice(index, 1);
    }
  }

  /**
   * Emit an event to the server
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    if (!this.socket || !this.connected) {
      console.error('Cannot emit: socket not connected');
      return;
    }

    this.socket.emit(event, {
      ...data,
      sessionId: this.currentSessionId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners() {
    if (!this.socket) return;

    this.listeners.forEach((listeners, event) => {
      listeners.forEach(listener => {
        // Remove the WRAPPED callback from socket.io
        this.socket.off(event, listener.wrapped);
      });
    });

    this.listeners.clear();
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected && this.socket?.connected;
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId() {
    return this.currentSessionId;
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
