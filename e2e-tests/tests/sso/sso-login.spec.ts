import { test, expect } from '@playwright/test';
import { loginWithSSO, assertAuthenticated, assertNotAuthenticated } from '../../utils/sso-helpers.js';

test.describe('SSO Login Flow', () => {
  test('System Admin can login via SSO and access system admin dashboard', async ({ page }) => {
    await page.goto('/system-admin-dashboard');
    await expect(page).toHaveURL(/login.microsoftonline.com/);
    await loginWithSSO(
      page,
      process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!,
      process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!
    );
    await expect(page).toHaveURL('/system-admin-dashboard');
    await assertAuthenticated(page);
  });

  test('Local Admin can login via SSO and access admin dashboard', async ({ page }) => {
    await page.goto('/admin-dashboard');
    await expect(page).toHaveURL(/login.microsoftonline.com/);
    await loginWithSSO(
      page,
      process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!,
      process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!
    );
    await expect(page).toHaveURL('/admin-dashboard');
    await assertAuthenticated(page);
  });

  test('CTSC Admin can login via SSO and access admin dashboard', async ({ page }) => {
    await page.goto('/admin-dashboard');
    await expect(page).toHaveURL(/login.microsoftonline.com/);
    await loginWithSSO(
      page,
      process.env.SSO_TEST_CTSC_ADMIN_EMAIL!,
      process.env.SSO_TEST_CTSC_ADMIN_PASSWORD!
    );
    await expect(page).toHaveURL('/admin-dashboard');
    await assertAuthenticated(page);
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

  test('Login flow preserves original destination URL', async ({ page }) => {
    await page.goto('/system-admin-dashboard');
    await expect(page).toHaveURL(/login.microsoftonline.com/);
    await loginWithSSO(
      page,
      process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!,
      process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!
    );
    await expect(page).toHaveURL('/system-admin-dashboard');
  });
});
