/**
 * TypeScript types for Sessions SDK
 */

import type { Session, Participant } from '@prisma/client';

/**
 * Session status values
 */
export type SessionStatus = 'open' | 'active' | 'completed' | 'cancelled' | 'expired';

/**
 * Options for creating a new session
 */
export interface CreateSessionOptions {
  // Creator info
  creatorNickname: string;
  creatorRealName?: string;
  creatorAvatarEmoji: string;
  nicknameId?: string; // ID of claimed nickname from pool

  // Coordination
  expectedParticipants?: number | null;

  // Authentication
  sessionPin?: string | null; // 4-6 digit PIN
  generatePin?: boolean; // Auto-generate 4-digit PIN

  // Expiry
  expiresInHours?: number; // Default: 24 hours
}

/**
 * Session with participants
 */
export interface SessionWithParticipants extends Session {
  participants: Participant[];
}

/**
 * Create session response
 */
export interface CreateSessionResponse {
  session: Session;
  participant: Participant; // Creator participant
  sessionUrl: string;
  sessionPin?: string | null;
  hostToken: string;
  authToken: string; // For WebSocket authentication
  constantInviteToken?: string | null; // For group mode constant invite links
}

/**
 * Update session options
 */
export interface UpdateSessionOptions {
  status?: SessionStatus;
  expectedParticipants?: number | null;
  checkpointComplete?: boolean;
}

/**
 * Standard API response format
 */
export interface ApiResponse<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Session error codes for structured error handling
 */
export enum SessionErrorCode {
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  INVALID_HOST_TOKEN = 'INVALID_HOST_TOKEN',
  INVALID_SESSION_ID = 'INVALID_SESSION_ID',
  NICKNAME_CLAIM_FAILED = 'NICKNAME_CLAIM_FAILED',
  PARTICIPANT_LIMIT_REACHED = 'PARTICIPANT_LIMIT_REACHED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  RATE_LIMITED = 'RATE_LIMITED', // BUGFIX #9: PIN rate limiting
  INVALID_OPERATION = 'INVALID_OPERATION', // For invalid state transitions
}

/**
 * Structured session error
 */
export class SessionError extends Error {
  constructor(
    public code: SessionErrorCode,
    message: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'SessionError';
  }
}
