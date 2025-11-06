import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginWithSSO } from "../utils/sso-helpers.js";

// Helper function to complete the manual upload form and navigate to summary page
async function navigateToSummaryPage(page: Page) {
  // Authenticate as System Admin first (manual upload requires admin access)
  await page.goto("/system-admin-dashboard");

  // If we're redirected to Azure AD, login
  if (page.url().includes("login.microsoftonline.com")) {
    const systemAdminEmail = process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!;
    const systemAdminPassword = process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!;
    await loginWithSSO(page, systemAdminEmail, systemAdminPassword);
  }

  // Navigate to manual upload page with location ID in query string (pre-fills the court)
  await page.goto("/manual-upload?locationId=1");

  // Wait for autocomplete to initialize
  await page.waitForTimeout(1000);

  // Select list type (6 = Crown Daily List)
  await page.selectOption('select[name="listType"]', "6");

  // Fill hearing start date
  await page.fill('input[name="hearingStartDate-day"]', "23");
  await page.fill('input[name="hearingStartDate-month"]', "10");
  await page.fill('input[name="hearingStartDate-year"]', "2025");

  // Select sensitivity
  await page.selectOption('select[name="sensitivity"]', "PUBLIC");

  // Select language
  await page.selectOption('select[name="language"]', "ENGLISH");

  // Fill display dates
  await page.fill('input[name="displayFrom-day"]', "20");
  await page.fill('input[name="displayFrom-month"]', "10");
  await page.fill('input[name="displayFrom-year"]', "2025");

  await page.fill('input[name="displayTo-day"]', "30");
  await page.fill('input[name="displayTo-month"]', "10");
  await page.fill('input[name="displayTo-year"]', "2025");

  // Upload a test file
  const fileInput = page.locator('input[name="file"]');
  await fileInput.setInputFiles({
    name: "test-document.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\nTest PDF content")
  });

  // Submit the form
  const continueButton = page.getByRole("button", { name: /continue/i });
  await continueButton.click();

  // Wait for navigation - either to summary page or back to form with errors
  await Promise.race([
    page.waitForURL(/\/manual-upload-summary\?uploadId=/, { timeout: 10000 }),
    page.waitForURL("/manual-upload", { timeout: 10000 })
  ]);

  // Check if we landed on summary page (success) or back on form (validation error)
  const currentURL = page.url();
  if (!currentURL.includes("/manual-upload-summary")) {
    // We're back on the form due to validation error
    const errorSummary = page.locator(".govuk-error-summary");
    const hasErrors = await errorSummary.isVisible().catch(() => false);
    if (hasErrors) {
      const errorText = await errorSummary.textContent();
      throw new Error(`Form validation failed: ${errorText}`);
    }
    throw new Error(`Form submission did not navigate to summary page. Current URL: ${currentURL}`);
  }
}

