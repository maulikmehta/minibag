# Testing Guide

## Overview

Comprehensive testing setup for LocalLoops MiniBag application following Test Pyramid principles.

## Test Pyramid

```
        /\
       /  \
      / E2E \           21 tests - Critical user journeys
     /------\
    /  Inte- \          28 tests - API integration
   / gration \
  /----------\
 /    Unit    \        50+ tests - Business logic
/--------------\
```

## Test Types

### 1. Unit Tests

**Purpose**: Test individual functions and components in isolation

**Location**: `packages/minibag/src/__tests__/unit/`

**Examples:**
- `sessionTransformers.test.js` - Data transformation logic (50 tests)
- `useSession.test.js` - React hook behavior (29 tests)

**Run:**
```bash
npm run test:unit
```

**When to write:**
- Pure functions (transformers, validators, formatters)
- React hooks (with Testing Library)
- Utility functions
- Custom logic/algorithms

**Best practices:**
- Test edge cases and null values
- Mock external dependencies (API, WebSocket)
- Use descriptive test names
- Test both happy path and error cases

### 2. Integration Tests

**Purpose**: Test API interactions and service integration

**Location**: `packages/minibag/src/__tests__/integration/`

**Examples:**
- `sessions.test.js` - Session API endpoints (28 tests)

**Run:**
```bash
npm run test:integration
```

**When to write:**
- API service functions
- Network request/response handling
- Error handling for different HTTP status codes
- Request payload validation

**Best practices:**
- Use MSW (Mock Service Worker) for HTTP mocking
- Test real request/response flow
- Verify headers and credentials
- Test error responses (4xx, 5xx)

### 3. E2E Tests

**Purpose**: Test complete user journeys from UI to backend

**Location**: `packages/minibag/src/__tests__/e2e/`

**Examples:**
- `session-creation.spec.js` - Session creation flow (5 tests)
- `session-join.spec.js` - Session join flow (9 tests)
- `complete-shopping-journey.spec.js` - End-to-end journeys (7 tests)

**Run:**
```bash
npm run test:e2e          # Headless
npm run test:e2e:ui       # Interactive UI mode
npm run test:e2e:debug    # Debug mode
```

**When to write:**
- Critical user paths (signup, login, checkout)
- Multi-step workflows
- Real-time features (WebSocket updates)
- Cross-browser compatibility

**Best practices:**
- Focus on user perspective, not implementation
- Use semantic selectors (role, label, text)
- Test on mobile viewport (default config)
- Handle async operations properly

## Quick Commands

```bash
# Run all tests
npm test                       # Watch mode
npm run test:run              # Single run

# Run specific test type
npm run test:unit             # Unit tests only
npm run test:integration      # Integration tests only
npm run test:e2e              # E2E tests only

# Coverage
npm run test:coverage         # Generate coverage report

# Specific file
npm test -- useSession.test.js

# Specific test
npm test -- -t "should join session"

# UI mode (interactive)
npm run test:ui               # Vitest UI
npm run test:e2e:ui           # Playwright UI

# Debug
npm run test:e2e:debug        # Playwright debug mode
```

## Writing Tests

### Unit Test Example

```javascript
// src/__tests__/unit/utils/formatter.test.js
import { describe, it, expect } from 'vitest';
import { formatPrice } from '../../../utils/formatter.js';

describe('formatPrice', () => {
  it('should format price with rupee symbol', () => {
    expect(formatPrice(100)).toBe('₹100');
  });

  it('should handle decimal values', () => {
    expect(formatPrice(99.99)).toBe('₹99.99');
  });

  it('should handle zero', () => {
    expect(formatPrice(0)).toBe('₹0');
  });

  it('should handle null input', () => {
    expect(formatPrice(null)).toBe('₹0');
  });
});
```

### Integration Test Example

```javascript
// src/__tests__/integration/api/items.test.js
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { getItems } from '../../../services/api.js';

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Items API', () => {
  it('should fetch items successfully', async () => {
    server.use(
      http.get('/api/items', () => {
        return HttpResponse.json({
          data: [{ id: 1, name: 'Tomato' }]
        });
      })
    );

    const items = await getItems();
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Tomato');
  });
});
```

### E2E Test Example

```javascript
// src/__tests__/e2e/checkout.spec.js
import { test, expect } from '@playwright/test';

test('should complete checkout flow', async ({ page }) => {
  // Navigate to app
  await page.goto('/');

  // Create session
  await page.getByRole('button', { name: /create/i }).click();
  await page.getByLabel(/location/i).fill('Market');
  await page.getByRole('button', { name: /start/i }).click();

  // Verify session created
  await expect(page).toHaveURL(/\/session\//);
  await expect(page.getByText(/session created/i)).toBeVisible();
});
```

## Test Organization

