import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createUniqueTestLocation } from "../utils/dynamic-test-data.js";

// Shared test location for the entire test suite
let testLocationId: number;
let testLocationName: string;

// Note: target-size and link-name rules are disabled due to pre-existing site-wide footer accessibility issues
// These issues affect ALL pages and should be addressed in a separate ticket

test.describe("Search Page", () => {
  test.beforeAll(async () => {
    const testLocation = await createUniqueTestLocation({ namePrefix: "Search Page Court" });
    testLocationId = testLocation.locationId;
    testLocationName = testLocation.name;
  });

  test("user can search for a court and navigate to A-Z list", async ({ page }) => {
    await page.goto("/search");

    // Verify page heading
    const heading = page.getByRole("heading", { name: /what court or tribunal are you interested in/i });
    await expect(heading).toBeVisible();

    // Verify search input (autocomplete combobox)
    const locationInput = page.getByRole("combobox");
    await expect(locationInput).toBeVisible();
    await expect(locationInput).toHaveAttribute("role", "combobox");

    // Verify hint text
    const hintText = page.getByText(/for example, oxford combined court centre/i);
    await expect(hintText).toBeVisible();

    // Verify continue button
    const continueButton = page.getByRole("button", { name: /continue/i });
    await expect(continueButton).toBeVisible();

    // Verify back link
    const backLink = page.locator(".govuk-back-link");
    await expect(backLink).toBeVisible();

    // Test search with no results
    await locationInput.fill("zzzzzzzzzzz");
    await page.waitForTimeout(300);
    const noResultsMessage = page.getByText("No results found");
    await expect(noResultsMessage).toBeVisible();

    // Clear and test valid input
    await locationInput.clear();
    await locationInput.fill("1");
    await expect(continueButton).toBeVisible();

    // Keyboard navigation - verify elements can receive focus
    await locationInput.focus();
    await expect(locationInput).toBeFocused();
    await continueButton.focus();
    await expect(continueButton).toBeFocused();

    // Accessibility check
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["target-size", "link-name"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Navigate to A-Z list
    await page.goto("/search");
    const azListLink = page.getByRole("link", { name: /select from an a-z list of courts and tribunals/i });
    await expect(azListLink).toBeVisible();
    await azListLink.click();

    // Verify navigation to A-Z list page
    await expect(page).toHaveURL("/courts-tribunals-list");
    const azHeading = page.getByRole("heading", { name: /find a court or tribunal/i });
    await expect(azHeading).toBeVisible();

    // Accessibility check on A-Z list page
    const azAccessibilityResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["target-size", "link-name"])
      .analyze();
    expect(azAccessibilityResults.violations).toEqual([]);
  });

  test("user sees validation error when submitting without selecting a location", async ({ page }) => {
    await page.goto("/search");

    // Click continue without selecting a location
    const continueButton = page.getByRole("button", { name: /continue/i });
    await continueButton.click();

    // Verify still on search page
    await expect(page).toHaveURL("/search");

    // Verify error summary
    const errorSummary = page.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();

    const errorSummaryHeading = errorSummary.getByRole("heading", { name: /there is a problem/i });
    await expect(errorSummaryHeading).toBeVisible();

    // Verify error message link
    const errorLink = errorSummary.getByRole("link", { name: /there is nothing matching your criteria/i });
    await expect(errorLink).toBeVisible();
    await expect(errorLink).toHaveAttribute("href", "#location");

    // Verify form group has error styling
    const formGroup = page.locator(".govuk-form-group--error");
    await expect(formGroup).toBeVisible();

    // Verify input has error class
    const autocompleteInput = page.getByRole("combobox");
    await expect(autocompleteInput).toHaveClass(/govuk-input--error/);

    // Accessibility check with error state
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["target-size", "link-name"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("user can search in Welsh and sees Welsh validation errors @nightly", async ({ page }) => {
    await page.goto("/search");

    // Switch to Welsh
    const languageToggle = page.locator(".language");
    await expect(languageToggle).toBeVisible();
    await expect(languageToggle).toContainText("Cymraeg");
    await languageToggle.click();

    // Verify Welsh URL
    await expect(page).toHaveURL(/.*\?lng=cy/);

    // Verify language toggle now shows English
    await expect(languageToggle).toContainText("English");

    // Verify Welsh hint text
    const hintText = page.getByText(/er enghraifft, oxford combined court centre/i);
    await expect(hintText).toBeVisible();

    // Verify Welsh continue button
    const continueButton = page.getByRole("button", { name: /parhau|continue/i });
    await expect(continueButton).toBeVisible();

    // Test Welsh no results message
    const locationInput = page.getByRole("combobox");
    await locationInput.fill("zzzzzzzzzzz");
    await page.waitForTimeout(300);
    const noResultsMessage = page.getByText("Ni ddaethpwyd o hyd i unrhyw ganlyniad");
    await expect(noResultsMessage).toBeVisible();

    // Clear and submit to trigger validation error
    await locationInput.clear();
    await continueButton.click();

    // Verify Welsh URL preserved after validation
    await expect(page).toHaveURL(/.*\/search.*lng=cy/);

    // Verify Welsh error summary
    const errorSummary = page.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();

    // Verify Welsh error message
    const errorLink = errorSummary.getByRole("link", { name: /nid oes dim sy'n cyfateb i'ch meini prawf/i });
    await expect(errorLink).toBeVisible();

    // Verify language toggle still shows English (still in Welsh mode)
    await expect(languageToggle).toContainText("English");

    // Accessibility check in Welsh
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["target-size", "link-name"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("search page displays preselected location when locationId is provided", async ({ page }) => {
    await page.goto(`/search?locationId=${testLocationId}`);

    // Verify location input is pre-filled
    const locationInput = page.getByRole("combobox");
    await expect(locationInput).toHaveValue(testLocationName);

    // Verify other elements are present
    const continueButton = page.getByRole("button", { name: /continue/i });
    await expect(continueButton).toBeVisible();

    // Accessibility check
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["target-size", "link-name"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
