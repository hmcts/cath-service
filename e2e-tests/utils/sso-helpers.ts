import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Helper function to perform SSO login through Azure AD
 * @param page - Playwright Page object
 * @param email - User email address
 * @param password - User password
 */
export async function loginWithSSO(page: Page, email: string, password: string): Promise<void> {
  // Wait for Azure AD login page
  await page.waitForURL(/login.microsoftonline.com/, { timeout: 10000 });

  // Enter email
  await page.fill('input[type="email"]', email);
  await page.click('input[type="submit"]');
  await page.waitForLoadState('networkidle');

  // Enter password
  await page.fill('input[type="password"]', password);
  await page.click('input[type="submit"]');

  // Wait a moment for potential error messages or redirects
  await page.waitForTimeout(2000);

  // Handle "Stay signed in?" prompt if it appears
  try {
    const staySignedInButton = page.locator('input[type="submit"][value="Yes"]');
    if (await staySignedInButton.isVisible({ timeout: 3000 })) {
      await staySignedInButton.click();
    }
  } catch {
    // Prompt didn't appear, continue
  }

  // Wait for redirect back to application (any localhost:8080 page)
  await page.waitForURL(/localhost:8080/, { timeout: 30000 });
}

/**
 * Assert that the user is authenticated
 * Checks for common authentication indicators
 */
export async function assertAuthenticated(page: Page): Promise<void> {
  // Wait a moment for the page to settle
  await page.waitForLoadState('networkidle');

  // Check that we're not on the login page
  await expect(page).not.toHaveURL(/login.microsoftonline.com/);

  // You can add more specific checks here based on your application
  // For example, checking for a user menu, logout button, etc.
}

/**
 * Assert that the user is not authenticated
 */
export async function assertNotAuthenticated(page: Page): Promise<void> {
  // Should either be on Azure AD login or redirected to it
  await expect(page).toHaveURL(/login.microsoftonline.com|\/login/);
}

/**
 * Helper to logout the user
 */
export async function logout(page: Page): Promise<void> {
  await page.click('text=/logout|sign out/i');
  await page.waitForURL(/login.microsoftonline.com/, { timeout: 10000 });
}
