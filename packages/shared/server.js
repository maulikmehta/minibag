import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

// Logging
import logger from './utils/logger.js';
import { requestIdMiddleware, httpLogger, errorLogger } from './middleware/requestLogger.js';

// Sentry Error Tracking
import { initSentry, getSentryRequestHandler, getSentryTracingHandler, getSentryErrorHandler } from './utils/sentry.js';

// API route imports
import * as catalogAPI from './api/catalog.js';
import * as sessionsAPI from './api/sessions.js';
import * as paymentsAPI from './api/payments.js';
import * as analyticsAPI from './api/analytics.js';
import * as participantsAPI from './api/participants.js';
import * as billsAPI from './api/bills.js';
import * as logsAPI from './api/logs.js';

// Sessions SDK integration (Phase 2 Week 6)
import { USE_SESSIONS_SDK, logFeatureFlags } from './config/features.js';

// Dynamic import for SDK to avoid loading @sessions/core when disabled
let createSessionWithSDK, joinSessionWithSDK, getNicknameOptionsWithSDK;
if (USE_SESSIONS_SDK) {
  const sdk = await import('./api/sessions-sdk.js');
  createSessionWithSDK = sdk.createSessionWithSDK;
  joinSessionWithSDK = sdk.joinSessionWithSDK;
  getNicknameOptionsWithSDK = sdk.getNicknameOptionsWithSDK;
}

// Validation middleware imports
import {
  validateSessionCreation,
  validateJoinSession,
  validatePayment,
  validateSessionStatus
} from './middleware/validation.js';

// Admin authentication middleware
import { adminAuth } from './middleware/adminAuth.js';

// WebSocket handlers
import { setupSocketHandlers } from './websocket/handlers.js';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

// Initialize Sentry as early as possible
initSentry();

const app = express();
const server = createServer(app);

// Trust proxy - required for rate limiting behind Render/Cloudflare
// Render adds X-Forwarded-For header
app.set('trust proxy', 1);

// Socket.IO setup with same CORS origins as Express
const socketAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://minibag.cc',
  'https://www.minibag.cc'
];

if (process.env.FRONTEND_URL && !socketAllowedOrigins.includes(process.env.FRONTEND_URL)) {
  socketAllowedOrigins.push(process.env.FRONTEND_URL);
}

const io = new Server(server, {
  cors: {
    origin: socketAllowedOrigins,
    credentials: true
  }
});

// Middleware
// Configure helmet with Content Security Policy
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for Vite dev mode
      styleSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline needed for Tailwind
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'",
        process.env.SUPABASE_URL || "https://*.supabase.co",
        process.env.FRONTEND_URL || "http://localhost:5173",
        "ws://localhost:*", // WebSocket in development
        "wss://*" // WebSocket in production
      ],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false, // Needed for WebSocket
  crossOriginResourcePolicy: { policy: "cross-origin" } // Needed for API
}));
// CORS configuration
// - origin: Restricted to frontend URL only (prevents cross-origin attacks)
// - credentials: true (allows httpOnly cookies for authentication)
// - Development: http://localhost:5173 or http://localhost:5174 (Vite may use either)
// - Production: Should be set via FRONTEND_URL env variable
// - minibag.cc: Production domain for field testing
// SECURITY: Validates FRONTEND_URL to prevent CORS bypass attacks
const getAllowedOrigins = () => {
  const origins = [];

  if (process.env.NODE_ENV === 'production') {
    origins.push('https://minibag.cc');
    origins.push('https://www.minibag.cc');
  } else {
    origins.push('http://localhost:5173');
    origins.push('http://localhost:5174');
  }

  // Validate FRONTEND_URL before adding
  if (process.env.FRONTEND_URL) {
    try {
      const url = new URL(process.env.FRONTEND_URL);

      // SECURITY: Enforce HTTPS in production
      if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:') {
        logger.error('CORS: FRONTEND_URL must use HTTPS in production', {
          provided: process.env.FRONTEND_URL,
          protocol: url.protocol
        });
        throw new Error('FRONTEND_URL must use HTTPS in production');
      }

      // SECURITY: Only allow trusted domains
      const trustedHosts = [
        'localhost',
        '127.0.0.1',
        'minibag.cc',
        'www.minibag.cc'
      ];

      const isValidHost = trustedHosts.some(host =>
        url.hostname === host || url.hostname.endsWith('.minibag.cc')
      );

      if (isValidHost) {
        origins.push(process.env.FRONTEND_URL);
        logger.info('CORS: Added FRONTEND_URL to allowed origins', {
          url: process.env.FRONTEND_URL
        });
      } else {
        logger.warn('CORS: FRONTEND_URL rejected - untrusted domain', {
          provided: process.env.FRONTEND_URL,
          hostname: url.hostname
        });
      }
    } catch (error) {
      logger.error('CORS: Invalid FRONTEND_URL format', {
        provided: process.env.FRONTEND_URL,
        error: error.message
      });
    }
  }

  return origins;
};

