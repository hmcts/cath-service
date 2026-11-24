import { expect, test } from "@playwright/test";
import { axeCheck } from "../../utils/axe-helper.js";
import { clickCardBelowHeading } from "../../utils/card-helpers.js";
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
      { title: "Manage Jurisdiction Data", href: "/jurisdiction-data" },
      { title: "Download MI Report", href: "/mi-report" }
    ];

    const tiles = page.locator(".admin-tile");
    await expect(tiles).toHaveCount(tileData.length);

    // Each tile has exactly one link, whose accessible name is the heading alone
    for (const [index, { title, href }] of tileData.entries()) {
      const tileLinks = tiles.nth(index).getByRole("link");
      await expect(tileLinks).toHaveCount(1);
      await expect(tileLinks).toHaveAccessibleName(title);
      await expect(tileLinks).toHaveAttribute("href", href);
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

    // The whole card is clickable: clicking the description follows the heading link
    await clickCardBelowHeading(tiles.nth(0));
    await page.waitForURL("**/reference-data");
    const referenceDataHeading = page.locator("h1");
    await expect(referenceDataHeading).toBeVisible();
    await expect(referenceDataHeading).toHaveText("What do you want to do?");
  });

  test("dashboard is keyboard accessible @nightly", async ({ page }) => {
    const tileLinks = page.locator(".admin-tile").getByRole("link");
    await expect(tileLinks).toHaveCount(11);

    // Tab to the first tile, then each further Tab moves to the next tile: one stop per tile
    let isFirstTileFocused = false;
    for (let i = 0; i < 20 && !isFirstTileFocused; i++) {
      await page.keyboard.press("Tab");
      isFirstTileFocused = await tileLinks.first().evaluate((el) => el === document.activeElement);
    }
    expect(isFirstTileFocused).toBe(true);
    for (let j = 1; j < 3; j++) {
      await page.keyboard.press("Tab");
      await expect(tileLinks.nth(j)).toBeFocused();
    }
  });
});
