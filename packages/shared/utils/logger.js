/**
 * Structured Logging with Pino
 *
 * Centralized logging configuration for MiniBag backend
 * Provides structured JSON logs in production and pretty logs in development
 */

import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';
const isTest = process.env.NODE_ENV === 'test';

/**
 * Pino logger configuration
 */
const loggerConfig = {
  // Log level based on environment
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),

  // Development: Pretty print, Production: JSON
  transport: isDevelopment && !isTest ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
      singleLine: false,
    }
  } : undefined,

  // Base configuration
  base: {
    env: process.env.NODE_ENV,
  },

  // Timestamp format
  timestamp: () => `,"time":"${new Date().toISOString()}"`,

  // Serialize errors properly
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },

  // Redact sensitive fields
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      'secret',
      'api_key',
      'apiKey',
    ],
    remove: true,
  },
};

/**
 * Create the logger instance
 */
const logger = pino(loggerConfig);

/**
 * Child logger with context
 * @param {Object} context - Additional context to include in all logs
 * @returns {Object} Child logger instance
 */
export function createChildLogger(context) {
  return logger.child(context);
}

/**
 * Log levels:
 * - trace: Very detailed debugging (usually disabled)
 * - debug: Detailed debugging information
 * - info: General informational messages
 * - warn: Warning messages
 * - error: Error messages
 * - fatal: Critical errors that cause shutdown
 */

export default logger;
