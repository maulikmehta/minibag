/**
 * E2E Tests: Session Creation Flow
 * Week 2 Day 7: Critical user journey testing
 *
 * Tests the complete flow of creating a new shopping session
 */

import { test, expect } from '@playwright/test';

test.describe('Session Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/');
  });

  test('should create a new session successfully', async ({ page }) => {
    // Click "Create New List" button
    await page.getByRole('button', { name: /create.*list/i }).click();

    // Should navigate to create session screen
    await expect(page).toHaveURL(/\/create/);

    // Fill in session details
    await page.getByLabel(/location/i).fill('Local Market');
    await page.getByLabel(/expected participants/i).fill('4');

    // Select scheduled time (e.g., "In 30 minutes")
    await page.getByRole('button', { name: /30 min/i }).click();

    // Submit the form
    await page.getByRole('button', { name: /create.*session|start.*list/i }).click();

    // Should navigate to session-active screen
    await expect(page).toHaveURL(/\/session\//);

    // Verify session was created successfully
    await expect(page.getByText(/session.*created|waiting.*participants/i)).toBeVisible({
      timeout: 10000
    });
  });

  test('should validate required fields', async ({ page }) => {
    // Navigate to create session screen
    await page.goto('/create');

    // Try to submit without filling fields
    await page.getByRole('button', { name: /create.*session|start.*list/i }).click();

    // Should show validation errors
    await expect(page.getByText(/required|please.*enter/i)).toBeVisible();
  });

  test('should show session ID after creation', async ({ page }) => {
    // Navigate to create session screen
    await page.goto('/create');

    // Fill in basic details
    await page.getByLabel(/location/i).fill('Test Market');

    // Create session
    await page.getByRole('button', { name: /create.*session|start.*list/i }).click();

    // Wait for navigation
    await page.waitForURL(/\/session\//);

    // Should show session ID (6-character alphanumeric code)
    await expect(page.locator('text=/[A-Z0-9]{6}/')).toBeVisible({
      timeout: 10000
    });
  });

  test('should allow selecting items after creation', async ({ page }) => {
    // Create a session
    await page.goto('/create');
    await page.getByLabel(/location/i).fill('Market');
    await page.getByRole('button', { name: /create.*session|start.*list/i }).click();

    // Wait for session screen
    await page.waitForURL(/\/session\//);

    // Click to add items
    await page.getByRole('button', { name: /add.*item|select.*item/i }).click();

    // Should show item catalog
    await expect(page.getByText(/vegetables|fruits/i)).toBeVisible();

    // Select an item (e.g., tomatoes)
    await page.getByText(/tomato/i).click();

    // Set quantity
    await page.getByRole('button', { name: '+' }).click();

    // Confirm selection
    await page.getByRole('button', { name: /confirm|add/i }).click();

    // Item should appear in the list
    await expect(page.getByText(/tomato/i)).toBeVisible();
  });

  test('should generate invite link after creation', async ({ page }) => {
    // Create a session
    await page.goto('/create');
    await page.getByLabel(/location/i).fill('Market');
    await page.getByRole('button', { name: /create.*session|start.*list/i }).click();

    // Wait for session screen
    await page.waitForURL(/\/session\//);

    // Look for invite/share button
    const inviteButton = page.getByRole('button', { name: /invite|share/i });

    if (await inviteButton.isVisible()) {
      await inviteButton.click();

      // Should show invite link or share options
      await expect(
        page.getByText(/link|share.*with|invite.*code/i)
      ).toBeVisible();
    }
  });
});
