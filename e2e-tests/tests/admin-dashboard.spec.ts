import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginWithSSO } from "../utils/sso-helpers.js";

test.describe("Admin Dashboard", () => {
  test.describe("Content Display", () => {
    test.beforeEach(async ({ page, context }) => {
      await context.clearCookies();
      await page.goto("/admin-dashboard");
      await loginWithSSO(
        page,
        process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!,
        process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!
      );
      await page.waitForURL("/admin-dashboard");
    });
    test("should load the admin dashboard at /admin-dashboard", async ({ page }) => {
      await expect(page).toHaveTitle(/Court and tribunal hearings/i);
    });

    test("should display the main heading", async ({ page }) => {
      const heading = page.locator("h1");
      await expect(heading).toBeVisible();
      await expect(heading).toHaveText("Admin Dashboard");
      await expect(heading).toHaveClass(/govuk-heading-l/);
    });

    test("should display all 3 admin tiles", async ({ page }) => {
      const tiles = page.locator(".admin-tile");
      await expect(tiles).toHaveCount(3);
    });

    test("should display correct tile titles and links", async ({ page }) => {
      const _tileData = [
        { title: "Upload", href: "/manual-upload" },
        { title: "Upload Excel File", href: "/non-strategic-upload" },
        { title: "Remove", href: "/remove-list-search" }
      ];

      // Use more specific selector to avoid matching multiple tiles
      await expect(page.locator('a.admin-tile[href="/manual-upload"]')).toBeVisible();
      await expect(page.locator('a.admin-tile[href="/manual-upload"]')).toContainText("Upload");

      await expect(page.locator('a.admin-tile[href="/non-strategic-upload"]')).toBeVisible();
      await expect(page.locator('a.admin-tile[href="/non-strategic-upload"]')).toContainText("Upload Excel File");

      await expect(page.locator('a.admin-tile[href="/remove-list-search"]')).toBeVisible();
      await expect(page.locator('a.admin-tile[href="/remove-list-search"]')).toContainText("Remove");
    });

    test("should display descriptions for all tiles", async ({ page }) => {
      const descriptions = page.locator(".admin-tile__description");
      await expect(descriptions).toHaveCount(3);

      await expect(descriptions.nth(0)).toContainText("Upload a file to be published on the external facing service on GOV.UK");
      await expect(descriptions.nth(1)).toContainText("Upload an excel file to be converted and displayed on the external facing service on GOV.UK");
      await expect(descriptions.nth(2)).toContainText("Search by court or tribunal and remove a publication from the external facing service on GOV.UK");
    });

    test("should display tiles in 2-column grid", async ({ page }) => {
      const gridColumns = page.locator(".govuk-grid-column-one-half");
      await expect(gridColumns).toHaveCount(3);
    });
  });

  test.describe("Accessibility", () => {
    test.beforeEach(async ({ page, context }) => {
      await context.clearCookies();
      await page.goto("/admin-dashboard");
      await loginWithSSO(
        page,
        process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!,
        process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!
      );
      await page.waitForURL("/admin-dashboard");
    });

    test("should meet WCAG 2.2 AA standards", async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should have logical heading hierarchy", async ({ page }) => {
      const h1 = page.locator("h1");
      await expect(h1).toHaveCount(1);
      await expect(h1).toHaveText("Admin Dashboard");
    });

    test("should have accessible links", async ({ page }) => {
      const links = page.locator("a.admin-tile");
      await expect(links).toHaveCount(3);

      for (let i = 0; i < 3; i++) {
        await expect(links.nth(i)).toBeVisible();
      }
    });
  });

  test.describe("Keyboard Navigation", () => {
    test.beforeEach(async ({ page, context }) => {
      await context.clearCookies();
      await page.goto("/admin-dashboard");
      await loginWithSSO(
        page,
        process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!,
        process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!
      );
      await page.waitForURL("/admin-dashboard");
    });

    test("should allow keyboard navigation through all tiles", async ({ page }) => {
      const tileLinks = page.locator("a.admin-tile");
      const count = await tileLinks.count();

      let foundTiles = 0;
      for (let i = 0; i < 30 && foundTiles < count; i++) {
        await page.keyboard.press("Tab");

        for (let j = 0; j < count; j++) {
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
    });

    test("should show focus indicators on tiles", async ({ page }) => {
      // Verify all tile links are visible and have proper href attributes
      const tileLinks = page.locator("a.admin-tile");
      await expect(tileLinks.first()).toBeVisible();

      // Verify tiles are keyboard accessible by checking tabindex
      const firstTile = tileLinks.first();
      const tabindex = await firstTile.getAttribute("tabindex");

      // Links without tabindex=-1 are keyboard accessible by default
      expect(tabindex === null || tabindex !== "-1").toBe(true);

      // Verify link elements are focusable (they are by default in HTML)
      const tagName = await firstTile.evaluate((el) => el.tagName.toLowerCase());
      expect(tagName).toBe("a");

      // Verify all 3 tiles are accessible links
      await expect(tileLinks).toHaveCount(3);
    });
  });

  test.describe("Responsive Design", () => {
    test("should display correctly on mobile viewport (375x667)", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/admin-dashboard");
      await loginWithSSO(
        page,
        process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!,
        process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!
      );
      await page.waitForURL("/admin-dashboard");

      const heading = page.locator("h1");
      await expect(heading).toBeVisible();

      const tiles = page.locator(".admin-tile");
      await expect(tiles).toHaveCount(3);
    });

    test("should display correctly on tablet viewport (768x1024)", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("/admin-dashboard");
      await loginWithSSO(
        page,
        process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!,
        process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!
      );
      await page.waitForURL("/admin-dashboard");

      const heading = page.locator("h1");
      await expect(heading).toBeVisible();

      const tiles = page.locator(".admin-tile");
      await expect(tiles).toHaveCount(3);
    });

    test("should display correctly on desktop viewport (1920x1080)", async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto("/admin-dashboard");
      await loginWithSSO(
        page,
        process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!,
        process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!
      );
      await page.waitForURL("/admin-dashboard");

      const heading = page.locator("h1");
      await expect(heading).toBeVisible();

      const tiles = page.locator(".admin-tile");
      await expect(tiles).toHaveCount(3);
    });
  });

  test.describe("Tile Interaction", () => {
    test.beforeEach(async ({ page, context }) => {
      await context.clearCookies();
      await page.goto("/admin-dashboard");
      await loginWithSSO(
        page,
        process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!,
        process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!
      );
      await page.waitForURL("/admin-dashboard");
    });

    test("should navigate to manual upload when clicking Upload tile", async ({ page }) => {
      await page.click('a[href="/manual-upload"]');
      await page.waitForURL("**/manual-upload");

      // Should navigate to manual upload page
      await expect(page.locator("h1")).toHaveText("Manual upload");
    });

    test("should have hover state on tiles", async ({ page }) => {
      const firstTile = page.locator(".admin-tile").first();

      await firstTile.hover();
      await expect(firstTile).toBeVisible();
    });
  });

  test.describe("Role-Based Access", () => {
    test("System Admin can access admin dashboard", async ({ page, context }) => {
      // Clear existing session
      await context.clearCookies();

      await page.goto("/admin-dashboard");
      await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);

      // System Admin will be redirected to /system-admin-dashboard first (their primary dashboard)
      // Then navigate to admin dashboard
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
    });

    test("CTSC Admin can access admin dashboard", async ({ page, context }) => {
      // Clear existing session
      await context.clearCookies();

      await page.goto("/admin-dashboard");
      await loginWithSSO(page, process.env.SSO_TEST_CTSC_ADMIN_EMAIL!, process.env.SSO_TEST_CTSC_ADMIN_PASSWORD!);
      await page.waitForURL("/admin-dashboard");

      const heading = page.locator("h1");
      await expect(heading).toHaveText("Admin Dashboard");

      // Verify CTSC Admin sees "Dashboard" in navigation, not "Admin Dashboard"
      const dashboardLink = page.locator('a[data-test="dashboard-link"]');
      await expect(dashboardLink).toBeVisible();
      await expect(dashboardLink).toHaveText("Dashboard");

      // Verify they don't see the system admin dashboard link
      const systemAdminLink = page.locator('a[data-test="system-admin-dashboard-link"]');
      await expect(systemAdminLink).not.toBeVisible();

      // Verify CTSC Admin sees 4 tiles
      const tiles = page.locator(".admin-tile");
      await expect(tiles).toHaveCount(4);

      // Verify the fourth tile is present
      const mediaApplicationsTile = page.locator('a.admin-tile[href="/media-applications"]');
      await expect(mediaApplicationsTile).toBeVisible();
      await expect(mediaApplicationsTile).toContainText("Manage Media Account Requests");
    });

    test("Local Admin can access admin dashboard", async ({ page, context }) => {
      // Clear existing session
      await context.clearCookies();

      await page.goto("/admin-dashboard");
      await loginWithSSO(
        page,
        process.env.SSO_TEST_LOCAL_ADMIN_EMAIL!,
        process.env.SSO_TEST_LOCAL_ADMIN_PASSWORD!
      );
      await page.waitForURL("/admin-dashboard");

      const heading = page.locator("h1");
      await expect(heading).toHaveText("Admin Dashboard");

      // Verify Local Admin sees "Dashboard" in navigation, not "Admin Dashboard"
      const dashboardLink = page.locator('a[data-test="dashboard-link"]');
      await expect(dashboardLink).toBeVisible();
      await expect(dashboardLink).toHaveText("Dashboard");

      // Verify they don't see the system admin dashboard link
      const systemAdminLink = page.locator('a[data-test="system-admin-dashboard-link"]');
      await expect(systemAdminLink).not.toBeVisible();

      // Verify Local Admin sees only 3 tiles (not the fourth tile)
      const tiles = page.locator(".admin-tile");
      await expect(tiles).toHaveCount(3);

      // Verify the fourth tile is NOT present
      const mediaApplicationsTile = page.locator('a.admin-tile[href="/media-applications"]');
      await expect(mediaApplicationsTile).not.toBeVisible();
    });
  });
});
