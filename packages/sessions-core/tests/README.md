# Sessions SDK - Tests

## Test Coverage

We have comprehensive tests covering:

### 1. Nickname Reservation (`reserve.test.ts`)
- Getting 2 nickname options (1 male, 1 female)
- Fallback nicknames when pool is empty
- First letter matching for personalization
- Reservation mechanism (5-minute TTL)
- Proper error handling

### 2. Nickname Claiming (`claim.test.ts`)
- Claiming available nicknames
- Incrementing usage counters
- Preventing double-claiming
- Reservation verification before claiming
- Releasing nicknames back to pool

### 3. Cleanup Functions (`cleanup.test.ts`)
- Releasing expired reservations (5+ minutes old)
- Releasing nicknames from old sessions (4+ hours)
- Preserving usage statistics
- Not affecting active sessions

### 4. Race Conditions (`race-conditions.test.ts`) ⚡ **CRITICAL**
- Concurrent reservation attempts
- Concurrent claim attempts
- Concurrent getTwoNicknameOptions calls
- Prevention of double-claiming via reservation
- Database consistency under load

## Running Tests

### Prerequisites

1. **PostgreSQL database** running locally
2. **Test database** created:
   ```bash
   createdb sessions_test
   ```

3. **Environment variable** set:
   ```bash
   export DATABASE_URL="postgresql://localhost:5432/sessions_test"
   ```

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

### Setup Test Database

```bash
# Generate Prisma client
npx prisma generate

# Create tables in test database
npx prisma db push --skip-generate

# Seed test data (optional)
npx prisma db seed
```

## Test Database Schema

The tests use the same Prisma schema as production:
- `nicknames_pool` table with all fields
- Indexes on `isAvailable`, `reservedUntil`, `gender`

## Expected Coverage

Target: **80%+ code coverage**

Current test files:
- ✅ reserve.test.ts (15 tests)
- ✅ claim.test.ts (10 tests)
- ✅ cleanup.test.ts (8 tests)
- ✅ race-conditions.test.ts (6 tests)

**Total: 39 comprehensive tests**

## Important Notes

⚠️ **Race Condition Tests**: These are critical! They verify that our database transactions prevent concurrent users from claiming the same nickname.

⚠️ **Test Isolation**: Each test cleans up its data in `beforeEach` and `afterEach` to ensure isolation.

⚠️ **Test Database**: Use a separate database for testing to avoid affecting development data.
