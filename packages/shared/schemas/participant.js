/**
 * Participant Validation Schemas
 * Zod schemas for validating participant data at API boundaries
 */

import { z } from 'zod';

/**
 * Core participant schema
 */
export const ParticipantSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  user_id: z.string().uuid().optional().nullable(),
  nickname: z.string().min(2).max(20),
  avatar_emoji: z.string().max(10),
  real_name: z.string().min(1).max(100).optional().nullable(),
  is_creator: z.boolean().default(false),
  items_confirmed: z.boolean().default(false),
  marked_not_coming: z.boolean().default(false),
  marked_not_coming_at: z.string().datetime({ offset: true }).optional().nullable(),
  timed_out_at: z.string().datetime({ offset: true }).optional().nullable(),
  claimed_invite_id: z.string().uuid().optional().nullable(),
  joined_at: z.preprocess(
    // Simplified: Only handle null/undefined here
    // Malformed timestamp normalization is done in transformers
    (val) => val ?? new Date().toISOString(),
    z.string().datetime({ offset: true })
  ),
  locked: z.boolean().default(false),
  locked_at: z.string().datetime({ offset: true }).optional().nullable(),
  // Note: created_at and updated_at don't exist in participants table schema
  // They are kept here as optional for backward compatibility with transformed data
  created_at: z.string().datetime({ offset: true }).optional().nullable(),
  updated_at: z.string().datetime({ offset: true }).optional().nullable(),
  // Joined data
  items: z.array(z.object({
    id: z.string().uuid(),
    item_id: z.string(), // Can be UUID or item_id string
    quantity: z.number().positive(),
    unit: z.string().optional().nullable(),
    catalog_item: z.object({
      item_id: z.string(),
      name_en: z.string().optional().nullable(), // Can be undefined if catalog join fails
      name_hi: z.string().optional().nullable()
    }).optional().nullable()
  })).optional().default([]),
  // Joined invite data (null if participant joined without invite link)
  invite: z.object({
    id: z.string().uuid(),
    invite_number: z.number().int().min(1).max(3),
    invite_token: z.string().length(8),
    status: z.enum(['pending', 'claimed', 'declined', 'expired'])
  }).optional().nullable()
});

/**
 * Schema for updating participant items
 */
export const UpdateParticipantItemsSchema = z.object({
  items: z.record(z.string(), z.number().positive())
});

/**
 * Schema for updating participant status
 */
export const UpdateParticipantStatusSchema = z.object({
  items_confirmed: z.boolean().optional(),
  marked_not_coming: z.boolean().optional()
});

/**
 * Frontend participant format (transformed)
 */
export const FrontendParticipantSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  nickname: z.string(),
  real_name: z.string().optional().nullable(),
  avatar_emoji: z.string().optional().nullable(),
  is_creator: z.boolean(),
  items: z.record(z.string(), z.number().positive()), // Map of item_id to quantity
  marked_not_coming: z.boolean()
});

export default ParticipantSchema;
