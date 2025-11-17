/**
 * Logs API
 * Endpoint for receiving frontend logs
 */

import logger from '../utils/logger.js';

/**
 * POST /api/logs
 * Receive and store frontend log entries
 *
 * Body:
 * - level: string (debug, info, warn, error)
 * - message: string
 * - timestamp: ISO timestamp
 * - correlationId: UUID
 * - context: object (sessionId, participantId, userAgent, url)
 * - metadata: object (additional data)
 */
export async function receiveFrontendLog(req, res) {
  try {
    const {
      level,
      message,
      timestamp,
      correlationId,
      context = {},
      metadata = {}
    } = req.body;

    // Validate log level
    const validLevels = ['debug', 'info', 'warn', 'error'];
    if (!validLevels.includes(level)) {
      return res.status(400).json({
        success: false,
        error: `Invalid log level. Must be one of: ${validLevels.join(', ')}`
      });
    }

    // Validate required fields
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a string'
      });
    }

    if (!correlationId || typeof correlationId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Correlation ID is required'
      });
    }

    // Create structured log entry
    const logEntry = {
      source: 'frontend',
      level,
      message,
      timestamp,
      correlationId,
      context: {
        sessionId: context.sessionId || null,
        participantId: context.participantId || null,
        userAgent: context.userAgent || 'unknown',
        url: context.url || 'unknown',
      },
      metadata,
      // Add server-side context
      serverTimestamp: new Date().toISOString(),
      clientIp: req.ip || req.connection.remoteAddress,
    };

    // Log to backend logger
    const logMethod = logger[level] || logger.info;
    logMethod({
      msg: `[Frontend] ${message}`,
      ...logEntry
    });

    // TODO: Forward to log aggregation service (e.g., Datadog, Elasticsearch)
    // await forwardToAggregationService(logEntry);

    return res.status(200).json({
      success: true,
      message: 'Log received'
    });

  } catch (error) {
    logger.error({
      msg: 'Error receiving frontend log',
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to process log entry'
    });
  }
}

/**
 * POST /api/logs/batch
 * Receive multiple log entries in a single request
 * Useful for sending buffered logs
 */
export async function receiveFrontendLogBatch(req, res) {
  try {
    const { logs } = req.body;

    if (!Array.isArray(logs)) {
      return res.status(400).json({
        success: false,
        error: 'Logs must be an array'
      });
    }

    if (logs.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Logs array cannot be empty'
      });
    }

    if (logs.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 50 logs per batch'
      });
    }

    // Process each log entry
    let processedCount = 0;
    let errorCount = 0;

    for (const log of logs) {
      try {
        const {
          level,
          message,
          timestamp,
          correlationId,
          context = {},
          metadata = {}
        } = log;

        // Skip invalid entries
        if (!level || !message || !correlationId) {
          errorCount++;
          continue;
        }

        const logEntry = {
          source: 'frontend',
          level,
          message,
          timestamp,
          correlationId,
          context,
          metadata,
          serverTimestamp: new Date().toISOString(),
          clientIp: req.ip || req.connection.remoteAddress,
        };

        const logMethod = logger[level] || logger.info;
        logMethod({
          msg: `[Frontend] ${message}`,
          ...logEntry
        });

        processedCount++;
      } catch (err) {
        errorCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Processed ${processedCount} logs`,
      processedCount,
      errorCount,
      totalCount: logs.length
    });

  } catch (error) {
    logger.error({
      msg: 'Error receiving frontend log batch',
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      error: 'Failed to process log batch'
    });
  }
}
