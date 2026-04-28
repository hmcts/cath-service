import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginWithSSO } from "../../utils/sso-helpers.js";

test.describe
  .skip("Location Metadata Management", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/system-admin-dashboard");
      await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
      await page.waitForURL("/system-admin-dashboard");
    });

    test("system admin can navigate to location metadata search and validate form", async ({ page }) => {
      // Navigate from dashboard
      const manageMetadataLink = page.locator('a.admin-tile:has-text("Manage Location Metadata")');
      await expect(manageMetadataLink).toBeVisible();
      await manageMetadataLink.click();

      await expect(page).toHaveURL("/location-metadata-search");

      // Verify page elements
      const heading = page.locator("h1.govuk-heading-l");
      await expect(heading).toBeVisible();
      await expect(heading).toContainText("Find the location metadata to manage");

      // Verify search input with autocomplete
      const searchInput = page.getByRole("combobox", { name: /search by court or tribunal/i });
      await expect(searchInput).toBeVisible();

      // Test validation - empty form
      const continueButton = page.getByRole("button", { name: /continue/i });
      await expect(continueButton).toBeVisible();
      await continueButton.click();

      // Should show error summary
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      // Accessibility check
      let accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Test Welsh content
      await page.goto("/location-metadata-search?lng=cy");
      await expect(heading).toContainText("Dod o hyd i'r metadata lleoliad i'w reoli");

      // Accessibility check in Welsh
      accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("manage and delete pages redirect to search without session @nightly", async ({ page }) => {
      // Manage page should redirect
      await page.goto("/location-metadata-manage");
      await expect(page).toHaveURL("/location-metadata-search");

      // Delete confirmation page should redirect
      await page.goto("/location-metadata-delete-confirmation");
      await expect(page).toHaveURL("/location-metadata-search");
    });

    test("success page displays correctly with Welsh support @nightly", async ({ page }) => {
      await page.goto("/location-metadata-success");

      // Success page should render with panel
      const panel = page.locator(".govuk-panel");
      await expect(panel).toBeVisible();
      await expect(panel).toHaveClass(/govuk-panel--confirmation/);

      // Check for next steps link
      const searchLink = page.locator('a[href*="location-metadata-search"]');
      await expect(searchLink).toBeVisible();

      // Accessibility check
      let accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Test Welsh
      await page.goto("/location-metadata-success?lng=cy");
      await expect(panel).toBeVisible();
      const panelTitle = page.locator(".govuk-panel__title");
      await expect(panelTitle).toContainText("Metadata lleoliad wedi'i greu");

      // Accessibility check in Welsh
      accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });
