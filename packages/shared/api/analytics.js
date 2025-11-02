/**
 * Analytics API Routes
 * Endpoints for LocalLoops admin dashboard analytics
 */

import { supabase } from '../db/supabase.js';

/**
 * GET /api/analytics/overview
 * Get platform-wide analytics overview
 */
export async function getAnalyticsOverview(req, res) {
  try {
    // Get all sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*');

    if (sessionsError) throw sessionsError;

    // Get all participants
    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('*');

    if (participantsError) throw participantsError;

    // Get all payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*');

    if (paymentsError) throw paymentsError;

    // Calculate metrics
    const totalSessions = sessions.length;
    const activeSessions = sessions.filter(s => s.status === 'active' || s.status === 'open').length;
    const completedSessions = sessions.filter(s => s.status === 'completed').length;
    const totalParticipants = participants.length;
    const uniqueUsers = new Set(participants.map(p => p.user_id).filter(Boolean)).size;

    // Total revenue from payments
    const totalRevenue = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    // Sessions by type
    const sessionsByType = {
      minibag: sessions.filter(s => s.session_type === 'minibag').length,
      partybag: sessions.filter(s => s.session_type === 'partybag').length,
      fitbag: sessions.filter(s => s.session_type === 'fitbag').length
    };

    // Get last 7 days of activity
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSessions = sessions.filter(s =>
      new Date(s.created_at) >= sevenDaysAgo
    );

    const weeklySessions = recentSessions.length;

    // Completion rate
    const completionRate = totalSessions > 0
      ? Math.round((completedSessions / totalSessions) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        overview: {
          totalSessions,
          activeSessions,
          completedSessions,
          totalParticipants,
          uniqueUsers,
          totalRevenue: Math.round(totalRevenue),
          weeklySessions,
          completionRate
        },
        sessionsByType,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics overview'
    });
  }
}

/**
 * GET /api/analytics/sessions/weekly
 * Get weekly session trends
 */
export async function getWeeklySessionTrends(req, res) {
  try {
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('session_type, created_at')
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group by week and type
    const weeklyData = {};

    sessions.forEach(session => {
      const date = new Date(session.created_at);
      const weekKey = getWeekKey(date);

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          minibag: 0,
          partybag: 0,
          fitbag: 0,
          week: weekKey
        };
      }

      weeklyData[weekKey][session.session_type] =
        (weeklyData[weekKey][session.session_type] || 0) + 1;
    });

    // Convert to array and get last 8 weeks
    const weeks = Object.values(weeklyData)
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-8);

    res.json({
      success: true,
      data: {
        weeks,
        labels: weeks.map((w, i) => `Week ${i + 1}`)
      }
    });
  } catch (error) {
    console.error('Error fetching weekly trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weekly trends'
    });
  }
}

/**
 * GET /api/analytics/revenue
 * Get revenue breakdown by product
 */
export async function getRevenueAnalytics(req, res) {
  try {
    // Get all payments with session info
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount, session_id');

    if (paymentsError) throw paymentsError;

    // Get session types for each payment
    const sessionIds = [...new Set(payments.map(p => p.session_id))];

    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('session_id, session_type')
      .in('session_id', sessionIds);

    if (sessionsError) throw sessionsError;

    // Create session type lookup
    const sessionTypeMap = {};
    sessions.forEach(s => {
      sessionTypeMap[s.session_id] = s.session_type;
    });

    // Calculate revenue by type
    const revenueByType = {
      minibag: 0,
      partybag: 0,
      fitbag: 0
    };

    payments.forEach(payment => {
      const sessionType = sessionTypeMap[payment.session_id];
      if (sessionType) {
        revenueByType[sessionType] += parseFloat(payment.amount) || 0;
      }
    });

    const totalRevenue = Object.values(revenueByType).reduce((sum, val) => sum + val, 0);

    res.json({
      success: true,
      data: {
        revenue: {
          minibag: Math.round(revenueByType.minibag),
          partybag: Math.round(revenueByType.partybag),
          fitbag: Math.round(revenueByType.fitbag),
          total: Math.round(totalRevenue)
        },
        percentages: {
          minibag: totalRevenue > 0 ? Math.round((revenueByType.minibag / totalRevenue) * 100) : 0,
          partybag: totalRevenue > 0 ? Math.round((revenueByType.partybag / totalRevenue) * 100) : 0,
          fitbag: totalRevenue > 0 ? Math.round((revenueByType.fitbag / totalRevenue) * 100) : 0
        }
      }
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue analytics'
    });
  }
}

