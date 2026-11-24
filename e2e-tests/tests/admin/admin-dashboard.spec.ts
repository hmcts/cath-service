import { expect, test } from "@playwright/test";
import { axeCheck } from "../../utils/axe-helper.js";
import { clickCardBelowHeading } from "../../utils/card-helpers.js";
import { loginWithSSO } from "../../utils/sso-helpers.js";

test.describe("Admin Dashboard", () => {
  test("Local Admin can view dashboard with tiles, navigation, and accessibility", async ({ page }) => {
    // Navigate and authenticate as Local Admin
    await page.goto("/admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!, process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!);
    await page.waitForURL("/admin-dashboard");

    // Verify page loads correctly
    await expect(page).toHaveTitle(/Court and tribunal hearings/i);

    // Verify main heading
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText("Admin Dashboard");
    await expect(heading).toHaveClass(/govuk-heading-l/);

    // Verify all 3 admin tiles are displayed
    const tiles = page.locator(".admin-tile");
    await expect(tiles).toHaveCount(3);

    // Verify each tile exposes a single link named by its heading
    const tileLink = (name: string) => tiles.getByRole("link", { name, exact: true });
    await expect(tileLink("Upload")).toHaveAttribute("href", "/manual-upload");
    await expect(tileLink("Upload Excel File")).toHaveAttribute("href", "/non-strategic-upload");
    await expect(tileLink("Remove")).toHaveAttribute("href", "/remove-list-search");
    await expect(tiles.getByRole("link")).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      await expect(tiles.nth(i).getByRole("link")).toHaveCount(1);
    }

    // Verify tile descriptions
    const descriptions = page.locator(".admin-tile__description");
    await expect(descriptions).toHaveCount(3);
    await expect(descriptions.nth(0)).toContainText("Upload a file to be published on the external facing service on GOV.UK");
    await expect(descriptions.nth(1)).toContainText("Upload an excel file to be converted and displayed on the external facing service on GOV.UK");
    await expect(descriptions.nth(2)).toContainText("Search by court or tribunal and remove a publication from the external facing service on GOV.UK");

    // Verify tiles in 2-column grid
    const gridColumns = page.locator(".govuk-grid-column-one-half");
    await expect(gridColumns).toHaveCount(3);

    // Verify Local Admin navigation - should see "Dashboard" link, not system admin links
    const dashboardLink = page.locator('a[data-test="dashboard-link"]');
    await expect(dashboardLink).toBeVisible();
    await expect(dashboardLink).toHaveText("Dashboard");

    const systemAdminLink = page.locator('a[data-test="system-admin-dashboard-link"]');
    await expect(systemAdminLink).not.toBeVisible();

    // Verify Local Admin does NOT see media applications tile
    await expect(page.locator('.admin-tile a[href="/media-applications"]')).toHaveCount(0);

    // Admin phase banner: feedback link warns about the new tab; admins get no language toggle
    const phaseBanner = page.locator(".govuk-phase-banner");
    await expect(phaseBanner.getByRole("link", { name: "feedback", exact: true })).toHaveAttribute("target", "_blank");
    await expect(phaseBanner).toContainText("feedback (opens in a new tab)");
    await expect(phaseBanner.locator(".app-phase-banner__language")).toHaveCount(0);

    // Test accessibility
    const accessibilityScanResults = await axeCheck(page).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Keyboard: one tab stop per tile, landing on the heading link
    const firstTileLink = tileLink("Upload");
    let isFirstTileFocused = false;
    for (let i = 0; i < 30 && !isFirstTileFocused; i++) {
      await page.keyboard.press("Tab");
      isFirstTileFocused = await firstTileLink.evaluate((el) => el === document.activeElement);
    }
    expect(isFirstTileFocused).toBe(true);
    await page.keyboard.press("Tab");
    await expect(tileLink("Upload Excel File")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(tileLink("Remove")).toBeFocused();

    // The whole card stays clickable: clicking the description follows the heading link
    await clickCardBelowHeading(tiles.nth(0));
    await page.waitForURL("**/manual-upload");
    await expect(page.locator("h1")).toHaveText("Manual upload");
  });

  test("CTSC Admin sees additional media applications tile @nightly", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_CTSC_ADMIN_EMAIL!, process.env.SSO_TEST_CTSC_ADMIN_PASSWORD!);
    await page.waitForURL("/admin-dashboard");

    const heading = page.locator("h1");
    await expect(heading).toHaveText("Admin Dashboard");

    // Verify CTSC Admin sees "Dashboard" in navigation
    const dashboardLink = page.locator('a[data-test="dashboard-link"]');
    await expect(dashboardLink).toBeVisible();
    await expect(dashboardLink).toHaveText("Dashboard");

    // Verify they don't see the system admin dashboard link
    const systemAdminLink = page.locator('a[data-test="system-admin-dashboard-link"]');
    await expect(systemAdminLink).not.toBeVisible();

    // Verify CTSC Admin sees 4 tiles (including media applications)
    const tiles = page.locator(".admin-tile");
    await expect(tiles).toHaveCount(4);

    // Verify the fourth tile is media applications
    const mediaApplicationsTile = tiles.getByRole("link", { name: "Manage Media Account Requests", exact: true });
    await expect(mediaApplicationsTile).toBeVisible();
    await expect(mediaApplicationsTile).toHaveAttribute("href", "/media-applications");

    // Test accessibility
    const accessibilityScanResults = await axeCheck(page).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("System Admin can access admin dashboard with dual navigation @nightly", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);

    // System Admin will be redirected to /system-admin-dashboard first (their primary dashboard)
    await page.waitForURL(/\/(system-admin-dashboard|admin-dashboard)/);
    await page.goto("/admin-dashboard");

    const heading = page.locator("h1");
    await expect(heading).toHaveText("Admin Dashboard");

    // Verify System Admin sees both navigation links
    const dashboardLink = page.locator('a[data-test="system-admin-dashboard-link"]');
    const adminDashboardLink = page.locator('a[data-test="admin-dashboard-link"]');

    await expect(dashboardLink).toBeVisible();
    await expect(adminDashboardLink).toBeVisible();
    await expect(dashboardLink).toHaveText("Dashboard");
    await expect(adminDashboardLink).toHaveText("Admin Dashboard");

    // Test accessibility
    const accessibilityScanResults = await axeCheck(page).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