```
packages/minibag/src/__tests__/
├── unit/                      # Unit tests
│   ├── hooks/                 # React hooks
│   │   └── useSession.test.js
│   ├── utils/                 # Utility functions
│   │   └── sessionTransformers.test.js
│   └── helpers/               # Test helpers
│       └── factories.test.js
│
├── integration/               # Integration tests
│   └── api/                   # API endpoints
│       └── sessions.test.js
│
└── e2e/                       # E2E tests
    ├── session-creation.spec.js
    ├── session-join.spec.js
    ├── complete-shopping-journey.spec.js
    ├── helpers.js             # E2E utilities
    └── README.md              # E2E documentation
```

## Coverage Thresholds

### Week 2 Target: 30%
```javascript
// vitest.config.js
coverage: {
  thresholds: {
    lines: 30,
    functions: 30,
    branches: 30,
    statements: 30,
  }
}
```

### Week 3 Target: 50%
### Week 4 Target: 60%+

## Mocking

### API Mocking (MSW)

```javascript
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  http.get('/api/sessions/:id', ({ params }) => {
    return HttpResponse.json({
      data: { session_id: params.id }
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Module Mocking (Vitest)

```javascript
// Mock must be before imports
vi.mock('../services/api.js', () => ({
  getSession: vi.fn(),
  createSession: vi.fn(),
}));

import { getSession } from '../services/api.js';

// In test
getSession.mockResolvedValue({ session_id: 'ABC123' });
```

### Component Mocking

```javascript
// Mock complex components
vi.mock('../components/Map.jsx', () => ({
  default: () => <div data-testid="map-mock">Map</div>
}));
```

## Debugging

### Unit/Integration Tests

```bash
# Run with verbose output
npm test -- --reporter=verbose

# Debug specific test
npm test -- -t "specific test name" --no-coverage

# Use console.log (will show in output)
console.log('Debug:', myVariable);
```

### E2E Tests

```bash
# Debug mode (step through tests)
npm run test:e2e:debug

# UI mode (watch tests run)
npm run test:e2e:ui

# Headed mode (see browser)
npx playwright test --headed

# Specific test
npx playwright test session-creation --debug
```

### Common Issues

**Issue:** Tests pass locally but fail on CI
- Check Node version matches CI (18.x or 20.x)
- Run `npm ci` instead of `npm install`
- Check for timezone-dependent logic

**Issue:** Flaky E2E tests
- Add explicit waits: `await page.waitForSelector()`
- Use `waitFor` from Testing Library
- Check for race conditions

**Issue:** Coverage not meeting threshold
- Run `npm run test:coverage` to see uncovered lines
- Add tests for missing coverage
- Focus on critical paths first

## CI/CD Integration

Tests run automatically on:
- ✅ Every pull request
- ✅ Push to main/develop
- ✅ Push to infrastructure/** branches

**CI Workflow:**
1. Unit & Integration tests (Node 18, 20)
2. E2E tests (Chromium)
3. Backend tests (with PostgreSQL)
4. Coverage report uploaded to Codecov
5. Coverage commented on PRs

See `.github/workflows/README.md` for detailed CI documentation.

## Best Practices

### General

1. **AAA Pattern**: Arrange, Act, Assert
   ```javascript
   // Arrange
   const input = { name: 'Test' };

   // Act
   const result = processInput(input);

   // Assert
   expect(result).toBe('TESTE');
   ```

2. **One assertion per test** (when possible)
   ```javascript
   // Good
   it('should uppercase name', () => {
     expect(uppercase('test')).toBe('TEST');
   });

   it('should handle empty string', () => {
     expect(uppercase('')).toBe('');
   });

   // Avoid
   it('should process name', () => {
     expect(uppercase('test')).toBe('TEST');
     expect(uppercase('')).toBe('');
     expect(uppercase(null)).toBe('');
   });
   ```

3. **Descriptive test names**
   ```javascript
   // Good
   it('should reject negative quantities', () => {});
   it('should format INR currency with rupee symbol', () => {});

   // Avoid
   it('works', () => {});
   it('test1', () => {});
   ```

4. **Test behavior, not implementation**
   ```javascript
   // Good - tests user-visible behavior
   await expect(page.getByText('Welcome')).toBeVisible();

   // Avoid - tests implementation details
   expect(component.state.welcomeShown).toBe(true);
   ```

### Performance

1. **Use beforeEach for setup** (not in every test)
2. **Clean up after tests** (prevent test pollution)
3. **Mock heavy dependencies** (database, network)
4. **Run E2E tests selectively** (only critical paths)

## Resources

- [Vitest Documentation](https://vitest.dev)
- [Testing Library](https://testing-library.com)
- [Playwright Documentation](https://playwright.dev)
- [MSW Documentation](https://mswjs.io)

## Getting Help

1. Check test output for error messages
2. Review relevant documentation above
3. Check `.github/workflows/README.md` for CI issues
4. Ask team for help debugging tricky issues
