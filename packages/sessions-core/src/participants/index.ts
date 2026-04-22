/**
 * Sessions SDK - Participant Management
 */

export {
  joinSession,
  leaveSession,
  updateParticipant,
  getParticipants,
  verifyParticipant,
} from './lifecycle.js';

export type { JoinSessionOptions, JoinSessionResponse } from './lifecycle.js';
