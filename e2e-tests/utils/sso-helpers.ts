import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

const SSO_REDIRECT_TIMEOUT = 30000;

/**
 * Helper function to perform SSO login through Azure AD
 * @param page - Playwright Page object
 * @param email - User email address
 * @param password - User password
 */
export async function loginWithSSO(page: Page, email: string, password: string): Promise<void> {
  // Wait for Azure AD login page
  try {
    await page.waitForURL(/login.microsoftonline.com/, { timeout: 10000 });
  } catch (_error) {
    const currentUrl = page.url();
    throw new Error(
      `Failed to redirect to Azure AD login page. Current URL: ${currentUrl}. ` +
        `This might indicate that SSO is not properly configured or ENABLE_SSO=true is not set.`
    );
  }

  // Enter email
  await page.fill('input[type="email"]', email);
  await page.click('input[type="submit"]');
  await page.waitForLoadState("networkidle");

  // Enter password
  await page.fill('input[type="password"]', password);
  await page.click('input[type="submit"]');

  // Azure AD may or may not show "Stay signed in?" and can take several seconds to render it
  // when several logins run in parallel, so wait for whichever happens first rather than
  // sampling once after a fixed delay (isVisible does not wait, so a late prompt was missed).
  const staySignedInButton = page.locator('input[type="submit"][value="Yes"]');
  const outcome = await Promise.any([
    page.waitForURL(hasLeftMicrosoftLogin, { timeout: SSO_REDIRECT_TIMEOUT }).then(() => "redirected" as const),
    staySignedInButton.waitFor({ state: "visible", timeout: SSO_REDIRECT_TIMEOUT }).then(() => "staySignedInPrompt" as const)
  ]).catch(() => "timedOut" as const);

  if (outcome === "staySignedInPrompt") {
    await staySignedInButton.click();
  }

  await page.waitForURL(hasLeftMicrosoftLogin, { timeout: SSO_REDIRECT_TIMEOUT });
}

function hasLeftMicrosoftLogin(url: URL): boolean {
  return !url.toString().includes("login.microsoftonline.com");
}

/**
 * Assert that the user is authenticated
 * Checks for common authentication indicators
 */
export async function assertAuthenticated(page: Page): Promise<void> {
  // Wait a moment for the page to settle
  await page.waitForLoadState("networkidle");

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
  await page.click("text=/logout|sign out/i");
  await page.waitForURL(/login.microsoftonline.com/, { timeout: 10000 });
}
