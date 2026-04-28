import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginWithSSO } from "../../utils/sso-helpers.js";

test.describe
  .skip("System Admin Dashboard", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/system-admin-dashboard");
      await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
      await page.waitForURL("/system-admin-dashboard");
    });

    test("system admin can view dashboard and navigate to upload page", async ({ page }) => {
      // Verify page title and heading
      await expect(page).toHaveTitle(/Court and tribunal hearings/i);
      const heading = page.locator("h1");
      await expect(heading).toBeVisible();
      await expect(heading).toHaveText("System Admin Dashboard");

      // Verify all 10 admin tiles are displayed
      const tiles = page.locator(".admin-tile");
      await expect(tiles).toHaveCount(10);

      // Verify correct tile titles and hrefs
      const tileData = [
        { title: "Upload Reference Data", href: "/upload-reference-data" },
        { title: "Delete Court", href: "/delete-court" },
        { title: "Manage Third Party Users", href: "/manage-third-party-users" },
        { title: "User Management", href: "/user-management" },
        { title: "Blob Explorer", href: "/blob-explorer-locations" },
        { title: "Bulk Create Media Accounts", href: "/bulk-media-accounts" },
        { title: "Audit Log Viewer", href: "/audit-log-list" },
        { title: "Manage Location Metadata", href: "/location-metadata-search" },
        { title: "Manage List Types", href: "/view-list-types" },
        { title: "Configure List Type", href: "/configure-list-type-enter-details" }
      ];

      for (const { title, href } of tileData) {
        const link = page.locator(`a.admin-tile:has-text("${title}")`);
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute("href", href);
      }

      // Verify tile descriptions are displayed
      const descriptions = page.locator(".admin-tile__description");
      await expect(descriptions).toHaveCount(10);

      // Verify 2-column grid layout
      const gridColumns = page.locator(".govuk-grid-column-one-half");
      await expect(gridColumns).toHaveCount(10);

      // Accessibility check
      const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Navigate to Upload Reference Data page
      await page.click('a:has-text("Upload Reference Data")');
      await page.waitForURL("**/reference-data-upload");
      const uploadHeading = page.locator("h1");
      await expect(uploadHeading).toBeVisible();
      await expect(uploadHeading).toHaveText("Manually upload a csv file");
    });

    test("dashboard is keyboard accessible @nightly", async ({ page }) => {
      // Verify tiles are focusable
      const tileLinks = page.locator("a.admin-tile");
      await expect(tileLinks).toHaveCount(10);

      // Verify first tile is visible and focusable
      const firstTile = tileLinks.first();
      await expect(firstTile).toBeVisible();

      // Verify links are keyboard accessible (no tabindex=-1)
      const tabindex = await firstTile.getAttribute("tabindex");
      expect(tabindex === null || tabindex !== "-1").toBe(true);

      // Verify they are anchor elements
      const tagName = await firstTile.evaluate((el) => el.tagName.toLowerCase());
      expect(tagName).toBe("a");

      // Tab through and verify at least one tile gets focused
      let foundFocusedTile = false;
      for (let i = 0; i < 20 && !foundFocusedTile; i++) {
        await page.keyboard.press("Tab");
        for (let j = 0; j < 10; j++) {
          try {
            await expect(tileLinks.nth(j)).toBeFocused({ timeout: 100 });
            foundFocusedTile = true;
            break;
          } catch {
            // Continue checking
          }
        }
      }
      expect(foundFocusedTile).toBe(true);
    });
  });
