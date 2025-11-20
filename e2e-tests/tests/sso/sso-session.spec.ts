import { expect, test } from "@playwright/test";
import { assertAuthenticated, assertNotAuthenticated, loginWithSSO } from "../../utils/sso-helpers.js";

test.describe("SSO Session Management", () => {
  test("Session persists across page navigations", async ({ page }) => {
    await page.goto("/system-admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await assertAuthenticated(page);
    await page.goto("/admin-dashboard");
    await assertAuthenticated(page);
    await page.goto("/system-admin-dashboard");
    await assertAuthenticated(page);
  });

  test("Session persists after page reload", async ({ page }) => {
    await page.goto("/system-admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await assertAuthenticated(page);
    await page.reload();
    await assertAuthenticated(page);
  });

  test("Logout clears session and redirects to login", async ({ page }) => {
    await page.goto("/system-admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await assertAuthenticated(page);
    await page.click("text=/logout|sign out/i");
    await expect(page).toHaveURL(/login.microsoftonline.com/);
    await assertNotAuthenticated(page);
  });

  test("Multiple concurrent sessions from same user are handled correctly", async ({ browser }) => {
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    await page1.goto("/system-admin-dashboard");
    await loginWithSSO(page1, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await assertAuthenticated(page1);

    await page2.goto("/system-admin-dashboard");
    await loginWithSSO(page2, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await assertAuthenticated(page2);

    await page1.reload();
    await assertAuthenticated(page1);
    await page2.reload();
    await assertAuthenticated(page2);

    await context1.close();
    await context2.close();
  });

  test("Accessing protected route without session redirects to login", async ({ page }) => {
    await page.goto("/admin-dashboard");
    await expect(page).toHaveURL(/login.microsoftonline.com/);
  });
});
