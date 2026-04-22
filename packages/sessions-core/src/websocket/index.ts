/**
 * Sessions SDK - WebSocket Support
 * Real-time event synchronization with token-based authentication
 */

// Event handlers
export {
  setupSocketHandlers,
  broadcastToSession,
  notifyParticipantJoined,
  notifyParticipantLeft,
  notifySessionStatusUpdated,
  notifySessionCancelled,
  notifyInviteDeclined,
  notifySlotClaimed,
  notifySessionAutoCompleted,
} from './handlers.js';

// Authentication
export {
  authenticateSocket,
  requireAuth,
  getAuthenticatedParticipantId,
  getAuthenticatedSessionId,
} from './auth.js';

// Types
export type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
  AuthenticateData,
  JoinSessionData,
  LeaveSessionData,
  ParticipantJoinedData,
  ParticipantLeftData,
  ParticipantStatusUpdatedData,
  SessionStatusUpdatedData,
  SessionCancelledData,
  SessionUpdateData,
  InviteDeclinedData,
  SlotClaimedData,
  SessionAutoCompletedData,
} from './types.js';

export type { WebSocketConnection, WebSocketServer } from './handlers.js';
