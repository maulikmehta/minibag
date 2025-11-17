/**
 * E2E Test Helpers
 * Week 2 Day 7: Common utilities for end-to-end testing
 */

import { expect } from '@playwright/test';

/**
 * Create a new session as host
 * @param {import('@playwright/test').Page} page
 * @param {Object} options
 * @returns {Promise<{sessionId: string, sessionUrl: string}>}
 */
export async function createSession(page, { location = 'Test Market', participants = 4 } = {}) {
  await page.goto('/');
  await page.getByRole('button', { name: /create.*list/i }).click();

  // Fill session details
  await page.getByLabel(/location/i).fill(location);

  const participantInput = page.getByLabel(/expected participants/i);
  if (await participantInput.isVisible({ timeout: 2000 })) {
    await participantInput.fill(String(participants));
  }

  // Create session
  await page.getByRole('button', { name: /create.*session|start.*list/i }).click();

  // Wait for navigation
  await page.waitForURL(/\/session\//, { timeout: 10000 });

  const sessionUrl = page.url();
  const sessionId = sessionUrl.match(/session\/([A-Z0-9]+)/)?.[1];

  if (!sessionId) {
    throw new Error('Failed to extract session ID from URL');
  }

  return { sessionId, sessionUrl };
}

/**
 * Join an existing session
 * @param {import('@playwright/test').Page} page
 * @param {string} sessionId
 * @param {Object} options
 */
export async function joinSession(page, sessionId, { name = 'Test User', inviteToken = null } = {}) {
  // Navigate to join page
  const url = inviteToken
    ? `/join/${sessionId}?inv=${inviteToken}`
    : `/join/${sessionId}`;

  await page.goto(url);

  // Enter name
  await page.getByPlaceholder(/name/i).fill(name);

  // Click next if available
  let nextButton = page.getByRole('button', { name: /next/i });
  if (await nextButton.isVisible({ timeout: 2000 })) {
    await nextButton.click();

    // Language selection (click next again if visible)
    nextButton = page.getByRole('button', { name: /next/i });
    if (await nextButton.isVisible({ timeout: 2000 })) {
      await nextButton.click();
    }
  }

  // Select avatar (if on avatar selection screen)
  await page.waitForTimeout(500);
  const avatar = page.locator('button:has(span)').first();
  if (await avatar.isVisible({ timeout: 2000 })) {
    await avatar.click();
  }

  // Join the session
  const joinButton = page.getByRole('button', { name: /join.*list/i });
  if (await joinButton.isVisible({ timeout: 2000 })) {
    await joinButton.click();
  }

  // Wait for join to complete
  await page.waitForURL(/\/session\//, { timeout: 10000 });
}

/**
 * Add items to shopping list
 * @param {import('@playwright/test').Page} page
 * @param {string[]} items - Item names to add
 */
export async function addItems(page, items) {
  // Open item selection
  await page.getByRole('button', { name: /add.*item|select.*item/i }).click();

  for (const itemName of items) {
    // Find and click item
    await page.getByText(new RegExp(itemName, 'i')).first().click();

    // Increase quantity
    await page.getByRole('button', { name: '+' }).click();
  }

  // Confirm selection
  await page.getByRole('button', { name: /done|confirm|save/i }).click();
}

/**
 * Get invite link from session page
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string|null>}
 */
export async function getInviteLink(page) {
  // Look for invite button
  const inviteButton = page.getByRole('button', { name: /invite|share/i });

  if (await inviteButton.isVisible({ timeout: 3000 })) {
    await inviteButton.click();

    // Try to extract link
    const linkElement = page.locator('text=/https?:\/\//').first();
    if (await linkElement.isVisible({ timeout: 2000 })) {
      return await linkElement.textContent();
    }
  }

  return null;
}

/**
 * Wait for element with retry
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 * @param {number} maxAttempts
 */
export async function waitForElement(page, selector, maxAttempts = 5) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await page.waitForSelector(selector, { timeout: 2000 });
      return true;
    } catch (e) {
      if (i === maxAttempts - 1) throw e;
      await page.waitForTimeout(500);
    }
  }
  return false;
}

/**
 * Check if element exists without throwing
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 */
export async function elementExists(page, selector) {
  try {
    await page.waitForSelector(selector, { timeout: 1000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get text content safely
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 */
export async function getTextSafe(page, selector) {
  try {
    const element = await page.locator(selector).first();
    if (await element.isVisible({ timeout: 1000 })) {
      return await element.textContent();
    }
  } catch {
    // Element not found
  }
  return null;
}

/**
 * Click button if visible
 * @param {import('@playwright/test').Page} page
 * @param {Object} options - Button locator options
 * @param {number} timeout - Wait timeout
 */
export async function clickIfVisible(page, options, timeout = 2000) {
  try {
    const button = page.getByRole('button', options);
    if (await button.isVisible({ timeout })) {
      await button.click();
      return true;
    }
  } catch {
    // Button not found or not clickable
  }
  return false;
}

/**
 * Fill form field if visible
 * @param {import('@playwright/test').Page} page
 * @param {RegExp|string} label
 * @param {string} value
 */
export async function fillIfVisible(page, label, value, timeout = 2000) {
  try {
    const input = page.getByLabel(label);
    if (await input.isVisible({ timeout })) {
      await input.fill(value);
      return true;
    }
  } catch {
    // Field not found
  }
  return false;
}

/**
 * Assert toast/notification appears
 * @param {import('@playwright/test').Page} page
 * @param {RegExp|string} message
 */
export async function expectToast(page, message) {
  await expect(
    page.locator('[role="alert"], [class*="toast"], [class*="notification"]')
      .filter({ hasText: message })
  ).toBeVisible({ timeout: 5000 });
}

/**
 * Wait for navigation with timeout
 * @param {import('@playwright/test').Page} page
 * @param {RegExp|string} urlPattern
 * @param {number} timeout
 */
export async function waitForNavigation(page, urlPattern, timeout = 10000) {
  await page.waitForURL(urlPattern, { timeout });
}

/**
 * Take screenshot with timestamp
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
export async function takeScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({ path: `test-results/${name}-${timestamp}.png` });
}

/**
 * Mock API response for testing
 * @param {import('@playwright/test').Page} page
 * @param {string} url
 * @param {Object} response
 */
export async function mockApiResponse(page, url, response) {
  await page.route(url, route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response)
    });
  });
}

/**
 * Setup test session with host and participants
 * @param {import('@playwright/test').BrowserContext} context
 * @param {number} participantCount
 * @returns {Promise<{host: Page, participants: Page[], sessionId: string}>}
 */
export async function setupMultiUserSession(context, participantCount = 2) {
  const hostPage = await context.newPage();
  const participantPages = [];

  // Host creates session
  const { sessionId } = await createSession(hostPage);

  // Participants join
  for (let i = 0; i < participantCount; i++) {
    const page = await context.newPage();
    await joinSession(page, sessionId, { name: `Participant ${i + 1}` });
    participantPages.push(page);
  }

  return { host: hostPage, participants: participantPages, sessionId };
}
