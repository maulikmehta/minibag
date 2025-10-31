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
      console.log('Socket already connected');
      return this.socket;
    }

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket.id);
      this.connected = true;

      // Rejoin session if we were in one
      if (this.currentSessionId) {
        this.joinSessionRoom(this.currentSessionId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
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
   * @param {string} sessionId - Session ID to join
   */
  joinSessionRoom(sessionId) {
    if (!this.socket || !sessionId) {
      console.error('Cannot join room: socket not connected or no sessionId');
      return;
    }

    console.log(`🚪 Joining session room: ${sessionId}`);
    this.currentSessionId = sessionId;
    this.socket.emit('join-session', { sessionId });
  }

  /**
   * Leave the current session room
   */
  leaveSessionRoom() {
    if (!this.socket || !this.currentSessionId) return;

    console.log(`🚪 Leaving session room: ${this.currentSessionId}`);
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
   * Listen for session status changes
   * @param {Function} callback - (status) => void
   */
  onSessionStatusChanged(callback) {
    this.on('session-status-changed', callback);
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
   * Notify session status change
   * @param {string} status - New status
   */
  emitSessionStatusChange(status) {
    this.emit('session-status-changed', status);
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

    // Store listener reference for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    this.socket.on(event, callback);
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Event handler to remove
   */
  off(event, callback) {
    if (!this.socket) return;

    this.socket.off(event, callback);

    // Remove from listeners map
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
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

    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        this.socket.off(event, callback);
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
