# Test Infrastructure Setup Progress

**Date:** November 17, 2025
**Status:** Phase 1 Complete ✅ | Phase 2 In Progress 🔄

---

## Overview

Setting up comprehensive SDK integration testing infrastructure for minibag-2 with **complete database isolation** to protect production data.

### Database Architecture
- **Production Supabase:** `https://drbocrbecchxbzcfljol.supabase.co` (PROTECTED)
- **Test Supabase:** `http://localhost:54321` (via Colima/Docker)
- **Test PostgreSQL:** `postgresql://localhost:5432/sessions_test` (via Postgres.app)

---

## ✅ Phase 1: Safety Infrastructure (COMPLETE)

### 1. Environment Configuration

#### Created `.env.test`
Location: `/Users/maulik/llcode/minibag-2/.env.test`

Contains:
- Local Supabase URL: `http://localhost:54321`
- Local Supabase keys (default test keys)
- Sessions SDK PostgreSQL URL
- Test-safe credentials (NO production!)
- Feature flags: `USE_SESSIONS_SDK=true`

#### Created `TESTING.md`
Location: `/Users/maulik/llcode/minibag-2/TESTING.md`

Comprehensive 60+ section guide covering:
- Quick start instructions
- Database setup procedures
- Running tests safely
- Troubleshooting common issues
- CI/CD integration examples

### 2. Safety Guards (Multiple Layers)

#### Layer 1: Environment Enforcement
**Files:**
- `packages/minibag/src/__tests__/setup.js:8-14`
- `packages/shared/src/__tests__/setup.js:14-20`

```javascript
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  throw new Error('Tests must run with NODE_ENV=test');
}
```

#### Layer 2: Production URL Blocking
**Files:**
- `packages/minibag/src/__tests__/helpers/testDb.js:36-44`
- `packages/minibag/src/__tests__/setup.js:33-43`
- `packages/shared/src/__tests__/setup.js:44-53`

```javascript
if (supabaseUrl && supabaseUrl.includes('supabase.co')) {
  throw new Error('Cannot use production Supabase in tests!');
}
```

#### Layer 3: Specific Production Instance Blocking
**File:** `packages/minibag/src/__tests__/helpers/testDb.js:46-52`

```javascript
if (url && url.includes('drbocrbecchxbzcfljol')) {
  throw new Error('Database URL appears to be production database');
}
```

#### Layer 4: Automatic .env.test Loading
**Files:**
- `packages/minibag/src/__tests__/setup.js:16-30`
- `packages/shared/src/__tests__/setup.js:22-37`

Test setup files automatically load `.env.test` instead of `.env`:

```javascript
import { config } from 'dotenv';
const rootDir = resolve(__dirname, '../../../../');
const envTestPath = resolve(rootDir, '.env.test');
config({ path: envTestPath });
```

### 3. Dependencies Installed

```bash
npm install --save-dev dotenv  # For loading .env.test in tests
```

### 4. Updated package.json Scripts

**Location:** `packages/minibag/package.json`

All test scripts now enforce `NODE_ENV=test`:

```json
{
  "test": "NODE_ENV=test vitest",
  "test:run": "NODE_ENV=test vitest run",
  "test:unit": "NODE_ENV=test vitest run src/__tests__/unit",
  "test:integration": "NODE_ENV=test vitest run src/__tests__/integration",
  "test:e2e": "NODE_ENV=test playwright test",

  "test:db:start": "colima start && npx supabase start",
  "test:db:stop": "npx supabase stop && colima stop",
  "test:db:reset": "npx supabase db reset",
  "test:db:status": "npx supabase status"
}
```

### 5. Local Supabase Initialized

```bash
npx supabase init  # ✅ DONE
```

Created:
- `supabase/config.toml` - Local Supabase configuration
- `supabase/.gitignore` - Git ignore rules
- `supabase/.temp/` - Temporary files directory

---

## 🔄 Phase 2: Database Setup (IN PROGRESS)

### Current Task: Installing Colima + Docker

**Command running:**
```bash
brew install colima docker
```

**Status:** Installing (building Go compiler from source)
**Expected time:** 5-15 minutes
**Background process ID:** aa7636

**Why Colima?**
- Docker Desktop requires macOS 11+
- You're on macOS 10.15.7
- Colima is lightweight Docker alternative that works on older macOS

### What Colima Does:
- Provides Docker runtime via Lima VM
- Allows running Docker containers (Supabase needs this)
- Compatible with all Docker commands
- Much lighter than Docker Desktop

---

## 📋 Next Steps (After Colima Finishes)

### Step 1: Start Colima
```bash
colima start
```

Expected output:
```
INFO[0000] starting colima
INFO[0000] runtime: docker
INFO[0010] starting ...
INFO[0030] done
```

Verify:
```bash
docker ps  # Should show empty list (no error)
```

### Step 2: Start Local Supabase
```bash
cd /Users/maulik/llcode/minibag-2
npx supabase start
```

This will:
- Pull Docker images (first time only, ~5 minutes)
- Start PostgreSQL on localhost:54321
- Start Supabase Studio on localhost:54323
- Display access credentials

Expected output:
```
Started supabase local development setup.

         API URL: http://localhost:54321
     GraphQL URL: http://localhost:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbG...
service_role key: eyJhbG...
```

### Step 3: Apply Database Schema

Option A - Create migration from production:
```bash
npx supabase db pull
```

Option B - Manual schema creation:
```bash
# Create schema file
supabase/migrations/001_initial_schema.sql

# Then apply
npx supabase db push
```

### Step 4: Verify Postgres.app Connection

