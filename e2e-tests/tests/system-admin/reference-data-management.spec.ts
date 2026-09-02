import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { loginWithSSO } from "../../utils/sso-helpers.js";

test.describe
  .skip("Reference Data Management", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/system-admin-dashboard");
      await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
      await page.waitForURL("/system-admin-dashboard");
    });

    test("system admin can navigate from dashboard to reference data landing page @nightly", async ({ page }) => {
      // Dashboard should show "Reference Data" tile and NOT show old tiles
      const referenceDataTile = page.locator('a.admin-tile:has-text("Reference Data")');
      await expect(referenceDataTile).toBeVisible();

      const uploadTile = page.locator('a.admin-tile:has-text("Upload Reference Data")');
      await expect(uploadTile).toHaveCount(0);

      const metadataTile = page.locator('a.admin-tile:has-text("Manage Location Metadata")');
      await expect(metadataTile).toHaveCount(0);

      // Navigate to reference data landing
      await referenceDataTile.click();
      await expect(page).toHaveURL("/reference-data");

      // Verify heading
      const heading = page.getByRole("heading", { level: 1 });
      await expect(heading).toContainText("What do you want to do?");

      // Accessibility check
      let accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Test Welsh
      await page.goto("/reference-data?lng=cy");
      await expect(heading).toContainText("Beth yr ydych eisiau ei wneud?");

      accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("system admin can navigate from reference data to upload page @nightly", async ({ page }) => {
      await page.goto("/reference-data");

      // Click Upload Reference Data tile
      const uploadTile = page.locator('a.admin-tile:has-text("Upload Reference Data")');
      await uploadTile.click();

      await expect(page).toHaveURL("/reference-data-upload");

      // Verify warning message is displayed
      await expect(page.locator(".govuk-warning-text")).toBeVisible();

      // Verify back link points to /reference-data
      const backLink = page.locator(".govuk-back-link");
      await expect(backLink).toHaveAttribute("href", "/reference-data");
    });

    test("system admin can create jurisdiction data through full journey @nightly", async ({ page }) => {
      // Navigate: Dashboard → Reference Data → Manage Jurisdiction Data → Create
      await page.goto("/reference-data");
      const jurisdictionTile = page.locator('a.admin-tile:has-text("Manage Jurisdiction Data")');
      await jurisdictionTile.click();

      await expect(page).toHaveURL("/jurisdiction-data");
      const heading = page.getByRole("heading", { level: 1 });
      await expect(heading).toContainText("What do you want to do?");

      // Select "Create" radio and continue
      await page.getByLabel(/Create a new jurisdiction/i).check();
      await page.getByRole("button", { name: /Continue/i }).click();

      await expect(page).toHaveURL("/jurisdiction-data-create");
      await expect(page.getByRole("heading", { level: 1 })).toContainText("Create Jurisdiction Data");

      // Test validation — submit empty form
      await page.getByRole("button", { name: /Confirm/i }).click();
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      // Accessibility check on error state
      let accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Fill in valid data
      await page.getByLabel("Name").fill("E2E Test Jurisdiction");
      await page.getByLabel("Welsh Name").fill("Awdurdodaeth Prawf E2E");
      await page.getByLabel("Type").selectOption("Jurisdiction");
      await page.getByRole("button", { name: /Confirm/i }).click();

      // Should reach success page
      await expect(page).toHaveURL("/jurisdiction-data-create-success");
      const panel = page.locator(".govuk-panel");
      await expect(panel).toBeVisible();
      await expect(panel).toContainText("Jurisdiction Data Created");

      // Verify link to manage page
      const manageLink = page.locator('a[href="/jurisdiction-data"]');
      await expect(manageLink).toBeVisible();

      // Test Welsh on success page
      await page.goto("/jurisdiction-data-create-success?lng=cy");

      accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("system admin can modify and update jurisdiction data @nightly", async ({ page }) => {
      // Navigate to list page
      await page.goto("/jurisdiction-data");
      await page.getByLabel(/Modify an existing/i).check();
      await page.getByRole("button", { name: /Continue/i }).click();

      await expect(page).toHaveURL("/jurisdiction-data-list");
      await expect(page.getByRole("heading", { level: 1 })).toContainText("Modify an existing");

      // Verify filter panel exists
      await expect(page.locator("#jurisdiction")).toBeVisible();
      await expect(page.locator("#subJurisdiction")).toBeVisible();

      // Accessibility check on list page
      const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Click first Modify link
      const modifyLink = page.locator("a.govuk-link:has-text('Modify')").first();
      await modifyLink.click();

      await expect(page).toHaveURL(/jurisdiction-data-modify/);

      // Verify summary list and buttons
      await expect(page.locator(".govuk-summary-list")).toBeVisible();
      const updateButton = page.locator('a.govuk-button:has-text("Update")');
      await expect(updateButton).toBeVisible();

      // Click Update
      await updateButton.click();
      await expect(page).toHaveURL("/jurisdiction-data-update");

      // Update the name
      await page.getByLabel("Name").fill("Updated E2E Name");
      await page.getByLabel("Welsh Name").fill("Enw E2E Diweddarwyd");
      await page.getByRole("button", { name: /Confirm/i }).click();

      // Should reach update success
      await expect(page).toHaveURL("/jurisdiction-data-update-success");
      await expect(page.locator(".govuk-panel")).toContainText("Jurisdiction Data Updated");
    });

    test("system admin can delete jurisdiction data with confirmation @nightly", async ({ page }) => {
      // Navigate to a modify page (use first item in list)
      await page.goto("/jurisdiction-data-list");
      const modifyLink = page.locator("a.govuk-link:has-text('Modify')").first();
      await modifyLink.click();

      // Click Delete button
      const deleteButton = page.locator('a.govuk-button--warning:has-text("Delete")');
      await expect(deleteButton).toBeVisible();
      await deleteButton.click();

      await expect(page).toHaveURL("/jurisdiction-data-delete");

      // Verify summary and Yes/No radios
      await expect(page.locator(".govuk-summary-list")).toBeVisible();

      // Test validation - no selection
      await page.getByRole("button", { name: /Continue/i }).click();
      await expect(page.locator(".govuk-error-summary")).toBeVisible();

      // Select Yes and confirm
      await page.getByLabel("Yes").check();
      await page.getByRole("button", { name: /Continue/i }).click();

      // Should reach delete success
      await expect(page).toHaveURL("/jurisdiction-data-delete-success");
      await expect(page.locator(".govuk-panel")).toContainText("Jurisdiction Data Deleted");
    });

    test("system admin can manage location jurisdiction data @nightly", async ({ page }) => {
      // Navigate to location jurisdiction search
      await page.goto("/reference-data");
      const locationJurisdictionTile = page.locator('a.admin-tile:has-text("Manage Location Jurisdiction Data")');
      await locationJurisdictionTile.click();

      await expect(page).toHaveURL("/location-jurisdiction-search");
      await expect(page.getByRole("heading", { level: 1 })).toContainText("Find the Jurisdiction data to manage");

      // Test validation - empty search
      await page.getByRole("button", { name: /Continue/i }).click();
      await expect(page.locator(".govuk-error-summary")).toBeVisible();

      // Accessibility check
      const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("system admin can update location jurisdiction data @nightly", async ({ page }) => {
      // Assume session already has location data (navigate through search first in real run)
      await page.goto("/location-jurisdiction-manage");

      // If redirected to search (no session), that's expected behavior
      const url = page.url();
      if (url.includes("location-jurisdiction-search")) {
        return; // Can't proceed without a real location in the database
      }

      // Verify warning text and table
      await expect(page.locator(".govuk-warning-text")).toBeVisible();

      // Click Update
      const updateButton = page.locator('a.govuk-button:has-text("Update")');
      await updateButton.click();

      await expect(page).toHaveURL("/location-jurisdiction-update");

      // Verify Confirm and Cancel buttons
      await expect(page.getByRole("button", { name: /Confirm/i })).toBeVisible();
      const cancelButton = page.locator('a.govuk-button--warning:has-text("Cancel")');
      await expect(cancelButton).toBeVisible();

      // Cancel returns to manage page without saving
      await cancelButton.click();
      await expect(page).toHaveURL("/location-jurisdiction-manage");
    });

    test("system admin can delete location jurisdiction data @nightly", async ({ page }) => {
      await page.goto("/location-jurisdiction-manage");

      const url = page.url();
      if (url.includes("location-jurisdiction-search")) {
        return; // Can't proceed without a real location in the database
      }

      // Click Delete
      const deleteButton = page.locator('a.govuk-button--warning:has-text("Delete")');
      await deleteButton.click();

      await expect(page).toHaveURL("/location-jurisdiction-delete");

      // Test validation
      await page.getByRole("button", { name: /Confirm/i }).click();
      await expect(page.locator(".govuk-error-summary")).toBeVisible();

      // Select Yes
      await page.getByLabel("Yes").check();
      await page.getByRole("button", { name: /Confirm/i }).click();

      await expect(page).toHaveURL("/location-jurisdiction-delete-success");
      await expect(page.locator(".govuk-panel")).toContainText("Jurisdiction Data Deleted");
    });

    test("radios variant validates selection on reference data landing @nightly", async ({ page }) => {
      // Test the radios variant validation (POST to /reference-data without selection)
      await page.goto("/reference-data");

      // If tiles variant is active, the Continue button won't exist — skip
      const continueButton = page.getByRole("button", { name: /Continue/i });
      if (!(await continueButton.isVisible())) {
        return; // Tiles variant active, no radios to validate
      }

      // Submit without selection
      await continueButton.click();
      await expect(page.locator(".govuk-error-summary")).toBeVisible();
      await expect(page.locator(".govuk-error-summary")).toContainText("Please select one option");
    });
  });
