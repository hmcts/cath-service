import { expect, test } from "@playwright/test";
import { loginWithSSO } from "../../utils/sso-helpers.js";

test.describe("SSO Role-Based Access Control", () => {
  test("System Admin can access both dashboards", async ({ page }) => {
    await page.goto("/system-admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await expect(page).toHaveURL("/system-admin-dashboard");
    await page.goto("/admin-dashboard");
    await expect(page).toHaveURL("/admin-dashboard");
  });

  test("Local Admin can access admin dashboard only", async ({ page }) => {
    await page.goto("/admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!, process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!);
    await expect(page).toHaveURL("/admin-dashboard");
  });

  test("CTSC Admin can access admin dashboard only", async ({ page }) => {
    await page.goto("/admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_CTSC_ADMIN_EMAIL!, process.env.SSO_TEST_CTSC_ADMIN_PASSWORD!);
    await expect(page).toHaveURL("/admin-dashboard");
  });

  test("User with no roles is redirected to rejected page", async ({ page }) => {
    await page.goto("/admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_NO_ROLES_EMAIL!, process.env.SSO_TEST_NO_ROLES_PASSWORD!);
    await expect(page).toHaveURL("/sso-rejected");
  });

  test("Local Admin cannot access system admin dashboard and is redirected to admin dashboard", async ({ page }) => {
    await page.goto("/admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!, process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!);
    await page.goto("/system-admin-dashboard");
    await expect(page).toHaveURL("/admin-dashboard");
  });

  test("CTSC Admin cannot access system admin dashboard and is redirected to admin dashboard", async ({ page }) => {
    await page.goto("/admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_CTSC_ADMIN_EMAIL!, process.env.SSO_TEST_CTSC_ADMIN_PASSWORD!);
    await page.goto("/system-admin-dashboard");
    await expect(page).toHaveURL("/admin-dashboard");
  });

  test("Role information is correctly set in user session", async ({ page }) => {
    await page.goto("/system-admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await expect(page).toHaveURL("/system-admin-dashboard");
  });

  test("System Admin cannot access account-home and is redirected to admin-dashboard", async ({ page }) => {
    await page.goto("/system-admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await expect(page).toHaveURL("/system-admin-dashboard");
    await page.goto("/account-home");
    await expect(page).toHaveURL("/admin-dashboard");
  });

  test("Local Admin cannot access account-home and is redirected to admin-dashboard", async ({ page }) => {
    await page.goto("/admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!, process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!);
    await expect(page).toHaveURL("/admin-dashboard");
    await page.goto("/account-home");
    await expect(page).toHaveURL("/admin-dashboard");
  });

  test("CTSC Admin cannot access account-home and is redirected to admin-dashboard", async ({ page }) => {
    await page.goto("/admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_CTSC_ADMIN_EMAIL!, process.env.SSO_TEST_CTSC_ADMIN_PASSWORD!);
    await expect(page).toHaveURL("/admin-dashboard");
    await page.goto("/account-home");
    await expect(page).toHaveURL("/admin-dashboard");
  });
});
