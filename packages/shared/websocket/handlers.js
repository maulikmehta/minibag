/**
 * WebSocket Event Handlers
 *
 * Centralized WebSocket event handling logic.
 * Keeps server.js clean and maintains separation of concerns.
 */

/**
 * Setup WebSocket event handlers for a socket connection
 * @param {Socket} socket - Socket.IO socket instance
 * @param {Server} io - Socket.IO server instance
 */
export function setupSocketHandlers(socket, io) {
  /**
   * JOIN SESSION ROOM
   * Client joins a session room for real-time updates
   * Sends confirmation back to client with room metadata
   */
  socket.on('join-session', async (data) => {
    const sessionId = data.sessionId || data;

    // Join the session room
    await socket.join(sessionId);

    // Get room size for metadata
    const roomSize = io.sockets.adapter.rooms.get(sessionId)?.size || 0;

    // Send confirmation to the client that joined
    socket.emit('joined-session', {
      sessionId,
      participantCount: roomSize
    });

    // Broadcast to others in the room (optional - for awareness)
    socket.to(sessionId).emit('user-joined', { socketId: socket.id });
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
   */
  socket.on('participant-joined', (data) => {
    const { sessionId, participant } = data;
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
   */
  socket.on('session-status-updated', (data) => {
    const { sessionId, status } = data;
    // Broadcast to all clients in the session room
    io.to(sessionId).emit('session-status-updated', { status });
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
