/**
 * Zod validation schemas for Sessions SDK
 * Provides runtime validation and type inference for all API inputs
 */

import { z } from 'zod';

// ============================================================================
// Enums and Constants
// ============================================================================

/**
 * Session mode: solo (no invites) or group (shareable link)
 */
export const SessionModeSchema = z.enum(['solo', 'group']);

/**
 * Session status values
 */
export const SessionStatusSchema = z.enum(['open', 'active', 'completed', 'cancelled', 'expired']);

/**
 * Invite type: constant (single shareable link) or named (traditional numbered invites)
 */
export const InviteTypeSchema = z.enum(['constant', 'named']);

// ============================================================================
// Session Schemas
// ============================================================================

/**
 * Create session request validation
 *
 * Required: creatorNickname, creatorAvatarEmoji
 * Optional: mode, maxParticipants, realName, session settings
 */
export const CreateSessionSchema = z.object({
  // Session mode
  mode: SessionModeSchema.default('solo'),
  maxParticipants: z.number().int().min(1).max(100).optional(),

  // Creator info
  creatorNickname: z.string().min(1).max(50),
  creatorAvatarEmoji: z.string().min(1).max(10), // Allow any emoji string
  creatorRealName: z.string().min(1).max(100).optional(),
  nicknameId: z.string().uuid().optional(),

  // Session settings
  expectedParticipants: z.number().int().min(0).max(100).nullable().optional(),
  sessionPin: z.string().length(4).regex(/^\d{4}$/).nullable().optional(),
  generatePin: z.boolean().optional(),
  expiresInHours: z.number().min(1).max(72).default(2),

  // Location (from existing schema)
  locationType: z.enum(['manual', 'geolocation']).optional(),
  locationText: z.string().max(200).optional(),
  locationLat: z.number().min(-90).max(90).nullable().optional(),
  locationLon: z.number().min(-180).max(180).nullable().optional(),

  // Timing
  scheduledTime: z.string().datetime().or(z.date()).optional(),
  sessionType: z.string().max(50).optional(),
});

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;

/**
 * Update session request validation
 */
export const UpdateSessionSchema = z.object({
  status: SessionStatusSchema.optional(),
  expectedParticipants: z.number().int().min(0).max(100).nullable().optional(),
  checkpointComplete: z.boolean().optional(),
  maxParticipants: z.number().int().min(1).max(100).optional(),
});

export type UpdateSessionInput = z.infer<typeof UpdateSessionSchema>;

// ============================================================================
// Invite Schemas
// ============================================================================

/**
 * Verify constant invite request
 */
export const VerifyConstantInviteSchema = z.object({
  sessionId: z.string().min(12).max(12), // Readable session ID
  constantToken: z.string().length(16),  // 16-char hex token
});

export type VerifyConstantInviteInput = z.infer<typeof VerifyConstantInviteSchema>;

/**
 * Join session request (via constant link)
 */
export const JoinSessionSchema = z.object({
  sessionId: z.string().min(12).max(12),
  constantToken: z.string().length(16),
  nicknameId: z.string().uuid(),
  nickname: z.string().min(1).max(50),
  avatarEmoji: z.string().min(1).max(10),
  realName: z.string().min(1).max(100).optional(),
});

export type JoinSessionInput = z.infer<typeof JoinSessionSchema>;

/**
 * Decline invite request
 */
export const DeclineInviteSchema = z.object({
  sessionId: z.string().min(12).max(12),
  constantToken: z.string().length(16),
  reason: z.string().max(200).optional(),
});

export type DeclineInviteInput = z.infer<typeof DeclineInviteSchema>;

/**
 * Generate invites request (for traditional named invites)
 */
export const GenerateInvitesSchema = z.object({
  sessionId: z.string().uuid(),
  count: z.number().int().min(1).max(10),
});

export type GenerateInvitesInput = z.infer<typeof GenerateInvitesSchema>;

// ============================================================================
// Participant Schemas
// ============================================================================

/**
 * Update participant request
 */
export const UpdateParticipantSchema = z.object({
  itemsConfirmed: z.boolean().optional(),
  markedNotComing: z.boolean().optional(),
  realName: z.string().min(1).max(100).optional(),
});

export type UpdateParticipantInput = z.infer<typeof UpdateParticipantSchema>;

/**
 * Verify participant credentials
 */
export const VerifyParticipantSchema = z.object({
  participantId: z.string().uuid(),
  authToken: z.string().min(32).max(128),
});

export type VerifyParticipantInput = z.infer<typeof VerifyParticipantSchema>;

// ============================================================================
// Nickname Schemas
// ============================================================================

/**
 * Get nickname options request
 */
export const GetNicknameOptionsSchema = z.object({
  firstLetter: z.string().length(1).nullable().optional(),
  sessionId: z.string().uuid().nullable().optional(),
  gender: z.enum(['male', 'female', 'neutral']).optional(),
});

export type GetNicknameOptionsInput = z.infer<typeof GetNicknameOptionsSchema>;

// ============================================================================
// WebSocket Schemas
// ============================================================================

/**
 * WebSocket authentication request
 */
export const AuthenticateSocketSchema = z.object({
  participantId: z.string().uuid(),
  authToken: z.string().min(32).max(128),
});

export type AuthenticateSocketInput = z.infer<typeof AuthenticateSocketSchema>;

/**
 * Join session room request
 */
export const JoinSessionRoomSchema = z.object({
  sessionId: z.string().uuid(),
});

export type JoinSessionRoomInput = z.infer<typeof JoinSessionRoomSchema>;
