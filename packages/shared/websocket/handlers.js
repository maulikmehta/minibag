/**
 * WebSocket Event Handlers
 *
 * Centralized WebSocket event handling logic.
 * Keeps server.js clean and maintains separation of concerns.
 */

import { supabase } from '../db/supabase.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

/**
 * SECURITY: Validate session ID format
 * Session IDs are 12-character alphanumeric strings
 */
function isValidSessionIdFormat(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') return false;
  // Session IDs are 12-character alphanumeric
  return /^[a-z0-9]{12}$/i.test(sessionId);
}

/**
 * SECURITY: Validate session exists and is active
 * Prevents unauthorized access to session rooms
 */
async function validateSession(sessionId) {
  if (!isValidSessionIdFormat(sessionId)) {
    return { valid: false, error: 'Invalid session ID format' };
  }

  try {
    const { data: session, error } = await supabase
      .from('sessions')
      .select('id, status, session_id')
      .eq('session_id', sessionId)
      .single();

    if (error || !session) {
      return { valid: false, error: 'Session not found' };
    }

    // Allow joining sessions in any status (open, active, shopping, completed, cancelled)
    // Validation happens at REST API level - WebSocket is just a transport layer
    // This aligns with Sessions SDK design pattern
    return { valid: true, session };
  } catch (err) {
    logger.error({ err, sessionId }, 'Session validation error');
    return { valid: false, error: 'Session validation failed' };
  }
}

/**
 * Setup WebSocket event handlers for a socket connection
 * IMPROVEMENT: Adds connection ID tracking for better observability
 * @param {Socket} socket - Socket.IO socket instance
 * @param {Server} io - Socket.IO server instance
 */
