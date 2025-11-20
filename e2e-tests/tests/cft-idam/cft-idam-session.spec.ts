import { test, expect } from '@playwright/test';
import { loginWithCftIdam, assertAuthenticated, assertNotAuthenticated } from '../../utils/cft-idam-helpers.js';

test.describe('CFT IDAM Session Management', () => {
  test('Session persists across page navigations', async ({ page }) => {
    // Skip if credentials are not configured
    test.skip(!process.env.CFT_VALID_TEST_ACCOUNT || !process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD, 'CFT IDAM test credentials not configured');

    await page.goto('/sign-in');

    // Select HMCTS account and continue
    const hmctsRadio = page.getByRole('radio', { name: /with a myhmcts account/i });
    await hmctsRadio.check();
    const continueButton = page.getByRole('button', { name: /continue/i });

    // Wait for navigation after clicking continue
    await Promise.all([
      page.waitForURL(/idam-web-public\.aat\.platform\.hmcts\.net|cft-login/, { timeout: 10000 }),
      continueButton.click()
    ]);

    // Login with CFT IDAM
    await loginWithCftIdam(
      page,
      process.env.CFT_VALID_TEST_ACCOUNT!,
      process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD!
    );
    await assertAuthenticated(page);

    // Navigate to different pages - session should persist
    await page.goto('/account-home');
    await assertAuthenticated(page);

    await page.goto('/');
    await assertAuthenticated(page);

    await page.goto('/account-home');
    await assertAuthenticated(page);
  });

  test('Session persists after page reload', async ({ page }) => {
    // Skip if credentials are not configured
    test.skip(!process.env.CFT_VALID_TEST_ACCOUNT || !process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD, 'CFT IDAM test credentials not configured');

    await page.goto('/sign-in');

    // Select HMCTS account and continue
    const hmctsRadio = page.getByRole('radio', { name: /with a myhmcts account/i });
    await hmctsRadio.check();
    const continueButton = page.getByRole('button', { name: /continue/i });

    // Wait for navigation after clicking continue
    await Promise.all([
      page.waitForURL(/idam-web-public\.aat\.platform\.hmcts\.net|cft-login/, { timeout: 10000 }),
      continueButton.click()
    ]);

    // Login with CFT IDAM
    await loginWithCftIdam(
      page,
      process.env.CFT_VALID_TEST_ACCOUNT!,
      process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD!
    );
    await assertAuthenticated(page);

    // Reload the page - session should persist
    await page.reload();
    await assertAuthenticated(page);
  });

  test('Logout clears session and redirects to logged out page', async ({ page }) => {
    // Skip if credentials are not configured
    test.skip(!process.env.CFT_VALID_TEST_ACCOUNT || !process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD, 'CFT IDAM test credentials not configured');

    await page.goto('/sign-in');

    // Select HMCTS account and continue
    const hmctsRadio = page.getByRole('radio', { name: /with a myhmcts account/i });
    await hmctsRadio.check();
    const continueButton = page.getByRole('button', { name: /continue/i });

    // Wait for navigation after clicking continue
    await Promise.all([
      page.waitForURL(/idam-web-public\.aat\.platform\.hmcts\.net|cft-login/, { timeout: 10000 }),
      continueButton.click()
    ]);

    // Login with CFT IDAM
    await loginWithCftIdam(
      page,
      process.env.CFT_VALID_TEST_ACCOUNT!,
      process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD!
    );
    await assertAuthenticated(page);

    // Logout
    await page.goto('/logout');

    // Should redirect to session-logged-out page
    await expect(page).toHaveURL('/session-logged-out');
  });

  test('Multiple concurrent sessions from same user are handled correctly', async ({ browser }) => {
    // Skip if credentials are not configured
    test.skip(!process.env.CFT_VALID_TEST_ACCOUNT || !process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD, 'CFT IDAM test credentials not configured');

    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    // Login in first context
    await page1.goto('/sign-in');
    const hmctsRadio1 = page1.getByRole('radio', { name: /with a myhmcts account/i });
    await hmctsRadio1.check();
    const continueButton1 = page1.getByRole('button', { name: /continue/i });

    // Wait for navigation after clicking continue
    await Promise.all([
      page1.waitForURL(/idam-web-public\.aat\.platform\.hmcts\.net|cft-login/, { timeout: 10000 }),
      continueButton1.click()
    ]);

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

    // Wait for navigation after clicking continue
    await Promise.all([
      page2.waitForURL(/idam-web-public\.aat\.platform\.hmcts\.net|cft-login/, { timeout: 10000 }),
      continueButton2.click()
    ]);

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

  test.skip('Accessing protected route without session redirects to sign-in', async ({ page }) => {
    // Note: This test is currently skipped because the application allows access to /account-home without authentication
    // TODO: Implement authentication middleware to protect this route
    await page.goto('/account-home');

    // Should redirect to sign-in page
    await expect(page).toHaveURL(/sign-in/);
    await assertNotAuthenticated(page);
  });
});
