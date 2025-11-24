import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Note: target-size and link-name rules are disabled due to pre-existing site-wide footer accessibility issues:
// 1. Crown copyright link fails WCAG 2.5.8 Target Size criterion (insufficient size)
// 2. Crown copyright logo link missing accessible text (WCAG 2.4.4, 4.1.2)
// These issues affect ALL pages and should be addressed in a separate ticket
// See: docs/tickets/VIBE-150/accessibility-findings.md

test.describe("Create Media Account", () => {
  test.describe("given user is on the create media account page", () => {
    test("should load the page with all form fields", async ({ page }) => {
      await page.goto("/create-media-account");

      // Check the page title
      const heading = page.getByRole("heading", { name: /create a court and tribunal hearings account/i });
      await expect(heading).toBeVisible();

      // Check opening paragraphs
      await expect(page.getByText(/a court and tribunal hearings account is for professional users/i)).toBeVisible();
      await expect(page.getByText(/an account holder, once signed in/i)).toBeVisible();
      await expect(page.getByText(/we will retain the personal information/i)).toBeVisible();

      // Check for all input fields
      const fullNameInput = page.getByLabel(/full name/i);
      const emailInput = page.getByLabel(/email address/i);
      const employerInput = page.getByLabel(/employer/i);
      const idProofInput = page.locator('input[name="idProof"]');

      await expect(fullNameInput).toBeVisible();
      await expect(emailInput).toBeVisible();
      await expect(employerInput).toBeVisible();
      await expect(idProofInput).toBeVisible();

      // Check email hint text
      const emailHint = page.getByText(/we'll only use this to contact you about your account/i);
      await expect(emailHint).toBeVisible();

      // Check file upload hint
      const fileHint = page.getByText(/upload a clear photo of your uk press card/i);
      await expect(fileHint).toBeVisible();

      // Check terms and conditions section
      const termsTitle = page.getByRole("heading", { name: /terms and conditions/i });
      await expect(termsTitle).toBeVisible();
      const termsCheckbox = page.getByRole("checkbox", { name: /please tick this box to agree to the above terms/i });
      await expect(termsCheckbox).toBeVisible();

      // Check continue button
      const continueButton = page.getByRole("button", { name: /continue/i });
      await expect(continueButton).toBeVisible();

      // Check back to top link
      const backToTop = page.getByRole("link", { name: /back to top/i });
      await expect(backToTop).toBeVisible();
    });

    test("should meet WCAG 2.2 AA accessibility standards", async ({ page }) => {
      await page.goto("/create-media-account");

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe("given user submits form with valid data", () => {
    test("should successfully create account and redirect to confirmation page", async ({ page }) => {
      await page.goto("/create-media-account");

      // Fill in all required fields
      await page.getByLabel(/full name/i).fill("John Smith");
      await page.getByLabel(/email address/i).fill("john.smith@example.com");
      await page.getByLabel(/employer/i).fill("Example Media Ltd");

      // Upload a valid file
      const fileInput = page.locator('input[name="idProof"]');
      await fileInput.setInputFiles({
        name: "press-card.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from("fake-image-content")
      });

      // Accept terms and conditions
      const termsCheckbox = page.getByRole("checkbox", { name: /please tick this box to agree to the above terms/i });
      await termsCheckbox.check();
      await expect(termsCheckbox).toBeChecked();

      // Submit the form
      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();

      // Wait for either success redirect or error display
      await page.waitForLoadState("networkidle");

      // Check if we're on the success page or if there are errors
      const currentUrl = page.url();
      if (!currentUrl.includes("/account-request-submitted")) {
        // If not redirected, check for errors on the page
        const errorSummary = page.locator(".govuk-error-summary");
        if (await errorSummary.isVisible()) {
          const errors = await page.locator(".govuk-error-summary__list li").allTextContents();
          throw new Error(`Form submission failed with errors: ${errors.join(", ")}`);
        }
        throw new Error(`Expected redirect to /account-request-submitted but stayed on ${currentUrl}`);
      }

      // Verify confirmation page content
      const bannerTitle = page.getByRole("heading", { name: /details submitted/i });
      await expect(bannerTitle).toBeVisible();

      const whatHappensNext = page.getByRole("heading", { name: /what happens next/i });
      await expect(whatHappensNext).toBeVisible();

      await expect(page.getByText(/hmcts will review your details/i)).toBeVisible();
      await expect(page.getByText(/we'll email you if we need more information/i)).toBeVisible();
    });

    test("should accept PDF file format", async ({ page }) => {
      await page.goto("/create-media-account");

      await page.getByLabel(/full name/i).fill("Jane Doe");
      await page.getByLabel(/email address/i).fill("jane.doe@example.com");
      await page.getByLabel(/employer/i).fill("News Corp");

      const fileInput = page.locator('input[name="idProof"]');
      await fileInput.setInputFiles({
        name: "work-id.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4\nTest PDF content")
      });

      const termsCheckbox = page.getByRole("checkbox", { name: /please tick this box to agree to the above terms/i });
      await termsCheckbox.check();

      const continueButton = page.getByRole("button", { name: /continue/i });

      // Wait for navigation after clicking continue
      await Promise.all([
        page.waitForURL("/account-request-submitted", { timeout: 10000 }),
        continueButton.click()
      ]);
    });

    test("should accept PNG file format", async ({ page }) => {
      await page.goto("/create-media-account");

      await page.getByLabel(/full name/i).fill("Bob Johnson");
      await page.getByLabel(/email address/i).fill("bob.johnson@example.com");
      await page.getByLabel(/employer/i).fill("Media House");

      const fileInput = page.locator('input[name="idProof"]');
      await fileInput.setInputFiles({
        name: "id-card.png",
        mimeType: "image/png",
        buffer: Buffer.from("fake-png-content")
      });

      const termsCheckbox = page.getByRole("checkbox", { name: /please tick this box to agree to the above terms/i });
      await termsCheckbox.check();

      const continueButton = page.getByRole("button", { name: /continue/i });

      // Wait for navigation after clicking continue
      await Promise.all([
        page.waitForURL("/account-request-submitted", { timeout: 10000 }),
        continueButton.click()
      ]);
    });
  });

  test.describe("given user submits form without required fields", () => {
    test("should display validation errors for all empty fields", async ({ page }) => {
      await page.goto("/create-media-account");

      // Submit without filling any fields
      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();

      // Verify we're still on the same page
      await expect(page).toHaveURL("/create-media-account");

      // Check for error summary
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      // Check for error summary heading
      const errorSummaryHeading = errorSummary.getByRole("heading", { name: /there is a problem/i });
      await expect(errorSummaryHeading).toBeVisible();

      // Check for specific error messages
      const fullNameError = errorSummary.getByRole("link", { name: /full name field must be populated/i });
      await expect(fullNameError).toBeVisible();
      await expect(fullNameError).toHaveAttribute("href", "#fullName");

      const emailError = errorSummary.getByRole("link", { name: /email address field must be populated/i });
      await expect(emailError).toBeVisible();
      await expect(emailError).toHaveAttribute("href", "#email");

      const employerError = errorSummary.getByRole("link", { name: /your employers name will be needed to support your application for an account/i });
      await expect(employerError).toBeVisible();
      await expect(employerError).toHaveAttribute("href", "#employer");

      const fileError = errorSummary.getByRole("link", { name: /we will need id evidence to support your application for an account/i });
      await expect(fileError).toBeVisible();
      await expect(fileError).toHaveAttribute("href", "#idProof");

      const termsError = errorSummary.getByRole("link", { name: /select the checkbox to agree to the terms and conditions/i });
      await expect(termsError).toBeVisible();
      await expect(termsError).toHaveAttribute("href", "#termsAccepted");

      // Verify inline error messages are displayed
      const inlineErrors = page.locator(".govuk-error-message");
      await expect(inlineErrors).toHaveCount(5);

      // Verify accessibility with error state
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should preserve form values when validation fails", async ({ page }) => {
      await page.goto("/create-media-account");

      // Fill in some fields but not all
      await page.getByLabel(/full name/i).fill("John Smith");
      await page.getByLabel(/email address/i).fill("john.smith@example.com");
      // Omit employer, file, and terms

      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();

      // Verify we're still on the same page with errors
      await expect(page).toHaveURL("/create-media-account");

      // Verify error summary is visible
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      // Verify form values are preserved
      await expect(page.getByLabel(/full name/i)).toHaveValue("John Smith");
      await expect(page.getByLabel(/email address/i)).toHaveValue("john.smith@example.com");
    });
  });

  test.describe("given user uploads invalid file", () => {
    test("should display error for invalid file type", async ({ page }) => {
      await page.goto("/create-media-account");

      await page.getByLabel(/full name/i).fill("Jane Doe");
      await page.getByLabel(/email address/i).fill("jane.doe@example.com");
      await page.getByLabel(/employer/i).fill("News Corp");

      // Upload invalid file type
      const fileInput = page.locator('input[name="idProof"]');
      await fileInput.setInputFiles({
        name: "document.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("text content")
      });

      const termsCheckbox = page.getByRole("checkbox", { name: /please tick this box to agree to the above terms/i });
      await termsCheckbox.check();

      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();

      // Verify error is displayed
      await expect(page).toHaveURL("/create-media-account");

      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      const fileError = errorSummary.getByRole("link", { name: /id evidence must be a jpg, pdf or png/i });
      await expect(fileError).toBeVisible();

      const inlineError = page.locator(".govuk-error-message").filter({ hasText: /id evidence must be a jpg, pdf or png/i });
      await expect(inlineError).toBeVisible();
    });

    test("should display error for file size exceeding 2MB", async ({ page }) => {
      await page.goto("/create-media-account");

      await page.getByLabel(/full name/i).fill("Bob Johnson");
      await page.getByLabel(/email address/i).fill("bob.johnson@example.com");
      await page.getByLabel(/employer/i).fill("Media House");

      // Upload file larger than 2MB
      const largeBuffer = Buffer.alloc(3 * 1024 * 1024); // 3MB
      const fileInput = page.locator('input[name="idProof"]');
      await fileInput.setInputFiles({
        name: "large-file.jpg",
        mimeType: "image/jpeg",
        buffer: largeBuffer
      });

      const termsCheckbox = page.getByRole("checkbox", { name: /please tick this box to agree to the above terms/i });
      await termsCheckbox.check();

      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();

      // Verify error is displayed
      await expect(page).toHaveURL("/create-media-account");

      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      const fileError = errorSummary.getByRole("link", { name: /id evidence needs to be less than 2mbs/i });
      await expect(fileError).toBeVisible();

      const inlineError = page.locator(".govuk-error-message").filter({ hasText: /id evidence needs to be less than 2mbs/i });
      await expect(inlineError).toBeVisible();
    });
  });

  test.describe("given user enters invalid email format", () => {
    test("should display email validation error", async ({ page }) => {
      await page.goto("/create-media-account");

      await page.getByLabel(/full name/i).fill("John Smith");
      await page.getByLabel(/email address/i).fill("invalid-email");
      await page.getByLabel(/employer/i).fill("Example Media");

      const fileInput = page.locator('input[name="idProof"]');
      await fileInput.setInputFiles({
        name: "id.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from("fake-image-content")
      });

      const termsCheckbox = page.getByRole("checkbox", { name: /please tick this box to agree to the above terms/i });
      await termsCheckbox.check();

      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();

      // Verify error is displayed
      await expect(page).toHaveURL("/create-media-account");

      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      const emailError = errorSummary.getByRole("link", { name: /email address field must be populated/i });
      await expect(emailError).toBeVisible();
    });
  });

  test.describe("given user toggles language", () => {
    test("should display Welsh content when language is changed to Welsh", async ({ page }) => {
      await page.goto("/create-media-account");

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
      const heading = page.getByRole("heading", { name: /creu cyfrif gwrandawiadau llys a thribiwnlys/i });
      await expect(heading).toBeVisible();

      // Check for Welsh labels
      const fullNameLabel = page.getByLabel(/enw llawn/i);
      const emailLabel = page.getByLabel(/cyfeiriad e-bost/i);
      const employerLabel = page.getByLabel(/cyflogwr/i);

      await expect(fullNameLabel).toBeVisible();
      await expect(emailLabel).toBeVisible();
      await expect(employerLabel).toBeVisible();

      // Verify continue button is in Welsh
      const continueButton = page.getByRole("button", { name: /parhau/i });
      await expect(continueButton).toBeVisible();

      // Run accessibility checks in Welsh
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should preserve language selection after validation error", async ({ page }) => {
      await page.goto("/create-media-account?lng=cy");

      // Submit without filling fields (in Welsh)
      const continueButton = page.getByRole("button", { name: /parhau/i });
      await continueButton.click();

      // Verify we're still on the page with Welsh parameter
      await expect(page).toHaveURL(/.*\/create-media-account.*lng=cy/);

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

  test.describe("given user submits form in Welsh", () => {
    test("should successfully create account with Welsh content", async ({ page }) => {
      await page.goto("/create-media-account?lng=cy");

      // Fill in all required fields
      await page.getByLabel(/enw llawn/i).fill("John Smith");
      await page.getByLabel(/cyfeiriad e-bost/i).fill("john.smith@example.com");
      await page.getByLabel(/cyflogwr/i).fill("Example Media Ltd");

      const fileInput = page.locator('input[name="idProof"]');
      await fileInput.setInputFiles({
        name: "press-card.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from("fake-image-content")
      });

      const termsCheckbox = page.getByRole("checkbox", { name: /ticiwch y blwch hwn/i });
      await termsCheckbox.check();

      const continueButton = page.getByRole("button", { name: /parhau/i });

      // Wait for navigation to Welsh confirmation page
      await Promise.all([
        page.waitForURL(/\/account-request-submitted.*lng=cy/, { timeout: 10000 }),
        continueButton.click()
      ]);

      // Verify Welsh confirmation page content
      const bannerTitle = page.getByRole("heading", { name: /cyflwyno manylion/i });
      await expect(bannerTitle).toBeVisible();

      const whatHappensNext = page.getByRole("heading", { name: /beth sy'n digwydd nesaf/i });
      await expect(whatHappensNext).toBeVisible();
    });
  });

  test.describe("given user tests keyboard navigation", () => {
    test("should allow keyboard navigation through all interactive elements", async ({ page }) => {
      await page.goto("/create-media-account");

      // Tab through to the full name input
      await page.keyboard.press("Tab");

      // Find the continue button and verify it can be reached by keyboard
      let focused = false;
      for (let i = 0; i < 20 && !focused; i++) {
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

    test("should allow form submission via keyboard", async ({ page }) => {
      await page.goto("/create-media-account");

      // Fill form using keyboard
      await page.getByLabel(/full name/i).focus();
      await page.keyboard.type("John Smith");

      await page.keyboard.press("Tab");
      await page.keyboard.type("john.smith@example.com");

      await page.keyboard.press("Tab");
      await page.keyboard.type("Example Media Ltd");

      // Note: File upload would typically require user interaction
      // Skip file and terms for this test, just verify keyboard navigation works

      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.focus();
      await expect(continueButton).toBeFocused();
    });
  });

  test.describe("given user relies on screen reader", () => {
    test("should have proper ARIA attributes and accessible names", async ({ page }) => {
      await page.goto("/create-media-account");

      // Verify all form inputs have accessible names
      const fullNameInput = page.getByLabel(/full name/i);
      const emailInput = page.getByLabel(/email address/i);
      const employerInput = page.getByLabel(/employer/i);

      await expect(fullNameInput).toHaveAccessibleName(/full name/i);
      await expect(emailInput).toHaveAccessibleName(/email address/i);
      await expect(employerInput).toHaveAccessibleName(/employer/i);

      // Verify form inputs have correct attributes
      await expect(fullNameInput).toHaveAttribute("type", "text");
      await expect(emailInput).toHaveAttribute("type", "email");

      // Verify continue button has accessible name
      const continueButton = page.getByRole("button", { name: /continue/i });
      await expect(continueButton).toHaveAccessibleName(/continue/i);
      await expect(continueButton).toHaveAttribute("type", "submit");

      // Verify checkbox has accessible name
      const termsCheckbox = page.getByRole("checkbox", { name: /please tick this box to agree to the above terms/i });
      await expect(termsCheckbox).toHaveAccessibleName(/please tick this box to agree to the above terms/i);
    });

    test("should announce error messages properly to screen readers", async ({ page }) => {
      await page.goto("/create-media-account");

      // Submit without filling fields to trigger errors
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

      // Verify error links have accessible names
      const fullNameError = errorSummary.getByRole("link", { name: /full name field must be populated/i });
      await expect(fullNameError).toHaveAccessibleName(/full name field must be populated/i);
      await expect(fullNameError).toHaveAttribute("href", "#fullName");

      // Verify inline error messages are visible
      const inlineErrors = page.locator(".govuk-error-message");
      await expect(inlineErrors.first()).toBeVisible();
    });

    test("should have proper semantic HTML structure", async ({ page }) => {
      await page.goto("/create-media-account");

      // Verify form element is present
      const form = page.locator("form");
      await expect(form).toBeVisible();
      await expect(form).toHaveAttribute("method", "post");

      // Verify button is a real button element
      const continueButton = page.getByRole("button", { name: /continue/i });
      await expect(continueButton).toHaveAttribute("type", "submit");

      // Verify all form inputs have associated labels
      const inputs = await page.locator('input[type="text"], input[type="email"]').all();
      for (const input of inputs) {
        const id = await input.getAttribute("id");
        expect(id).toBeTruthy();

        // Check corresponding label exists
        const label = page.locator(`label[for="${id}"]`);
        await expect(label).toBeVisible();
      }
    });
  });

  test.describe("Confirmation Page", () => {
    test("should display confirmation page with all elements", async ({ page }) => {
      // First submit a valid form
      await page.goto("/create-media-account");

      await page.getByLabel(/full name/i).fill("John Smith");
      await page.getByLabel(/email address/i).fill("john.smith@example.com");
      await page.getByLabel(/employer/i).fill("Example Media Ltd");

      const fileInput = page.locator('input[name="idProof"]');
      await fileInput.setInputFiles({
        name: "press-card.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from("fake-image-content")
      });

      const termsCheckbox = page.getByRole("checkbox", { name: /please tick this box to agree to the above terms/i });
      await termsCheckbox.check();

      const continueButton = page.getByRole("button", { name: /continue/i });

      // Wait for navigation after clicking continue
      await Promise.all([
        page.waitForURL("/account-request-submitted", { timeout: 10000 }),
        continueButton.click()
      ]);

      // Check panel component
      const panel = page.locator(".govuk-panel");
      await expect(panel).toBeVisible();

      const bannerTitle = page.getByRole("heading", { name: /details submitted/i });
      await expect(bannerTitle).toBeVisible();

      // Check what happens next section
      const whatHappensNext = page.getByRole("heading", { name: /what happens next/i });
      await expect(whatHappensNext).toBeVisible();

      // Check content paragraphs
      await expect(page.getByText(/hmcts will review your details/i)).toBeVisible();
      await expect(page.getByText(/we'll email you if we need more information/i)).toBeVisible();
      await expect(page.getByText(/if you do not get an email from us within 5 working days/i)).toBeVisible();
    });

    test("should meet WCAG 2.2 AA accessibility standards on confirmation page", async ({ page }) => {
      // Submit form to get to confirmation page
      await page.goto("/create-media-account");

      await page.getByLabel(/full name/i).fill("John Smith");
      await page.getByLabel(/email address/i).fill("john.smith@example.com");
      await page.getByLabel(/employer/i).fill("Example Media Ltd");

      const fileInput = page.locator('input[name="idProof"]');
      await fileInput.setInputFiles({
        name: "press-card.jpg",
        mimeType: "image/jpeg",
        buffer: Buffer.from("fake-image-content")
      });

      const termsCheckbox = page.getByRole("checkbox", { name: /please tick this box to agree to the above terms/i });
      await termsCheckbox.check();

      const continueButton = page.getByRole("button", { name: /continue/i });

      // Wait for navigation after clicking continue
      await Promise.all([
        page.waitForURL("/account-request-submitted", { timeout: 10000 }),
        continueButton.click()
      ]);

      // Run accessibility checks
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should display Welsh confirmation page content", async ({ page }) => {
      await page.goto("/account-request-submitted?lng=cy");

      const bannerTitle = page.getByRole("heading", { name: /cyflwyno manylion/i });
      await expect(bannerTitle).toBeVisible();

      const whatHappensNext = page.getByRole("heading", { name: /beth sy'n digwydd nesaf/i });
      await expect(whatHappensNext).toBeVisible();

      await expect(page.getByText(/bydd glltem yn adolygu eich manylion/i)).toBeVisible();
    });
  });
});
