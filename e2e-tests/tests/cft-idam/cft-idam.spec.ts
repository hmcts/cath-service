import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginWithCftIdam, assertAuthenticated, assertNotAuthenticated, logout } from '../../utils/cft-idam-helpers.js';

// Note: target-size and link-name rules are disabled due to pre-existing site-wide footer accessibility issues
// See: docs/tickets/VIBE-150/accessibility-findings.md

test.describe('CFT IDAM Login Flow', () => {
  test('Valid user can select HMCTS account and login via CFT IDAM', async ({ page }) => {
    await page.goto('/sign-in');

    // Select HMCTS account option
    const hmctsRadio = page.getByRole('radio', { name: /with a myhmcts account/i });
    await hmctsRadio.check();
    await expect(hmctsRadio).toBeChecked();

    // Click continue and wait for navigation
    const continueButton = page.getByRole('button', { name: /continue/i });
    await Promise.all([
      page.waitForURL(/idam-web-public\.aat\.platform\.hmcts\.net|cft-login/, { timeout: 10000 }),
      continueButton.click()
    ]);

    // Perform CFT IDAM login
    await loginWithCftIdam(
      page,
      process.env.CFT_VALID_TEST_ACCOUNT!,
      process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD!
    );

    // Should be redirected to account-home
    await expect(page).toHaveURL(/\/account-home/);
    await assertAuthenticated(page);
  });

  test('Valid user maintains session after login', async ({ page }) => {
    // Skip if credentials are not configured
    test.skip(!process.env.CFT_VALID_TEST_ACCOUNT || !process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD, 'CFT IDAM test credentials not configured');

    await page.goto('/sign-in');

    // Login via CFT IDAM
    const hmctsRadio = page.getByRole('radio', { name: /with a myhmcts account/i });
    await hmctsRadio.check();
    const continueButton = page.getByRole('button', { name: /continue/i });

    // Wait for navigation after clicking continue
    await Promise.all([
      page.waitForURL(/idam-web-public\.aat\.platform\.hmcts\.net|cft-login/, { timeout: 10000 }),
      continueButton.click()
    ]);

    await loginWithCftIdam(
      page,
      process.env.CFT_VALID_TEST_ACCOUNT!,
      process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD!
    );

    await expect(page).toHaveURL(/\/account-home/);

    // Navigate to another page - session should persist
    await page.goto('/');
    await assertAuthenticated(page);

    // Navigate to account-home again - should not require re-authentication
    await page.goto('/account-home');
    await expect(page).toHaveURL(/\/account-home/);
  });

  test('User with rejected role (citizen) is redirected to cft-rejected page', async ({ page }) => {
    // Note: The "invalid" account is actually valid but has a rejected role (citizen)
    await page.goto('/sign-in');

    // Select HMCTS account
    const hmctsRadio = page.getByRole('radio', { name: /with a myhmcts account/i });
    await hmctsRadio.check();
    const continueButton = page.getByRole('button', { name: /continue/i });

    // Wait for navigation after clicking continue
    await Promise.all([
      page.waitForURL(/idam-web-public\.aat\.platform\.hmcts\.net|cft-login/, { timeout: 10000 }),
      continueButton.click()
    ]);

    // Login with account that has rejected role
    await loginWithCftIdam(
      page,
      process.env.CFT_INVALID_TEST_ACCOUNT!,
      process.env.CFT_INVALID_TEST_ACCOUNT_PASSWORD!
    );

    // User should be redirected to cft-rejected page
    await expect(page).toHaveURL(/\/cft-rejected/);

    // Verify the rejection message is displayed
    const heading = page.getByRole('heading', { name: /you cannot access this service/i });
    await expect(heading).toBeVisible();
  });

  test('Language and query parameters are preserved through CFT IDAM flow', async ({ page }) => {
    // Test 1: Language parameter is preserved through CFT IDAM redirect
    await page.goto('/sign-in?lng=cy');

    // Verify we're in Welsh mode
    const heading = page.getByRole('heading', { name: /sut hoffech chi fewngofnodi/i });
    await expect(heading).toBeVisible();

    // Select HMCTS account in Welsh
    const hmctsRadio = page.getByRole('radio', { name: /gyda chyfrif myhmcts/i });
    await hmctsRadio.check();
    const continueButton = page.getByRole('button', { name: /parhau/i });

    // Wait for navigation after clicking continue
    await Promise.all([
      page.waitForURL(/idam-web-public\.aat\.platform\.hmcts\.net|cft-login/, { timeout: 10000 }),
      continueButton.click()
    ]);

    // Check that language parameter is included in CFT IDAM redirect
    let currentUrl = page.url();
    expect(currentUrl).toMatch(/lng=cy|ui_locales=cy/);

    // Test 2: CFT login preserves language parameter in redirect
    await page.goto('/cft-login?lng=cy');
    await page.waitForLoadState('networkidle');
    currentUrl = page.url();
    expect(currentUrl).toMatch(/ui_locales=cy/);

    // Test 3: CFT rejected page displays Welsh content correctly
    await page.goto('/cft-rejected?lng=cy');

    // Verify language toggle shows English
    const languageToggle = page.locator('.language');
    await expect(languageToggle).toContainText('English');

    // Check for Welsh content
    const welshHeading = page.locator('h1');
    await expect(welshHeading).toBeVisible();

    // Check return link still works
    const signInLink = page.getByRole('link', { name: /yn ôl.*fewngofnodi|return.*sign/i });
    await expect(signInLink).toHaveAttribute('href', '/sign-in');

    // Run accessibility checks in Welsh
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .disableRules(['target-size', 'link-name'])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Authorization flow handles errors and protected resource access', async ({ page }) => {
    // Test 1: Direct access to protected resource redirects to sign-in
    await page.goto('/account-home');
    await expect(page).toHaveURL(/sign-in/);
    await assertNotAuthenticated(page);

    // Test 2: Authorization flow handles missing code parameter
    await page.goto('/cft-login/return');
    await expect(page).toHaveURL(/sign-in.*error/);
    let url = new URL(page.url());
    expect(url.searchParams.get('error')).toBeTruthy();

    // Test 3: Authorization flow handles invalid code parameter
    await page.goto('/cft-login/return?code=invalid-code-12345');
    await expect(page).toHaveURL(/sign-in.*error/);
    url = new URL(page.url());
    expect(url.searchParams.get('error')).toBeTruthy();
  });

  test('User can logout after CFT IDAM login', async ({ page }) => {
    // Skip if credentials are not configured
    test.skip(!process.env.CFT_VALID_TEST_ACCOUNT || !process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD, 'CFT IDAM test credentials not configured');

    await page.goto('/sign-in');

    // Login
    const hmctsRadio = page.getByRole('radio', { name: /with a myhmcts account/i });
    await hmctsRadio.check();
    const continueButton = page.getByRole('button', { name: /continue/i });

    // Wait for navigation after clicking continue
    await Promise.all([
      page.waitForURL(/idam-web-public\.aat\.platform\.hmcts\.net|cft-login/, { timeout: 10000 }),
      continueButton.click()
    ]);

    await loginWithCftIdam(
      page,
      process.env.CFT_VALID_TEST_ACCOUNT!,
      process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD!
    );

    await expect(page).toHaveURL(/\/account-home/);

    // Logout
    await logout(page);

    // Verify logged out
    await expect(page).toHaveURL('/session-logged-out');

    // Note: /account-home is not currently protected by authentication middleware
    // TODO: Once authentication middleware is implemented, add test to verify redirect to sign-in
  });

  test('CFT IDAM login preserves original destination URL', async ({ page }) => {
    // Try to access a specific protected page
    await page.goto('/account-home');

    // Should redirect to sign-in
    await expect(page).toHaveURL(/sign-in/);

    // Complete login
    const hmctsRadio = page.getByRole('radio', { name: /with a myhmcts account/i });
    await hmctsRadio.check();
    const continueButton = page.getByRole('button', { name: /continue/i });

    // Wait for navigation after clicking continue
    await Promise.all([
      page.waitForURL(/idam-web-public\.aat\.platform\.hmcts\.net|cft-login/, { timeout: 10000 }),
      continueButton.click()
    ]);

    await loginWithCftIdam(
      page,
      process.env.CFT_VALID_TEST_ACCOUNT!,
      process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD!
    );

    // Should be redirected back to original destination
    await expect(page).toHaveURL(/\/account-home/);
  });

  test('CFT login endpoint redirects to IDAM when configured', async ({ page }) => {
    await page.goto('/cft-login');
    await page.waitForLoadState('networkidle');

    // Should redirect to CFT IDAM
    await expect(page).toHaveURL(/idam-web-public\.aat\.platform\.hmcts\.net/);
  });
});

