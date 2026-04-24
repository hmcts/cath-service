import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
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

    // Verify tile titles and links
    await expect(page.locator('a.admin-tile[href="/manual-upload"]')).toBeVisible();
    await expect(page.locator('a.admin-tile[href="/manual-upload"]')).toContainText("Upload");

    await expect(page.locator('a.admin-tile[href="/non-strategic-upload"]')).toBeVisible();
    await expect(page.locator('a.admin-tile[href="/non-strategic-upload"]')).toContainText("Upload Excel File");

    await expect(page.locator('a.admin-tile[href="/remove-list-search"]')).toBeVisible();
    await expect(page.locator('a.admin-tile[href="/remove-list-search"]')).toContainText("Remove");

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
    const mediaApplicationsTile = page.locator('a.admin-tile[href="/media-applications"]');
    await expect(mediaApplicationsTile).not.toBeVisible();

    // Test accessibility
    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Test keyboard navigation - verify tiles are keyboard accessible
    const tileLinks = page.locator("a.admin-tile");
    const firstTile = tileLinks.first();

    // Verify links are focusable by default (no tabindex=-1)
    const tabindex = await firstTile.getAttribute("tabindex");
    expect(tabindex === null || tabindex !== "-1").toBe(true);

    // Tab through page to find tiles
    let foundTiles = 0;
    for (let i = 0; i < 30 && foundTiles < 3; i++) {
      await page.keyboard.press("Tab");
      for (let j = 0; j < 3; j++) {
        try {
          await expect(tileLinks.nth(j)).toBeFocused({ timeout: 100 });
          foundTiles++;
          break;
        } catch {
          // Continue checking other tiles
        }
      }
    }
    expect(foundTiles).toBeGreaterThan(0);

    // Test tile navigation works
    await page.click('a[href="/manual-upload"]');
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
    const mediaApplicationsTile = page.locator('a.admin-tile[href="/media-applications"]');
    await expect(mediaApplicationsTile).toBeVisible();
    await expect(mediaApplicationsTile).toContainText("Manage Media Account Requests");

    // Test accessibility
    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
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
    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
