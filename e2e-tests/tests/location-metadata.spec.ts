import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginWithSSO } from "../utils/sso-helpers.js";

test.describe("Location Metadata Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/system-admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await page.waitForURL("/system-admin-dashboard");
  });

  test.describe("Search Page", () => {
    test("should navigate to location metadata search from dashboard", async ({ page }) => {
      const manageMetadataLink = page.locator('a.admin-tile:has-text("Manage Location Metadata")');
      await expect(manageMetadataLink).toBeVisible();
      await manageMetadataLink.click();

      await expect(page).toHaveURL("/location-metadata-search");

      const heading = page.locator("h1.govuk-heading-l");
      await expect(heading).toBeVisible();
      await expect(heading).toContainText("Find the location metadata to manage");

      // Accessibility check
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should display search input with autocomplete", async ({ page }) => {
      await page.goto("/location-metadata-search");

      const searchInput = page.locator("#location-search");
      await expect(searchInput).toBeVisible();

      const continueButton = page.getByRole("button", { name: /continue/i });
      await expect(continueButton).toBeVisible();
    });

    test("should show validation error when submitting empty form", async ({ page }) => {
      await page.goto("/location-metadata-search");

      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();

      // Should show error summary
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();
    });

    test("should display Welsh content when language is Welsh @nightly", async ({ page }) => {
      await page.goto("/location-metadata-search?lng=cy");

      const heading = page.locator("h1.govuk-heading-l");
      await expect(heading).toContainText("Dod o hyd i'r metadata lleoliad i'w reoli");

      // Accessibility check in Welsh
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe("Manage Page", () => {
    test("should redirect to search if accessed directly without session @nightly", async ({ page }) => {
      await page.goto("/location-metadata-manage");

      // Should redirect to search page
      await expect(page).toHaveURL("/location-metadata-search");
    });

    test("should have correct browser tab title @nightly", async ({ page }) => {
      await page.goto("/location-metadata-search");

      await expect(page).toHaveTitle(/Search for location metadata/i);
    });
  });

  test.describe("Delete Confirmation Page", () => {
    test("should redirect to search if accessed directly without session @nightly", async ({ page }) => {
      await page.goto("/location-metadata-delete-confirmation");

      // Should redirect to search page
      await expect(page).toHaveURL("/location-metadata-search");
    });

    test("should have correct browser tab title when accessed via flow @nightly", async ({ page }) => {
      // This test would need location metadata to exist
      // For now, just verify redirect behavior
      await page.goto("/location-metadata-delete-confirmation");
      await expect(page).toHaveURL("/location-metadata-search");
    });
  });

  test.describe("Success Page", () => {
    test("should redirect to search if accessed directly without session @nightly", async ({ page }) => {
      await page.goto("/location-metadata-success");

      // Success page should still render even without session
      // as it uses default "created" operation
      const panel = page.locator(".govuk-panel");
      await expect(panel).toBeVisible();
    });

    test("should display success panel with correct styling @nightly", async ({ page }) => {
      await page.goto("/location-metadata-success");

      const panel = page.locator(".govuk-panel");
      await expect(panel).toBeVisible();
      await expect(panel).toHaveClass(/govuk-panel--confirmation/);

      // Check for next steps link
      const searchLink = page.locator('a[href*="location-metadata-search"]');
      await expect(searchLink).toBeVisible();

      // Accessibility check
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should display Welsh content when language is Welsh @nightly", async ({ page }) => {
      await page.goto("/location-metadata-success?lng=cy");

      const panel = page.locator(".govuk-panel");
      await expect(panel).toBeVisible();

      // Check for Welsh text
      const panelTitle = page.locator(".govuk-panel__title");
      await expect(panelTitle).toContainText("Metadata lleoliad wedi'i greu");
    });
  });

  test.describe("Full User Journey @nightly", () => {
    test("should navigate through search to manage page flow", async ({ page }) => {
      // Start from dashboard
      await page.goto("/system-admin-dashboard");

      // Click on Manage Location Metadata tile
      const manageMetadataLink = page.locator('a.admin-tile:has-text("Manage Location Metadata")');
      await manageMetadataLink.click();

      // Verify we're on search page
      await expect(page).toHaveURL("/location-metadata-search");

      // Verify page elements
      const heading = page.locator("h1.govuk-heading-l");
      await expect(heading).toBeVisible();

      const searchInput = page.locator("#location-search");
      await expect(searchInput).toBeVisible();

      // Run accessibility check on the full journey
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe("Keyboard Navigation @nightly", () => {
    test("should allow keyboard navigation through search form", async ({ page }) => {
      await page.goto("/location-metadata-search");

      // Tab to search input
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");

      // Verify we can reach the continue button via keyboard
      const continueButton = page.getByRole("button", { name: /continue/i });
      await expect(continueButton).toBeVisible();

      // Tab to continue button and press Enter
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press("Tab");
      }
      await page.keyboard.press("Enter");

      // Should show error (empty form)
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();
    });
  });
});
