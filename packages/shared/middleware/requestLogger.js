/**
 * Request Logging Middleware
 *
 * Adds request ID tracking and HTTP request logging using Pino
 */

import { randomBytes } from 'crypto';
import pinoHttp from 'pino-http';
import logger from '../utils/logger.js';

/**
 * Generate a unique request ID
 * @returns {string} 16-character hex request ID
 */
function generateRequestId() {
  return randomBytes(8).toString('hex');
}

/**
 * Request ID middleware
 * Adds a unique ID to each request for tracking across logs
 */
export function requestIdMiddleware(req, res, next) {
  // Check if request ID already exists (from load balancer, etc.)
  req.id = req.headers['x-request-id'] || generateRequestId();

  // Add request ID to response headers for debugging
  res.setHeader('X-Request-ID', req.id);

  next();
}

/**
 * HTTP request/response logging middleware using Pino
 */
export const httpLogger = pinoHttp({
  logger,

  // Use request ID from our middleware
  genReqId: (req) => req.id,

  // Custom log level based on response status
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    if (res.statusCode >= 300) return 'info';
    return 'info';
  },

  // Custom success message
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },

  // Custom error message
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
  },

  // Custom request properties to log
  customProps: (req, res) => ({
    userId: req.user?.id,
    sessionId: req.params?.sessionId || req.body?.sessionId,
    userAgent: req.headers['user-agent'],
  }),

  // Serialize request/response
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      query: req.query,
      params: req.params,
      // Don't log request body in production (can be large)
      // body: process.env.NODE_ENV === 'development' ? req.body : undefined,
      remoteAddress: req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress,
      userAgent: req.headers?.['user-agent'],
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});

/**
 * Error logging middleware
 * Logs uncaught errors with full context
 */
export function errorLogger(err, req, res, next) {
  // Use req.log if available (from pino-http), otherwise fallback to logger
  const log = req.log || logger;

  log.error({
    err,
    req: {
      id: req.id,
      method: req.method,
      url: req.url,
      params: req.params,
      query: req.query,
    },
  }, 'Unhandled error');

  next(err);
}
