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
  console.log('Client connected:', socket.id);

  /**
   * JOIN SESSION ROOM
   * Client joins a session room for real-time updates
   */
  socket.on('join-session', (data) => {
    const sessionId = data.sessionId || data;
    socket.join(sessionId);
    console.log(`Client ${socket.id} joined session ${sessionId}`);
    io.to(sessionId).emit('user-joined', { socketId: socket.id });
  });

  /**
   * LEAVE SESSION ROOM
   * Client leaves a session room
   */
  socket.on('leave-session', (data) => {
    const sessionId = data.sessionId || data;
    socket.leave(sessionId);
    console.log(`Client ${socket.id} left session ${sessionId}`);
    io.to(sessionId).emit('user-left', { socketId: socket.id });
  });

  /**
   * PARTICIPANT JOINED
   * Broadcast when a participant joins the session
   * This updates all clients in real-time with new participant info
   */
  socket.on('participant-joined', (data) => {
    const { sessionId, participant } = data;
    console.log(`Participant joined session ${sessionId}:`, participant);
    // Broadcast to all clients in the session room (including sender)
    io.to(sessionId).emit('participant-joined', participant);
  });

  /**
   * PARTICIPANT LEFT
   * Broadcast when a participant leaves the session
   */
  socket.on('participant-left', (data) => {
    const { sessionId, participantId } = data;
    console.log(`Participant left session ${sessionId}:`, participantId);
    io.to(sessionId).emit('participant-left', participantId);
  });

  /**
   * PARTICIPANT ITEMS UPDATED
   * Broadcast when a participant updates their item selections
   */
  socket.on('participant-items-updated', (data) => {
    const { sessionId, participantId, items } = data;
    console.log(`Participant ${participantId} updated items in session ${sessionId}`);
    // Broadcast to all clients in the session room (so host can see)
    io.to(sessionId).emit('participant-items-updated', { participantId, items });
  });

  /**
   * SESSION STATUS UPDATED
   * Broadcast when session status changes (active → shopping → completed)
   * Used for participant tracking screen updates
   */
  socket.on('session-status-updated', (data) => {
    const { sessionId, status } = data;
    console.log(`Session ${sessionId} status updated to: ${status}`);
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
    console.log(`Payment recorded in session ${sessionId}:`, payment);
  });

  /**
   * PAYMENT EDITED
   * Broadcast when a payment is edited
   */
  socket.on('payment-edited', (data) => {
    const { sessionId, payment } = data;
    io.to(sessionId).emit('payment-updated', payment);
    console.log(`Payment edited in session ${sessionId}:`, payment);
  });

  /**
   * DISCONNECT
   * Cleanup when client disconnects
   */
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
}
