import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Note: target-size and link-name rules are disabled due to pre-existing site-wide footer accessibility issues

test.describe("View Option Page", () => {
  test("complete view option journey with validation, navigation, Welsh, and accessibility", async ({ page }) => {
    // STEP 1: Navigate to view option page and verify elements
    await page.goto("/view-option");

    const courtTribunalRadio = page.getByRole("radio", { name: /court or tribunal/i });
    const sjpCaseRadio = page.getByRole("radio", { name: /single justice procedure/i });
    await expect(courtTribunalRadio).toBeVisible();
    await expect(sjpCaseRadio).toBeVisible();

    // Verify hint text
    const courtHintText = page.getByText(/view time, location, type of hearings and more/i);
    await expect(courtHintText).toBeVisible();
    const sjpHintText = page.getByText(/TV licensing, minor traffic offences such as speeding and more/i);
    await expect(sjpHintText).toBeVisible();

    // Verify continue button and back link
    const continueButton = page.getByRole("button", { name: /continue/i });
    await expect(continueButton).toBeVisible();
    const backLink = page.locator(".govuk-back-link");
    await expect(backLink).toBeVisible();

    // STEP 2: Test validation - submit without selecting an option
    await continueButton.click();
    await expect(page).toHaveURL("/view-option");

    // Verify error summary
    const errorSummary = page.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();
    const errorSummaryHeading = errorSummary.getByRole("heading", { name: /there is a problem/i });
    await expect(errorSummaryHeading).toBeVisible();

    // Verify error link points to radio group
    const errorLink = errorSummary.getByRole("link");
    await expect(errorLink).toBeVisible();
    await expect(errorLink).toHaveAttribute("href", "#viewOption");

    // Accessibility check with error state
    let accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["target-size", "link-name"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // STEP 3: Select court/tribunal option and navigate
    await courtTribunalRadio.check();
    await expect(courtTribunalRadio).toBeChecked();

    // Accessibility check before navigation
    accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["target-size", "link-name"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    await continueButton.click();
    await expect(page).toHaveURL("/search");

    // Accessibility check on search page
    accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["target-size", "link-name"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // STEP 4: Test Welsh language support
    await page.goto("/view-option");
    const languageToggle = page.locator(".language");
    await expect(languageToggle).toBeVisible();
    await expect(languageToggle).toContainText("Cymraeg");
    await languageToggle.click();

    // Verify Welsh URL
    await expect(page).toHaveURL(/.*\?lng=cy/);
    await expect(languageToggle).toContainText("English");

    // Verify radio options still visible in Welsh
    const radioOptions = page.locator(".govuk-radios__item");
    await expect(radioOptions).toHaveCount(2);

    // Verify Welsh continue button
    const welshContinueButton = page.getByRole("button", { name: /parhau|continue/i });
    await expect(welshContinueButton).toBeVisible();

    // Test Welsh validation error - submit without selection
    await welshContinueButton.click();
    await expect(page).toHaveURL(/.*\/view-option.*lng=cy/);

    // Verify error summary in Welsh
    await expect(errorSummary).toBeVisible();

    // Verify language is preserved after validation error
    await expect(languageToggle).toContainText("English");

    // Accessibility check in Welsh with error state
    accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["target-size", "link-name"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Switch back to English
    await languageToggle.click();
    await expect(page).toHaveURL(/.*\?lng=en/);
    await expect(languageToggle).toContainText("Cymraeg");
  });
});