const allowedOrigins = getAllowedOrigins();

// Log CORS configuration for debugging
logger.info('CORS Configuration', {
  environment: process.env.NODE_ENV || 'development',
  allowedOrigins,
  frontendUrl: process.env.FRONTEND_URL || 'not set'
});

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Parse cookies for httpOnly authentication

// Request ID tracking (must be before HTTP logger)
app.use(requestIdMiddleware);

// HTTP request/response logging with Pino
app.use(httpLogger);

// Sentry request handler (must be first middleware)
app.use(getSentryRequestHandler());

// Sentry tracing handler (before routes)
app.use(getSentryTracingHandler());

// Add request timeout (30 seconds)
app.use((req, res, next) => {
  req.setTimeout(30000);
  res.setTimeout(30000);
  next();
});

// General API rate limiting (ENABLED in all environments)
// Security: Rate limiting active in development to catch issues early
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 500, // More generous in dev, but still limited
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  // Rate limiting now active in ALL environments (no skip function)
});

// Stricter limits for session creation (prevent spam)
const createSessionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 10 : 50, // 50 for dev, 10 for production
  message: 'Too many sessions created from this IP. Please try again in an hour.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limits for authentication attempts (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 20, // Very strict in production
  message: 'Too many failed authentication attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed attempts
});

// Rate limiter for frontend logs (prevent log spam)
const logsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 100 : 200, // 100 logs per minute in production
  message: 'Too many logs from this IP. Please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Basic routes
app.get('/', (req, res) => {
  res.json({
    message: 'LocalLoops API Server',
    version: '0.1.0',
    status: 'running'
  });
});

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Detailed health check (readiness probe)
app.get('/health/ready', async (req, res) => {
  const { supabase } = await import('./db/supabase.js');

  const checks = {
    server: 'ok',
    database: 'unknown',
    websocket: 'unknown',
    timestamp: new Date().toISOString()
  };

  try {
    // Check database connection
    const { data, error } = await supabase
      .from('sessions')
      .select('id')
      .limit(1);
    checks.database = error ? 'error' : 'ok';
  } catch (err) {
    checks.database = 'error';
  }

  // Check WebSocket
  checks.websocket = io.engine.clientsCount !== undefined ? 'ok' : 'error';

  const isHealthy = Object.values(checks).every(v => v === 'ok' || typeof v === 'string');
  res.status(isHealthy && checks.database === 'ok' ? 200 : 503).json(checks);
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    },
    connections: {
      websocket: io.engine.clientsCount
    },
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Serve sessions dashboard logo
app.get('/sessions-logo.png', (req, res) => {
  res.sendFile(resolve(__dirname, '../minibag/public/sessions-logo.png'));
});

// Apply general rate limiting to all API routes
app.use('/api/', apiLimiter);

// Disable caching for all API routes to prevent stale data issues
// CRITICAL: Session data, participant lists, and invite status must always be fresh
app.use('/api/', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Catalog API routes
app.get('/api/catalog/categories', catalogAPI.getCategories);
app.get('/api/catalog/items', catalogAPI.getItems);
app.get('/api/catalog/items/:item_id', catalogAPI.getItem);
app.get('/api/catalog/popular', catalogAPI.getPopularItems);

// Sessions API routes (with SDK integration - Phase 2 Week 6)
app.get('/api/sessions/nickname-options', (req, res) =>
  getNicknameOptionsWithSDK
    ? getNicknameOptionsWithSDK(req, res, sessionsAPI.getNicknameOptions)
    : sessionsAPI.getNicknameOptions(req, res)
);
app.post('/api/sessions/create', createSessionLimiter, validateSessionCreation, (req, res) =>
  createSessionWithSDK
    ? createSessionWithSDK(req, res, sessionsAPI.createSession)
    : sessionsAPI.createSession(req, res)
);
app.get('/api/sessions/:session_id', sessionsAPI.getSession);
app.get('/api/sessions/:session_id/shopping-items', sessionsAPI.getShoppingItems); // Aggregated items for shopping screen
app.get('/api/sessions/:session_id/bill-items', sessionsAPI.getBillItems); // Aggregated items with payments for bill screen
app.post('/api/sessions/:session_id/join', authLimiter, validateJoinSession, (req, res) =>
  joinSessionWithSDK
    ? joinSessionWithSDK(req, res, sessionsAPI.joinSession)
    : sessionsAPI.joinSession(req, res)
); // Rate limit joins (PIN brute force protection)
app.put('/api/sessions/:session_id/status', validateSessionStatus, sessionsAPI.updateSessionStatus);
app.patch('/api/sessions/:session_id/expected', sessionsAPI.updateExpectedParticipants);
app.patch('/api/sessions/:session_id/participant-limit', sessionsAPI.updateParticipantLimit);
app.get('/api/sessions/:session_id/invites', sessionsAPI.getSessionInvites);
app.get('/api/sessions/:session_id/invites/resolved', sessionsAPI.checkInvitesResolved); // BUGFIX #3
app.post('/api/sessions/:session_id/invites/:invite_id/decline', sessionsAPI.declineInvite); // BUGFIX #1

// Participants API routes
app.put('/api/participants/:participant_id/items', participantsAPI.updateParticipantItems);
app.patch('/api/participants/:participant_id/status', participantsAPI.updateParticipantStatus);

// Payments API routes
app.post('/api/sessions/:session_id/payments', validatePayment, paymentsAPI.recordPayment);
app.get('/api/sessions/:session_id/payments', paymentsAPI.getSessionPayments);
app.get('/api/sessions/:session_id/payments/summary', paymentsAPI.getPaymentSummary);
app.get('/api/sessions/:session_id/split', paymentsAPI.getPaymentSplit);
app.put('/api/payments/:payment_id', paymentsAPI.updatePayment);
app.delete('/api/payments/:payment_id', paymentsAPI.deletePayment);

// Bills API routes
app.post('/api/sessions/:session_id/bill-token', billsAPI.generateBillToken);
app.get('/api/bill/:token', billsAPI.getBillByToken);

// Analytics API routes (protected with admin authentication)
app.get('/api/analytics/overview', adminAuth, analyticsAPI.getAnalyticsOverview);
app.get('/api/analytics/sessions/weekly', adminAuth, analyticsAPI.getWeeklySessionTrends);
app.get('/api/analytics/revenue', adminAuth, analyticsAPI.getRevenueAnalytics);
app.get('/api/analytics/sessions/recent', adminAuth, analyticsAPI.getRecentSessions);

// Logs API routes (frontend logging with rate limiting)
app.post('/api/logs', logsLimiter, logsAPI.receiveFrontendLog);
app.post('/api/logs/batch', logsLimiter, logsAPI.receiveFrontendLogBatch);
app.get('/api/analytics/sessions/completions', adminAuth, analyticsAPI.getSessionCompletions);

// WebSocket connection handling
io.on('connection', (socket) => {
  setupSocketHandlers(socket, io);
});

// Sentry error handler (must be before other error handlers)
app.use(getSentryErrorHandler());

// Error logging middleware (logs errors before handling them)
app.use(errorLogger);

// Enhanced error handling
app.use((err, req, res, next) => {
  // Error already logged by errorLogger middleware

  // Send appropriate response
  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal server error' : err.message,
    requestId: req.id,
    timestamp: new Date().toISOString(),
    // Only include details in development
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err.details
    })
  });
});

