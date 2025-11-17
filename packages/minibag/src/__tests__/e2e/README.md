# E2E Tests

## Overview

End-to-end tests for MiniBag application using Playwright. Tests critical user journeys from session creation to completion.

## Test Files

### session-creation.spec.js (5 tests)
- ✅ Create new session successfully
- ✅ Validate required fields
- ✅ Show session ID after creation
- ✅ Allow selecting items after creation
- ✅ Generate invite link after creation

### session-join.spec.js (9 tests)
- ✅ Join session with valid invite link
- ✅ Show error for invalid session ID
- ✅ Show error for expired invite link
- ✅ Handle full session error
- ✅ Allow declining an invite
- ✅ Show host info and items preview
- ✅ Validate name input
- ✅ Only allow letters and spaces in name
- ✅ Show checkmark animation on avatar selection

### complete-shopping-journey.spec.js (7 tests)
- ✅ Complete full shopping flow as host
- ✅ Handle real-time updates between participants
- ✅ Persist session across page refresh
- ✅ Navigate between app screens
- ✅ Show appropriate UI for different session states
- ✅ Handle errors gracefully
- ✅ Show loading states during async operations

**Total: 21 E2E tests**

## Running Tests

### All E2E tests
```bash
npm run test:e2e
```

### With UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Debug mode
```bash
npm run test:e2e:debug
```

### Specific test file
```bash
npx playwright test session-creation.spec.js
```

### Specific test by name
```bash
npx playwright test --grep "should create a new session"
```

## Configuration

See `playwright.config.js` for configuration:
- Base URL: http://localhost:5173
- Viewport: Mobile-first (390x844 - iPhone 12 Pro)
- Browsers: Chromium (mobile Chrome)
- Retries: 2 on CI, 0 locally
- Timeout: 30 seconds per test

## Prerequisites

1. **Dev Server Running**
   ```bash
   npm run dev
   ```
   The test suite automatically starts the dev server if not running.

2. **Browsers Installed**
   ```bash
   npx playwright install chromium
   ```

3. **Environment**
   - Node.js 18+
   - Backend API running (for real E2E tests)
   - Database seeded with test data (if needed)

## Test Helpers

See `helpers.js` for reusable utilities:
- `createSession()` - Create new session as host
- `joinSession()` - Join existing session
- `addItems()` - Add items to shopping list
- `getInviteLink()` - Extract invite link
- `setupMultiUserSession()` - Setup multi-user scenario
- And more...

## Writing New Tests

### Example: Basic Test
```javascript
import { test, expect } from '@playwright/test';
import { createSession } from './helpers.js';

test('should do something', async ({ page }) => {
  const { sessionId } = await createSession(page);

  // Your test logic
  await expect(page.getByText(sessionId)).toBeVisible();
});
```

### Example: Multi-User Test
```javascript
import { test } from '@playwright/test';
import { setupMultiUserSession } from './helpers.js';

test('should sync between users', async ({ context }) => {
  const { host, participants, sessionId } = await setupMultiUserSession(context, 2);

  // Host does something
  await host.getByRole('button', { name: /start/i }).click();

  // Participants see the update
  await participants[0].waitForSelector('text=/shopping/i');
});
```

## Best Practices

### 1. Use Semantic Locators
```javascript
// Good - semantic and resilient
await page.getByRole('button', { name: /create/i });
await page.getByLabel('Location');
await page.getByText(/invited.*you/i);

// Avoid - fragile
await page.locator('.btn-primary');
await page.locator('#location-input');
```

### 2. Wait for State, Not Time
```javascript
// Good - wait for actual state
await page.waitForURL(/\/session\//);
await page.waitForSelector('text=/session created/i');

// Avoid - arbitrary waits
await page.waitForTimeout(3000);
```

### 3. Handle Conditional UI
```javascript
// Good - check if element exists before interacting
const nextButton = page.getByRole('button', { name: /next/i });
if (await nextButton.isVisible({ timeout: 2000 })) {
  await nextButton.click();
}

// Use helpers for common patterns
await clickIfVisible(page, { name: /next/i });
```

### 4. Test Mobile-First
```javascript
// Tests run with mobile viewport by default
// Ensure touch interactions work
await page.tap('button'); // Instead of click for touch devices
```

### 5. Clean Up Resources
```javascript
test('multi-user test', async ({ context }) => {
  const hostPage = await context.newPage();
  const participantPage = await context.newPage();

  try {
    // Test logic
  } finally {
    // Cleanup
    await hostPage.close();
    await participantPage.close();
  }
});
```

## Debugging

### 1. Run in UI Mode
```bash
npm run test:e2e:ui
```
Interactive mode with time travel debugging.

### 2. Run in Debug Mode
```bash
npm run test:e2e:debug
```
Opens Playwright Inspector for step-by-step debugging.

### 3. Enable Trace
Already enabled on first retry. View traces:
```bash
npx playwright show-trace trace.zip
```

### 4. Screenshots and Videos
- Screenshots: Captured on failure
- Videos: Retained on failure
- Location: `test-results/` directory

## CI/CD Integration

Tests are configured for CI with:
- Retries: 2 attempts on failure
- Workers: 1 (sequential execution)
- Reporter: GitHub Actions format
- Video: Retained on failure for debugging

### GitHub Actions Example
```yaml
- name: Run E2E tests
  run: npm run test:e2e

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Performance

- **Parallel Execution**: Tests run in parallel by default (except on CI)
- **Test Isolation**: Each test runs in a fresh browser context
- **Reuse Dev Server**: Dev server is reused across test runs locally

## Coverage

E2E tests cover:
- ✅ Critical user journeys (session create/join)
- ✅ Error handling (invalid data, network errors)
- ✅ Real-time updates (WebSocket communication)
- ✅ State persistence (localStorage)
- ✅ Mobile UX (touch interactions, responsive design)
- ✅ Loading states (spinners, disabled buttons)
- ✅ Navigation flows (between screens)

## Known Limitations

1. **Database State**: Tests assume clean database state
   - Consider using test-specific sessions or cleanup

2. **WebSocket**: Real-time tests require backend running
   - May need mocking for offline development

3. **Invite Links**: Full invite flow requires backend
   - Some tests use simplified join URLs

## Future Enhancements

- [ ] Add visual regression testing
- [ ] Add performance metrics (Core Web Vitals)
- [ ] Add accessibility testing (axe-core)
- [ ] Add test data factories for consistent test setup
- [ ] Add API mocking for offline development

## Troubleshooting

### Tests Timeout
- Ensure dev server is running
- Check network/backend availability
- Increase timeout in playwright.config.js

### Flaky Tests
- Check for race conditions (WebSocket updates)
- Add explicit waits for state changes
- Use `waitForLoadState('networkidle')` if needed

### Element Not Found
- Verify UI hasn't changed
- Use Playwright Inspector to inspect current page state
- Check if element is in different viewport (scroll)

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
