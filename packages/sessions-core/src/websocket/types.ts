/**
 * WebSocket Types
 * Event names and payloads for real-time synchronization
 */

import type { Participant } from '@prisma/client';

/**
 * Client-to-Server Events
 */
export interface ClientToServerEvents {
  // Room management
  'join-session': (data: JoinSessionData) => void;
  'leave-session': (data: LeaveSessionData) => void;
  authenticate: (data: AuthenticateData) => void;

  // Participant events
  'participant-joined': (data: ParticipantJoinedData) => void;
  'participant-left': (data: ParticipantLeftData) => void;
  'participant-status-updated': (data: ParticipantStatusUpdatedData) => void;

  // Session events
  'session-status-updated': (data: SessionStatusUpdatedData) => void;
  'session-cancelled': (data: SessionCancelledData) => void;
  'session-update': (data: SessionUpdateData) => void;
}

/**
 * Server-to-Client Events
 */
export interface ServerToClientEvents {
  // Room management
  'joined-session': (data: JoinedSessionData) => void;
  'user-joined': (data: UserJoinedData) => void;
  'user-left': (data: UserLeftData) => void;
  authenticated: (data: AuthenticatedData) => void;
  'authentication-error': (data: AuthenticationErrorData) => void;

  // Participant events
  'participant-joined': (participant: Participant) => void;
  'participant-left': (participantId: string) => void;
  'participant-status-updated': (participant: Participant) => void;

  // Session events
  'session-status-updated': (data: { status: string }) => void;
  'session-cancelled': (data: { message: string }) => void;
  'session-updated': (update: any) => void;

  // Phase 2 Week 6: Constant invite events
  'invite-declined': (data: InviteDeclinedData) => void;
  'slot-claimed': (data: SlotClaimedData) => void;

  // Session lifecycle events
  'session-auto-completed': (data: SessionAutoCompletedData) => void;
}

/**
 * Event Payload Types
 */

// Authentication
export interface AuthenticateData {
  participantId: string;
  authToken: string;
}

export interface AuthenticatedData {
  participantId: string;
  sessionId: string;
}

export interface AuthenticationErrorData {
  message: string;
  code: string;
}

// Join/Leave
export interface JoinSessionData {
  sessionId: string;
  participantId?: string; // Optional if not yet authenticated
  authToken?: string; // For authentication
}

export interface LeaveSessionData {
  sessionId: string;
}

export interface JoinedSessionData {
  sessionId: string;
  participantCount: number;
}

export interface UserJoinedData {
  socketId: string;
}

export interface UserLeftData {
  socketId: string;
}

// Participant events
export interface ParticipantJoinedData {
  sessionId: string;
  participant: Participant;
}

export interface ParticipantLeftData {
  sessionId: string;
  participantId: string;
}

export interface ParticipantStatusUpdatedData {
  sessionId: string;
  participant: Participant;
}

// Session events
export interface SessionStatusUpdatedData {
  sessionId: string;
  status: string;
}

export interface SessionCancelledData {
  sessionId: string;
  message?: string;
}

export interface SessionUpdateData {
  sessionId: string;
  update: any;
}

// Phase 2 Week 6: Constant invite events
export interface InviteDeclinedData {
  reason: string;
  timestamp: string;
}

export interface SlotClaimedData {
  slotNumber: number;
  participant: Participant;
}

// Session lifecycle events
export interface SessionAutoCompletedData {
  reason: string;
  status: string;
}

/**
 * Socket data (stored on each socket connection)
 */
export interface SocketData {
  participantId?: string;
  sessionId?: string;
  authenticated: boolean;
}
