# Testing Guide

This guide covers how to safely run tests for the minibag-2 project with proper database isolation to protect production data.

## Table of Contents
- [Overview](#overview)
- [Database Architecture](#database-architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Database Setup](#database-setup)
- [Running Tests](#running-tests)
- [Safety Features](#safety-features)
- [Troubleshooting](#troubleshooting)

---

## Overview

minibag-2 uses a comprehensive testing strategy with **complete database isolation** to ensure production data is never affected by test runs.

**Test Types:**
- **Unit Tests:** Component and function-level tests (no database required)
- **Integration Tests:** API and SDK integration tests (requires test databases)
- **E2E Tests:** Full user journey tests via Playwright (requires test databases)

**Coverage Target:** 30% (Week 2 baseline, increasing incrementally)

---

## Database Architecture

minibag-2 uses **two separate databases:**

### 1. Supabase (PostgreSQL + APIs)
**Production:** `https://drbocrbecchxbzcfljol.supabase.co`
**Test:** `http://localhost:54321` (local Supabase via Docker/Colima)

**Stores:**
- Shopping items, bills, payments
- Catalog data
- Session metadata (when not using Sessions SDK)

### 2. Sessions SDK Database (PostgreSQL via Prisma)
**Production:** (configured separately)
**Test:** `postgresql://localhost:5432/sessions_test`

**Stores:**
- Session lifecycle (create, join, complete)
- Participants and nicknames
- Invites and group mode data

---

## Prerequisites

### Required Software

1. **Node.js** 18+ (already installed)
2. **Postgres.app** (for Sessions SDK database) - [Download](https://postgresapp.com/)
3. **Docker/Colima** (for local Supabase)

### Installing Docker Alternative (Colima) for macOS 10.15.7

Docker Desktop requires macOS 11+, so we use Colima instead:

```bash
# Install Colima and Docker CLI
brew install colima docker

# Start Colima (runs Docker containers)
colima start

# Verify Docker is working
docker ps
```

---

## Quick Start

```bash
# 1. Install dependencies (if not done)
npm install

# 2. Start test databases
npm run test:db:start

# 3. Run all tests
npm test

# 4. Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# 5. Stop test databases when done
npm run test:db:stop
```

---

## Database Setup

### 1. Local Supabase Setup

#### First-time Setup:
```bash
# Initialize Supabase (already done)
cd /Users/maulik/llcode/minibag-2
npx supabase init

# Start local Supabase (requires Colima/Docker)
npx supabase start
```

**What this does:**
- Starts PostgreSQL on `localhost:54321`
- Starts Supabase Studio (web UI) on `localhost:54323`
- Applies database schema from `supabase/migrations/`
- Provides local auth, storage, and realtime services

**Default Credentials:**
- URL: `http://localhost:54321`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (in `.env.test`)
- Service Role Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (in `.env.test`)

#### Apply Schema:
```bash
# If you have existing migrations
npx supabase db push

# Or create new migration from production
npx supabase db pull
```

#### Stop Supabase:
```bash
npx supabase stop
```

---

### 2. Sessions SDK PostgreSQL Setup

The Sessions SDK uses Postgres.app for its test database.

#### Verify Postgres.app is Running:
```bash
# Check PostgreSQL is accessible
psql -U postgres -h localhost -p 5432 -c "SELECT version();"
```

#### Create Test Database:
```bash
# Connect to PostgreSQL
psql -U postgres -h localhost -p 5432

# Create test database
CREATE DATABASE sessions_test;

# Exit psql
\q
```

#### Run Migrations:
```bash
cd /Users/maulik/llcode/sessions/packages/core

# Apply Prisma schema
npx prisma migrate dev

# Or reset database (WARNING: deletes all data)
npx prisma migrate reset
```

---

## Running Tests

### Test Scripts

```bash
# Run all tests
npm test                  # Watch mode
npm run test:run          # Run once

# Run specific test types
npm run test:unit         # Unit tests only (fast, no DB required)
npm run test:integration  # Integration tests (requires test DBs)
npm run test:e2e          # End-to-end tests (requires test DBs + dev server)

# Coverage
npm run test:coverage     # Generate coverage report
```

### Environment Variables

Tests automatically load `.env.test` which contains:
- Local Supabase URL and keys
- Sessions SDK test database URL
- Test-safe credentials (NOT production!)

**Never modify `.env.test` to use production credentials!**

---

## Safety Features

Our test infrastructure has multiple layers of protection against accidental production database access:

### 1. Environment Enforcement
```javascript
// Throws error if NODE_ENV !== 'test'
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  throw new Error('Tests must run with NODE_ENV=test');
}
```

**Location:**
- `packages/minibag/src/__tests__/setup.js:8-14`
- `packages/shared/src/__tests__/setup.js:14-20`

### 2. Production URL Blocking
```javascript
// Blocks any *.supabase.co URLs
if (supabaseUrl && supabaseUrl.includes('supabase.co')) {
  throw new Error('Cannot use production Supabase in tests!');
}
```

**Location:**
- `packages/minibag/src/__tests__/helpers/testDb.js:36-44`
- `packages/minibag/src/__tests__/setup.js:33-43`
- `packages/shared/src/__tests__/setup.js:44-53`

### 3. Specific Production Instance Blocking
```javascript
// Blocks your specific production database by ID
if (url && url.includes('drbocrbecchxbzcfljol')) {
  throw new Error('Database URL appears to be production database');
}
```

**Location:** `packages/minibag/src/__tests__/helpers/testDb.js:46-52`

### 4. .env.test Auto-Loading
Test setup files automatically load `.env.test` instead of `.env`, ensuring test-safe configuration.

**Location:**
- `packages/minibag/src/__tests__/setup.js:16-30`
- `packages/shared/src/__tests__/setup.js:22-37`

---

## Test Database Isolation

### How It Works:

1. **Unit Tests:** Use MSW (Mock Service Worker) to mock HTTP requests - no real database calls
2. **Integration Tests:** Connect to `localhost:54321` (local Supabase) and `localhost:5432` (local PostgreSQL)
3. **E2E Tests:** Full stack runs locally with test databases

### Data Cleanup:

Tests use `TEST_` prefixes for all created data:
```javascript
const sessionId = `TEST_${Date.now()}`;
```

After each test:
```javascript
afterEach(async () => {
  await deleteAllTestSessions(); // Removes all TEST_* sessions
});
```

---

## Troubleshooting

### "SAFETY CHECK FAILED: Cannot use production Supabase in tests!"

**Cause:** `.env` file is being loaded instead of `.env.test`
**Solution:**
1. Verify `.env.test` exists in project root
2. Check `NODE_ENV=test` is set
3. Restart test process

### "Connection refused to localhost:54321"

**Cause:** Local Supabase is not running
**Solution:**
```bash
# Check if Colima is running
docker ps

# If not, start Colima
colima start

# Then start Supabase
npx supabase start
```

### "Connection refused to localhost:5432"

**Cause:** Postgres.app is not running
**Solution:**
1. Open Postgres.app
2. Click "Start" button
3. Verify with: `psql -U postgres -h localhost -p 5432 -c "SELECT 1;"`

### "Database sessions_test does not exist"

**Cause:** Test database not created
**Solution:**
```bash
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE sessions_test;"
```

### Tests are slow

**Solutions:**
- Run only unit tests: `npm run test:unit` (fast, no DB)
- Use `test.only()` to run specific tests
- Check if local Supabase is running (faster than mocking)

### Colima won't start on macOS 10.15.7

**Solutions:**
1. Try specific version: `brew install colima@0.5.5`
2. Increase resources: `colima start --cpu 2 --memory 4`
3. Check logs: `colima logs`
4. Alternative: Use separate test Supabase project (slower but works)

---

## CI/CD Integration

For continuous integration pipelines:

```yaml
# .github/workflows/test.yml example
- name: Start test databases
  run: |
    docker compose up -d  # Or use Supabase CLI
    npm run test:db:wait

- name: Run tests
  run: npm run test:run
  env:
    NODE_ENV: test
    CI: true
```

---

## Best Practices

1. **Always run tests locally before pushing**
   ```bash
   npm run test:run
   ```

2. **Use test factories for data creation**
   ```javascript
   import { buildSession, buildParticipant } from '@/__tests__/helpers/factories';
   const session = buildSession({ status: 'active' });
   ```

3. **Clean up after tests**
   ```javascript
   afterEach(async () => {
     await resetTestData();
   });
   ```

4. **Use descriptive test names**
   ```javascript
   test('should create session with SDK adapter when USE_SESSIONS_SDK=true', ...)
   ```

5. **Mock external services**
   - Use MSW for HTTP mocking
   - Don't make real API calls (Razorpay, SMS, etc.)

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Supabase Local Development](https://supabase.com/docs/guides/cli/local-development)
- [Playwright Testing](https://playwright.dev/)
- [MSW (Mock Service Worker)](https://mswjs.io/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)

---

## Need Help?

- Check existing test files in `packages/minibag/src/__tests__/`
- Review test helpers in `packages/minibag/src/__tests__/helpers/`
- Ask in team chat or open an issue

---

**Last Updated:** November 2025
**Test Coverage:** 30% (baseline)
**Safety Level:** MAXIMUM ✅
