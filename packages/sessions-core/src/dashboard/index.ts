/**
 * Dashboard Module
 * Optional monitoring dashboard for Sessions SDK
 *
 * Usage:
 * ```typescript
 * import { mountDashboard } from '@sessions/core';
 *
 * mountDashboard(server, {
 *   path: '/sessions-monitor',
 *   auth: {
 *     type: 'basic',
 *     credentials: {
 *       username: 'admin',
 *       password: process.env.DASHBOARD_PASSWORD
 *     }
 *   },
 *   branding: {
 *     productName: 'Minibag Sessions',
 *     primaryColor: '#00B87C'
 *   }
 * });
 * ```
 */

export { mountDashboard, type DashboardConfig } from './mount.js';
export { getDashboardMetrics, type DashboardMetrics, type SessionMonitorData } from './monitor.js';
