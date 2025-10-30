# Testing Strategy

**Last Updated:** October 13, 2025  
**Version:** 1.0.0  
**Status:** Draft

---

## 🎯 Overview

This document defines the testing strategy for LocalLoops platform, covering unit tests, integration tests, and end-to-end testing.

**Goal:** 80%+ code coverage, zero critical bugs in production.

---

## 📊 Testing Pyramid

```
       /\
      /E2E\         10% - User flows (Playwright)
     /------\
    /  API  \       30% - Integration (Jest + Supertest)
   /----------\
  /   Unit     \    60% - Functions, components (Vitest)
 /--------------\
```

---

## 🧪 Testing Stack

| Type | Tool | Purpose |
|------|------|---------|
| **Unit** | Vitest | Fast, lightweight, React component testing |
| **Integration** | Jest + Supertest | API endpoint testing |
| **E2E** | Playwright | Full user journeys in real browsers |
| **Visual** | Percy (optional) | Screenshot regression testing |
| **Performance** | Lighthouse CI | Load time, accessibility, SEO |

---

## 🎯 Testing Priorities

### Critical (Must Test)
- ✅ Session creation flow
- ✅ Participant joining flow
- ✅ Item add/update/remove
- ✅ Order locking
- ✅ Payment recording
- ✅ Split calculation
- ✅ Real-time sync (WebSocket)
- ✅ Authentication (OTP)

### Important (Should Test)
- Catalog search/filter
- Nickname generation
- Session expiry
- Error handling
- Offline queue
- Language switching

### Nice to Have (Can Test)
- UI animations
- Accessibility
- Performance metrics
- Browser compatibility

---

## 📝 Unit Testing

### What to Test
- Pure functions (calculations, utilities)
- React components (props, state, events)
- API client methods
- Business logic

### Tools Setup
```bash
npm install -D vitest @testing-library/react @testing-library/user-event
```

### Example Tests

#### 1. Pure Function Test
```javascript
// calculations.test.js
import { describe, it, expect } from 'vitest';
import { calculateSessionMetrics } from './calculations';

describe('calculateSessionMetrics', () => {
  it('calculates total demand value correctly', () => {
    const session = { session_type: 'minibag' };
    const participants = [
      { items: [{ item_id: 'v1', quantity: 2, bulk_price: 35 }] },
      { items: [{ item_id: 'v1', quantity: 1, bulk_price: 35 }] }
    ];

    const result = calculateSessionMetrics(session, participants);

    expect(result.totalDemandValue).toBe(105); // 3kg × ₹35
  });

  it('aggregates items from multiple participants', () => {
    const session = { session_type: 'minibag' };
    const participants = [
      { items: [{ item_id: 'v1', quantity: 2, unit: 'kg' }] },
      { items: [{ item_id: 'v1', quantity: 1.5, unit: 'kg' }] }
    ];

    const result = calculateSessionMetrics(session, participants);
    const tomatoes = result.aggregatedItems.find(i => i.item_id === 'v1');

    expect(tomatoes.total_quantity).toBe(3.5);
    expect(tomatoes.participant_count).toBe(2);
  });

  it('marks session ready when thresholds met', () => {
    const session = { session_type: 'minibag' };
    const participants = Array(5).fill({
      items: [{ item_id: 'v1', quantity: 2, bulk_price: 100 }]
    });

    const result = calculateSessionMetrics(session, participants);

    expect(result.readyForVendor).toBe(true);
    expect(result.participantCount).toBeGreaterThanOrEqual(5);
    expect(result.totalDemandValue).toBeGreaterThanOrEqual(2000);
  });
});
```

