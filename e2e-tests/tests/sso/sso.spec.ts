import { expect, test } from "@playwright/test";
import { assertAuthenticated, assertNotAuthenticated, loginWithSSO } from "../../utils/sso-helpers.js";

test.describe("SSO Authentication", () => {
  test("role-based access control with login, redirects, and restrictions", async ({ page, context }) => {
    // STEP 1: Unauthenticated user is redirected to Azure AD login
    await page.goto("/admin-dashboard");
    await expect(page).toHaveURL(/login.microsoftonline.com/);

    // STEP 2: System Admin login and cross-dashboard access
    await page.goto("/system-admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await expect(page).toHaveURL("/system-admin-dashboard");
    await assertAuthenticated(page);

    // System Admin can access admin dashboard
    await page.goto("/admin-dashboard");
    await expect(page).toHaveURL("/admin-dashboard");

    // System Admin cannot access account-home - redirected to admin-dashboard
    await page.goto("/account-home");
    await expect(page).toHaveURL("/admin-dashboard");

    // Clear session for next role test
    await context.clearCookies();

    // STEP 3: Local Admin login and access restrictions
    await page.goto("/admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!, process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!);
    await expect(page).toHaveURL("/admin-dashboard");
    await assertAuthenticated(page);

    // Local Admin cannot access system admin dashboard - redirected to admin-dashboard
    await page.goto("/system-admin-dashboard");
    await expect(page).toHaveURL("/admin-dashboard");

    // Local Admin cannot access account-home
    await page.goto("/account-home");
    await expect(page).toHaveURL("/admin-dashboard");

    // Clear session for next role test
    await context.clearCookies();

    // STEP 4: CTSC Admin login and access restrictions
    await page.goto("/admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_CTSC_ADMIN_EMAIL!, process.env.SSO_TEST_CTSC_ADMIN_PASSWORD!);
    await expect(page).toHaveURL("/admin-dashboard");
    await assertAuthenticated(page);

    // CTSC Admin cannot access system admin dashboard
    await page.goto("/system-admin-dashboard");
    await expect(page).toHaveURL("/admin-dashboard");

    // CTSC Admin cannot access account-home
    await page.goto("/account-home");
    await expect(page).toHaveURL("/admin-dashboard");

    // Clear session for next role test
    await context.clearCookies();

    // STEP 5: No-roles user is rejected
    await page.goto("/admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_NO_ROLES_EMAIL!, process.env.SSO_TEST_NO_ROLES_PASSWORD!);
    await assertAuthenticated(page);
    await expect(page).toHaveURL("/sso-rejected");
  });

  test("session persistence, logout, and concurrent sessions @nightly", async ({ page, browser }) => {
    // STEP 1: Login and verify session
    await page.goto("/system-admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await assertAuthenticated(page);

    // STEP 2: Session persists across page navigations
    await page.goto("/admin-dashboard");
    await assertAuthenticated(page);
    await page.goto("/system-admin-dashboard");
    await assertAuthenticated(page);

    // STEP 3: Session persists across page reload
    await page.reload();
    await assertAuthenticated(page);

    // STEP 4: Multiple concurrent sessions work correctly
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    await page2.goto("/system-admin-dashboard");
    await loginWithSSO(page2, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await assertAuthenticated(page2);

    // Both sessions remain valid after reload
    await page.reload();
    await assertAuthenticated(page);
    await page2.reload();
    await assertAuthenticated(page2);

    await context2.close();

    // STEP 5: Logout clears session
    await page.click("text=/logout|sign out/i");
    await expect(page).toHaveURL(/login.microsoftonline.com/);
    await assertNotAuthenticated(page);
  });
});
