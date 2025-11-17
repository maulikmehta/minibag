/**
 * Simple Admin Authentication Middleware
 * Protects admin-only routes with a PIN/password check against environment variable
 */

import logger from '../utils/logger.js';

/**
 * Middleware to check admin password from Authorization header
 * Usage: Add to routes that require admin access
 *
 * Example:
 *   app.get('/api/analytics/overview', adminAuth, getAnalyticsOverview);
 *
 * Client should send:
 *   Authorization: Bearer <ADMIN_PASSWORD>
 */
export function adminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.warn({ ip: req.ip, endpoint: req.path }, 'Admin access attempted without authorization header');
      return res.status(401).json({
        success: false,
        error: 'Authorization required',
        message: 'Please provide admin credentials'
      });
    }

    // Extract token from "Bearer <token>" format
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    // Check against environment variable
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      logger.error({ endpoint: req.path }, 'ADMIN_PASSWORD environment variable not set');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error'
      });
    }

    if (token !== adminPassword) {
      logger.warn({
        ip: req.ip,
        endpoint: req.path,
        userAgent: req.headers['user-agent']
      }, 'Failed admin authentication attempt');
      return res.status(403).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Authentication successful
    logger.info({ endpoint: req.path }, 'Admin authenticated successfully');
    next();
  } catch (error) {
    logger.error({ err: error, endpoint: req.path }, 'Error in admin authentication middleware');
    return res.status(500).json({
      success: false,
      error: 'Authentication error'
    });
  }
}

/**
 * Alternative: Basic Auth middleware (if you prefer HTTP Basic Authentication)
 * Client sends: Authorization: Basic base64(username:password)
 *
 * Uncomment to use:
 *
 * export function adminBasicAuth(req, res, next) {
 *   const authHeader = req.headers.authorization;
 *
 *   if (!authHeader || !authHeader.startsWith('Basic ')) {
 *     res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
 *     return res.status(401).json({ error: 'Authorization required' });
 *   }
 *
 *   const credentials = Buffer.from(authHeader.slice(6), 'base64').toString();
 *   const [username, password] = credentials.split(':');
 *
 *   if (username === 'admin' && password === process.env.ADMIN_PASSWORD) {
 *     next();
 *   } else {
 *     res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
 *     return res.status(403).json({ error: 'Invalid credentials' });
 *   }
 * }
 */