#### 2. React Component Test
```javascript
// SessionCard.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SessionCard from './SessionCard';

describe('SessionCard', () => {
  const mockSession = {
    session_id: 'abc123',
    participant_count: 3,
    total_demand_value: 450,
    status: 'open'
  };

  it('renders session details correctly', () => {
    render(<SessionCard session={mockSession} />);

    expect(screen.getByText('abc123')).toBeInTheDocument();
    expect(screen.getByText('3 participants')).toBeInTheDocument();
    expect(screen.getByText('₹450')).toBeInTheDocument();
  });

  it('calls onJoin when join button clicked', () => {
    const handleJoin = vi.fn();
    render(<SessionCard session={mockSession} onJoin={handleJoin} />);

    const joinButton = screen.getByRole('button', { name: /join/i });
    fireEvent.click(joinButton);

    expect(handleJoin).toHaveBeenCalledWith('abc123');
  });

  it('disables join button when session is full', () => {
    const fullSession = { ...mockSession, participant_count: 4 };
    render(<SessionCard session={fullSession} />);

    const joinButton = screen.getByRole('button', { name: /join/i });
    expect(joinButton).toBeDisabled();
  });

  it('shows "Shopping" badge when status is shopping', () => {
    const shoppingSession = { ...mockSession, status: 'shopping' };
    render(<SessionCard session={shoppingSession} />);

    expect(screen.getByText('Shopping')).toBeInTheDocument();
  });
});
```

#### 3. Custom Hook Test
```javascript
// useMinibagCatalog.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMinibagCatalog } from './useMinibagCatalog';

// Mock API
vi.mock('./api/catalog', () => ({
  getCatalogItems: vi.fn(() => Promise.resolve({
    items: [{ id: 'v1', name: 'Tomatoes' }],
    categories: [{ id: 'veggies', name: 'Vegetables' }]
  }))
}));

describe('useMinibagCatalog', () => {
  it('loads catalog on mount', async () => {
    const { result } = renderHook(() => useMinibagCatalog());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.categories).toHaveLength(1);
  });

  it('filters by category', async () => {
    const { result } = renderHook(() => useMinibagCatalog());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    result.current.filterByCategory('veggies');

    await waitFor(() => {
      expect(result.current.items[0].category_id).toBe('veggies');
    });
  });
});
```

---

## 🔗 Integration Testing

### What to Test
- API endpoints (request/response)
- Database operations (CRUD)
- WebSocket events
- Authentication flow

### Tools Setup
```bash
npm install -D jest supertest socket.io-client
```

### Example Tests

#### 1. REST API Test
```javascript
// sessions.api.test.js
import request from 'supertest';
import app from '../src/app';
import { db } from '../src/db';

describe('Sessions API', () => {
  beforeEach(async () => {
    await db.collection('sessions').deleteMany({});
  });

  describe('POST /api/sessions/create', () => {
    it('creates a new session', async () => {
      const response = await request(app)
        .post('/api/sessions/create')
        .send({
          session_type: 'minibag',
          location_text: 'Building A',
          scheduled_time: new Date().toISOString()
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.session_id).toBeDefined();
      expect(response.body.short_url).toContain('minibag.in');
    });

    it('rejects invalid session type', async () => {
      const response = await request(app)
        .post('/api/sessions/create')
        .send({
          session_type: 'invalid',
          location_text: 'Building A',
          scheduled_time: new Date().toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_SESSION_TYPE');
    });

    it('generates nickname if not provided', async () => {
      const response = await request(app)
        .post('/api/sessions/create')
        .send({
          session_type: 'minibag',
          location_text: 'Building A',
          scheduled_time: new Date().toISOString()
        });

      expect(response.body.creator_nickname).toMatch(/^[A-Z][a-z]{2}$/);
    });
  });

  describe('GET /api/sessions/:id', () => {
    it('returns session details', async () => {
      // Create session first
      const createResponse = await request(app)
        .post('/api/sessions/create')
        .send({
          session_type: 'minibag',
          location_text: 'Building A',
          scheduled_time: new Date().toISOString()
        });

      const sessionId = createResponse.body.session_id;

      // Get session
      const response = await request(app)
        .get(`/api/sessions/${sessionId}`);

      expect(response.status).toBe(200);
      expect(response.body.session.session_id).toBe(sessionId);
    });

    it('returns 404 for non-existent session', async () => {
      const response = await request(app)
        .get('/api/sessions/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('SESSION_NOT_FOUND');
    });
  });
});
```

