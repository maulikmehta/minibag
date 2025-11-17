/**
 * Sentry Error Tracking - Backend
 *
 * Initializes Sentry for error tracking and performance monitoring
 * Install with: npm install @sentry/node @sentry/profiling-node -w @localloops/shared
 */

// Uncomment after installing @sentry/node
// import * as Sentry from '@sentry/node';
// import { nodeProfilingIntegration } from '@sentry/profiling-node';

import logger from './logger.js';

/**
 * Initialize Sentry
 * Call this at the very top of server.js before any other imports
 */
export function initSentry() {
  // Uncomment after installing @sentry/node and setting SENTRY_DSN in .env

  /*
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';

  if (!dsn) {
    logger.warn('Sentry DSN not configured. Skipping Sentry initialization.');
    return;
  }

  Sentry.init({
    dsn,
    environment,

    // Performance Monitoring
    integrations: [
      // Enable HTTP instrumentation
      Sentry.httpIntegration(),
      // Enable Express instrumentation
      Sentry.expressIntegration(),
      // Enable Profiling
      nodeProfilingIntegration(),
    ],

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

    // Set profilesSampleRate to 1.0 to profile 100% of sampled transactions.
    // We recommend adjusting this value in production
    profilesSampleRate: environment === 'production' ? 0.1 : 1.0,

    // Filter out non-error noise
    beforeSend(event, hint) {
      // Don't send events in development (optional)
      if (environment === 'development') {
        logger.debug({ event }, 'Sentry event (dev - not sent)');
        return null; // Comment this line to send events in dev
      }

      // Add custom tags
      if (event.tags) {
        event.tags.app = 'minibag-backend';
      }

      return event;
    },

    // Don't capture breadcrumbs for console in production
    beforeBreadcrumb(breadcrumb, hint) {
      if (breadcrumb.category === 'console' && environment === 'production') {
        return null;
      }
      return breadcrumb;
    },
  });

  logger.info(`✓ Sentry initialized (${environment})`);
  */

  logger.info('ℹ Sentry not initialized - install @sentry/node and configure SENTRY_DSN');
}

/**
 * Get Sentry request handler middleware
 * Add this AFTER all controllers but BEFORE error handlers
 */
export function getSentryRequestHandler() {
  // Uncomment after installing @sentry/node
  // return Sentry.Handlers.requestHandler();

  return (req, res, next) => next(); // No-op middleware
}

/**
 * Get Sentry tracing handler middleware
 * Add this AFTER requestHandler but BEFORE routes
 */
export function getSentryTracingHandler() {
  // Uncomment after installing @sentry/node
  // return Sentry.Handlers.tracingHandler();

  return (req, res, next) => next(); // No-op middleware
}

/**
 * Get Sentry error handler middleware
 * Add this BEFORE your other error handlers
 */
export function getSentryErrorHandler() {
  // Uncomment after installing @sentry/node
  /*
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all 5xx errors and specific 4xx errors
      const statusCode = error.statusCode || error.status || 500;
      return statusCode >= 500 || statusCode === 429 || statusCode === 401;
    },
  });
  */

  return (err, req, res, next) => next(err); // No-op error handler
}

/**
 * Set user context for error tracking
 * @param {Object} user - User object
 */
export function setSentryUser(user) {
  // Uncomment after installing @sentry/node
  /*
  if (user) {
    Sentry.setUser({
      id: user.id,
      username: user.nickname || user.name,
    });
  } else {
    Sentry.setUser(null);
  }
  */
}

/**
 * Add breadcrumb for debugging
 * @param {string} message - Breadcrumb message
 * @param {Object} data - Additional data
 */
export function addSentryBreadcrumb(message, data = {}) {
  // Uncomment after installing @sentry/node
  /*
  Sentry.addBreadcrumb({
    message,
    data,
    level: 'info',
  });
  */
}

/**
 * Manually capture an exception
 * @param {Error} error - Error to capture
 * @param {Object} context - Additional context
 */
export function captureException(error, context = {}) {
  // Uncomment after installing @sentry/node
  /*
  Sentry.captureException(error, {
    extra: context,
  });
  */

  // Fallback to logger
  logger.error({ err: error, context }, 'Error captured');
}

/**
 * Manually capture a message
 * @param {string} message - Message to capture
 * @param {string} level - Severity level (info, warning, error)
 */
export function captureMessage(message, level = 'info') {
  // Uncomment after installing @sentry/node
  /*
  Sentry.captureMessage(message, level);
  */

  logger[level](`Sentry message: ${message}`);
}

// Re-export Sentry for advanced usage
// Uncomment after installing @sentry/node
// export { Sentry };
