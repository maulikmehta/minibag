/**
 * Dashboard Monitoring API
 * Provides session health metrics and real-time monitoring data
 */

import { getDatabaseClient } from '../database/client.js';
import { DashboardMetricsSchema, SessionMonitorDataSchema } from '../schemas/index.js';
import { z } from 'zod';

const prisma = getDatabaseClient();

export interface DashboardMetrics {
  status: {
    sdk_running: boolean;
    database_connected: boolean;
    websocket_connected: boolean;
  };
  sessions: {
    active_count: number;
    completed_today: number;
    completion_rate: number;
  };
  nickname_pool: {
    available: number;
    reserved: number;
    in_use: number;
  };
  sessions_list: SessionMonitorData[];
}

export interface SessionMonitorData {
  session_id: string;
  created_at: string;
  milestone: 'created' | 'gathering' | 'checkpoint' | 'active' | 'completed' | 'expired' | 'cancelled';
  is_solo: boolean;
  expected_participants: number;
  max_participants: number;
  joined_count: number;
  declined_count: number;
  timed_out_count: number;
  age_minutes: number;
  completed_at: string | null;
  status: 'waiting' | 'partial' | 'ready' | 'running' | 'done' | 'timeout' | 'cancelled';
}

/**
 * Calculate session milestone based on state
 */
function calculateMilestone(session: any): SessionMonitorData['milestone'] {
  // Completed states
  if (session.status === 'completed') return 'completed';
  if (session.status === 'cancelled') return 'cancelled';
  if (session.status === 'expired') return 'expired';

  // Active coordination
  if (session.status === 'active' || session.status === 'shopping') {
    return 'active';
  }

  // Checkpoint: all expected participants ready
  if (session.checkpoint_complete === true) {
    return 'checkpoint';
  }

  // Gathering: some participants joined/declined
  const hasResponses = session.joined_count > 0 || session.declined_count > 0 || session.timed_out_count > 0;
  if (hasResponses) {
    return 'gathering';
  }

  // Default: just created
  return 'created';
}

/**
 * Calculate human-readable status
 */
function calculateStatus(session: any): SessionMonitorData['status'] {
  const milestone = calculateMilestone(session);

  // Terminal states
  if (milestone === 'completed') return 'done';
  if (milestone === 'expired') return 'timeout';
  if (milestone === 'cancelled') return 'cancelled';

  // Active states
  if (milestone === 'active') return 'running';
  if (milestone === 'checkpoint') return 'ready';

  // Solo sessions
  if (session.is_solo && milestone === 'created') {
    return 'running'; // Solo sessions are ready immediately
  }

  // Gathering/created states
  if (session.joined_count > 0 && session.joined_count < session.expected_participants) {
    return 'partial';
  }

  return 'waiting';
}

/**
 * Get dashboard monitoring data
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    const dbConnected = true;

    // Get session metrics for last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Query sessions with participant counts
    const sessionsData = await prisma.$queryRaw<any[]>`
      SELECT
        s.session_id,
        s.created_at,
        s.status,
        s.expected_participants,
        s.max_participants,
        s.checkpoint_complete,
        s.completed_at,

        -- Session type
        CASE WHEN s.expected_participants = 0 THEN true ELSE false END as is_solo,

        -- Count joined participants (active, not declined, not left)
        COUNT(p.id) FILTER (
          WHERE p.marked_not_coming = false
          AND p.left_at IS NULL
        ) as joined_count,

        -- Count declined participants
        COUNT(p.id) FILTER (
          WHERE p.marked_not_coming = true
        ) as declined_count,

        -- Count left participants (timed out or left)
        COUNT(p.id) FILTER (
          WHERE p.left_at IS NOT NULL
          AND p.marked_not_coming = false
        ) as timed_out_count,

        -- Calculate age in minutes (use end time for terminal states)
        CASE
          WHEN s.status IN ('completed', 'cancelled', 'expired') AND s.completed_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (s.completed_at - s.created_at)) / 60
          ELSE
            EXTRACT(EPOCH FROM (NOW() - s.created_at)) / 60
        END as age_minutes

      FROM sessions s
      LEFT JOIN participants p ON p.session_id = s.id
      WHERE s.created_at > ${twentyFourHoursAgo}
      GROUP BY s.id, s.session_id, s.created_at, s.status, s.expected_participants,
               s.max_participants, s.checkpoint_complete, s.completed_at
      ORDER BY s.created_at DESC
      LIMIT 100
    `;

    // Transform to monitor data with Zod validation
    const sessions_list_raw = sessionsData.map((s) => ({
      session_id: s.session_id,
      created_at: s.created_at.toISOString(),
      milestone: calculateMilestone(s),
      is_solo: s.is_solo,
      expected_participants: s.expected_participants || 0,
      max_participants: s.max_participants || 5,
      joined_count: Number(s.joined_count) || 0,
      declined_count: Number(s.declined_count) || 0,
      timed_out_count: Number(s.timed_out_count) || 0,
      age_minutes: Math.round(Number(s.age_minutes) || 0),
      completed_at: s.completed_at ? s.completed_at.toISOString() : null,
      status: calculateStatus(s),
      checkpoint_complete: s.checkpoint_complete || false,
    }));

    // ✅ Validate with Zod schema (prevents runtime errors from schema mismatches)
    const sessions_list = z.array(SessionMonitorDataSchema).parse(sessions_list_raw);

    // Calculate aggregated metrics
    const active_sessions = sessions_list.filter(s =>
      s.milestone !== 'completed' && s.milestone !== 'expired' && s.milestone !== 'cancelled'
    );

    const completed_today = sessions_list.filter(s => s.milestone === 'completed').length;
    const total_sessions = sessions_list.length;
    const completion_rate = total_sessions > 0
      ? Math.round((completed_today / total_sessions) * 100)
      : 0;

    // Get nickname pool stats
    const nicknameStats = await prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*) FILTER (WHERE is_available = true AND reserved_until IS NULL) as available,
        COUNT(*) FILTER (WHERE reserved_until IS NOT NULL AND reserved_until > NOW()) as reserved,
        COUNT(*) FILTER (WHERE is_available = false AND currently_used_in IS NOT NULL) as in_use
      FROM nicknames_pool
    `;

    const nickname_pool = {
      available: Number(nicknameStats[0]?.available) || 0,
      reserved: Number(nicknameStats[0]?.reserved) || 0,
      in_use: Number(nicknameStats[0]?.in_use) || 0,
    };

    const metrics = {
      status: {
        sdk_running: true,
        database_connected: dbConnected,
        websocket_connected: true, // TODO: Get actual WebSocket status
      },
      sessions: {
        active_count: active_sessions.length,
        completed_today,
        completion_rate,
      },
      nickname_pool,
      sessions_list,
    };

    // ✅ Validate final output with Zod (ensures API contract is maintained)
    return DashboardMetricsSchema.parse(metrics);
  } catch (error) {
    console.error('Dashboard metrics error:', error);

    // Provide helpful error message for schema validation failures
    if (error instanceof z.ZodError) {
      console.error('\n❌ Dashboard metrics validation failed!');
      console.error('This usually means the database schema doesn\'t match SDK expectations.\n');
      console.error('Validation errors:', error.issues);
      console.error('\nRun: npm run sdk:check-schema\n');
    }

    throw error;
  }
}