test.describe('CFT IDAM Session Management', () => {
  test('Complete session lifecycle: login, navigation, reload, and logout', async ({ page }) => {
    // Test 1: Accessing protected route without session redirects to sign-in
    await page.goto('/account-home');
    await expect(page).toHaveURL(/sign-in/);
    await assertNotAuthenticated(page);

    // Test 2: Login via CFT IDAM
    await page.goto('/sign-in');
    const hmctsRadio = page.getByRole('radio', { name: /with a myhmcts account/i });
    await hmctsRadio.check();
    const continueButton = page.getByRole('button', { name: /continue/i });
    await continueButton.click();

    await loginWithCftIdam(
      page,
      process.env.CFT_VALID_TEST_ACCOUNT!,
      process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD!
    );

    await expect(page).toHaveURL(/\/account-home/);
    await assertAuthenticated(page);

    // Test 3: Session persists across page navigations
    await page.goto('/');
    await assertAuthenticated(page);
    await page.goto('/account-home');
    await expect(page).toHaveURL(/\/account-home/);
    await assertAuthenticated(page);

    // Test 4: Session persists after page reload
    await page.reload();
    await assertAuthenticated(page);

    // Test 5: User can logout
    await logout(page);
    await expect(page).toHaveURL('/session-logged-out');
  });

  test('Multiple concurrent sessions from same user are handled correctly', async ({ browser }) => {
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    // Login in first context
    await page1.goto('/sign-in');
    const hmctsRadio1 = page1.getByRole('radio', { name: /with a myhmcts account/i });
    await hmctsRadio1.check();
    const continueButton1 = page1.getByRole('button', { name: /continue/i });
    await continueButton1.click();
    await loginWithCftIdam(
      page1,
      process.env.CFT_VALID_TEST_ACCOUNT!,
      process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD!
    );
    await assertAuthenticated(page1);

    // Login in second context
    await page2.goto('/sign-in');
    const hmctsRadio2 = page2.getByRole('radio', { name: /with a myhmcts account/i });
    await hmctsRadio2.check();
    const continueButton2 = page2.getByRole('button', { name: /continue/i });
    await continueButton2.click();
    await loginWithCftIdam(
      page2,
      process.env.CFT_VALID_TEST_ACCOUNT!,
      process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD!
    );
    await assertAuthenticated(page2);

    // Both sessions should remain valid
    await page1.reload();
    await assertAuthenticated(page1);
    await page2.reload();
    await assertAuthenticated(page2);

    await context1.close();
    await context2.close();
  });
});

