import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginWithSSO } from "../utils/sso-helpers.js";

test.describe("System Admin Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/system-admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await page.waitForURL("/system-admin-dashboard");
  });

  test("system admin can view and interact with dashboard", async ({ page }) => {
    // Verify page loads correctly
    await expect(page).toHaveTitle(/Court and tribunal hearings/i);

    // Verify main heading
    const heading = page.locator("h1");
    await expect(heading).toBeVisible();
    await expect(heading).toHaveText("System Admin Dashboard");

    // Verify all 8 tiles are present with correct content
    const tiles = page.locator(".admin-tile");
    await expect(tiles).toHaveCount(8);

    const tileData = [
      { title: "Upload Reference Data", href: "/upload-reference-data", description: "Upload CSV location reference data" },
      { title: "Delete Court", href: "/delete-court", description: "Delete court from reference data" },
      { title: "Manage Third-Party Users", href: "/third-party-users", description: "View, create, update and remove third-party users" },
      { title: "User Management", href: "/find-users", description: "Find, update and delete users" },
      { title: "Blob Explorer", href: "/blob-explorer-locations", description: "Discover content uploaded to all locations" },
      { title: "Bulk Create Media Accounts", href: "/bulk-media-accounts", description: "Upload a CSV file for bulk creation of media accounts" },
      { title: "Audit Log Viewer", href: "/audit-log-viewer", description: "View audit logs on system admin actions" },
      { title: "Manage Location Metadata", href: "/location-metadata", description: "View, update and remove location metadata" }
    ];

    for (let i = 0; i < tileData.length; i++) {
      const { title, href, description } = tileData[i];
      const link = page.locator(`a.admin-tile:has-text("${title}")`);
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", href);

      const desc = page.locator(".admin-tile__description").nth(i);
      await expect(desc).toContainText(description);
    }

    // Check accessibility inline
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Test keyboard navigation
    const tileLinks = page.locator("a.admin-tile");
    let foundTiles = 0;
    for (let i = 0; i < 30 && foundTiles < 8; i++) {
      await page.keyboard.press("Tab");
      for (let j = 0; j < 8; j++) {
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

    // Verify navigation works by clicking a tile
    await page.click('a:has-text("Upload Reference Data")');
    await page.waitForURL("**/reference-data-upload");
    const uploadHeading = page.locator("h1");
    await expect(uploadHeading).toBeVisible();
    await expect(uploadHeading).toHaveText("Manually upload a csv file");
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

});

