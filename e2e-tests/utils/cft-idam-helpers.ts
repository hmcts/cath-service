import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Helper function to perform CFT IDAM login
 * @param page - Playwright Page object
 * @param email - User email address
 * @param password - User password
 */
export async function loginWithCftIdam(page: Page, email: string, password: string): Promise<void> {
  // Wait for CFT IDAM login page
  try {
    await page.waitForURL(/idam-web-public\.aat\.platform\.hmcts\.net/, { timeout: 10000 });
  } catch (error) {
    const currentUrl = page.url();
    throw new Error(
      `Failed to redirect to CFT IDAM login page. Current URL: ${currentUrl}. ` +
      `This might indicate that CFT IDAM is not properly configured or ENABLE_CFT_IDAM=true is not set.`
    );
  }

  // Enter email
  const emailInput = page.locator('input[type="text"]#username, input[type="email"]#username, input[name="username"]');
  await emailInput.waitFor({ state: 'visible', timeout: 5000 });
  await emailInput.fill(email);

  // Enter password
  const passwordInput = page.locator('input[type="password"]#password, input[name="password"]');
  await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
  await passwordInput.fill(password);

  // Click sign in button
  const signInButton = page.locator('input[type="submit"], button[type="submit"]').first();
  await signInButton.click();

  // Wait a moment for potential error messages or redirects
  await page.waitForTimeout(2000);

  // Wait for redirect back to application (any localhost:8080 page)
  await page.waitForURL(/localhost:8080/, { timeout: 30000 });
}

/**
 * Assert that the user is authenticated with CFT IDAM
 * Checks for common authentication indicators
 */
export async function assertAuthenticated(page: Page): Promise<void> {
  // Wait a moment for the page to settle
  await page.waitForLoadState('networkidle');

  // Check that we're not on the CFT IDAM login page
  await expect(page).not.toHaveURL(/idam-web-public\.aat\.platform\.hmcts\.net/);

  // Check that we're not on the sign-in page
  await expect(page).not.toHaveURL(/\/sign-in/);
}

/**
 * Assert that the user is not authenticated
 */
export async function assertNotAuthenticated(page: Page): Promise<void> {
  // Should either be on CFT IDAM login or redirected to sign-in
  await expect(page).toHaveURL(/idam-web-public\.aat\.platform\.hmcts\.net|\/sign-in/);
}

/**
 * Helper to logout the user
 */
export async function logout(page: Page): Promise<void> {
  await page.goto('/logout');
  await page.waitForURL(/\/session-logged-out/, { timeout: 10000 });
}
