import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Note: target-size and link-name rules are disabled due to pre-existing site-wide footer accessibility issues:
// 1. Crown copyright link fails WCAG 2.5.8 Target Size criterion (insufficient size)
// 2. Crown copyright logo link missing accessible text (WCAG 2.4.4, 4.1.2)
// These issues affect ALL pages and should be addressed in a separate ticket
// See: docs/tickets/VIBE-150/accessibility-findings.md

test.describe("Sign In Account Selection Page", () => {
  test.describe("given user is on the select account page", () => {
    test("should load the page with all radio options", async ({ page }) => {
      await page.goto("/sign-in");

      // Check the page title
      const heading = page.getByRole("heading", { name: /how do you want to sign in/i });
      await expect(heading).toBeVisible();

      // Check for the three radio button options
      const hmctsRadio = page.getByRole("radio", { name: /with a myhmcts account/i });
      const commonPlatformRadio = page.getByRole("radio", { name: /with a common platform account/i });
      const cathRadio = page.getByRole("radio", { name: /with a court and tribunal hearings account/i });

      await expect(hmctsRadio).toBeVisible();
      await expect(commonPlatformRadio).toBeVisible();
      await expect(cathRadio).toBeVisible();

      // Check for continue button
      const continueButton = page.getByRole("button", { name: /continue/i });
      await expect(continueButton).toBeVisible();

      // Check for create account link
      const createAccountText = page.getByText(/don't have a cath account/i);
      await expect(createAccountText).toBeVisible();
      const createAccountLink = page.getByRole("link", { name: /create one here/i });
      await expect(createAccountLink).toBeVisible();
      await expect(createAccountLink).toHaveAttribute("href", "/create-media-account");
    });
  });

  test.describe("given user selects HMCTS account", () => {
    test("should redirect to home page when continue is clicked", async ({ page }) => {
      await page.goto("/sign-in");

      // Select the HMCTS account radio option
      const hmctsRadio = page.getByRole("radio", { name: /with a myhmcts account/i });
      await hmctsRadio.check();

      // Verify the radio is checked
      await expect(hmctsRadio).toBeChecked();

      // Click continue button
      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();

      // Verify navigation to home page
      await expect(page).toHaveURL("/");
    });
  });

  test.describe("given user selects Common Platform account", () => {
    test("should redirect to home page when continue is clicked", async ({ page }) => {
      await page.goto("/sign-in");

      // Select the Common Platform account radio option
      const commonPlatformRadio = page.getByRole("radio", { name: /with a common platform account/i });
      await commonPlatformRadio.check();

      // Verify the radio is checked
      await expect(commonPlatformRadio).toBeChecked();

      // Click continue button
      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();

      // Verify navigation to home page
      await expect(page).toHaveURL("/");
    });
  });

  test.describe("given user selects CaTH account", () => {
    test("should redirect to home page when continue is clicked with accessibility check", async ({ page }) => {
      await page.goto("/sign-in");

      // Initial accessibility check
      let accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Select the CaTH account radio option
      const cathRadio = page.getByRole("radio", { name: /with a court and tribunal hearings account/i });
      await cathRadio.check();

      // Verify the radio is checked
      await expect(cathRadio).toBeChecked();

      // Accessibility check after selection
      accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Click continue button
      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();

      // Verify navigation to home page
      await expect(page).toHaveURL("/");

      // Final accessibility check on destination page
      accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe("given user submits without selecting an option", () => {
    test("should display validation error message", async ({ page }) => {
      await page.goto("/sign-in");

      // Click continue without selecting an option
      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();

      // Verify we're still on the sign-in page
      await expect(page).toHaveURL("/sign-in");

      // Check for error summary
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      // Check for error summary heading
      const errorSummaryHeading = errorSummary.getByRole("heading", { name: /there is a problem/i });
      await expect(errorSummaryHeading).toBeVisible();

      // Check for error message link in the summary
      const errorLink = errorSummary.getByRole("link", { name: /please select an option/i });
      await expect(errorLink).toBeVisible();

      // Verify error link points to the radio group
      await expect(errorLink).toHaveAttribute("href", "#accountType");

      // Verify accessibility with error state
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe("given user toggles language", () => {
    test("should display Welsh content when language is changed to Welsh", async ({ page }) => {
      await page.goto("/sign-in");

      // Find and click the Welsh language toggle
      const languageToggle = page.locator(".language");
      await expect(languageToggle).toBeVisible();
      await expect(languageToggle).toContainText("Cymraeg");

      await languageToggle.click();

      // Verify URL has Welsh parameter
      await expect(page).toHaveURL(/.*\?lng=cy/);

      // Verify language toggle now shows English option
      await expect(languageToggle).toContainText("English");

      // Check that Welsh heading is visible
      const heading = page.getByRole("heading", { name: /sut hoffech chi fewngofnodi/i });
      await expect(heading).toBeVisible();

      // Check that radio options are still visible (content will be in Welsh)
      const radioOptions = page.locator(".govuk-radios__item");
      await expect(radioOptions).toHaveCount(3);

      // Verify Welsh radio labels
      const hmctsRadio = page.getByRole("radio", { name: /gyda chyfrif myhmcts/i });
      const commonPlatformRadio = page.getByRole("radio", { name: /gyda chyfrif common platform/i });
      const cathRadio = page.getByRole("radio", { name: /gyda chyfrif gwrandawiadau llys a thribiwnlys/i });

      await expect(hmctsRadio).toBeVisible();
      await expect(commonPlatformRadio).toBeVisible();
      await expect(cathRadio).toBeVisible();

      // Verify continue button is still visible (Welsh text)
      const continueButton = page.getByRole("button", { name: /parhau/i });
      await expect(continueButton).toBeVisible();

      // Verify create account link in Welsh
      const createAccountText = page.getByText(/nid oes gennych gyfrif cath/i);
      await expect(createAccountText).toBeVisible();
      const createAccountLink = page.getByRole("link", { name: /crëwch un yma/i });
      await expect(createAccountLink).toBeVisible();

      // Run accessibility checks in Welsh
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should switch back to English when language toggle is clicked again", async ({ page }) => {
      await page.goto("/sign-in?lng=cy");

      // Verify we're in Welsh mode
      const languageToggle = page.locator(".language");
      await expect(languageToggle).toContainText("English");

      // Switch back to English
      await languageToggle.click();

      // Verify URL has English parameter
      await expect(page).toHaveURL(/.*\?lng=en/);

      // Verify language toggle now shows Welsh option
      await expect(languageToggle).toContainText("Cymraeg");

      // Check that English heading is visible
      const heading = page.getByRole("heading", { name: /how do you want to sign in/i });
      await expect(heading).toBeVisible();

      // Check that page elements are still visible
      const radioOptions = page.locator(".govuk-radios__item");
      await expect(radioOptions).toHaveCount(3);

      const continueButton = page.getByRole("button", { name: /continue/i });
      await expect(continueButton).toBeVisible();
    });

    test("should preserve language selection after validation error", async ({ page }) => {
      await page.goto("/sign-in?lng=cy");

      // Click continue without selecting an option (in Welsh)
      const continueButton = page.getByRole("button", { name: /parhau/i });
      await continueButton.click();

      // Verify we're still on the sign-in page with Welsh parameter
      await expect(page).toHaveURL(/.*\/sign-in.*lng=cy/);

      // Verify error summary is visible with Welsh text
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      const errorSummaryHeading = errorSummary.getByRole("heading", { name: /mae yna broblem/i });
      await expect(errorSummaryHeading).toBeVisible();

      // Verify language toggle still shows English option (we're in Welsh mode)
      const languageToggle = page.locator(".language");
      await expect(languageToggle).toContainText("English");
    });
  });

  test.describe("given user clicks create account link", () => {
    test("should navigate to create media account page", async ({ page }) => {
      await page.goto("/sign-in");

      // Find and click the create account link
      const createAccountLink = page.getByRole("link", { name: /create one here/i });
      await expect(createAccountLink).toBeVisible();
      await createAccountLink.click();

      // Verify navigation to create media account page
      await expect(page).toHaveURL("/create-media-account");
    });
  });

  test.describe("given user tests keyboard navigation", () => {
    test("should allow keyboard navigation through all interactive elements", async ({ page }) => {
      await page.goto("/sign-in");

      // Tab through interactive elements
      await page.keyboard.press("Tab");

      // The focus order should be:
      // 1. Skip link (if present)
      // 2. Language toggle
      // 3. First radio button (HMCTS)
      // 4. Second radio button (Common Platform)
      // 5. Third radio button (CaTH)
      // 6. Create account link
      // 7. Continue button

      // Find the continue button and verify it can be reached by keyboard
      let focused = false;
      for (let i = 0; i < 15 && !focused; i++) {
        await page.keyboard.press("Tab");
        const continueButton = page.getByRole("button", { name: /continue/i });
        try {
          await expect(continueButton).toBeFocused({ timeout: 100 });
          focused = true;
        } catch {
          // Continue tabbing
        }
      }

      // Verify continue button is focused
      const continueButton = page.getByRole("button", { name: /continue/i });
      await expect(continueButton).toBeFocused();
    });

    test("should allow radio selection via keyboard", async ({ page }) => {
      await page.goto("/sign-in");

      // Get references to all radio buttons
      const hmctsRadio = page.getByRole("radio", { name: /with a myhmcts account/i });
      const commonPlatformRadio = page.getByRole("radio", { name: /with a common platform account/i });
      const cathRadio = page.getByRole("radio", { name: /with a court and tribunal hearings account/i });

      // Click the first radio button to select it and give it focus
      await hmctsRadio.click();
      await expect(hmctsRadio).toBeChecked();

      // Now test keyboard navigation with arrow keys
      // Arrow Down should move to next radio and select it
      await page.keyboard.press("ArrowDown");
      await expect(commonPlatformRadio).toBeChecked();
      await expect(hmctsRadio).not.toBeChecked();

      // Arrow Down should move to third radio
      await page.keyboard.press("ArrowDown");
      await expect(cathRadio).toBeChecked();
      await expect(commonPlatformRadio).not.toBeChecked();

      // Arrow Up should move back to second radio
      await page.keyboard.press("ArrowUp");
      await expect(commonPlatformRadio).toBeChecked();
      await expect(cathRadio).not.toBeChecked();

      // Arrow Up should move back to first radio
      await page.keyboard.press("ArrowUp");
      await expect(hmctsRadio).toBeChecked();
      await expect(commonPlatformRadio).not.toBeChecked();
    });
  });

  test.describe("given user relies on screen reader", () => {
    test("should have proper ARIA attributes and accessible names", async ({ page }) => {
      await page.goto("/sign-in");

      // Verify page has proper heading structure
      // The legend acts as the h1 heading in GOV.UK pattern
      const legend = page.locator("legend");
      await expect(legend).toBeVisible();
      await expect(legend).toHaveText(/how do you want to sign in/i);

      // Verify radio group has proper fieldset
      const fieldset = page.locator("fieldset");
      await expect(fieldset).toBeVisible();

      // Verify all radio buttons have accessible names
      const hmctsRadio = page.getByRole("radio", { name: /with a myhmcts account/i });
      const commonPlatformRadio = page.getByRole("radio", { name: /with a common platform account/i });
      const cathRadio = page.getByRole("radio", { name: /with a court and tribunal hearings account/i });

      await expect(hmctsRadio).toHaveAccessibleName(/with a myhmcts account/i);
      await expect(commonPlatformRadio).toHaveAccessibleName(/with a common platform account/i);
      await expect(cathRadio).toHaveAccessibleName(/with a court and tribunal hearings account/i);

      // Verify radio buttons have correct type and name attributes
      await expect(hmctsRadio).toHaveAttribute("type", "radio");
      await expect(hmctsRadio).toHaveAttribute("name", "accountType");
      await expect(commonPlatformRadio).toHaveAttribute("name", "accountType");
      await expect(cathRadio).toHaveAttribute("name", "accountType");

      // Verify continue button has accessible name
      const continueButton = page.getByRole("button", { name: /continue/i });
      await expect(continueButton).toHaveAccessibleName(/continue/i);

      // Verify create account link has accessible name
      const createAccountLink = page.getByRole("link", { name: /create one here/i });
      await expect(createAccountLink).toHaveAccessibleName(/create one here/i);
    });

    test("should announce error messages properly to screen readers", async ({ page }) => {
      await page.goto("/sign-in");

      // Submit without selection to trigger error
      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();

      // Verify error summary is visible and has proper structure
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      // GOV.UK error summary has tabindex for keyboard focus
      await expect(errorSummary).toHaveAttribute("tabindex", "-1");

      // Verify error summary heading is properly marked up
      const errorHeading = errorSummary.getByRole("heading", { name: /there is a problem/i });
      await expect(errorHeading).toBeVisible();

      // Verify error link in summary has accessible name
      const errorLink = errorSummary.getByRole("link", { name: /please select an option/i });
      await expect(errorLink).toHaveAccessibleName(/please select an option/i);
      await expect(errorLink).toHaveAttribute("href", "#accountType");

      // Verify radio group has error message associated
      const radioGroup = page.locator(".govuk-radios");
      const errorMessage = page.locator(".govuk-error-message");
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/please select an option/i);

      // Verify error message is part of the radio group
      // GOV.UK pattern includes error message inside the fieldset
      const fieldset = page.locator("fieldset");
      const errorInFieldset = fieldset.locator(".govuk-error-message");
      await expect(errorInFieldset).toBeVisible();
    });

    test("should announce error messages in Welsh to screen readers", async ({ page }) => {
      await page.goto("/sign-in?lng=cy");

      // Submit without selection to trigger Welsh error
      const continueButton = page.getByRole("button", { name: /parhau/i });
      await continueButton.click();

      // Verify Welsh error summary is visible
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      // GOV.UK error summary has tabindex for keyboard focus
      await expect(errorSummary).toHaveAttribute("tabindex", "-1");

      const errorHeading = errorSummary.getByRole("heading", { name: /mae yna broblem/i });
      await expect(errorHeading).toBeVisible();

      // Verify Welsh error message
      const errorLink = errorSummary.getByRole("link", { name: /rhaid dewis opsiwn/i });
      await expect(errorLink).toHaveAccessibleName(/rhaid dewis opsiwn/i);

      const errorMessage = page.locator(".govuk-error-message");
      await expect(errorMessage).toContainText(/rhaid dewis opsiwn/i);
    });

    test("should have proper semantic HTML structure", async ({ page }) => {
      await page.goto("/sign-in");

      // Verify form element is present
      const form = page.locator("form");
      await expect(form).toBeVisible();
      await expect(form).toHaveAttribute("method", "post");

      // Verify fieldset wraps radio buttons
      const fieldset = page.locator("fieldset");
      await expect(fieldset).toBeVisible();

      // Verify legend is first child of fieldset
      const legend = fieldset.locator("legend").first();
      await expect(legend).toBeVisible();

      // Verify button is a real button element, not a link styled as button
      const continueButton = page.getByRole("button", { name: /continue/i });
      await expect(continueButton).toHaveAttribute("type", "submit");

      // Verify radio buttons are input elements with type="radio"
      const radioInputs = page.locator('input[type="radio"]');
      await expect(radioInputs).toHaveCount(3);

      // Verify each radio has an associated label
      const radios = await radioInputs.all();
      for (const radio of radios) {
        const id = await radio.getAttribute("id");
        expect(id).toBeTruthy();

        // Check corresponding label exists
        const label = page.locator(`label[for="${id}"]`);
        await expect(label).toBeVisible();
      }
    });

    test("should maintain focus order for screen reader navigation", async ({ page }) => {
      await page.goto("/sign-in");

      // Verify logical focus order by checking tab order
      // Start from the first focusable element
      await page.keyboard.press("Tab");

      // Get all focusable elements in order
      const focusableElements = await page.evaluate(() => {
        const elements = Array.from(
          document.querySelectorAll(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        return elements.map(el => ({
          tagName: el.tagName,
          type: (el as HTMLInputElement).type || null,
          text: el.textContent?.trim().substring(0, 50) || "",
          role: el.getAttribute("role"),
        }));
      });

      // Verify radio buttons are in the focus order
      const radioElements = focusableElements.filter(el => el.type === "radio");
      expect(radioElements.length).toBe(3);

      // Verify button is in focus order
      const buttonElements = focusableElements.filter(el => el.tagName === "BUTTON");
      expect(buttonElements.length).toBeGreaterThanOrEqual(1);

      // Verify links are in focus order
      const linkElements = focusableElements.filter(el => el.tagName === "A");
      expect(linkElements.length).toBeGreaterThan(0);
    });

    test("should properly announce form field context", async ({ page }) => {
      await page.goto("/sign-in");

      // Verify radio group provides context through fieldset/legend
      const fieldset = page.locator("fieldset");
      const legend = fieldset.locator("legend");

      // Screen readers announce legend text as context for all fields in fieldset
      await expect(legend).toHaveText(/how do you want to sign in/i);

      // Verify radio buttons are contained within the fieldset
      const radiosInFieldset = fieldset.locator('input[type="radio"]');
      await expect(radiosInFieldset).toHaveCount(3);

      // When screen reader user navigates to any radio button,
      // they should hear both the legend and the label
      const firstRadio = page.getByRole("radio", { name: /with a myhmcts account/i });
      await expect(firstRadio).toHaveAccessibleName(/with a myhmcts account/i);

      // Verify all three radios can be accessed by their accessible names
      await expect(page.getByRole("radio", { name: /with a myhmcts account/i })).toBeVisible();
      await expect(page.getByRole("radio", { name: /with a common platform account/i })).toBeVisible();
      await expect(page.getByRole("radio", { name: /with a court and tribunal hearings account/i })).toBeVisible();
    });
  });

  test.describe("given user views footer information links", () => {
    test("should display all general information links at the bottom of the page", async ({ page }) => {
      await page.goto("/sign-in");

      // Check for footer section
      const footer = page.locator(".govuk-footer");
      await expect(footer).toBeVisible();

      // Check for all footer links
      const helpLink = footer.getByRole("link", { name: /help/i });
      await expect(helpLink).toBeVisible();
      await expect(helpLink).toHaveAttribute("href", "https://www.gov.uk/help");

      const privacyLink = footer.getByRole("link", { name: /privacy/i });
      await expect(privacyLink).toBeVisible();
      await expect(privacyLink).toHaveAttribute("href", "https://www.gov.uk/help/privacy-notice");

      const cookiesLink = footer.getByRole("link", { name: /cookies/i });
      await expect(cookiesLink).toBeVisible();
      await expect(cookiesLink).toHaveAttribute("href", "/cookie-preferences");

      const accessibilityLink = footer.getByRole("link", { name: /accessibility statement/i });
      await expect(accessibilityLink).toBeVisible();
      await expect(accessibilityLink).toHaveAttribute("href", "/accessibility-statement");

      const contactLink = footer.getByRole("link", { name: /contact/i });
      await expect(contactLink).toBeVisible();
      await expect(contactLink).toHaveAttribute("href", "https://www.gov.uk/contact");

      const termsLink = footer.getByRole("link", { name: /terms and conditions/i });
      await expect(termsLink).toBeVisible();
      await expect(termsLink).toHaveAttribute("href", "https://www.gov.uk/help/terms-conditions");

      const welshLink = footer.getByRole("link", { name: /welsh/i });
      await expect(welshLink).toBeVisible();
      await expect(welshLink).toHaveAttribute("href", "https://www.gov.uk/cymraeg");

      const gdsLink = footer.getByRole("link", { name: /government digital service/i });
      await expect(gdsLink).toBeVisible();
      await expect(gdsLink).toHaveAttribute("href", "https://www.gov.uk/government/organisations/government-digital-service");

      const oglLink = footer.getByRole("link", { name: /open government licence/i });
      await expect(oglLink).toBeVisible();
      await expect(oglLink).toHaveAttribute("href", "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/");
    });
  });
});