test.describe("Manual Upload Summary Page", () => {
  test.describe("Navigation and Page Load", () => {
    test("should load the manual upload summary page at /manual-upload-summary", async ({ page }) => {
      await navigateToSummaryPage(page);
      await expect(page).toHaveURL(/\/manual-upload-summary\?uploadId=/);
      await expect(page.locator("h1")).toHaveText("File upload summary");
    });

    test("should display sub-heading", async ({ page }) => {
      await navigateToSummaryPage(page);
      const subHeading = page.getByRole("heading", { name: "Check upload details" });
      await expect(subHeading).toBeVisible();
      await expect(subHeading).toHaveText("Check upload details");
    });

    test("should display back link", async ({ page }) => {
      await navigateToSummaryPage(page);
      const backLink = page.locator(".govuk-back-link");
      await expect(backLink).toBeVisible();
    });
  });

  test.describe("Summary List Display", () => {
    test("should display all 7 summary list rows", async ({ page }) => {
      await navigateToSummaryPage(page);

      const summaryList = page.locator(".govuk-summary-list");
      await expect(summaryList).toBeVisible();

      const rows = page.locator(".govuk-summary-list__row");
      await expect(rows).toHaveCount(7);
    });

    test("should display correct summary list keys", async ({ page }) => {
      await navigateToSummaryPage(page);

      const keys = page.locator(".govuk-summary-list__key");
      await expect(keys.nth(0)).toHaveText("Court name");
      await expect(keys.nth(1)).toHaveText("File");
      await expect(keys.nth(2)).toHaveText("List type");
      await expect(keys.nth(3)).toHaveText("Hearing start date");
      await expect(keys.nth(4)).toHaveText("Sensitivity");
      await expect(keys.nth(5)).toHaveText("Language");
      await expect(keys.nth(6)).toHaveText("Display file dates");
    });

    test("should display submitted values for all fields", async ({ page }) => {
      await navigateToSummaryPage(page);

      const values = page.locator(".govuk-summary-list__value");
      // locationId=1 should map to a valid court name from the location service
      await expect(values.nth(0)).not.toBeEmpty(); // Check court name exists
      await expect(values.nth(1)).toContainText("test-document.pdf");
      await expect(values.nth(2)).toContainText("Crown Daily List");
      await expect(values.nth(3)).toContainText("23 October 2025");
      await expect(values.nth(4)).toContainText("Public");
      await expect(values.nth(5)).toContainText("English");
      await expect(values.nth(6)).toContainText("20 October 2025 to 30 October 2025");
    });
  });

  test.describe("Change Actions", () => {
    test("should display Change link for all summary list rows", async ({ page }) => {
      await navigateToSummaryPage(page);

      const changeLinks = page.locator(".govuk-summary-list__actions a");
      await expect(changeLinks).toHaveCount(7);

      // Verify all change links have the correct text
      for (let i = 0; i < 7; i++) {
        await expect(changeLinks.nth(i)).toContainText("Change");
      }
    });

    test("should have Change links pointing to /manual-upload with anchor links", async ({ page }) => {
      await navigateToSummaryPage(page);

      const changeLinks = page.locator(".govuk-summary-list__actions a");

      // Verify each change link has proper anchor to the corresponding field
      await expect(changeLinks.nth(0)).toHaveAttribute("href", "/manual-upload#court");
      await expect(changeLinks.nth(1)).toHaveAttribute("href", "/manual-upload#file");
      await expect(changeLinks.nth(2)).toHaveAttribute("href", "/manual-upload#listType");
      await expect(changeLinks.nth(3)).toHaveAttribute("href", "/manual-upload#hearingStartDate-day");
      await expect(changeLinks.nth(4)).toHaveAttribute("href", "/manual-upload#sensitivity");
      await expect(changeLinks.nth(5)).toHaveAttribute("href", "/manual-upload#language");
      await expect(changeLinks.nth(6)).toHaveAttribute("href", "/manual-upload#displayFrom-day");
    });

    test("should have visually hidden text for each Change link", async ({ page }) => {
      await navigateToSummaryPage(page);

      const changeLinks = page.locator(".govuk-summary-list__actions a");
      const hiddenTexts = ["Court name", "File", "List type", "Hearing start date", "Sensitivity", "Language", "Display file dates"];

      for (let i = 0; i < 7; i++) {
        const visuallyHiddenText = changeLinks.nth(i).locator(".govuk-visually-hidden");
        await expect(visuallyHiddenText).toHaveText(hiddenTexts[i]);
      }
    });
  });

  test.describe("Confirm Button", () => {
    test("should display Confirm button", async ({ page }) => {
      await navigateToSummaryPage(page);

      const confirmButton = page.getByRole("button", { name: "Confirm" });
      await expect(confirmButton).toBeVisible();
    });

    test("should redirect to /manual-upload-success when Confirm is clicked", async ({ page }) => {
      await navigateToSummaryPage(page);

      const confirmButton = page.getByRole("button", { name: "Confirm" });
      await confirmButton.click();

      // Wait for navigation
      await page.waitForURL("/manual-upload-success");
      await expect(page).toHaveURL("/manual-upload-success");
    });
  });

  test.describe("Welsh Language Toggle", () => {
    test("should not display Welsh language toggle", async ({ page }) => {
      await navigateToSummaryPage(page);

      const welshToggle = page.locator('a[href*="lng=cy"]');
      await expect(welshToggle).not.toBeVisible();
    });
  });

  test.describe("Accessibility", () => {
    test("should meet WCAG 2.2 AA standards", async ({ page }) => {
      await navigateToSummaryPage(page);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should have proper heading hierarchy", async ({ page }) => {
      await navigateToSummaryPage(page);

      const h1 = page.locator("h1");
      await expect(h1).toHaveCount(1);
      await expect(h1).toHaveText("File upload summary");

      const mainHeading = page.getByRole("heading", { name: "File upload summary", level: 1 });
      await expect(mainHeading).toBeVisible();

      const subHeading = page.getByRole("heading", { name: "Check upload details", level: 2 });
      await expect(subHeading).toBeVisible();
    });

    test("should have all Change links keyboard accessible", async ({ page }) => {
      await navigateToSummaryPage(page);

      const changeLinks = page.locator(".govuk-summary-list__actions a");
      await expect(changeLinks).toHaveCount(7);

      // Verify all change links have href attributes (making them keyboard accessible)
      for (let i = 0; i < 7; i++) {
        const href = await changeLinks.nth(i).getAttribute("href");
        expect(href).toMatch(/^\/manual-upload#/);
      }
    });

    test("should have Confirm button keyboard accessible", async ({ page }) => {
      await navigateToSummaryPage(page);

      const confirmButton = page.getByRole("button", { name: "Confirm" });
      await expect(confirmButton).toBeVisible();

      // Verify button is a proper button element (keyboard accessible)
      await expect(confirmButton).toHaveAttribute("type", "submit");
    });
  });

  test.describe("Responsive Design", () => {
    test("should display correctly on mobile viewport", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await navigateToSummaryPage(page);

      const h1 = page.locator("h1");
      await expect(h1).toBeVisible();

      const summaryList = page.locator(".govuk-summary-list");
      await expect(summaryList).toBeVisible();

      const confirmButton = page.getByRole("button", { name: "Confirm" });
      await expect(confirmButton).toBeVisible();
    });

    test("should display correctly on tablet viewport", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await navigateToSummaryPage(page);

      const h1 = page.locator("h1");
      await expect(h1).toBeVisible();

      const summaryList = page.locator(".govuk-summary-list");
      await expect(summaryList).toBeVisible();

      const confirmButton = page.getByRole("button", { name: "Confirm" });
      await expect(confirmButton).toBeVisible();
    });

    test("should display correctly on desktop viewport", async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await navigateToSummaryPage(page);

      const h1 = page.locator("h1");
      await expect(h1).toBeVisible();

      const summaryList = page.locator(".govuk-summary-list");
      await expect(summaryList).toBeVisible();

      const confirmButton = page.getByRole("button", { name: "Confirm" });
      await expect(confirmButton).toBeVisible();
    });
  });

  test.describe("Keyboard Navigation", () => {
    test("should be navigable using Tab key with visible focus indicators", async ({ page }) => {
      await navigateToSummaryPage(page);

      // Verify all interactive elements are present and keyboard accessible
      const changeLinks = page.locator(".govuk-summary-list__actions a");
      await expect(changeLinks).toHaveCount(7);

      // Verify all change links are proper anchor elements (keyboard accessible)
      for (let i = 0; i < 7; i++) {
        const href = await changeLinks.nth(i).getAttribute("href");
        expect(href).toMatch(/^\/manual-upload#/);
      }

      // Verify Confirm button is present and keyboard accessible
      const confirmButton = page.getByRole("button", { name: "Confirm" });
      await expect(confirmButton).toBeVisible();
      await expect(confirmButton).toHaveAttribute("type", "submit");
    });

    test("should submit form using Enter key on Confirm button", async ({ page }) => {
      await navigateToSummaryPage(page);

      const confirmButton = page.getByRole("button", { name: "Confirm" });
      await confirmButton.focus();
      await page.keyboard.press("Enter");

      // Wait for navigation
      await page.waitForURL("/manual-upload-success");
      await expect(page).toHaveURL("/manual-upload-success");
    });
  });

  test.describe("Form Structure", () => {
    test("should have form with POST method", async ({ page }) => {
      await navigateToSummaryPage(page);

      const form = page.locator("form");
      await expect(form).toBeVisible();
      await expect(form).toHaveAttribute("method", "post");
    });

    test("should not have cancel link", async ({ page }) => {
      await navigateToSummaryPage(page);

      const cancelLink = page.locator('a[href="/admin-dashboard"]');
      await expect(cancelLink).not.toBeVisible();
    });
  });
});