#### 2. WebSocket Test
```javascript
// websocket.test.js
import { io as ioClient } from 'socket.io-client';
import { createServer } from '../src/server';

describe('WebSocket Events', () => {
  let server, clientSocket, serverSocket;

  beforeAll((done) => {
    server = createServer();
    server.listen(() => {
      const port = server.address().port;
      clientSocket = ioClient(`http://localhost:${port}`);
      
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    server.close();
    clientSocket.close();
  });

  it('creates session via WebSocket', (done) => {
    clientSocket.emit('create-session', {
      session_type: 'minibag',
      location_text: 'Building A',
      scheduled_time: new Date().toISOString()
    });

    clientSocket.on('session-created', (data) => {
      expect(data.success).toBe(true);
      expect(data.session_id).toBeDefined();
      done();
    });
  });

  it('broadcasts to other participants when item added', (done) => {
    const secondClient = ioClient(`http://localhost:${server.address().port}`);

    // Both join same session
    clientSocket.emit('join-session', { session_id: 'abc123' });
    secondClient.emit('join-session', { session_id: 'abc123' });

    // First client adds item
    clientSocket.emit('add-item', {
      session_id: 'abc123',
      item_id: 'v1',
      quantity: 2
    });

    // Second client should receive update
    secondClient.on('session-updated', (session) => {
      expect(session.participant_count).toBeGreaterThan(0);
      secondClient.close();
      done();
    });
  });
});
```

#### 3. Database Test
```javascript
// database.test.js
import { db } from '../src/db';
import { createSession, getSession } from '../src/services/sessions';

describe('Database Operations', () => {
  beforeEach(async () => {
    await db.collection('sessions').deleteMany({});
  });

  it('stores session in database', async () => {
    const data = {
      session_type: 'minibag',
      location_text: 'Building A',
      scheduled_time: new Date().toISOString()
    };

    const result = await createSession(db, data);

    const stored = await db.collection('sessions')
      .doc(result.session_id)
      .get();

    expect(stored.exists).toBe(true);
    expect(stored.data().session_type).toBe('minibag');
  });

  it('retrieves session with participants', async () => {
    const sessionId = 'test123';
    
    // Create session
    await db.collection('sessions').doc(sessionId).set({
      session_id: sessionId,
      session_type: 'minibag',
      participant_count: 2
    });

    // Add participants
    await db.collection('sessions').doc(sessionId)
      .collection('participants').add({
        nickname: 'Raj',
        items: []
      });

    const session = await getSession(db, sessionId);

    expect(session.participants).toHaveLength(1);
  });
});
```

---

## 🎭 End-to-End Testing

### What to Test
- Complete user flows
- Multi-user scenarios
- Real browser interactions
- Mobile responsiveness

### Tools Setup
```bash
npm install -D @playwright/test
```

### Example Tests

#### 1. Session Creation Flow
```javascript
// e2e/session-creation.spec.js
import { test, expect } from '@playwright/test';

test.describe('Session Creation', () => {
  test('host creates session and shares link', async ({ page, context }) => {
    // Go to home
    await page.goto('http://localhost:5173');

    // Click plus button
    await page.click('[data-testid="plus-button"]');
    await page.click('text=New run');

    // Select category
    await page.click('[data-testid="category-veggies"]');

    // Add items
    await page.click('text=Tomatoes');
    await page.click('[data-testid="add-tomatoes"]');
    await page.fill('[data-testid="quantity-v1"]', '2');

    await page.click('text=Onions');
    await page.click('[data-testid="add-onions"]');

    // Create session
    await page.click('text=Create session');

    // Verify session created
    await expect(page.locator('text=Session active')).toBeVisible();
    await expect(page.locator('text=minibag.in/')).toBeVisible();

    // Get session URL
    const sessionUrl = await page.locator('[data-testid="session-url"]').textContent();
    expect(sessionUrl).toMatch(/minibag\.in\/[a-z0-9]{6}/);
  });

  test('displays capacity limit warning', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.click('[data-testid="plus-button"]');
    await page.click('text=New run');

    // Add items until capacity reached
    for (let i = 0; i < 20; i++) {
      await page.click('[data-testid="add-v1"]');
    }

    // Should show warning
    await expect(page.locator('text=10kg limit reached')).toBeVisible();

    // Add button should be disabled
    const addButton = page.locator('[data-testid="add-v1"]');
    await expect(addButton).toBeDisabled();
  });
});
```

#### 2. Multi-User Flow
```javascript
// e2e/multi-user.spec.js
import { test, expect } from '@playwright/test';

