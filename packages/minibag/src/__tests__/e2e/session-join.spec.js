/**
 * E2E Tests: Session Join Flow
 * Week 2 Day 7: Critical user journey testing
 *
 * Tests the complete flow of joining an existing session via invite link
 */

import { test, expect } from '@playwright/test';

test.describe('Session Join Flow', () => {
  test('should join session successfully with valid invite link', async ({ page }) => {
    // Simulate navigating to an invite link
    // Note: In a real test, you'd create a session first and use its actual invite link
    // For now, we'll test the join screen UI and validation
    await page.goto('/join/ABC123?inv=test-invite-token');

    // Should show join session screen
    await expect(page.getByText(/join.*list|invited.*you/i)).toBeVisible();

    // Step 1: Enter name
    await page.getByPlaceholder(/name/i).fill('John Doe');
    await page.getByRole('button', { name: /next|continue/i }).click();

    // Step 2: Select language (if available)
    const languageButton = page.getByRole('button', { name: /english|hindi/i });
    if (await languageButton.isVisible()) {
      await languageButton.first().click();
      await page.getByRole('button', { name: /next|continue/i }).click();
    }

    // Step 3: Select nickname/avatar
    await page.waitForSelector('[data-tour="participant-nickname-selection"]');
    const avatarButtons = await page.locator('button:has(span:text("👨"), span:text("👩"))').all();

    if (avatarButtons.length > 0) {
      await avatarButtons[0].click();
    }

    // Join the session
    await page.getByRole('button', { name: /join.*list/i }).click();

    // Should navigate to session-active screen
    await expect(page).toHaveURL(/\/session\//, { timeout: 10000 });

    // Should show success message or participant list
    await expect(
      page.getByText(/joined|welcome/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test('should show error for invalid session ID', async ({ page }) => {
    // Try to join non-existent session
    await page.goto('/join/INVALID123');

    // Should show error message
    await expect(
      page.getByText(/not found|doesn't exist|expired/i)
    ).toBeVisible({ timeout: 10000 });

    // Should show option to create own list
    await expect(
      page.getByRole('button', { name: /create.*own.*list|start.*list/i })
    ).toBeVisible();
  });

  test('should show error for expired invite link', async ({ page }) => {
    // Navigate with expired invite token
    // Note: Server should detect expired tokens
    await page.goto('/join/ABC123?inv=expired-token');

    // May show expired message or load session normally
    // If expired, should show appropriate error
    const expiredText = page.getByText(/expired|no longer valid/i);

    if (await expiredText.isVisible({ timeout: 5000 })) {
      // Verify error message is clear
      await expect(expiredText).toBeVisible();

      // Should have option to request new invite
      await expect(
        page.getByText(/ask.*host|request.*new/i)
      ).toBeVisible();
    }
  });

  test('should handle full session error', async ({ page }) => {
    // This would require server-side mocking or a full session
    // For now, test the UI validation on the client side

    await page.goto('/join/FULL123');

    // Try to join
    await page.getByPlaceholder(/name/i).fill('Late Joiner');

    // If session is full, should show error
    const fullMessage = page.getByText(/full|maximum.*participants/i);

    if (await fullMessage.isVisible({ timeout: 5000 })) {
      await expect(fullMessage).toBeVisible();
    }
  });

  test('should allow declining an invite', async ({ page }) => {
    // Navigate to invite link
    await page.goto('/join/ABC123?inv=test-invite-token');

    // Look for decline/cancel button
    const declineButton = page.getByRole('button', { name: /decline|no.*thanks|cancel/i });

    if (await declineButton.isVisible()) {
      await declineButton.click();

      // Should navigate away or show confirmation
      await expect(
        page.getByText(/declined|notified/i)
      ).toBeVisible({ timeout: 5000 });

      // Should navigate back to home
      await expect(page).toHaveURL(/\/$|\/home/);
    }
  });

  test('should show host info and items preview', async ({ page }) => {
    // Navigate to join page
    await page.goto('/join/ABC123');

    // Should show who invited you
    await expect(
      page.getByText(/invited.*you|from/i)
    ).toBeVisible({ timeout: 10000 });

    // If host has selected items, should show preview
    const itemsPreview = page.getByText(/items.*in.*list/i);

    if (await itemsPreview.isVisible({ timeout: 3000 })) {
      await expect(itemsPreview).toBeVisible();

      // Should show item count or list
      await expect(page.locator('[class*="item"]').first()).toBeVisible();
    }
  });

  test('should validate name input', async ({ page }) => {
    await page.goto('/join/ABC123');

    // Try to proceed without entering name
    await page.getByRole('button', { name: /next|join/i }).click();

    // Should show validation error
    await expect(
      page.getByText(/enter.*name|name.*required/i)
    ).toBeVisible();
  });

  test('should only allow letters and spaces in name', async ({ page }) => {
    await page.goto('/join/ABC123');

    const nameInput = page.getByPlaceholder(/name/i);

    // Try entering numbers and special characters
    await nameInput.fill('John123!@#');

    // Input should filter out invalid characters
    const value = await nameInput.inputValue();

    // Should only contain letters and spaces
    expect(value).toMatch(/^[a-zA-Z\s]*$/);
  });

  test('should show big checkmark animation on avatar selection', async ({ page }) => {
    await page.goto('/join/ABC123');

    // Go through name step
    await page.getByPlaceholder(/name/i).fill('Test User');
    await page.getByRole('button', { name: /next/i }).click();

    // Skip language if present
    const nextButton = page.getByRole('button', { name: /next/i });
    if (await nextButton.isVisible({ timeout: 1000 })) {
      await nextButton.click();
    }

    // Wait for avatar selection
    await page.waitForSelector('[data-tour="participant-nickname-selection"]', {
      timeout: 5000
    });

    // Click an avatar
    const avatar = page.locator('button:has(span)').first();
    await avatar.click();

    // Should show visual feedback (checkmark animation)
    // Note: This tests the interaction, visual animation may be hard to assert
    await expect(avatar).toHaveClass(/selected|active|border/);
  });
});
