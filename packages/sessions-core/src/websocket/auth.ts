/**
 * WebSocket Authentication
 * CRITICAL-1 FIX: Token-based authentication instead of cookie-based
 *
 * Replaces broken cookie-based auth that persisted across sessions
 * Now uses participant auth tokens stored in database
 */

import { verifyParticipant } from '../participants/lifecycle.js';
import type { AuthenticateData } from './types.js';

/**
 * Authenticate a WebSocket connection using participant auth token
 * CRITICAL-1 FIX: Token-based auth replaces cookie-based auth
 *
 * @param data - Authentication data (participantId + authToken)
 * @returns Authenticated participant or null
 */
export async function authenticateSocket(data: AuthenticateData) {
  try {
    const { participantId, authToken } = data;

    if (!participantId || !authToken) {
      return {
        success: false,
        error: {
          message: 'participantId and authToken are required',
          code: 'MISSING_CREDENTIALS',
        },
      };
    }

    // Verify participant with server-side validation (CRITICAL-2 fix)
    const { data: participant, error } = await verifyParticipant(
      participantId,
      authToken
    );

    if (error || !participant) {
      return {
        success: false,
        error: {
          message: error?.message || 'Invalid credentials',
          code: 'INVALID_CREDENTIALS',
        },
      };
    }

    // Return authenticated participant info
    return {
      success: true,
      data: {
        participantId: participant.id,
        sessionId: participant.sessionId,
        nickname: participant.nickname,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Authentication failed',
        code: 'AUTH_ERROR',
      },
    };
  }
}

/**
 * Middleware to require authentication before allowing certain events
 *
 * @param socket - Socket connection
 * @returns True if authenticated
 */
export function requireAuth(socket: any): boolean {
  return socket.data?.authenticated === true;
}

/**
 * Get authenticated participant ID from socket
 *
 * @param socket - Socket connection
 * @returns Participant ID or null
 */
export function getAuthenticatedParticipantId(socket: any): string | null {
  return socket.data?.participantId || null;
}

/**
 * Get authenticated session ID from socket
 *
 * @param socket - Socket connection
 * @returns Session ID or null
 */
export function getAuthenticatedSessionId(socket: any): string | null {
  return socket.data?.sessionId || null;
}
