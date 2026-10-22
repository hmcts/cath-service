import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export const CFT_IDAM_URL_PATTERN = /hmcts-access\.aat\.platform\.hmcts\.net/;
const CFT_IDAM_HOST_PATTERN = /hmcts-access/;

/**
 * Helper function to perform CFT IDAM login against either the classic or the new IDAM UI
 * @param page - Playwright Page object
 * @param email - User email address
 * @param password - User password
 */
export async function loginWithCftIdam(page: Page, email: string, password: string): Promise<void> {
  // Validate credentials are provided
  if (!email || email === "undefined") {
    throw new Error(
      "CFT_VALID_TEST_ACCOUNT environment variable is not set. " +
        "Credentials should be loaded from Azure Key Vault (cath-stg). " +
        "Ensure the runner has Azure access via Workload Identity or service principal."
    );
  }
  if (!password || password === "undefined") {
    throw new Error(
      "CFT_VALID_TEST_ACCOUNT_PASSWORD environment variable is not set. " +
        "Credentials should be loaded from Azure Key Vault (cath-stg). " +
        "Ensure the runner has Azure access via Workload Identity or service principal."
    );
  }

  console.log(`[CFT IDAM] Starting login for account: ${email}`);
  console.log(`[CFT IDAM] Current URL before redirect: ${page.url()}`);

  // Wait for CFT IDAM login page
  try {
    await page.waitForURL(CFT_IDAM_URL_PATTERN, { timeout: 15000 });
    console.log(`[CFT IDAM] Successfully redirected to IDAM. URL: ${page.url()}`);
  } catch (_error) {
    const currentUrl = page.url();
    const pageTitle = await page.title().catch(() => "unknown");
    console.error(`[CFT IDAM] Failed to redirect to CFT IDAM login page`);
    console.error(`[CFT IDAM] Current URL: ${currentUrl}`);
    console.error(`[CFT IDAM] Page title: ${pageTitle}`);
    throw new Error(
      `Failed to redirect to CFT IDAM login page. Current URL: ${currentUrl}. ` +
        `This might indicate that CFT IDAM is not properly configured or ENABLE_CFT_IDAM=true is not set.`
    );
  }

  const classicEmailInput = page.locator('input[type="text"]#username, input[type="email"]#username, input[name="username"]');
  const modernEmailInput = page.locator("input#email");
  await classicEmailInput.or(modernEmailInput).first().waitFor({ state: "visible", timeout: 15000 });

  if (await modernEmailInput.isVisible()) {
    await loginWithModernUi(page, email, password);
  } else {
    await loginWithClassicUi(page, email, password);
  }

  // Wait a moment for potential error messages or redirects
  await page.waitForTimeout(2000);

  const urlAfterSubmit = page.url();
  console.log(`[CFT IDAM] URL after form submit: ${urlAfterSubmit}`);

  // Check for login error messages on the IDAM page
  if (CFT_IDAM_HOST_PATTERN.test(new URL(urlAfterSubmit).hostname)) {
    const errorText = await page
      .locator(".error-message, .alert-danger, .govuk-error-summary")
      .first()
      .textContent({ timeout: 1000 })
      .catch(() => null);
    if (errorText) {
      console.error(`[CFT IDAM] Login error message found: ${errorText}`);
      throw new Error(`CFT IDAM login failed with error: ${errorText}`);
    }
    console.log(`[CFT IDAM] Still on IDAM page after submit - waiting for redirect...`);
  }

  // Wait for redirect back to application (any localhost:8080 or deployed URL page)
  console.log(`[CFT IDAM] Waiting for redirect back to application...`);
  try {
    await page.waitForURL((url) => !CFT_IDAM_HOST_PATTERN.test(url.hostname), { timeout: 30000 });
    console.log(`[CFT IDAM] Successfully redirected back to application. URL: ${page.url()}`);
  } catch (_error) {
    const finalUrl = page.url();
    const pageTitle = await page.title().catch(() => "unknown");
    const bodyText = await page
      .locator("body")
      .textContent()
      .catch(() => "");
    console.error(`[CFT IDAM] Timed out waiting for application redirect`);
    console.error(`[CFT IDAM] Final URL: ${finalUrl}`);
    console.error(`[CFT IDAM] Page title: ${pageTitle}`);
    console.error(`[CFT IDAM] Page body excerpt: ${bodyText?.substring(0, 500)}`);
    throw new Error(`CFT IDAM login did not redirect back to application. Final URL: ${finalUrl}`);
  }
}

async function loginWithModernUi(page: Page, email: string, password: string): Promise<void> {
  console.log(`[CFT IDAM] New UI detected - filling in email`);
  await page.locator("input#email").fill(email);
  await page.getByRole("button", { name: /^(continue|parhau)$/i }).click();

  console.log(`[CFT IDAM] Filling in password`);
  const passwordInput = page.locator("input#password");
  await passwordInput.waitFor({ state: "visible", timeout: 10000 });
  await passwordInput.fill(password);
  await page.getByRole("button", { name: /^(continue|parhau)$/i }).click();
}

async function loginWithClassicUi(page: Page, email: string, password: string): Promise<void> {
  console.log(`[CFT IDAM] Classic UI detected - filling in username`);
  await page.locator('input[type="text"]#username, input[type="email"]#username, input[name="username"]').fill(email);

  console.log(`[CFT IDAM] Filling in password`);
  const passwordInput = page.locator('input[type="password"]#password, input[name="password"]');
  await passwordInput.waitFor({ state: "visible", timeout: 5000 });
  await passwordInput.fill(password);

  console.log(`[CFT IDAM] Clicking sign in button`);
  await page.locator('input[type="submit"], button[type="submit"]').first().click();
}

/**
 * Assert that the user is authenticated with CFT IDAM
 * Checks for common authentication indicators
 */
export async function assertAuthenticated(page: Page): Promise<void> {
  // Wait a moment for the page to settle
  await page.waitForLoadState("networkidle");

  const currentUrl = page.url();
  console.log(`[CFT IDAM] Asserting authenticated. Current URL: ${currentUrl}`);

  // Check that we're not on the CFT IDAM login page
  await expect(page).not.toHaveURL(CFT_IDAM_URL_PATTERN);

  // Check that we're not on the sign-in page
  await expect(page).not.toHaveURL(/\/sign-in/);

  console.log(`[CFT IDAM] Authentication assertion passed`);
}

/**
 * Assert that the user is not authenticated
 */
export async function assertNotAuthenticated(page: Page): Promise<void> {
  const currentUrl = page.url();
  console.log(`[CFT IDAM] Asserting not authenticated. Current URL: ${currentUrl}`);

  // Should either be on CFT IDAM login or redirected to sign-in
  await expect(page).toHaveURL(/hmcts-access\.aat\.platform\.hmcts\.net|\/sign-in/);

  console.log(`[CFT IDAM] Not-authenticated assertion passed`);
}

/**
 * Helper to logout the user. CFT IDAM users are routed through IDAM endSession before returning.
 */
export async function logout(page: Page): Promise<void> {
  console.log(`[CFT IDAM] Logging out. Current URL: ${page.url()}`);
  await page.goto("/logout");
  await page.waitForURL(/\/session-logged-out/, { timeout: 30000 });
  console.log(`[CFT IDAM] Logged out successfully. URL: ${page.url()}`);
}
