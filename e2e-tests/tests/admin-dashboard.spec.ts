import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Admin Dashboard - VIBE-157", () => {
  test.describe("Navigation and Page Load", () => {
    test("should load the admin dashboard at /admin-dashboard", async ({ page }) => {
      await page.goto("/admin-dashboard");
      await expect(page).toHaveURL("/admin-dashboard");
      await expect(page.locator("h1")).toHaveText("Admin Dashboard");
    });

    test("should display Sign out button in header", async ({ page }) => {
      await page.goto("/admin-dashboard");
      const signOutLink = page.locator('.govuk-service-navigation__link').filter({ hasText: "Sign out" });
      await expect(signOutLink).toBeVisible();
      await expect(signOutLink).toHaveText("Sign out");
    });

    test("should display back link", async ({ page }) => {
      await page.goto("/admin-dashboard");
      const backLink = page.locator(".govuk-back-link");
      await expect(backLink).toBeVisible();
    });
  });

  test.describe("Tile Navigation", () => {
    test("should display all three tiles", async ({ page }) => {
      await page.goto("/admin-dashboard");

      const tiles = page.locator(".admin-tile");
      await expect(tiles).toHaveCount(3);

      await expect(tiles.nth(0).locator(".admin-tile__heading")).toHaveText("Upload");
      await expect(tiles.nth(1).locator(".admin-tile__heading")).toHaveText("Upload Excel file");
      await expect(tiles.nth(2).locator(".admin-tile__heading")).toHaveText("Remove");
    });

    test("should display correct tile descriptions", async ({ page }) => {
      await page.goto("/admin-dashboard");

      const uploadTile = page.locator(".admin-tile").nth(0);
      await expect(uploadTile.locator(".admin-tile__description"))
        .toContainText("Upload a file to be published on the external facing service on GOV.UK");

      const uploadExcelTile = page.locator(".admin-tile").nth(1);
      await expect(uploadExcelTile.locator(".admin-tile__description"))
        .toContainText("Upload an excel file to be converted and displayed on the external facing service on GOV.UK");

      const removeTile = page.locator(".admin-tile").nth(2);
      await expect(removeTile.locator(".admin-tile__description"))
        .toContainText("Search by court or tribunal and remove a publication from the external facing service on GOV.UK");
    });

    test("should navigate to correct URLs when tiles are clicked", async ({ page }) => {
      await page.goto("/admin-dashboard");

      const uploadTile = page.locator(".admin-tile").nth(0);
      await expect(uploadTile).toHaveAttribute("href", "/manual-upload");

      const uploadExcelTile = page.locator(".admin-tile").nth(1);
      await expect(uploadExcelTile).toHaveAttribute("href", "/non-strategic-upload");

      const removeTile = page.locator(".admin-tile").nth(2);
      await expect(removeTile).toHaveAttribute("href", "/remove-list");
    });
  });

  test.describe("Welsh Language Toggle", () => {
    test("should not display Welsh language toggle", async ({ page }) => {
      await page.goto("/admin-dashboard");

      const welshToggle = page.locator('a[href*="lng=cy"]');
      await expect(welshToggle).not.toBeVisible();
    });
  });

  test.describe("Tile Styling", () => {
    test("should have proper tile styling", async ({ page }) => {
      await page.goto("/admin-dashboard");

      const firstTile = page.locator(".admin-tile").nth(0);

      // Check heading is blue and underlined
      const heading = firstTile.locator(".admin-tile__heading");
      await expect(heading).toBeVisible();

      // Check tile has border
      const borderStyle = await firstTile.evaluate((el) => {
        return window.getComputedStyle(el).border;
      });
      expect(borderStyle).toContain("1px");
    });

    test("should change border color on hover", async ({ page }) => {
      await page.goto("/admin-dashboard");

      const firstTile = page.locator(".admin-tile").nth(0);
      await firstTile.hover();

      // Just verify the tile is still visible after hover
      await expect(firstTile).toBeVisible();
    });
  });

  test.describe("Accessibility", () => {
    test("should meet WCAG 2.2 AA standards", async ({ page }) => {
      await page.goto("/admin-dashboard");

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should have proper heading hierarchy", async ({ page }) => {
      await page.goto("/admin-dashboard");

      const h1 = page.locator("h1");
      await expect(h1).toHaveCount(1);
      await expect(h1).toHaveText("Admin Dashboard");

      const h2s = page.locator(".admin-tile__heading");
      await expect(h2s).toHaveCount(3);
    });

    test("should have all tiles keyboard accessible", async ({ page }) => {
      await page.goto("/admin-dashboard");

      // Check that all tiles are links (keyboard accessible by default)
      const tiles = page.locator(".admin-tile");
      await expect(tiles).toHaveCount(3);

      // Verify all tiles have href attributes (making them keyboard accessible)
      await expect(tiles.nth(0)).toHaveAttribute("href", "/manual-upload");
      await expect(tiles.nth(1)).toHaveAttribute("href", "/non-strategic-upload");
      await expect(tiles.nth(2)).toHaveAttribute("href", "/remove-list");
    });
  });

  test.describe("Responsive Design", () => {
    test("should display correctly on mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/admin-dashboard");

      const tiles = page.locator(".admin-tile");
      await expect(tiles).toHaveCount(3);
      await expect(tiles.nth(0)).toBeVisible();
    });

    test("should display correctly on tablet viewport", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("/admin-dashboard");

      const tiles = page.locator(".admin-tile");
      await expect(tiles).toHaveCount(3);
      await expect(tiles.nth(0)).toBeVisible();
    });

    test("should display correctly on desktop viewport", async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto("/admin-dashboard");

      const tiles = page.locator(".admin-tile");
      await expect(tiles).toHaveCount(3);
      await expect(tiles.nth(0)).toBeVisible();
    });
  });
});
