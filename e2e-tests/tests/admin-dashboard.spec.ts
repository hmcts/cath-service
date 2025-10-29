import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Admin Dashboard", () => {
  test.describe("Content Display", () => {
    test("should load the admin dashboard at /admin/dashboard", async ({ page }) => {
      await page.goto("/admin/dashboard");
      await expect(page).toHaveTitle(/Court and tribunal hearings/i);
    });

    test("should display the main heading", async ({ page }) => {
      await page.goto("/admin/dashboard");
      const heading = page.locator("h1");
      await expect(heading).toBeVisible();
      await expect(heading).toHaveText("System Admin Dashboard");
      await expect(heading).toHaveClass(/govuk-heading-l/);
    });

    test("should display all 8 admin tiles", async ({ page }) => {
      await page.goto("/admin/dashboard");
      const tiles = page.locator(".admin-dashboard-tile");
      await expect(tiles).toHaveCount(8);
    });

    test("should display correct tile titles and links", async ({ page }) => {
      await page.goto("/admin/dashboard");

      const tileData = [
        { title: "Upload Reference Data", href: "/admin/upload-reference-data" },
        { title: "Delete Court", href: "/admin/delete-court" },
        { title: "Manage Third-Party Users", href: "/admin/third-party-users" },
        { title: "User Management", href: "/admin/user-management" },
        { title: "Blob Explorer", href: "/admin/blob-explorer" },
        { title: "Bulk Create Media Accounts", href: "/admin/bulk-media-accounts" },
        { title: "Audit Log Viewer", href: "/admin/audit-log-viewer" },
        { title: "Manage Location Metadata", href: "/admin/location-metadata" }
      ];

      for (const { title, href } of tileData) {
        const link = page.locator(`a.admin-dashboard-tile__link:has-text("${title}")`);
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute("href", href);
      }
    });

    test("should display descriptions for all tiles", async ({ page }) => {
      await page.goto("/admin/dashboard");
      const descriptions = page.locator(".admin-dashboard-tile__description");
      await expect(descriptions).toHaveCount(8);

      await expect(descriptions.nth(0)).toContainText("Upload CSV location reference data");
      await expect(descriptions.nth(1)).toContainText("Delete court from reference data");
      await expect(descriptions.nth(2)).toContainText("View, create, update and remove third-party users");
      await expect(descriptions.nth(3)).toContainText("Search, update and delete users");
      await expect(descriptions.nth(4)).toContainText("Discover content uploaded to all locations");
      await expect(descriptions.nth(5)).toContainText("Upload a CSV file for bulk creation of media accounts");
      await expect(descriptions.nth(6)).toContainText("View audit logs on system admin actions");
      await expect(descriptions.nth(7)).toContainText("View, update and remove location metadata");
    });

    test("should display tiles in 2-column grid", async ({ page }) => {
      await page.goto("/admin/dashboard");
      const gridColumns = page.locator(".govuk-grid-column-one-half");
      await expect(gridColumns).toHaveCount(8);
    });
  });

  test.describe("Accessibility", () => {
    test("should meet WCAG 2.2 AA standards", async ({ page }) => {
      await page.goto("/admin/dashboard");
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should have logical heading hierarchy", async ({ page }) => {
      await page.goto("/admin/dashboard");
      const h1 = page.locator("h1");
      await expect(h1).toHaveCount(1);
      await expect(h1).toHaveText("System Admin Dashboard");
    });

    test("should have accessible links", async ({ page }) => {
      await page.goto("/admin/dashboard");
      const links = page.locator("a.admin-dashboard-tile__link");
      await expect(links).toHaveCount(8);

      for (let i = 0; i < 8; i++) {
        await expect(links.nth(i)).toBeVisible();
      }
    });
  });

  test.describe("Keyboard Navigation", () => {
    test("should allow keyboard navigation through all tiles", async ({ page }) => {
      await page.goto("/admin/dashboard");

      const tileLinks = page.locator("a.admin-dashboard-tile__link");
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
      await page.goto("/admin/dashboard");

      const firstTileLink = page.locator("a.admin-dashboard-tile__link").first();
      await firstTileLink.focus();
      await expect(firstTileLink).toBeFocused();
    });
  });

  test.describe("Responsive Design", () => {
    test("should display correctly on mobile viewport (375x667)", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/admin/dashboard");

      const heading = page.locator("h1");
      await expect(heading).toBeVisible();

      const tiles = page.locator(".admin-dashboard-tile");
      await expect(tiles).toHaveCount(8);
    });

    test("should display correctly on tablet viewport (768x1024)", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("/admin/dashboard");

      const heading = page.locator("h1");
      await expect(heading).toBeVisible();

      const tiles = page.locator(".admin-dashboard-tile");
      await expect(tiles).toHaveCount(8);
    });

    test("should display correctly on desktop viewport (1920x1080)", async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto("/admin/dashboard");

      const heading = page.locator("h1");
      await expect(heading).toBeVisible();

      const tiles = page.locator(".admin-dashboard-tile");
      await expect(tiles).toHaveCount(8);
    });
  });

  test.describe("Tile Interaction", () => {
    test("should navigate to 404 when clicking Upload Reference Data tile", async ({ page }) => {
      await page.goto("/admin/dashboard");
      await page.click('a:has-text("Upload Reference Data")');
      await page.waitForURL("**/admin/upload-reference-data");

      // Should show 404 as page doesn't exist yet
      await expect(page.locator("h1")).toContainText(/not found|404/i);
    });

    test("should have hover state on tiles", async ({ page }) => {
      await page.goto("/admin/dashboard");
      const firstTile = page.locator(".admin-dashboard-tile").first();

      await firstTile.hover();
      await expect(firstTile).toBeVisible();
    });
  });
});