/**
 * GET /api/analytics/sessions/recent
 * Get recent sessions with details
 */
export async function getRecentSessions(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const { data: sessions, error } = await supabase
      .from('sessions')
      .select(`
        *,
        participants (count)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('Error fetching recent sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent sessions'
    });
  }
}

/**
 * GET /api/analytics/sessions/completions
 * Get session completion metrics for LocalLoops analytics
 */
export async function getSessionCompletions(req, res) {
  try {
    const { start_date, end_date, session_type } = req.query;

    // Build query for completed sessions
    let query = supabase
      .from('sessions')
      .select('*')
      .not('completed_at', 'is', null);

    if (start_date) query = query.gte('completed_at', start_date);
    if (end_date) query = query.lte('completed_at', end_date);
    if (session_type) query = query.eq('session_type', session_type);

    const { data: sessions, error: sessionsError } = await query;

    if (sessionsError) throw sessionsError;

    // Get payments for revenue calculations
    const sessionIds = sessions.map(s => s.id);
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('session_id, amount, method, skipped')
      .in('session_id', sessionIds);

    if (paymentsError) throw paymentsError;

    // Calculate metrics
    const totalCompleted = sessions.length;
    const soloSessions = sessions.filter(s => s.participant_count === 0).length;
    const groupSessions = sessions.filter(s => s.participant_count > 0).length;
    const financiallySettled = sessions.filter(s => s.financially_settled_at).length;

    // Calculate average duration (in minutes)
    const durations = sessions.map(s => {
      const start = new Date(s.created_at);
      const end = new Date(s.completed_at);
      return (end - start) / 60000; // Convert to minutes
    });
    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
      : 0;

    // Revenue metrics (excluding skipped items)
    let totalRevenue = 0;
    let upiAmount = 0;
    let cashAmount = 0;
    let itemsPurchased = 0;

    payments.forEach(payment => {
      if (!payment.skipped) {
        const amount = parseFloat(payment.amount) || 0;
        totalRevenue += amount;
        itemsPurchased++;

        if (payment.method === 'upi') {
          upiAmount += amount;
        } else if (payment.method === 'cash') {
          cashAmount += amount;
        }
      }
    });

    // Group by session type
    const byType = {
      minibag: {
        count: sessions.filter(s => s.session_type === 'minibag').length,
        solo: sessions.filter(s => s.session_type === 'minibag' && s.participant_count === 0).length,
        group: sessions.filter(s => s.session_type === 'minibag' && s.participant_count > 0).length
      },
      partybag: {
        count: sessions.filter(s => s.session_type === 'partybag').length,
        solo: sessions.filter(s => s.session_type === 'partybag' && s.participant_count === 0).length,
        group: sessions.filter(s => s.session_type === 'partybag' && s.participant_count > 0).length
      },
      fitbag: {
        count: sessions.filter(s => s.session_type === 'fitbag').length,
        solo: sessions.filter(s => s.session_type === 'fitbag' && s.participant_count === 0).length,
        group: sessions.filter(s => s.session_type === 'fitbag' && s.participant_count > 0).length
      }
    };

    res.json({
      success: true,
      data: {
        overview: {
          totalCompleted,
          soloSessions,
          groupSessions,
          financiallySettled,
          avgDurationMinutes: avgDuration
        },
        financial: {
          totalRevenue: Math.round(totalRevenue),
          upiAmount: Math.round(upiAmount),
          cashAmount: Math.round(cashAmount),
          itemsPurchased
        },
        byType,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching session completions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session completions'
    });
  }
}

// Helper function to get week key (YYYY-WW format)
function getWeekKey(date) {
  const year = date.getFullYear();
  const firstDayOfYear = new Date(year, 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  return `${year}-W${String(weekNumber).padStart(2, '0')}`;
}
