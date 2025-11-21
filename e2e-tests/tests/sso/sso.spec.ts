import { test, expect } from '@playwright/test';
import { loginWithSSO, assertAuthenticated, assertNotAuthenticated } from '../../utils/sso-helpers.js';

test.describe('SSO Login Flow', () => {
  test('System Admin can login via SSO and access both dashboards', async ({ page }) => {
    await page.goto('/system-admin-dashboard');
    await expect(page).toHaveURL(/login.microsoftonline.com/);
    await loginWithSSO(
      page,
      process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!,
      process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!
    );
    await expect(page).toHaveURL('/system-admin-dashboard');
    await assertAuthenticated(page);

    // Verify System Admin can also access admin dashboard
    await page.goto('/admin-dashboard');
    await expect(page).toHaveURL('/admin-dashboard');

    // Verify System Admin cannot access account-home and is redirected to admin-dashboard
    await page.goto('/account-home');
    await expect(page).toHaveURL('/admin-dashboard');
  });

  test('Local Admin can login via SSO and access admin dashboard only', async ({ page }) => {
    await page.goto('/admin-dashboard');
    await expect(page).toHaveURL(/login.microsoftonline.com/);
    await loginWithSSO(
      page,
      process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!,
      process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!
    );
    await expect(page).toHaveURL('/admin-dashboard');
    await assertAuthenticated(page);

    // Verify Local Admin cannot access system admin dashboard
    await page.goto('/system-admin-dashboard');
    await expect(page).toHaveURL('/admin-dashboard');

    // Verify Local Admin cannot access account-home
    await page.goto('/account-home');
    await expect(page).toHaveURL('/admin-dashboard');
  });

  test('CTSC Admin can login via SSO and access admin dashboard only', async ({ page }) => {
    await page.goto('/admin-dashboard');
    await expect(page).toHaveURL(/login.microsoftonline.com/);
    await loginWithSSO(
      page,
      process.env.SSO_TEST_CTSC_ADMIN_EMAIL!,
      process.env.SSO_TEST_CTSC_ADMIN_PASSWORD!
    );
    await expect(page).toHaveURL('/admin-dashboard');
    await assertAuthenticated(page);

    // Verify CTSC Admin cannot access system admin dashboard
    await page.goto('/system-admin-dashboard');
    await expect(page).toHaveURL('/admin-dashboard');

    // Verify CTSC Admin cannot access account-home
    await page.goto('/account-home');
    await expect(page).toHaveURL('/admin-dashboard');
  });

  test('User with no roles can login but is redirected to rejected page', async ({ page }) => {
    await page.goto('/admin-dashboard');
    await expect(page).toHaveURL(/login.microsoftonline.com/);
    await loginWithSSO(
      page,
      process.env.SSO_TEST_NO_ROLES_EMAIL!,
      process.env.SSO_TEST_NO_ROLES_PASSWORD!
    );
    await assertAuthenticated(page);
    await expect(page).toHaveURL('/sso-rejected');
  });

  test('Unauthenticated user is redirected to Azure AD login', async ({ page }) => {
    await page.goto('/admin-dashboard');
    await expect(page).toHaveURL(/login.microsoftonline.com/);
  });
});

test.describe('SSO Session Management', () => {
  test('Session persists across page navigations, reload, and logout clears session', async ({ page }) => {
    await page.goto('/system-admin-dashboard');
    await loginWithSSO(
      page,
      process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!,
      process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!
    );
    await assertAuthenticated(page);

    // Test navigation to different pages
    await page.goto('/admin-dashboard');
    await assertAuthenticated(page);
    await page.goto('/system-admin-dashboard');
    await assertAuthenticated(page);

    // Test page reload
    await page.reload();
    await assertAuthenticated(page);

    // Test logout
    await page.click('text=/logout|sign out/i');
    await expect(page).toHaveURL(/login.microsoftonline.com/);
    await assertNotAuthenticated(page);
  });

  test('Multiple concurrent sessions from same user are handled correctly', async ({ browser }) => {
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    await page1.goto('/system-admin-dashboard');
    await loginWithSSO(
      page1,
      process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!,
      process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!
    );
    await assertAuthenticated(page1);

    await page2.goto('/system-admin-dashboard');
    await loginWithSSO(
      page2,
      process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!,
      process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!
    );
    await assertAuthenticated(page2);

    await page1.reload();
    await assertAuthenticated(page1);
    await page2.reload();
    await assertAuthenticated(page2);

    await context1.close();
    await context2.close();
  });
});