test.describe('Multi-User Coordination', () => {
  test('participant joins and adds items', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();

    const participantContext = await browser.newContext();
    const participantPage = await participantContext.newPage();

    // Host creates session
    await hostPage.goto('http://localhost:5173');
    await hostPage.click('[data-testid="plus-button"]');
    await hostPage.click('text=New run');
    await hostPage.click('[data-testid="add-v1"]');
    await hostPage.click('text=Create session');

    // Get session URL
    const sessionUrl = await hostPage
      .locator('[data-testid="session-url"]')
      .textContent();
    const sessionId = sessionUrl.split('/').pop();

    // Participant joins via link
    await participantPage.goto(`http://localhost:5173/${sessionId}`);

    // Verify joined message
    await expect(participantPage.locator('text=You joined as')).toBeVisible();

    // Participant adds items
    await participantPage.click('[data-testid="add-v2"]');
    await participantPage.click('text=Lock order');

    // Host should see updated participant count
    await expect(hostPage.locator('text=2 participants')).toBeVisible();

    // Cleanup
    await hostContext.close();
    await participantContext.close();
  });
});
```

#### 3. Mobile Responsiveness
```javascript
// e2e/mobile.spec.js
import { test, expect, devices } from '@playwright/test';

test.describe('Mobile Experience', () => {
  test.use({ ...devices['iPhone 12'] });

  test('works on mobile viewport', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Verify mobile layout
    const viewport = page.viewportSize();
    expect(viewport.width).toBe(390);

    // Check touch targets are large enough (48x48 minimum)
    const plusButton = page.locator('[data-testid="plus-button"]');
    const box = await plusButton.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(48);
    expect(box.height).toBeGreaterThanOrEqual(48);

    // Test horizontal scroll for categories
    await page.click('[data-testid="plus-button"]');
    await page.click('text=New run');

    const categories = page.locator('[data-testid="categories"]');
    const scrollable = await categories.evaluate(el => 
      el.scrollWidth > el.clientWidth
    );
    expect(scrollable).toBe(true);
  });
});
```

---

## 🎨 Visual Regression Testing

### Percy Integration
```javascript
// visual.spec.js
import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';

test.describe('Visual Regression', () => {
  test('home screen', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await percySnapshot(page, 'Home Screen');
  });

  test('session active screen', async ({ page }) => {
    // Setup: create session
    await page.goto('http://localhost:5173/test-session');
    await percySnapshot(page, 'Session Active');
  });

  test('shopping screen', async ({ page }) => {
    await page.goto('http://localhost:5173/test-session/shopping');
    await percySnapshot(page, 'Shopping Screen');
  });
});
```

---

## ⚡ Performance Testing

### Lighthouse CI
```yaml
# .lighthouserc.json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:5173", "http://localhost:5173/abc123"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "categories:accessibility": ["error", {"minScore": 0.95}],
        "first-contentful-paint": ["error", {"maxNumericValue": 2000}],
        "interactive": ["error", {"maxNumericValue": 3000}]
      }
    }
  }
}
```

### Load Testing
```javascript
// load-test.js
import { check } from 'k6';
import http from 'k6/http';

export const options = {
  vus: 50, // 50 virtual users
  duration: '1m'
};

export default function() {
  const response = http.post('http://localhost:3000/api/sessions/create', {
    session_type: 'minibag',
    location_text: 'Building A',
    scheduled_time: new Date().toISOString()
  });

  check(response, {
    'status is 201': (r) => r.status === 201,
    'response time < 500ms': (r) => r.timings.duration < 500
  });
}
```

---

## 🔄 CI/CD Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      firebase:
        image: firebase/emulator-suite
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e

  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run lighthouse:ci
```

---

## 📊 Coverage Goals

| Area | Target Coverage |
|------|-----------------|
| **Critical Paths** | 95%+ |
| **Business Logic** | 90%+ |
| **UI Components** | 80%+ |
| **Utilities** | 85%+ |
| **Overall** | 80%+ |

### Measuring Coverage
```bash
# Unit test coverage
npm run test:unit -- --coverage

# Generate HTML report
npm run test:coverage:html

# View report
open coverage/index.html
```

---

## ✅ Testing Checklist

### Before Each Release
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass
- [ ] Coverage > 80%
- [ ] No console errors
- [ ] Lighthouse score > 90
- [ ] Visual regression tests pass
- [ ] Tested on Chrome, Safari, Firefox
- [ ] Tested on iOS and Android
- [ ] Load tested (50 concurrent users)

---

## 🔄 Version History

- **1.0.0** (Oct 13, 2025): Initial testing strategy