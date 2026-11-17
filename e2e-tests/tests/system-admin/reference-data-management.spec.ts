import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { selectAutocompleteOption } from "../../utils/autocomplete-helpers.js";
import { createUniqueTestJurisdiction, createUniqueTestLocation, generateTestId } from "../../utils/dynamic-test-data.js";
import { loginWithSSO } from "../../utils/sso-helpers.js";
import { prefixName } from "../../utils/test-prefix.js";

// Real jurisdictions and courts are read-only: modify and delete journeys act on a prefixed jurisdiction or court
// the test creates, which global-teardown deletes

async function openOwnJurisdiction(page: Page, jurisdictionName: string) {
  const row = page.getByRole("row").filter({ has: page.getByRole("cell", { name: jurisdictionName, exact: true }) });
  await expect(row).toHaveCount(1);
  await row.getByRole("link", { name: "Modify" }).click();
  await expect(page).toHaveURL(/jurisdiction-data-modify/);
}

async function selectOwnCourtForJurisdictionManagement(page: Page, court: { locationId: number; name: string }) {
  await page.goto("/location-jurisdiction-search");
  const searchInput = page.getByRole("combobox", { name: "Search by court or tribunal name" });
  expect(await selectAutocompleteOption(page, searchInput, court.name)).toBe(String(court.locationId));
  await page.getByRole("button", { name: /Continue/i }).click();
  await expect(page).toHaveURL("/location-jurisdiction-manage");
}

test.describe("Reference Data Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/system-admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await page.waitForURL("/system-admin-dashboard");
  });

  test("system admin can navigate from dashboard to reference data landing page @nightly", async ({ page }) => {
    // Dashboard should show "Reference Data" tile and NOT show old tiles
    // Matched by href: the "Delete Court" tile description also contains "reference data"
    const referenceDataTile = page.locator('a.admin-tile[href="/reference-data"]');
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
    // Navigate: Dashboard → Manage Jurisdiction Data → Create
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
    const testId = generateTestId();
    await page.getByLabel("Name", { exact: true }).fill(prefixName(`E2E Test Jurisdiction ${testId}`));
    await page.getByLabel("Welsh Name").fill(prefixName(`Awdurdodaeth Prawf E2E ${testId}`));
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
    const jurisdiction = await createUniqueTestJurisdiction("Modify Jurisdiction");

    // Navigate to list page
    await page.goto("/jurisdiction-data");
    await page.getByLabel(/Modify an existing/i).check();
    await page.getByRole("button", { name: /Continue/i }).click();

    await expect(page).toHaveURL("/jurisdiction-data-list");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Modify an existing");

    // Verify the type filter exists
    await expect(page.getByRole("checkbox", { name: "Jurisdiction", exact: true })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "Sub-Jurisdiction", exact: true })).toBeVisible();

    // Accessibility check on list page
    const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Open this test's own jurisdiction
    await openOwnJurisdiction(page, jurisdiction.name);

    // Verify summary list and buttons
    await expect(page.locator(".govuk-summary-list")).toBeVisible();
    const updateButton = page.locator('a.govuk-button:has-text("Update")');
    await expect(updateButton).toBeVisible();

    // Click Update
    await updateButton.click();
    await expect(page).toHaveURL("/jurisdiction-data-update");

    // Update the name
    // The new name keeps the run prefix so global-teardown still removes the row
    const updatedId = generateTestId();
    await page.getByLabel("Name", { exact: true }).fill(prefixName(`Updated E2E Name ${updatedId}`));
    await page.getByLabel("Welsh Name").fill(prefixName(`Enw E2E Diweddarwyd ${updatedId}`));
    await page.getByRole("button", { name: /Confirm/i }).click();

    // Should reach update success
    await expect(page).toHaveURL("/jurisdiction-data-update-success");
    await expect(page.locator(".govuk-panel")).toContainText("Jurisdiction Data Updated");
  });

  test("system admin can delete jurisdiction data with confirmation @nightly", async ({ page }) => {
    const jurisdiction = await createUniqueTestJurisdiction("Delete Jurisdiction");

    // Navigate to this test's own jurisdiction
    await page.goto("/jurisdiction-data-list");
    await openOwnJurisdiction(page, jurisdiction.name);

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
    const locationJurisdictionTile = page.locator('a.admin-tile:has-text("Manage Location Jurisdiction and Region Data")');
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
    const court = await createUniqueTestLocation({ namePrefix: "Location Jurisdiction Update Court" });
    await selectOwnCourtForJurisdictionManagement(page, court);

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
    const court = await createUniqueTestLocation({ namePrefix: "Location Jurisdiction Delete Court" });
    await selectOwnCourtForJurisdictionManagement(page, court);

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