// Start servers
const PORT = process.env.API_PORT || 3000;

async function startServer() {
  // Mount Sessions SDK Dashboard (development only, no auth)
  try {
    if (USE_SESSIONS_SDK) {
      const { mountDashboard } = await import('@sessions/core');
      await mountDashboard(app, {
        path: '/sessions-monitor',
        branding: {
          productName: 'Minibag Sessions',
          primaryColor: '#00B87C'
        }
      });
    }
  } catch (error) {
    logger.error('Failed to mount Sessions SDK dashboard:', error);
    logger.warn('Continuing without dashboard...');
  }

  server.listen(PORT, () => {
    logger.info({
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
    }, 'LocalLoops API Server started');

    logger.info('Server features:');
    logger.info('  ✓ API server');
    logger.info('  ✓ WebSocket server');
    logger.info('  ✓ Structured logging (Pino)');

    // Log feature flags (Phase 2 Week 6)
    logFeatureFlags();
    logger.info('  ✓ Rate limiting');
    logger.info('  ✓ Security headers (Helmet)');
    logger.info('  ✓ Request ID tracking');
    logger.info('  ✓ Nickname cleanup job (runs hourly)');
    if (USE_SESSIONS_SDK) {
      logger.info('  ✓ Sessions SDK dashboard (/sessions-monitor)');
    }

    // Start nickname cleanup job (runs every hour to prevent pool depletion)
    const stopNicknameCleanup = sessionsAPI.startNicknameCleanup();

    // BUGFIX #9: Start PIN rate limiter cleanup job (runs every 10 minutes)
    const { startPinRateLimiterCleanup } = await import('./utils/pinRateLimiter.js');
    const stopPinRateLimiterCleanup = startPinRateLimiterCleanup();

    // Graceful shutdown handler
    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      stopNicknameCleanup();
      stopPinRateLimiterCleanup(); // BUGFIX #9: Stop PIN cleanup job
      server.close(() => {
        logger.info('HTTP server closed');
      });
    });
  });
}

startServer().catch(error => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export { app, io };
