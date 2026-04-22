/**
 * Sessions SDK - Session Management
 */

// CRUD operations
export {
  createSession,
  getSession,
  updateSession,
  deleteSession,
  completeSession,
  isSessionExpired,
} from './crud.js';

// Types
export type {
  SessionStatus,
  CreateSessionOptions,
  SessionWithParticipants,
  CreateSessionResponse,
  UpdateSessionOptions,
  ApiResponse,
} from './types.js';

export { SessionError, SessionErrorCode } from './types.js';
