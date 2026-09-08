import { expect, test } from "@playwright/test";
import { axeCheck } from "../../utils/axe-helper.js";
import { loginWithSSO } from "../../utils/sso-helpers.js";

test.describe("System Admin Dashboard", () => {
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

    // Tiles in the order declared by the page content, so this also verifies display order
    const tileData = [
      { title: "Reference Data", href: "/reference-data" },
      { title: "Delete Court", href: "/delete-court" },
      { title: "Manage Third Party Users", href: "/manage-third-party-users" },
      { title: "Manage Third-Party Subscribers", href: "/third-party-subscribers" },
      { title: "User Management", href: "/find-users" },
      { title: "Blob Explorer", href: "/blob-explorer-locations" },
      { title: "Bulk Create Media Accounts", href: "/bulk-media-accounts" },
      { title: "Audit Log Viewer", href: "/audit-log-list" },
      { title: "Manage List Types", href: "/manage-list-types" },
      { title: "Manage Jurisdiction Data", href: "/jurisdiction-data" }
    ];

    const tiles = page.locator("a.admin-tile");
    await expect(tiles).toHaveCount(tileData.length);

    // Match headings exactly by index: `:has-text()` matches case-insensitive substrings
    // across the whole tile, so "Reference Data" would also match the Delete Court tile
    // whose description reads "Delete court from reference data".
    for (const [index, { title, href }] of tileData.entries()) {
      const tile = tiles.nth(index);
      await expect(tile.locator(".admin-tile__heading")).toHaveText(title);
      await expect(tile).toHaveAttribute("href", href);
    }

    // Verify tile descriptions are displayed
    const descriptions = page.locator(".admin-tile__description");
    await expect(descriptions).toHaveCount(tileData.length);

    // Verify 2-column grid layout
    const gridColumns = page.locator(".govuk-grid-column-one-half");
    await expect(gridColumns).toHaveCount(tileData.length);

    // Accessibility check
    const accessibilityScanResults = await axeCheck(page).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Navigate to Reference Data landing page, selected by href to avoid the
    // substring clash with the Delete Court tile's description
    await page.locator('a.admin-tile[href="/reference-data"]').click();
    await page.waitForURL("**/reference-data");
    const referenceDataHeading = page.locator("h1");
    await expect(referenceDataHeading).toBeVisible();
    await expect(referenceDataHeading).toHaveText("What do you want to do?");
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
