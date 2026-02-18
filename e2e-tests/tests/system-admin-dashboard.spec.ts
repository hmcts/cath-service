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
    await expect(page.getByRole("heading", { name: "System Admin Dashboard", level: 1 })).toBeVisible();

    // Verify all 8 tiles with correct content
    const tileData = [
      { title: "Upload Reference Data", href: "/upload-reference-data", description: "Upload CSV location reference data" },
      { title: "Delete Court", href: "/delete-court", description: "Delete court from reference data" },
      { title: "Manage Third-Party Users", href: "/third-party-users", description: "View, create, update and remove third-party users" },
      { title: "User Management", href: "/user-management", description: "Find, update and delete users" },
      { title: "Blob Explorer", href: "/blob-explorer-locations", description: "Discover content uploaded to all locations" },
      { title: "Bulk Create Media Accounts", href: "/bulk-media-accounts", description: "Upload a CSV file for bulk creation of media accounts" },
      { title: "Audit Log Viewer", href: "/audit-log-viewer", description: "View audit logs on system admin actions" },
      { title: "Manage Location Metadata", href: "/location-metadata-search", description: "View, update and remove location metadata" }
    ];

    for (const { title, href, description } of tileData) {
      const link = page.getByRole("link", { name: new RegExp(title, "i") });
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("href", href);
      await expect(link).toContainText(description);
    }

    // Check accessibility inline
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Test keyboard navigation
    let foundTiles = 0;
    for (let i = 0; i < 30 && foundTiles < 8; i++) {
      await page.keyboard.press("Tab");
      for (const { title } of tileData) {
        try {
          const link = page.getByRole("link", { name: new RegExp(title, "i") });
          await expect(link).toBeFocused({ timeout: 100 });
          foundTiles++;
          break;
        } catch {
          // Continue checking other tiles
        }
      }
    }
    expect(foundTiles).toBeGreaterThan(0);

    // Verify navigation works by clicking a tile
    await page.getByRole("link", { name: /Upload Reference Data/i }).click();
    await page.waitForURL("**/reference-data-upload");
    await expect(page.getByRole("heading", { name: "Manually upload a csv file", level: 1 })).toBeVisible();
  });
});