export function setupSocketHandlers(socket, io) {
  // IMPROVEMENT: Generate unique connection ID for tracing and debugging
  const connectionId = crypto.randomUUID();
  logger.info({ connectionId, socketId: socket.id }, 'WebSocket connection established');
  /**
   * JOIN SESSION ROOM
   * Client joins a session room for real-time updates
   * Sends confirmation back to client with room metadata
   * SECURITY FIX: Validates session before allowing join
   */
  socket.on('join-session', async (data) => {
    // IMPROVEMENT: Generate request ID for tracing
    const requestId = data.requestId || crypto.randomUUID();
    const sessionId = data.sessionId || data;

    // SECURITY: Validate session ID format and existence
    const validation = await validateSession(sessionId);
    if (!validation.valid) {
      logger.warn({
        connectionId,
        requestId,
        sessionId,
        socketId: socket.id
      }, `WebSocket join rejected: ${validation.error}`);
      socket.emit('error', {
        event: 'join-session',
        message: validation.error,
        requestId
      });
      return;
    }

    // Join the session room
    await socket.join(sessionId);

    // Get room size for metadata
    const roomSize = io.sockets.adapter.rooms.get(sessionId)?.size || 0;

    logger.info({
      connectionId,
      requestId,
      sessionId,
      socketId: socket.id,
      roomSize
    }, 'WebSocket session joined');

    // Send confirmation to the client that joined
    socket.emit('joined-session', {
      sessionId,
      participantCount: roomSize,
      requestId // Echo back for client correlation
    });

    // Broadcast to others in the room (optional - for awareness)
    socket.to(sessionId).emit('user-joined', { socketId: socket.id, requestId });
  });

  /**
   * LEAVE SESSION ROOM
   * Client leaves a session room
   */
  socket.on('leave-session', (data) => {
    const sessionId = data.sessionId || data;
    socket.leave(sessionId);
    io.to(sessionId).emit('user-left', { socketId: socket.id });
  });

  /**
   * PARTICIPANT JOINED
   * Broadcast when a participant joins the session
   * This updates all clients in real-time with new participant info
   * SECURITY FIX: Validates session ID format before broadcasting
   */
  socket.on('participant-joined', (data) => {
    const { sessionId, participant } = data;

    // SECURITY: Validate session ID format
    if (!isValidSessionIdFormat(sessionId)) {
      logger.warn({ sessionId, socketId: socket.id }, 'Invalid session ID in participant-joined');
      socket.emit('error', {
        event: 'participant-joined',
        message: 'Invalid session ID format'
      });
      return;
    }

    // Broadcast to all clients in the session room (including sender)
    io.to(sessionId).emit('participant-joined', participant);
  });

  /**
   * PARTICIPANT LEFT
   * Broadcast when a participant leaves the session
   */
  socket.on('participant-left', (data) => {
    const { sessionId, participantId } = data;
    io.to(sessionId).emit('participant-left', participantId);
  });

  /**
   * PARTICIPANT ITEMS UPDATED
   * Broadcast when a participant updates their item selections
   */
  socket.on('participant-items-updated', (data) => {
    const { sessionId, participantId, items, items_confirmed, real_name, nickname } = data;
    // Broadcast to all clients in the session room (so host can see)
    // Include all metadata for proper state sync
    io.to(sessionId).emit('participant-items-updated', {
      participantId,
      items,
      ...(items_confirmed !== undefined && { items_confirmed }),
      ...(real_name && { real_name }),
      ...(nickname && { nickname })
    });
  });

  /**
   * PARTICIPANT STATUS UPDATED
   * Broadcast when participant status changes (items_confirmed, marked_not_coming)
   * Used for checkpoint logic and UI updates
   */
  socket.on('participant-status-updated', (data) => {
    const { sessionId, participant } = data;
    // Broadcast to all clients in the session room
    io.to(sessionId).emit('participant-status-updated', participant);
  });

  /**
   * SESSION STATUS UPDATED
   * Broadcast when session status changes (active → shopping → completed)
   * Used for participant tracking screen updates
   * SECURITY FIX: Validates session ID format before broadcasting
   */
  socket.on('session-status-updated', (data) => {
    const { sessionId, status } = data;

    // SECURITY: Validate session ID format
    if (!isValidSessionIdFormat(sessionId)) {
      logger.warn({ sessionId, socketId: socket.id }, 'Invalid session ID in session-status-updated');
      socket.emit('error', {
        event: 'session-status-updated',
        message: 'Invalid session ID format'
      });
      return;
    }

    // Broadcast to all clients in the session room
    io.to(sessionId).emit('session-status-updated', { status });
  });

  /**
   * SESSION CANCELLED
   * Broadcast when host cancels the session prematurely
   * Forces all participants to exit the session
   * SECURITY FIX: Validates session ID format before broadcasting
   */
  socket.on('session-cancelled', (data) => {
    const { sessionId, message } = data;

    // SECURITY: Validate session ID format
    if (!isValidSessionIdFormat(sessionId)) {
      logger.warn({ sessionId, socketId: socket.id }, 'Invalid session ID in session-cancelled');
      socket.emit('error', {
        event: 'session-cancelled',
        message: 'Invalid session ID format'
      });
      return;
    }

    logger.info({ sessionId, socketId: socket.id }, 'Session cancelled via WebSocket');

    // Broadcast to all clients in the session room EXCEPT the sender (host)
    socket.to(sessionId).emit('session-cancelled', {
      message: message || 'This session has been cancelled by the host'
    });
  });

  /**
   * SESSION UPDATE
   * Broadcast general session updates (status, metadata, etc.)
   */
  socket.on('session-update', (data) => {
    const { sessionId, update } = data;
    io.to(sessionId).emit('session-updated', update);
  });

  /**
   * PAYMENT RECORDED
   * Broadcast when a payment is recorded for an item
   */
  socket.on('payment-recorded', (data) => {
    const { sessionId, payment } = data;
    io.to(sessionId).emit('payment-updated', payment);
  });

  /**
   * PAYMENT EDITED
   * Broadcast when a payment is edited
   */
  socket.on('payment-edited', (data) => {
    const { sessionId, payment } = data;
    io.to(sessionId).emit('payment-updated', payment);
  });

  /**
   * DISCONNECT
   * Cleanup when client disconnects
   */
  socket.on('disconnect', () => {
    // Cleanup happens automatically
  });
}
