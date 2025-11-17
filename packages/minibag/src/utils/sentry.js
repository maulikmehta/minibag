/**
 * Sentry Error Tracking - Frontend
 *
 * Initializes Sentry for error tracking and performance monitoring
 * Install with: npm install @sentry/react -w @localloops/minibag
 */

// Uncomment after installing @sentry/react
// import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry
 * Call this in main.jsx before rendering the app
 */
export function initSentry() {
  // Uncomment after installing @sentry/react and setting VITE_SENTRY_DSN in .env

  /*
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE;

  if (!dsn) {
    console.warn('Sentry DSN not configured. Skipping Sentry initialization.');
    return;
  }

  Sentry.init({
    dsn,
    environment,

    // Performance Monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Capture 10% of all sessions
        sessionSampleRate: 0.1,
        // Capture 100% of sessions with errors
        errorSampleRate: 1.0,
      }),
    ],

    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // We recommend adjusting this value in production
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,

    // Capture Replay for 10% of all sessions,
    // plus 100% of sessions with an error
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Filter out non-error noise
    beforeSend(event, hint) {
      // Don't send events in development (optional)
      if (environment === 'development') {
        console.log('Sentry event (dev - not sent):', event);
        return null; // Comment this line to send events in dev
      }

      // Filter out specific errors (optional)
      const error = hint.originalException;
      if (error && error.message) {
        // Don't send network errors
        if (error.message.match(/network|fetch|timeout/i)) {
          return null;
        }
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

    // Attach user context
    initialScope: {
      tags: {
        app: 'minibag',
      },
    },
  });

  console.log(`✓ Sentry initialized (${environment})`);
  */

  console.log('ℹ Sentry not initialized - install @sentry/react and configure VITE_SENTRY_DSN');
}

/**
 * Set user context for error tracking
 * @param {Object} user - User object
 */
export function setSentryUser(user) {
  // Uncomment after installing @sentry/react
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
  // Uncomment after installing @sentry/react
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
  // Uncomment after installing @sentry/react
  /*
  Sentry.captureException(error, {
    extra: context,
  });
  */

  // Fallback to console in development
  console.error('Error captured:', error, context);
}

/**
 * Manually capture a message
 * @param {string} message - Message to capture
 * @param {string} level - Severity level (info, warning, error)
 */
export function captureMessage(message, level = 'info') {
  // Uncomment after installing @sentry/react
  /*
  Sentry.captureMessage(message, level);
  */

  console.log(`Sentry message (${level}):`, message);
}
