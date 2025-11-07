/**
 * Session Validation Schemas
 * Zod schemas for validating session data at API boundaries
 */

import { z } from 'zod';

/**
 * Session status enum
 */
export const SessionStatusSchema = z.enum(['open', 'active', 'shopping', 'completed', 'cancelled', 'expired']);

/**
 * Core session schema
 */
export const SessionSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().length(12), // 12-character hex string
  host_id: z.string().uuid(),
  location_text: z.string().min(1).max(255),
  neighborhood: z.string().max(100).optional().nullable(),
  scheduled_time: z.string().datetime(),
  title: z.string().max(255).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  status: SessionStatusSchema,
  created_at: z.string().datetime(),
  completed_at: z.string().datetime().optional().nullable(),
  expected_participants: z.number().int().min(0).max(3).optional().nullable(),
  expected_participants_set_at: z.string().datetime().optional().nullable(),
  session_pin: z.string().regex(/^\d{4,6}$/).optional().nullable(), // 4-6 digit PIN
  creator_nickname: z.string().min(2).max(20).optional().nullable()
});

/**
 * Schema for creating a new session (request body)
 */
export const CreateSessionSchema = z.object({
  location_text: z.string().min(1, 'Location is required').max(255),
  neighborhood: z.string().max(100).optional(),
  scheduled_time: z.string().datetime('Invalid date/time format'),
  title: z.string().max(255).optional(),
  description: z.string().max(1000).optional(),
  items: z.array(z.object({
    item_id: z.string(),
    quantity: z.number().positive(),
    unit: z.string().optional()
  })).optional().default([]),
  expected_participants: z.number().int().min(0).max(3).nullable().optional(),
  real_name: z.string().min(1).max(100).optional(),
  selected_nickname_id: z.string().uuid().optional(),
  selected_nickname: z.string().min(2).max(20).optional(),
  selected_avatar_emoji: z.string().max(10).optional(),
  session_pin: z.string().regex(/^\d{4,6}$/).nullable().optional(),
  generate_pin: z.boolean().optional()
});

/**
 * Schema for updating session status
 */
export const UpdateSessionStatusSchema = z.object({
  status: SessionStatusSchema
});

/**
 * Schema for updating expected participants
 */
export const UpdateExpectedParticipantsSchema = z.object({
  expected_participants: z.number().int().min(0).max(3).nullable(),
  start_timeout: z.boolean().optional().default(true)
});

/**
 * Schema for join session request
 */
export const JoinSessionSchema = z.object({
  items: z.array(z.object({
    item_id: z.string(),
    quantity: z.number().positive(),
    unit: z.string().optional()
  })).optional().default([]),
  real_name: z.string().min(1).max(100).optional(),
  selected_nickname_id: z.string().uuid().optional(),
  selected_nickname: z.string().regex(/^[a-zA-Z0-9\s]{2,20}$/, 'Nickname must be 2-20 alphanumeric characters').optional(),
  selected_avatar_emoji: z.string().max(10).optional(),
  session_pin: z.string().regex(/^\d{4,6}$/).optional().nullable(),
  marked_not_coming: z.boolean().optional().default(false),
  invite_token: z.string().uuid().optional().nullable()
});

export default SessionSchema;
