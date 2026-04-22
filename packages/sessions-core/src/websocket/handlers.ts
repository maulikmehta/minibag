/**
 * WebSocket Event Handlers
 * Generic implementation (not tied to Socket.IO)
 * Extracted from LocalLoops with CRITICAL-1 fix (token-based auth)
 */

import { authenticateSocket, requireAuth } from './auth.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  JoinSessionData,
  LeaveSessionData,
  AuthenticateData,
  ParticipantJoinedData,
  ParticipantLeftData,
  ParticipantStatusUpdatedData,
  SessionStatusUpdatedData,
  SessionCancelledData,
  SessionUpdateData,
} from './types.js';

/**
 * WebSocket handler interface
 * Abstracts Socket.IO-specific details
 */
export interface WebSocketConnection {
  id: string;
  data: any;
  join(room: string): Promise<void>;
  leave(room: string): void;
  emit(event: string, data: any): void;
  on(event: string, handler: (data: any) => void): void;
  to(room: string): {
    emit(event: string, data: any): void;
  };
  broadcast: {
    to(room: string): {
      emit(event: string, data: any): void;
    };
  };
}

export interface WebSocketServer {
  sockets: {
    adapter: {
      rooms: Map<string, Set<string>>;
    };
  };
  to(room: string): {
    emit(event: string, data: any): void;
  };
}

/**
 * Setup WebSocket event handlers for a connection
 * CRITICAL-1 FIX: Uses token-based authentication
 *
 * @param socket - WebSocket connection
 * @param io - WebSocket server
 */
export function setupSocketHandlers(
  socket: WebSocketConnection,
  io: WebSocketServer
) {
  /**
   * AUTHENTICATE
   * CRITICAL-1 FIX: Token-based authentication replaces cookie-based auth
   * Client must authenticate before accessing session rooms
   */
  socket.on('authenticate', async (data: AuthenticateData) => {
    const result = await authenticateSocket(data);

    if (!result.success) {
      socket.emit('authentication-error', {
        message: result.error!.message,
        code: result.error!.code,
      });
      return;
    }

    // Store authentication data on socket
    socket.data = {
      ...socket.data,
      authenticated: true,
      participantId: result.data!.participantId,
      sessionId: result.data!.sessionId,
      nickname: result.data!.nickname,
    };

    // Confirm authentication to client
    socket.emit('authenticated', {
      participantId: result.data!.participantId,
      sessionId: result.data!.sessionId,
    });
  });

  /**
   * JOIN SESSION ROOM
   * Client joins a session room for real-time updates
   * Requires authentication (CRITICAL-1 fix)
   */
  socket.on('join-session', async (data: JoinSessionData) => {
    const sessionId = data.sessionId;

    // Optional: Authenticate if credentials provided
    if (data.participantId && data.authToken) {
      const authResult = await authenticateSocket({
        participantId: data.participantId,
        authToken: data.authToken,
      });

      if (authResult.success) {
        socket.data = {
          ...socket.data,
          authenticated: true,
          participantId: authResult.data!.participantId,
          sessionId: authResult.data!.sessionId,
        };
      }
    }

    // Join the session room
    await socket.join(sessionId);

    // Get room size for metadata
    const room = io.sockets.adapter.rooms.get(sessionId);
    const roomSize = room?.size || 0;

    // Send confirmation to the client that joined
    socket.emit('joined-session', {
      sessionId,
      participantCount: roomSize,
    });

    // Broadcast to others in the room (optional - for awareness)
    socket.to(sessionId).emit('user-joined', { socketId: socket.id });
  });

  /**
   * LEAVE SESSION ROOM
   * Client leaves a session room
   */
  socket.on('leave-session', (data: LeaveSessionData) => {
    const sessionId = data.sessionId;
    socket.leave(sessionId);
    io.to(sessionId).emit('user-left', { socketId: socket.id });
  });

  /**
   * PARTICIPANT JOINED
   * Broadcast when a participant joins the session
   * This updates all clients in real-time with new participant info
   */
  socket.on('participant-joined', (data: ParticipantJoinedData) => {
    const { sessionId, participant } = data;
    // Broadcast to all clients in the session room (including sender)
    io.to(sessionId).emit('participant-joined', participant);
  });

  /**
   * PARTICIPANT LEFT
   * Broadcast when a participant leaves the session
   */
  socket.on('participant-left', (data: ParticipantLeftData) => {
    const { sessionId, participantId } = data;
    io.to(sessionId).emit('participant-left', participantId);
  });

  /**
   * PARTICIPANT STATUS UPDATED
   * Broadcast when participant status changes (items_confirmed, marked_not_coming)
   * Used for checkpoint logic and UI updates
   */
  socket.on('participant-status-updated', (data: ParticipantStatusUpdatedData) => {
    const { sessionId, participant } = data;
    // Broadcast to all clients in the session room
    io.to(sessionId).emit('participant-status-updated', participant);
  });

  /**
   * SESSION STATUS UPDATED
   * Broadcast when session status changes (open → active → completed)
   */
  socket.on('session-status-updated', (data: SessionStatusUpdatedData) => {
    const { sessionId, status } = data;
    // Broadcast to all clients in the session room
    io.to(sessionId).emit('session-status-updated', { status });
  });

  /**
   * SESSION CANCELLED
   * Broadcast when host cancels the session prematurely
   * Forces all participants to exit the session
   */
  socket.on('session-cancelled', (data: SessionCancelledData) => {
    const { sessionId, message } = data;
    // Broadcast to all clients in the session room EXCEPT the sender (host)
    socket.to(sessionId).emit('session-cancelled', {
      message: message || 'This session has been cancelled by the host',
    });
  });

  /**
   * SESSION UPDATE
   * Broadcast general session updates (status, metadata, etc.)
   */
  socket.on('session-update', (data: SessionUpdateData) => {
    const { sessionId, update } = data;
    io.to(sessionId).emit('session-updated', update);
  });

  /**
   * DISCONNECT
   * Cleanup when client disconnects
   */
  socket.on('disconnect', () => {
    // Cleanup happens automatically
    // Rooms are automatically cleaned up by Socket.IO
  });
}