test.describe('CFT IDAM Rejected Page', () => {
  test('CFT rejected page displays correct content and is accessible', async ({ page }) => {
    // Enable when CFT_REJECTED_ROLE_ACCOUNT is available

    // Navigate to rejected page (normally after authentication)
    await page.goto('/cft-rejected');

    // Check heading
    const heading = page.getByRole('heading', { name: /you cannot access this service/i });
    await expect(heading).toBeVisible();

    // Check message content
    const message = page.getByText(/your account type is not authorized/i);
    await expect(message).toBeVisible();

    // Check "What you can do" section
    const whatYouCanDo = page.getByText(/what you can do/i);
    await expect(whatYouCanDo).toBeVisible();

    // Check return to sign in link
    const signInLink = page.getByRole('link', { name: /return to sign in page/i });
    await expect(signInLink).toBeVisible();
    await expect(signInLink).toHaveAttribute('href', '/sign-in');

    // Run accessibility checks
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .disableRules(['target-size', 'link-name'])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('CFT rejected page supports keyboard navigation', async ({ page }) => {
    await page.goto('/cft-rejected');

    // Tab through interactive elements
    await page.keyboard.press('Tab');

    // Find and focus on the sign-in link
    let focused = false;
    for (let i = 0; i < 10 && !focused; i++) {
      await page.keyboard.press('Tab');
      const signInLink = page.getByRole('link', { name: /return to sign in page/i });
      try {
        await expect(signInLink).toBeFocused({ timeout: 100 });
        focused = true;
      } catch {
        // Continue tabbing
      }
    }

    // Verify link is focused
    const signInLink = page.getByRole('link', { name: /return to sign in page/i });
    await expect(signInLink).toBeFocused();

    // Press Enter to navigate
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL('/sign-in');
  });
});