Check Sessions SDK database:
```bash
# Test PostgreSQL connection
psql -U postgres -h localhost -p 5432 -c "SELECT version();"

# Create test database if needed
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE IF NOT EXISTS sessions_test;"

# Apply Sessions SDK schema
cd /Users/maulik/llcode/sessions/packages/core
npx prisma migrate dev
```

### Step 5: Test Database Connectivity

Run connectivity test:
```bash
cd /Users/maulik/llcode/minibag-2/packages/minibag

# This should pass with local databases
NODE_ENV=test node -e "
import { getTestClient } from './src/__tests__/helpers/testDb.js';
const client = getTestClient();
console.log('✅ Test client created successfully');
"
```

---

## 📦 Phase 3: SDK Integration Tests (READY TO START)

Once databases are running, we'll create:

### Test Structure
```
packages/minibag/src/__tests__/integration/sdk/
├── session-creation.test.js       # SDK adapter for creating sessions
├── session-join.test.js           # Joining sessions via SDK
├── nickname-selection.test.js     # Nickname pool integration
├── feature-flag-toggle.test.js    # SDK vs legacy path testing
└── group-mode.test.js             # Constant invite links
```

### Test Coverage Goals
- ✅ Session creation via SDK adapter
- ✅ Participant joining with nickname selection
- ✅ Group mode (constant invite links)
- ✅ Feature flag toggling (SDK vs legacy)
- ✅ Error handling and fallbacks
- ✅ Data synchronization between databases

### Factories to Create
```javascript
// packages/minibag/src/__tests__/helpers/factories.js
export function buildSDKSession({ ... }) { }
export function buildSDKParticipant({ ... }) { }
export function buildSDKInvite({ ... }) { }
```

---

## 🎯 Success Criteria

### Phase 1 (Complete ✅)
- [x] .env.test file created with safe configuration
- [x] Safety guards prevent production database access
- [x] Test setup files load .env.test automatically
- [x] TESTING.md documentation created
- [x] package.json scripts enforce NODE_ENV=test
- [x] dotenv dependency installed

### Phase 2 (In Progress 🔄)
- [ ] Colima + Docker installed and running
- [ ] Local Supabase started on localhost:54321
- [ ] Database schema applied to local instance
- [ ] Postgres.app verified and sessions_test database created
- [ ] SDK Prisma migrations applied
- [ ] Database connectivity tests pass

### Phase 3 (Pending 📋)
- [ ] SDK integration test directory created
- [ ] session-creation.test.js implemented
- [ ] session-join.test.js implemented
- [ ] nickname-selection.test.js implemented
- [ ] feature-flag-toggle.test.js implemented
- [ ] Test data factories created
- [ ] All SDK tests passing
- [ ] Existing integration tests updated

---

## 🔒 Safety Verification

Before running any tests, verify safety checks:

### Test 1: Environment Check
```bash
NODE_ENV=production npm run test:run
# Expected: Error "Tests must run with NODE_ENV=test"
```

### Test 2: Production URL Block
```bash
VITE_SUPABASE_URL=https://drbocrbecchxbzcfljol.supabase.co npm run test:unit
# Expected: Error "Cannot use production Supabase in tests!"
```

### Test 3: .env.test Loading
```bash
npm run test:run -- --reporter=verbose
# Expected: "[Test Setup] Loaded test environment from .env.test"
```

All three tests should FAIL with safety errors. This confirms protection is working.

---

## 📊 Test Execution Plan

### Running Tests (After Setup Complete)

```bash
# 1. Start test databases (once per session)
npm run test:db:start

# 2. Run unit tests (fast, no DB required)
npm run test:unit

# 3. Run integration tests (requires test DBs)
npm run test:integration

# 4. Run E2E tests (requires test DBs + dev server)
npm run test:e2e

# 5. Run all tests with coverage
npm run test:coverage

# 6. Stop databases when done
npm run test:db:stop
```

---

## ⚠️ Important Notes

### DO NOT:
- ❌ Modify `.env.test` to use production URLs
- ❌ Run tests without `NODE_ENV=test`
- ❌ Commit `.env.test` with real credentials
- ❌ Skip database startup (integration tests will fail)

### DO:
- ✅ Always start test databases before integration tests
- ✅ Run `npm run test:unit` frequently (fast, safe)
- ✅ Use `test.only()` to focus on specific tests
- ✅ Clean up test data with `TEST_` prefixes
- ✅ Check `npm run test:db:status` if tests fail

---

## 🔧 Troubleshooting

### Colima Installation Fails
```bash
# Try specific version
brew install colima@0.5.5

# Or check logs
tail -f ~/Library/Logs/Homebrew/colima/*.log
```

### Supabase Won't Start
```bash
# Check Colima is running
colima status

# Restart Colima
colima stop && colima start

# Check Docker
docker ps
```

### Tests Hit Production Database
**STOP IMMEDIATELY**

1. Check `NODE_ENV`: `echo $NODE_ENV` (should be "test")
2. Check `.env.test` exists
3. Verify safety guards haven't been modified
4. Run: `npm run test:db:status` to check which DBs are running

---

## 📞 Current Status Summary

**Phase 1:** ✅ **COMPLETE** - Safety infrastructure fully operational
**Phase 2:** 🔄 **IN PROGRESS** - Waiting for Colima installation
**Phase 3:** 📋 **READY** - SDK test files ready to create

**Next Action:** Wait for Colima installation to complete, then run Step 1 from "Next Steps" section above.

**Background Process:** `aa7636` - Running `brew install colima docker`

---

**Last Updated:** November 17, 2025, 13:50 IST
