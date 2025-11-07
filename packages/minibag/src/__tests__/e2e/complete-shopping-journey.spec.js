/**
 * E2E Tests: Complete Shopping Journey
 * Week 2 Day 7: End-to-end critical user journeys
 *
 * Tests complete user flows from session creation to completion
 */

import { test, expect } from '@playwright/test';

test.describe('Complete Shopping Journey', () => {
  test('should complete full shopping flow as host', async ({ page }) => {
    // STEP 1: Create session
    await page.goto('/');
    await page.getByRole('button', { name: /create.*list/i }).click();

    await page.getByLabel(/location/i).fill('Local Market');
    await page.getByRole('button', { name: /create.*session|start/i }).click();

    // Wait for session creation
    await page.waitForURL(/\/session\//, { timeout: 10000 });

    const sessionUrl = page.url();
    const sessionId = sessionUrl.match(/session\/([A-Z0-9]+)/)?.[1];

    expect(sessionId).toBeTruthy();

    // STEP 2: Add items to list
    const addItemButton = page.getByRole('button', { name: /add.*item|select.*item/i });

    if (await addItemButton.isVisible({ timeout: 3000 })) {
      await addItemButton.click();

      // Select some items
      await page.getByText(/tomato/i).first().click();
      await page.getByRole('button', { name: '+' }).click();

      await page.getByText(/onion/i).first().click();
      await page.getByRole('button', { name: '+' }).click();

      // Confirm selection
      await page.getByRole('button', { name: /done|confirm|save/i }).click();
    }

    // STEP 3: Set expectations (participant count)
    const expectationsButton = page.getByRole('button', { name: /expectation|how many|set.*expectation/i });

    if (await expectationsButton.isVisible({ timeout: 3000 })) {
      await expectationsButton.click();

      // Set expected participants
      const input = page.getByLabel(/participants/i);
      await input.fill('3');

      await page.getByRole('button', { name: /confirm|save/i }).click();
    }

    // STEP 4: Start shopping
    const startButton = page.getByRole('button', { name: /start.*shopping|begin|go.*shopping/i });

    if (await startButton.isVisible({ timeout: 3000 })) {
      await startButton.click();

      // Should transition to shopping mode
      await expect(
        page.getByText(/shopping.*mode|active.*shopping/i)
      ).toBeVisible({ timeout: 5000 });
    }

    // STEP 5: Mark items as purchased (simplified)
    const checkboxes = page.getByRole('checkbox');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount > 0) {
      await checkboxes.first().check();

      // Item should be marked as done
      await expect(checkboxes.first()).toBeChecked();
    }

    // STEP 6: Complete shopping
    const completeButton = page.getByRole('button', { name: /complete|finish.*shopping|done.*shopping/i });

    if (await completeButton.isVisible({ timeout: 3000 })) {
      await completeButton.click();

      // Should navigate to payment/bill screen
      await expect(
        page.getByText(/bill|payment|split|total/i)
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('should handle real-time updates between participants', async ({ context }) => {
    // Open two browser contexts (simulating two users)
    const hostPage = await context.newPage();
    const participantPage = await context.newPage();

    try {
      // HOST: Create session
      await hostPage.goto('/');
      await hostPage.getByRole('button', { name: /create.*list/i }).click();
      await hostPage.getByLabel(/location/i).fill('Market');
      await hostPage.getByRole('button', { name: /create/i }).click();

      await hostPage.waitForURL(/\/session\//);

      // Get session ID and generate invite URL
      const sessionUrl = hostPage.url();
      const sessionId = sessionUrl.match(/session\/([A-Z0-9]+)/)?.[1];

      // HOST: Get invite link
      const inviteButton = hostPage.getByRole('button', { name: /invite|share/i });

      let inviteLink;
      if (await inviteButton.isVisible({ timeout: 3000 })) {
        await inviteButton.click();

        // Extract invite link (this depends on implementation)
        const linkElement = hostPage.locator('text=/https?:\/\//').first();
        if (await linkElement.isVisible({ timeout: 2000 })) {
          inviteLink = await linkElement.textContent();
        }
      }

      // If we have an invite link, participant joins
      if (inviteLink) {
        await participantPage.goto(inviteLink);
      } else {
        // Fallback: construct join URL manually
        await participantPage.goto(`/join/${sessionId}`);
      }

      // PARTICIPANT: Join the session
      await participantPage.getByPlaceholder(/name/i).fill('Participant');

      // Complete join flow
      const nextButton = participantPage.getByRole('button', { name: /next/i });
      if (await nextButton.isVisible()) {
        await nextButton.click();
        // May need to click next again for language/avatar
        if (await nextButton.isVisible({ timeout: 2000 })) {
          await nextButton.click();
        }
      }

      // Select avatar if on that step
      const avatar = participantPage.locator('button:has(span)').first();
      if (await avatar.isVisible({ timeout: 2000 })) {
        await avatar.click();
      }

      // Join the list
      const joinButton = participantPage.getByRole('button', { name: /join.*list/i });
      if (await joinButton.isVisible()) {
        await joinButton.click();
      }

      // Wait for join to complete
      await participantPage.waitForURL(/\/session\//);

      // HOST: Should see new participant
      await hostPage.waitForTimeout(2000); // Give WebSocket time to update

      // Check if participant count increased or participant appears in list
      const participantCount = hostPage.getByText(/participant|member|people/i);
      await expect(participantCount).toBeVisible({ timeout: 5000 });

    } finally {
      // Cleanup
      await hostPage.close();
      await participantPage.close();
    }
  });

  test('should persist session across page refresh', async ({ page }) => {
    // Create a session
    await page.goto('/');
    await page.getByRole('button', { name: /create.*list/i }).click();
    await page.getByLabel(/location/i).fill('Test Market');
    await page.getByRole('button', { name: /create/i }).click();

    await page.waitForURL(/\/session\//);

    const originalUrl = page.url();
    const sessionId = originalUrl.match(/session\/([A-Z0-9]+)/)?.[1];

    // Reload the page
    await page.reload();

    // Should remain on same session (from localStorage)
    await expect(page).toHaveURL(new RegExp(sessionId));

    // Session data should still be visible
    await expect(page.locator(`text=${sessionId}`)).toBeVisible({ timeout: 5000 });
  });

  test('should navigate between app screens', async ({ page }) => {
    // Start at home
    await page.goto('/');

    // Navigate to create
    await page.getByRole('button', { name: /create/i }).click();
    await expect(page).toHaveURL(/\/create/);

    // Go back to home (if back button exists)
    const backButton = page.getByRole('button', { name: /back|home/i });
    if (await backButton.isVisible({ timeout: 2000 })) {
      await backButton.click();
      await expect(page).toHaveURL(/\/$|\/home/);
    }
  });

  test('should show appropriate UI for different session states', async ({ page }) => {
    // Create session
    await page.goto('/');
    await page.getByRole('button', { name: /create/i }).click();
    await page.getByLabel(/location/i).fill('Market');
    await page.getByRole('button', { name: /create/i }).click();

    await page.waitForURL(/\/session\//);

    // STATE 1: Waiting for participants
    await expect(
      page.getByText(/waiting|open|invite/i)
    ).toBeVisible({ timeout: 5000 });

    // Start shopping (if button available)
    const startButton = page.getByRole('button', { name: /start.*shopping/i });
    if (await startButton.isVisible({ timeout: 3000 })) {
      await startButton.click();

      // STATE 2: Active shopping
      await expect(
        page.getByText(/shopping|active|in.*progress/i)
      ).toBeVisible();
    }
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Test network error handling by going offline
    await page.goto('/');

    // Simulate offline
    await page.context().setOffline(true);

    // Try to create session (should fail)
    await page.getByRole('button', { name: /create/i }).click();
    await page.getByLabel(/location/i).fill('Market');
    await page.getByRole('button', { name: /create/i }).click();

    // Should show error message
    await expect(
      page.getByText(/error|failed|network|connection/i)
    ).toBeVisible({ timeout: 10000 });

    // Go back online
    await page.context().setOffline(false);
  });

  test('should show loading states during async operations', async ({ page }) => {
    await page.goto('/');

    // Click create
    await page.getByRole('button', { name: /create/i }).click();

    // Fill form
    await page.getByLabel(/location/i).fill('Market');

    // Click submit
    const submitButton = page.getByRole('button', { name: /create.*session|start/i });
    await submitButton.click();

    // Should show loading indicator (spinner, disabled button, etc.)
    // Check if button is disabled or shows loading text
    const isDisabled = await submitButton.isDisabled();
    const loadingText = await submitButton.textContent();

    expect(isDisabled || loadingText?.includes('...') || loadingText?.includes('Creating')).toBeTruthy();
  });
});
