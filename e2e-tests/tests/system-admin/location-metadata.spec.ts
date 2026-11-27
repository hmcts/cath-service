import { expect, test } from "@playwright/test";
import { selectAutocompleteOption } from "../../utils/autocomplete-helpers.js";
import { axeCheck } from "../../utils/axe-helper.js";
import { createUniqueTestLocation } from "../../utils/dynamic-test-data.js";
import { loginWithSSO } from "../../utils/sso-helpers.js";

test.describe("Location Metadata Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/system-admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await page.waitForURL("/system-admin-dashboard");
  });

  test("system admin can navigate to location metadata search and validate form", async ({ page }) => {
    // Navigate from dashboard through the Reference Data landing page
    await page.locator('a.admin-tile[href="/reference-data"]').click();
    await expect(page).toHaveURL("/reference-data");
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
    let accessibilityScanResults = await axeCheck(page).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Test Welsh content
    await page.goto("/location-metadata-search?lng=cy");
    await expect(heading).toContainText("Dod o hyd i'r metadata lleoliad i'w reoli");

    // Accessibility check in Welsh
    accessibilityScanResults = await axeCheck(page).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Select a court the test owns and submit the manage form empty
    const court = await createUniqueTestLocation({ namePrefix: "Location Metadata Court" });
    await page.goto("/location-metadata-search?lng=en");
    expect(await selectAutocompleteOption(page, searchInput, court.name)).toBe(String(court.locationId));
    await continueButton.click();
    await expect(page).toHaveURL(/\/location-metadata-manage/);

    await page.getByRole("button", { name: "Create" }).click();

    const englishMessages = [
      "Enter at least one message",
      "Enter English caution message",
      "Enter Welsh caution message",
      "Enter English no list message",
      "Enter Welsh no list message"
    ];
    await expect(errorSummary.getByRole("heading", { name: "There is a problem" })).toBeVisible();
    await expect(errorSummary.getByRole("link")).toHaveText(englishMessages);

    const fields = [
      { id: "cautionMessage", label: "English caution message", message: englishMessages[1] },
      { id: "welshCautionMessage", label: "Welsh caution message", message: englishMessages[2] },
      { id: "noListMessage", label: "English no list message", message: englishMessages[3] },
      { id: "welshNoListMessage", label: "Welsh no list message", message: englishMessages[4] }
    ];
    for (const field of fields) {
      await expect(page.locator(`#${field.id}-error`)).toContainText(field.message);
      await expect(page.getByLabel(field.label, { exact: true })).toHaveAttribute("aria-describedby", new RegExp(`${field.id}-error`));
    }

    await errorSummary.getByRole("link", { name: "Enter Welsh no list message" }).click();
    await expect(page.locator("#welshNoListMessage")).toBeFocused();

    accessibilityScanResults = await axeCheck(page).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Welsh: the five messages come from cy.ts
    await page.goto("/location-metadata-manage?lng=cy");
    await page.getByRole("button", { name: "Creu" }).click();
    await expect(errorSummary.getByRole("link")).toHaveText(["Rhowch o leiaf un neges", ...englishMessages.slice(1)]);
    await expect(page.locator(".govuk-error-message")).toHaveCount(4);

    accessibilityScanResults = await axeCheck(page).analyze();
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
    let accessibilityScanResults = await axeCheck(page).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Test Welsh
    await page.goto("/location-metadata-success?lng=cy");
    await expect(panel).toBeVisible();
    const panelTitle = page.locator(".govuk-panel__title");
    await expect(panelTitle).toContainText("Metadata lleoliad wedi'i greu");

    // Accessibility check in Welsh
    accessibilityScanResults = await axeCheck(page).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