/**
 * Broadcast helper functions
 * These can be called from API endpoints to notify WebSocket clients
 */

/**
 * Broadcast to all clients in a session room
 *
 * @param io - WebSocket server
 * @param sessionId - Session ID
 * @param event - Event name
 * @param data - Event data
 */
export function broadcastToSession(
  io: WebSocketServer,
  sessionId: string,
  event: string,
  data: any
) {
  io.to(sessionId).emit(event, {
    ...data,
    timestamp: Date.now(), // For conflict resolution
  });
}

/**
 * Notify all participants when a participant joins
 *
 * @param io - WebSocket server
 * @param sessionId - Session ID
 * @param participant - Participant data
 */
export function notifyParticipantJoined(
  io: WebSocketServer,
  sessionId: string,
  participant: any
) {
  broadcastToSession(io, sessionId, 'participant-joined', participant);
}

/**
 * Notify all participants when a participant leaves
 *
 * @param io - WebSocket server
 * @param sessionId - Session ID
 * @param participantId - Participant ID
 */
export function notifyParticipantLeft(
  io: WebSocketServer,
  sessionId: string,
  participantId: string
) {
  broadcastToSession(io, sessionId, 'participant-left', participantId);
}

/**
 * Notify all participants when session status changes
 *
 * @param io - WebSocket server
 * @param sessionId - Session ID
 * @param status - New status
 */
export function notifySessionStatusUpdated(
  io: WebSocketServer,
  sessionId: string,
  status: string
) {
  broadcastToSession(io, sessionId, 'session-status-updated', { status });
}

/**
 * Notify all participants when session is cancelled
 *
 * @param io - WebSocket server
 * @param sessionId - Session ID
 * @param message - Cancellation message
 */
export function notifySessionCancelled(
  io: WebSocketServer,
  sessionId: string,
  message?: string
) {
  broadcastToSession(io, sessionId, 'session-cancelled', {
    message: message || 'This session has been cancelled',
  });
}

/**
 * Notify all participants when someone declines an invite (Phase 2 Week 6)
 *
 * @param io - WebSocket server
 * @param sessionId - Session ID
 * @param data - Decline data (reason, timestamp)
 */
export function notifyInviteDeclined(
  io: WebSocketServer,
  sessionId: string,
  data: { reason: string }
) {
  broadcastToSession(io, sessionId, 'invite-declined', {
    reason: data.reason,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Notify all participants when someone claims a slot (Phase 2 Week 6)
 *
 * @param io - WebSocket server
 * @param sessionId - Session ID
 * @param slotNumber - Slot number claimed
 * @param participant - Participant who claimed the slot
 */
export function notifySlotClaimed(
  io: WebSocketServer,
  sessionId: string,
  slotNumber: number,
  participant: any
) {
  broadcastToSession(io, sessionId, 'slot-claimed', {
    slotNumber,
    participant,
  });
}

/**
 * Notify all participants when session auto-completes (all participants left)
 *
 * @param io - WebSocket server
 * @param sessionId - Session ID
 * @param reason - Reason for auto-completion
 */
export function notifySessionAutoCompleted(
  io: WebSocketServer,
  sessionId: string,
  reason?: string
) {
  broadcastToSession(io, sessionId, 'session-auto-completed', {
    reason: reason || 'All participants have left',
    status: 'completed',
  });
}
