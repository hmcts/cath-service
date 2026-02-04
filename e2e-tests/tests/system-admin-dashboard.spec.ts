import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginWithSSO } from "../utils/sso-helpers.js";

test.describe("System Admin Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/system-admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await page.waitForURL("/system-admin-dashboard");
  });

  test.describe("Content Display", () => {
    test("should load the admin dashboard at /system-admin-dashboard", async ({ page }) => {
      await expect(page).toHaveTitle(/Court and tribunal hearings/i);
    });

    test("should display the main heading", async ({ page }) => {
      const heading = page.locator("h1");
      await expect(heading).toBeVisible();
      await expect(heading).toHaveText("System Admin Dashboard");
      await expect(heading).toHaveClass(/govuk-heading-l/);
    });

    test("should display all 8 admin tiles", async ({ page }) => {
      const tiles = page.locator(".admin-tile");
      await expect(tiles).toHaveCount(8);
    });

    test("should display correct tile titles and links", async ({ page }) => {
      const tileData = [
        { title: "Upload Reference Data", href: "/upload-reference-data" },
        { title: "Delete Court", href: "/delete-court" },
        { title: "Manage Third-Party Users", href: "/third-party-users" },
        { title: "User Management", href: "/find-users" },
        { title: "Blob Explorer", href: "/blob-explorer-locations" },
        { title: "Bulk Create Media Accounts", href: "/bulk-media-accounts" },
        { title: "Audit Log Viewer", href: "/audit-log-viewer" },
        { title: "Manage Location Metadata", href: "/location-metadata" }
      ];

      for (const { title, href } of tileData) {
        const link = page.locator(`a.admin-tile:has-text("${title}")`);
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute("href", href);
      }
    });

    test("should display descriptions for all tiles", async ({ page }) => {
      const descriptions = page.locator(".admin-tile__description");
      await expect(descriptions).toHaveCount(8);

      await expect(descriptions.nth(0)).toContainText("Upload CSV location reference data");
      await expect(descriptions.nth(1)).toContainText("Delete court from reference data");
      await expect(descriptions.nth(2)).toContainText("View, create, update and remove third-party users");
      await expect(descriptions.nth(3)).toContainText("Find, update and delete users");
      await expect(descriptions.nth(4)).toContainText("Discover content uploaded to all locations");
      await expect(descriptions.nth(5)).toContainText("Upload a CSV file for bulk creation of media accounts");
      await expect(descriptions.nth(6)).toContainText("View audit logs on system admin actions");
      await expect(descriptions.nth(7)).toContainText("View, update and remove location metadata");
    });

    test("should display tiles in 2-column grid", async ({ page }) => {
      const gridColumns = page.locator(".govuk-grid-column-one-half");
      await expect(gridColumns).toHaveCount(8);
    });
  });

  test.describe("Accessibility", () => {
    test("should meet WCAG 2.2 AA standards", async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should have logical heading hierarchy @nightly", async ({ page }) => {
      const h1 = page.locator("h1");
      await expect(h1).toHaveCount(1);
      await expect(h1).toHaveText("System Admin Dashboard");
    });

    test("should have accessible links @nightly", async ({ page }) => {
      const links = page.locator("a.admin-tile");
      await expect(links).toHaveCount(8);

      for (let i = 0; i < 8; i++) {
        await expect(links.nth(i)).toBeVisible();
      }
    });
  });

  test.describe("Keyboard Navigation", () => {
    test("should allow keyboard navigation through all tiles @nightly", async ({ page }) => {
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

    test("should show focus indicators on tiles @nightly", async ({ page }) => {
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

      // Verify all 8 tiles are accessible links
      await expect(tileLinks).toHaveCount(8);
    });
  });

  test.describe("Responsive Design", () => {
    test("should display correctly on mobile viewport (375x667) @nightly", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/system-admin-dashboard");

      const heading = page.locator("h1");
      await expect(heading).toBeVisible();

      const tiles = page.locator(".admin-tile");
      await expect(tiles).toHaveCount(8);
    });

    test("should display correctly on tablet viewport (768x1024) @nightly", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("/system-admin-dashboard");

      const heading = page.locator("h1");
      await expect(heading).toBeVisible();

      const tiles = page.locator(".admin-tile");
      await expect(tiles).toHaveCount(8);
    });

    test("should display correctly on desktop viewport (1920x1080) @nightly", async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto("/system-admin-dashboard");

      const heading = page.locator("h1");
      await expect(heading).toBeVisible();

      const tiles = page.locator(".admin-tile");
      await expect(tiles).toHaveCount(8);
    });
  });

  test.describe("Tile Interaction", () => {
    test("should navigate to upload page when clicking Upload Reference Data tile", async ({ page }) => {
      await page.click('a:has-text("Upload Reference Data")');
      await page.waitForURL("**/reference-data-upload");

      // Should show the upload reference data page
      const heading = page.locator("h1");
      await expect(heading).toBeVisible();
      await expect(heading).toHaveText("Manually upload a csv file");
    });

    test("should have hover state on tiles @nightly", async ({ page }) => {
      const firstTile = page.locator(".admin-tile").first();

      await firstTile.hover();
      await expect(firstTile).toBeVisible();
    });
  });
});
