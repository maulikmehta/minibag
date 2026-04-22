/**
 * Zod Schema Definitions for Sessions SDK
 * Single source of truth for all data structures
 */

import { z } from 'zod';

/**
 * Participant Schema
 * Defines structure for session participants with anonymous nicknames
 */
export const ParticipantSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  nickname: z.string(),
  avatar_emoji: z.string(),
  real_name: z.string().nullable(),
  is_creator: z.boolean(),
  auth_token: z.string().nullable(),
  claimed_invite_id: z.string().uuid().nullable(),
  items_confirmed: z.boolean(),
  marked_not_coming: z.boolean(),
  marked_not_coming_at: z.date().nullable(),
  joined_at: z.date(),
  left_at: z.date().nullable(), // ✅ NOT timed_out_at
});

export type Participant = z.infer<typeof ParticipantSchema>;

/**
 * Session Schema
 * Core coordination entity for group sessions
 */
export const SessionSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string(), // Short readable ID (abc123)
  creator_nickname: z.string(),
  creator_real_name: z.string().nullable(),
  status: z.enum(['open', 'active', 'completed', 'cancelled', 'expired']),
  host_token: z.string(),
  session_pin: z.string().nullable(),
  mode: z.enum(['solo', 'group']).nullable(),
  max_participants: z.number().int().positive().nullable(),
  constant_invite_token: z.string().nullable(),
  expected_participants: z.number().int().nonnegative().nullable(),
  expected_participants_set_at: z.date().nullable(),
  checkpoint_complete: z.boolean(),
  created_at: z.date(),
  completed_at: z.date().nullable(),
  cancelled_at: z.date().nullable(),
  expires_at: z.date().nullable(),
});

export type Session = z.infer<typeof SessionSchema>;

/**
 * Nicknames Pool Schema
 * Pre-generated nicknames for anonymous participation
 */
export const NicknamesPoolSchema = z.object({
  id: z.string().uuid(),
  nickname: z.string(),
  avatar_emoji: z.string(),
  is_available: z.boolean(), // ✅ NOT a released_at column
  currently_used_in: z.string().uuid().nullable(),
  reserved_until: z.date().nullable(),
  reserved_by_session: z.string().uuid().nullable(),
  times_used: z.number().int().nonnegative(),
  last_used: z.date().nullable(),
  gender: z.string().nullable(),
  language_origin: z.string().nullable(),
  created_at: z.date(),
});

export type NicknamesPool = z.infer<typeof NicknamesPoolSchema>;

/**
 * Invite Schema
 * Session invitation system
 */
export const InviteSchema = z.object({
  id: z.string().uuid(),
  session_id: z.string().uuid(),
  invite_token: z.string(),
  invite_number: z.number().int().positive().nullable(),
  status: z.enum(['pending', 'claimed', 'expired', 'active']),
  invite_type: z.enum(['constant', 'named']),
  is_constant_link: z.boolean(),
  slot_assignments: z.any().nullable(), // JSON field
  declined_by: z.any().nullable(), // JSON field
  claimed_at: z.date().nullable(),
  created_at: z.date(),
  expires_at: z.date().nullable(),
});

export type Invite = z.infer<typeof InviteSchema>;

/**
 * Dashboard Monitor Data Schema
 * Structure for session monitoring metrics
 */
export const SessionMonitorDataSchema = z.object({
  session_id: z.string(),
  created_at: z.string().datetime(),
  milestone: z.enum(['created', 'gathering', 'checkpoint', 'active', 'completed', 'expired', 'cancelled']),
  is_solo: z.boolean(),
  expected_participants: z.number().int().nonnegative(),
  max_participants: z.number().int().positive(),
  joined_count: z.number().int().nonnegative(),
  declined_count: z.number().int().nonnegative(),
  timed_out_count: z.number().int().nonnegative(), // Actually tracks left_at participants
  age_minutes: z.number().nonnegative(),
  completed_at: z.string().datetime().nullable(),
  status: z.enum(['waiting', 'partial', 'ready', 'running', 'done', 'timeout', 'cancelled']),
  checkpoint_complete: z.boolean().optional(),
});

export type SessionMonitorData = z.infer<typeof SessionMonitorDataSchema>;

/**
 * Dashboard Metrics Schema
 * Complete dashboard API response structure
 */
export const DashboardMetricsSchema = z.object({
  status: z.object({
    sdk_running: z.boolean(),
    database_connected: z.boolean(),
    websocket_connected: z.boolean(),
  }),
  sessions: z.object({
    active_count: z.number().int().nonnegative(),
    completed_today: z.number().int().nonnegative(),
    completion_rate: z.number().int().min(0).max(100),
  }),
  nickname_pool: z.object({
    available: z.number().int().nonnegative(),
    reserved: z.number().int().nonnegative(),
    in_use: z.number().int().nonnegative(),
  }),
  sessions_list: z.array(SessionMonitorDataSchema),
});

export type DashboardMetrics = z.infer<typeof DashboardMetricsSchema>;

/**
 * Database Configuration Schema
 * Validates DATABASE_URL format and settings
 */
export const DatabaseConfigSchema = z.object({
  url: z.string().url(),
  protocol: z.enum(['postgresql', 'postgres']),
  host: z.string(),
  port: z.number().int().positive(),
  database: z.string(),
  username: z.string(),
  password: z.string().optional(),
  isLocal: z.boolean(),
  isSupabase: z.boolean(),
});

export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
