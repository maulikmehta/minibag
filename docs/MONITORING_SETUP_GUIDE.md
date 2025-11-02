# Monitoring & Error Tracking Setup Guide

This guide walks you through setting up production monitoring for MiniBag using free tier services.

## Table of Contents

1. [Sentry Setup (Error Tracking)](#sentry-setup)
2. [UptimeRobot Setup (Uptime Monitoring)](#uptimerobot-setup)
3. [Verification & Testing](#verification--testing)

---

## Sentry Setup (Error Tracking)

**Free Tier:** 50,000 events/month

### Step 1: Create Sentry Account

1. Go to [https://sentry.io/signup/](https://sentry.io/signup/)
2. Sign up with email or GitHub
3. Choose "I'm a developer" when asked

### Step 2: Create Projects

You'll need **two projects** (one for frontend, one for backend):

#### Frontend Project

1. Click "Create Project"
2. Platform: **React**
3. Project name: `minibag-frontend`
4. Alert frequency: **On every new issue**
5. Click "Create Project"
6. **SAVE the DSN** - it looks like: `https://xxxxx@o1234567.ingest.sentry.io/1234567`

#### Backend Project

1. Click "Create Project" again
2. Platform: **Node.js / Express**
3. Project name: `minibag-backend`
4. Alert frequency: **On every new issue**
5. Click "Create Project"
6. **SAVE the DSN**

### Step 3: Add DSNs to Environment Variables

Add these to your `.env` file:

```bash
# Sentry Configuration
VITE_SENTRY_DSN=<your-frontend-dsn>
SENTRY_DSN=<your-backend-dsn>
SENTRY_ENVIRONMENT=development  # Change to "production" when deploying
```

### Step 4: Install Sentry SDK

The Sentry SDKs are ready to install. Run:

```bash
# Install frontend Sentry
npm install @sentry/react -w @localloops/minibag

# Install backend Sentry
npm install @sentry/node @sentry/profiling-node -w @localloops/shared
```

### Step 5: Configure Sentry (Frontend)

The integration code is ready. After installing, the frontend will automatically initialize Sentry.

### Step 6: Configure Sentry (Backend)

The backend integration is ready. After installing, the server will initialize Sentry automatically.

### Step 7: Test Error Reporting

**Frontend Test:**
1. Start the dev server: `npm run dev`
2. Open browser console
3. Run: `throw new Error("Test Sentry Error")`
4. Check Sentry dashboard - you should see the error within 30 seconds

**Backend Test:**
1. Make a request to a non-existent endpoint: `curl http://localhost:3000/api/test-error`
2. Check Sentry backend project - you should see the 404 error

### Step 8: Configure Source Maps (Optional but Recommended)

Source maps help you see the original code in error stack traces.

Add to `.env`:
```bash
SENTRY_AUTH_TOKEN=<your-auth-token>
SENTRY_ORG=<your-org-slug>
SENTRY_PROJECT=minibag-frontend
```

Get auth token:
1. Go to Sentry Settings → Auth Tokens
2. Create new token with `project:releases` and `org:read` scopes
3. Copy and save in `.env`

---

## UptimeRobot Setup (Uptime Monitoring)

**Free Tier:** 50 monitors, 5-minute interval checks

### Step 1: Create UptimeRobot Account

1. Go to [https://uptimerobot.com/](https://uptimerobot.com/)
2. Click "Free Sign Up"
3. Verify your email

### Step 2: Add Monitor for API Server

1. Click "+ Add New Monitor"
2. Configuration:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** MiniBag API - Health Check
   - **URL:** `https://your-domain.com/health` (or `http://localhost:3000/health` for testing)
   - **Monitoring Interval:** 5 minutes (free tier)
3. Click "Create Monitor"

### Step 3: Add Monitor for Readiness Check

1. Click "+ Add New Monitor" again
2. Configuration:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** MiniBag API - Readiness
   - **URL:** `https://your-domain.com/health/ready`
   - **Monitoring Interval:** 5 minutes
3. Click "Create Monitor"

### Step 4: Set Up Alerts

1. Go to "My Settings" → "Alert Contacts"
2. Add your email (should already be there)
3. Optional: Add Slack webhook for instant notifications
   - In Slack: Apps → Incoming Webhooks
   - Copy webhook URL
   - Add to UptimeRobot as "Web-Hook" alert contact

### Step 5: Configure Alert Preferences

For each monitor:
1. Click the monitor name
2. Go to "Alert Contacts To Notify"
3. Select your email/Slack
4. Set "Send notifications when:" to **Down**
5. Check "Send notification when up again"

### Step 6: Add Public Status Page (Optional)

1. Go to "My Settings" → "Status Pages"
2. Click "Add Status Page"
3. Choose monitors to include
4. Set friendly URL: `minibag-status`
5. Your status page: `https://stats.uptimerobot.com/your-custom-url`

---

## Verification & Testing

### Verify Logging is Working

1. Start the backend server:
   ```bash
   npm run dev -w @localloops/shared
   ```

2. You should see pretty-printed logs with colors in development
3. Make a request: `curl http://localhost:3000/health`
4. Check the logs - you should see the request logged with:
   - Request ID
   - Method
   - URL
   - Status code
   - Response time

### Verify Sentry is Working

Once Sentry SDKs are installed:

**Backend:**
```bash
curl http://localhost:3000/api/nonexistent
# Check Sentry backend project for 404 error
```

**Frontend:**
1. Open app in browser
2. Open DevTools console
3. Type: `Sentry.captureMessage("Test message")`
4. Check Sentry frontend project

### Verify UptimeRobot is Working

1. Deploy your app (or use ngrok for local testing)
2. Wait 5 minutes
3. Check UptimeRobot dashboard - should show "Up"
4. Stop your server
5. Wait 5-10 minutes
6. Should receive "Down" alert email

### Test Log Levels

**Development (pretty logs):**
```bash
NODE_ENV=development npm run dev -w @localloops/shared
```

**Production (JSON logs):**
```bash
NODE_ENV=production npm start -w @localloops/shared
```

---

## Environment Variables Summary

Add these to your `.env`:

```bash
# Logging
NODE_ENV=development  # or production
LOG_LEVEL=debug       # or info, warn, error

# Sentry - Error Tracking
VITE_SENTRY_DSN=https://xxxxx@o1234567.ingest.sentry.io/1234567
SENTRY_DSN=https://xxxxx@o1234567.ingest.sentry.io/7654321
SENTRY_ENVIRONMENT=development  # or production

# Optional: For source maps
SENTRY_AUTH_TOKEN=your-auth-token
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=minibag-frontend
```

---

## What's Already Configured

✅ **Backend Logging (Pino)**
- Structured JSON logging in production
- Pretty-printed logs in development
- Request ID tracking
- Automatic error logging
- Log levels: trace, debug, info, warn, error, fatal

✅ **Frontend Console Removal**
- Vite configured to remove console.log/debug/info/warn in production
- Keeps console.error for critical issues

✅ **Health Endpoints**
- `/health` - Basic health check
- `/health/ready` - Detailed readiness probe (checks DB, WebSocket)
- `/metrics` - System metrics (uptime, memory, connections)

---

## Next Steps

After setting up Sentry and UptimeRobot:

1. ✅ Monitor errors in Sentry dashboard daily
2. ✅ Set up Slack alerts for critical errors (optional)
3. ✅ Review logs regularly for anomalies
4. ✅ Test error scenarios before launch
5. ✅ Set up log retention policy (Better Stack/Logtail in Week 2)

---

## Troubleshooting

**Sentry not capturing errors?**
- Check DSN is correct in `.env`
- Verify `SENTRY_ENVIRONMENT` is set
- Check network tab for Sentry requests
- Ensure error is not filtered by beforeSend

**UptimeRobot showing "Down" but server is running?**
- Check `/health` endpoint returns 200 status
- Verify URL is accessible from public internet
- Check firewall/security group rules
- Verify CORS settings

**Logs not showing in console?**
- Check `NODE_ENV` is set correctly
- Verify `LOG_LEVEL` environment variable
- Check `pino-pretty` is installed (dev dependency)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-02
**Status:** Ready for Implementation
