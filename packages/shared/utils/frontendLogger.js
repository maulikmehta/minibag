/**
 * Frontend Logger Service
 *
 * Structured logging for the frontend with correlation IDs and context tracking.
 * Logs can be sent to the backend for aggregation and monitoring.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Log levels (in order of severity)
 */
const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error'
};

/**
 * Frontend Logger Class
 */
class FrontendLogger {
  constructor() {
    this.sessionId = null;
    this.participantId = null;
    this.correlationId = this.generateCorrelationId();
    this.logs = [];
    this.maxLocalLogs = 100; // Keep last 100 logs in memory
    this.enabled = true;
    this.sendToBackend = false; // Will be enabled once backend endpoint is ready
  }

  /**
   * Generate a unique correlation ID for tracking related logs
   * @returns {string} UUID v4
   */
  generateCorrelationId() {
    return uuidv4();
  }

  /**
   * Set session context
   * @param {string} sessionId - Current session ID
   */
  setSessionId(sessionId) {
    this.sessionId = sessionId;
  }

  /**
   * Set participant context
   * @param {string} participantId - Current participant ID
   */
  setParticipantId(participantId) {
    this.participantId = participantId;
  }

  /**
   * Clear all context (on logout/session end)
   */
  clearContext() {
    this.sessionId = null;
    this.participantId = null;
    this.correlationId = this.generateCorrelationId();
  }

  /**
   * Enable/disable logging
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * Enable/disable sending logs to backend
   * @param {boolean} send
   */
  setSendToBackend(send) {
    this.sendToBackend = send;
  }

  /**
   * Create a log entry with full context
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Log entry
   */
  createLogEntry(level, message, metadata = {}) {
    const entry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      correlationId: this.correlationId,
      context: {
        sessionId: this.sessionId,
        participantId: this.participantId,
        userAgent: navigator.userAgent,
        url: window.location.href,
      },
      metadata,
    };

    return entry;
  }

  /**
   * Store log entry locally
   * @param {Object} entry - Log entry
   */
  storeLogEntry(entry) {
    this.logs.push(entry);

    // Keep only the last maxLocalLogs entries
    if (this.logs.length > this.maxLocalLogs) {
      this.logs.shift();
    }
  }

  /**
   * Send log entry to backend
   * @param {Object} entry - Log entry
   */
  async sendToBackendEndpoint(entry) {
    if (!this.sendToBackend) return;

    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });
    } catch (error) {
      // Silently fail to avoid infinite loops
      console.error('Failed to send log to backend:', error);
    }
  }

  /**
   * Log a message
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   */
  log(level, message, metadata = {}) {
    if (!this.enabled) return;

    const entry = this.createLogEntry(level, message, metadata);

    // Store locally
    this.storeLogEntry(entry);

    // Console output with color coding
    const consoleMethod = console[level] || console.log;
    const prefix = `[${level.toUpperCase()}]`;
    consoleMethod(prefix, message, metadata);

    // Send to backend if enabled
    if (this.sendToBackend) {
      this.sendToBackendEndpoint(entry);
    }
  }

  /**
   * Debug log (detailed debugging information)
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   */
  debug(message, metadata = {}) {
    this.log(LOG_LEVELS.DEBUG, message, metadata);
  }

  /**
   * Info log (general informational messages)
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   */
  info(message, metadata = {}) {
    this.log(LOG_LEVELS.INFO, message, metadata);
  }

  /**
   * Warning log (warning messages)
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   */
  warn(message, metadata = {}) {
    this.log(LOG_LEVELS.WARN, message, metadata);
  }

  /**
   * Error log (error messages)
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   */
  error(message, metadata = {}) {
    this.log(LOG_LEVELS.ERROR, message, metadata);
  }

  /**
   * Get all stored logs
   * @returns {Array} Array of log entries
   */
  getLogs() {
    return [...this.logs];
  }

  /**
   * Get logs filtered by level
   * @param {string} level - Log level to filter
   * @returns {Array} Filtered log entries
   */
  getLogsByLevel(level) {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Clear all stored logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Export logs for debugging
   * @returns {string} JSON string of all logs
   */
  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Create singleton instance
const logger = new FrontendLogger();

// Export singleton and class
export { LOG_LEVELS };
export default logger;
