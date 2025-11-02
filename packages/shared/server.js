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

// API route imports
import * as catalogAPI from './api/catalog.js';
import * as sessionsAPI from './api/sessions.js';
import * as paymentsAPI from './api/payments.js';
import * as analyticsAPI from './api/analytics.js';
import * as participantsAPI from './api/participants.js';

// Validation middleware imports
import {
  validateSessionCreation,
  validateJoinSession,
  validatePayment,
  validateSessionStatus
} from './middleware/validation.js';

// WebSocket handlers
import { setupSocketHandlers } from './websocket/handlers.js';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../../.env') });

const app = express();
const server = createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Parse cookies for httpOnly authentication

// Add request ID for tracking
app.use((req, res, next) => {
  req.id = crypto.randomBytes(8).toString('hex');
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Add request timeout (30 seconds)
app.use((req, res, next) => {
  req.setTimeout(30000);
  res.setTimeout(30000);
  next();
});

// General API rate limiting (DISABLED in development for debugging)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 999999, // Effectively unlimited for dev
  message: 'Too many requests, please try again later',
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production' // Skip rate limiting in development
});

// Stricter limits for session creation (prevent spam)
const createSessionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 10 : 100, // 100 for dev, 10 for production
  message: 'Too many sessions created. Please try again later.'
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

// Apply general rate limiting to all API routes
app.use('/api/', apiLimiter);

// Catalog API routes
app.get('/api/catalog/categories', catalogAPI.getCategories);
app.get('/api/catalog/items', catalogAPI.getItems);
app.get('/api/catalog/items/:item_id', catalogAPI.getItem);
app.get('/api/catalog/popular', catalogAPI.getPopularItems);

// Sessions API routes
app.get('/api/sessions/nickname-options', sessionsAPI.getNicknameOptions);
app.post('/api/sessions/create', createSessionLimiter, validateSessionCreation, sessionsAPI.createSession);
app.get('/api/sessions/:session_id', sessionsAPI.getSession);
app.post('/api/sessions/:session_id/join', validateJoinSession, sessionsAPI.joinSession);
app.put('/api/sessions/:session_id/status', validateSessionStatus, sessionsAPI.updateSessionStatus);
app.patch('/api/sessions/:session_id/expected', sessionsAPI.updateExpectedParticipants);

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

// Analytics API routes
app.get('/api/analytics/overview', analyticsAPI.getAnalyticsOverview);
app.get('/api/analytics/sessions/weekly', analyticsAPI.getWeeklySessionTrends);
app.get('/api/analytics/revenue', analyticsAPI.getRevenueAnalytics);
app.get('/api/analytics/sessions/recent', analyticsAPI.getRecentSessions);
app.get('/api/analytics/sessions/completions', analyticsAPI.getSessionCompletions);

// WebSocket connection handling
io.on('connection', (socket) => {
  setupSocketHandlers(socket, io);
});

// Enhanced error handling
app.use((err, req, res, next) => {
  // Log error with context
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    requestId: req.id,
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack,
    userId: req.session?.userId || 'anonymous'
  }));

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

server.listen(PORT, () => {
  console.log(`✓ API server running on port ${PORT}`);
  console.log(`✓ WebSocket server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
});

export { app, io };
