import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { loginWithSSO } from "../utils/sso-helpers.js";
import {
  cleanupTestNotifications,
  cleanupTestSubscriptions,
  cleanupTestUsers,
  createTestSubscription,
  createTestUser,
  getNotificationsByPublicationId,
  getNotificationsBySubscriptionId
} from "../utils/notification-helpers.js";

// Note: target-size and link-name rules are disabled due to pre-existing site-wide footer accessibility issues:
// 1. Crown copyright link fails WCAG 2.5.8 Target Size criterion (insufficient size)
// 2. Crown copyright logo link missing accessible text (WCAG 2.4.4, 4.1.2)
// These issues affect ALL pages and should be addressed in a separate ticket
// See: docs/tickets/VIBE-150/accessibility-findings.md

// Helper function to authenticate as System Admin
async function authenticateSystemAdmin(page: Page) {
  await page.goto("/system-admin-dashboard");

  if (page.url().includes("login.microsoftonline.com")) {
    const systemAdminEmail = process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!;
    const systemAdminPassword = process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!;
    await loginWithSSO(page, systemAdminEmail, systemAdminPassword);
  }
}

// Helper function to navigate to summary page by completing the upload form
async function navigateToSummaryPage(page: Page) {
  await authenticateSystemAdmin(page);
  await page.goto("/manual-upload?locationId=9001");
  await page.waitForTimeout(1000);

  await page.selectOption('select[name="listType"]', "6");
  await page.fill('input[name="hearingStartDate-day"]', "23");
  await page.fill('input[name="hearingStartDate-month"]', "10");
  await page.fill('input[name="hearingStartDate-year"]', "2025");
  await page.selectOption('select[name="sensitivity"]', "PUBLIC");
  await page.selectOption('select[name="language"]', "ENGLISH");
  await page.fill('input[name="displayFrom-day"]', "20");
  await page.fill('input[name="displayFrom-month"]', "10");
  await page.fill('input[name="displayFrom-year"]', "2025");
  await page.fill('input[name="displayTo-day"]', "30");
  await page.fill('input[name="displayTo-month"]', "10");
  await page.fill('input[name="displayTo-year"]', "2025");

  const fileInput = page.locator('input[name="file"]');
  await fileInput.setInputFiles({
    name: "test-document.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\nTest PDF content")
  });

  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForURL(/\/manual-upload-summary\?uploadId=/, { timeout: 10000 });
}

// Helper function to complete the full manual upload flow and reach success page
async function completeManualUploadFlow(page: Page) {
  await navigateToSummaryPage(page);
  await page.getByRole("button", { name: "Confirm" }).click();
  await page.waitForURL("/manual-upload-success", { timeout: 10000 });
}

test.describe("Manual Upload End-to-End Flow", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateSystemAdmin(page);
  });

  test.describe("Complete End-to-End Journey", () => {
    test("should be keyboard accessible throughout entire upload flow", async ({ page }) => {
      // Step 1: Test keyboard accessibility on form page
      await page.goto("/manual-upload?locationId=9001");
      await page.waitForTimeout(1000);

      const fileInput = page.locator('input[name="file"]');
      await fileInput.click();
      await expect(fileInput).toBeFocused();

      await page.keyboard.press("Tab");
      const focusedElement = page.locator(":focus");
      await expect(focusedElement).toBeVisible();

      // Step 2: Fill form and submit
      await page.selectOption('select[name="listType"]', "6");
      await page.fill('input[name="hearingStartDate-day"]', "23");
      await page.fill('input[name="hearingStartDate-month"]', "10");
      await page.fill('input[name="hearingStartDate-year"]', "2025");
      await page.selectOption('select[name="sensitivity"]', "PUBLIC");
      await page.selectOption('select[name="language"]', "ENGLISH");
      await page.fill('input[name="displayFrom-day"]', "20");
      await page.fill('input[name="displayFrom-month"]', "10");
      await page.fill('input[name="displayFrom-year"]', "2025");
      await page.fill('input[name="displayTo-day"]', "30");
      await page.fill('input[name="displayTo-month"]', "10");
      await page.fill('input[name="displayTo-year"]', "2025");

      await fileInput.setInputFiles({
        name: "test-keyboard.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4\nTest keyboard content")
      });

      await page.getByRole("button", { name: /continue/i }).click();
      await page.waitForURL(/\/manual-upload-summary\?uploadId=/, { timeout: 10000 });

      // Step 3: Test keyboard accessibility on summary page
      const changeLinks = page.locator(".govuk-summary-list__actions a");
      await expect(changeLinks).toHaveCount(7);

      for (let i = 0; i < 7; i++) {
        const href = await changeLinks.nth(i).getAttribute("href");
        expect(href).toMatch(/^\/manual-upload#/);
      }

      const confirmButton = page.getByRole("button", { name: "Confirm" });
      await expect(confirmButton).toBeVisible();
      await expect(confirmButton).toHaveAttribute("type", "submit");

      await confirmButton.focus();
      await page.keyboard.press("Enter");
      await page.waitForURL("/manual-upload-success", { timeout: 10000 });

      // Step 4: Test keyboard accessibility on success page
      const links = page.locator(".govuk-list a");
      await expect(links).toHaveCount(3);

      for (let i = 0; i < 3; i++) {
        const href = await links.nth(i).getAttribute("href");
        expect(href).toBeTruthy();
      }

      for (let i = 0; i < 3; i++) {
        const link = links.nth(i);
        await link.focus();
        await expect(link).toBeFocused();
      }

      const uploadLink = page.getByRole("link", { name: "Upload another file" });
      await uploadLink.focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL("/manual-upload");
    });

    test("should complete full upload flow from form to success", async ({ page }) => {
      // Step 1: Load manual upload form
      await page.goto("/manual-upload?locationId=9001");
      await page.waitForTimeout(1000);
      await expect(page).toHaveTitle("Upload - Manual upload - Court and tribunal hearings - GOV.UK");

      // Step 2: Fill out the form
      await page.selectOption('select[name="listType"]', "6");
      await page.fill('input[name="hearingStartDate-day"]', "23");
      await page.fill('input[name="hearingStartDate-month"]', "10");
      await page.fill('input[name="hearingStartDate-year"]', "2025");
      await page.selectOption('select[name="sensitivity"]', "PUBLIC");
      await page.selectOption('select[name="language"]', "ENGLISH");
      await page.fill('input[name="displayFrom-day"]', "20");
      await page.fill('input[name="displayFrom-month"]', "10");
      await page.fill('input[name="displayFrom-year"]', "2025");
      await page.fill('input[name="displayTo-day"]', "30");
      await page.fill('input[name="displayTo-month"]', "10");
      await page.fill('input[name="displayTo-year"]', "2025");

      const fileInput = page.locator('input[name="file"]');
      await fileInput.setInputFiles({
        name: "test-hearing-list.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4\nTest hearing list content")
      });

      // Step 3: Submit form and verify navigation to summary
      await page.getByRole("button", { name: /continue/i }).click();
      await page.waitForURL(/\/manual-upload-summary\?uploadId=/, { timeout: 10000 });
      await expect(page.locator("h1")).toHaveText("File upload summary");

      // Step 4: Verify summary page displays correct data
      const values = page.locator(".govuk-summary-list__value");
      await expect(values.nth(1)).toContainText("test-hearing-list.pdf");
      await expect(values.nth(2)).toContainText("Crown Daily List");
      await expect(values.nth(3)).toContainText("23 October 2025");
      await expect(values.nth(4)).toContainText("Public");
      await expect(values.nth(5)).toContainText("English");
      await expect(values.nth(6)).toContainText("20 October 2025 to 30 October 2025");

      // Step 5: Confirm upload and navigate to success page
      await page.getByRole("button", { name: "Confirm" }).click();
      await page.waitForURL("/manual-upload-success", { timeout: 10000 });

      // Step 6: Verify success page content
      const successPanel = page.locator(".govuk-panel");
      await expect(successPanel).toBeVisible();
      const title = page.locator(".govuk-panel__title");
      await expect(title).toHaveText("File upload successful");
      await expect(successPanel).toContainText("Your file has been uploaded");

      // Step 7: Verify next steps are available
      const uploadLink = page.getByRole("link", { name: "Upload another file" });
      await expect(uploadLink).toBeVisible();
    });
  });

  test.describe("Manual Upload Form Page", () => {
    test("should load the page with all form fields and accessibility compliance", async ({ page }) => {
      await page.goto("/manual-upload");

      await expect(page).toHaveTitle("Upload - Manual upload - Court and tribunal hearings - GOV.UK");

      const heading = page.getByRole("heading", { name: /manual upload/i });
      await expect(heading).toBeVisible();

      const warningTitle = page.getByText(/warning/i);
      await expect(warningTitle).toBeVisible();

      const fileUpload = page.locator('input[name="file"]');
      await expect(fileUpload).toBeVisible();

      const courtInput = page.getByRole("combobox", { name: /court name or tribunal name/i });
      await courtInput.waitFor({ state: "visible", timeout: 10000 });
      await expect(courtInput).toBeVisible();

      const listTypeSelect = page.locator('select[name="listType"]');
      await expect(listTypeSelect).toBeVisible();

      const hearingDateDay = page.locator('input[name="hearingStartDate-day"]');
      const hearingDateMonth = page.locator('input[name="hearingStartDate-month"]');
      const hearingDateYear = page.locator('input[name="hearingStartDate-year"]');
      await expect(hearingDateDay).toBeVisible();
      await expect(hearingDateMonth).toBeVisible();
      await expect(hearingDateYear).toBeVisible();

      const sensitivitySelect = page.locator('select[name="sensitivity"]');
      await expect(sensitivitySelect).toBeVisible();

      const languageSelect = page.locator('select[name="language"]');
      await expect(languageSelect).toBeVisible();

      const displayFromDay = page.locator('input[name="displayFrom-day"]');
      const displayFromMonth = page.locator('input[name="displayFrom-month"]');
      const displayFromYear = page.locator('input[name="displayFrom-year"]');
      await expect(displayFromDay).toBeVisible();
      await expect(displayFromMonth).toBeVisible();
      await expect(displayFromYear).toBeVisible();

      const displayToDay = page.locator('input[name="displayTo-day"]');
      const displayToMonth = page.locator('input[name="displayTo-month"]');
      const displayToYear = page.locator('input[name="displayTo-year"]');
      await expect(displayToDay).toBeVisible();
      await expect(displayToMonth).toBeVisible();
      await expect(displayToYear).toBeVisible();

      const continueButton = page.getByRole("button", { name: /continue/i });
      await expect(continueButton).toBeVisible();

      const languageToggle = page.locator(".language");
      await expect(languageToggle).not.toBeVisible();

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();

      if (accessibilityScanResults.violations.length > 0) {
        console.log("Accessibility violations found:");
        accessibilityScanResults.violations.forEach((violation) => {
          console.log(`- ${violation.id}: ${violation.description}`);
          console.log(`  Impact: ${violation.impact}`);
          console.log(`  Affected nodes: ${violation.nodes.length}`);
          violation.nodes.forEach((node) => {
            console.log(`    ${node.target}`);
          });
        });
      }

      expect(accessibilityScanResults.violations).toEqual([]);

      const fileInset = page.locator(".govuk-inset-text").nth(0);
      const listTypeInset = page.locator(".govuk-inset-text").nth(1);

      await expect(fileInset).toBeVisible();
      await expect(listTypeInset).toBeVisible();

      const fileUploadInInset = fileInset.locator('input[name="file"]');
      await expect(fileUploadInInset).toBeVisible();

      const listTypeInInset = listTypeInset.locator('select[name="listType"]');
      const hearingDateInInset = listTypeInset.locator('input[name="hearingStartDate-day"]');
      await expect(listTypeInInset).toBeVisible();
      await expect(hearingDateInInset).toBeVisible();

      const pageHelpTitle = page.getByText(/page help/i);
      await expect(pageHelpTitle).toBeVisible();

      const listsHelp = page.getByText(/lists/i).first();
      const sensitivityHelp = page.getByText(/sensitivity/i).first();
      const displayFromHelp = page.getByText(/display from/i).first();
      const displayToHelp = page.getByText(/display to/i).first();

      await expect(listsHelp).toBeVisible();
      await expect(sensitivityHelp).toBeVisible();
      await expect(displayFromHelp).toBeVisible();
      await expect(displayToHelp).toBeVisible();
    });

    test("should validate form fields and file requirements", async ({ page }) => {
      // Test empty form validation
      await page.goto("/manual-upload");

      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();

      await expect(page).toHaveURL("/manual-upload");

      let errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      const errorSummaryHeading = errorSummary.getByRole("heading", { name: /there is a problem/i });
      await expect(errorSummaryHeading).toBeVisible();

      const errorLinks = errorSummary.locator(".govuk-error-summary__list a");
      const errorCount = await errorLinks.count();
      expect(errorCount).toBeGreaterThan(0);

      let fileErrorMessage = page.locator("#file").locator("..").locator(".govuk-error-message");
      await expect(fileErrorMessage).toBeVisible();

      // Test accessibility with error state
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);

      // Test invalid file type validation
      await page.goto("/manual-upload?locationId=9001");
      await page.waitForTimeout(1000);

      await page.selectOption('select[name="listType"]', "1");
      await page.fill('input[name="hearingStartDate-day"]', "15");
      await page.fill('input[name="hearingStartDate-month"]', "06");
      await page.fill('input[name="hearingStartDate-year"]', "2025");
      await page.selectOption('select[name="sensitivity"]', "PUBLIC");
      await page.selectOption('select[name="language"]', "ENGLISH");
      await page.fill('input[name="displayFrom-day"]', "10");
      await page.fill('input[name="displayFrom-month"]', "06");
      await page.fill('input[name="displayFrom-year"]', "2025");
      await page.fill('input[name="displayTo-day"]', "20");
      await page.fill('input[name="displayTo-month"]', "06");
      await page.fill('input[name="displayTo-year"]', "2025");

      const fileInput = page.locator('input[name="file"]');
      await fileInput.setInputFiles({
        name: "test.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("test content")
      });

      await continueButton.click();

      await expect(page).toHaveURL(/\/manual-upload/);

      errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      let errorLink = errorSummary.getByRole("link", { name: /please upload a valid file format/i });
      await expect(errorLink).toBeVisible();
      await expect(errorLink).toHaveAttribute("href", "#file");

      fileErrorMessage = page.locator("#file").locator("..").locator(".govuk-error-message");
      await expect(fileErrorMessage).toBeVisible();
      await expect(fileErrorMessage).toContainText(/please upload a valid file format/i);

      // Test file size validation
      const largeBuffer = Buffer.alloc(3 * 1024 * 1024);
      await fileInput.setInputFiles({
        name: "large-file.pdf",
        mimeType: "application/pdf",
        buffer: largeBuffer
      });

      await continueButton.click();

      await expect(page).toHaveURL(/\/manual-upload/);

      errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      errorLink = errorSummary.getByRole("link", { name: /file too large/i });
      await expect(errorLink).toBeVisible();
      await expect(errorLink).toHaveAttribute("href", "#file");

      fileErrorMessage = page.locator("#file").locator("..").locator(".govuk-error-message");
      await expect(fileErrorMessage).toBeVisible();
      await expect(fileErrorMessage).toContainText(/file too large, please upload file smaller than 2mb/i);
    });

    test("should validate court name, date range, and preserve form data on validation errors", async ({ page }) => {
      // Part 1: Verify autocomplete is initialized
      await page.goto("/manual-upload");

      const courtInput = page.getByRole("combobox", { name: /court name or tribunal name/i });
      await courtInput.waitFor({ state: "visible", timeout: 10000 });
      await expect(courtInput).toBeVisible();
      await expect(courtInput).toHaveAttribute("role", "combobox");

      // Part 2: Test court name validation with empty input
      const fileInput = page.locator('input[name="file"]');
      await fileInput.setInputFiles({
        name: "test.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("test content")
      });

      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();

      let errorSummary = page.locator(".govuk-error-summary");
      let errorLink = errorSummary.getByRole("link", { name: /court name must be three characters or more/i });
      await expect(errorLink).toBeVisible();

      let inlineError = page.locator(".govuk-error-message").filter({ hasText: /court name must be three characters or more/i });
      await expect(inlineError).toBeVisible();

      // Part 3: Test court name validation with short input
      await courtInput.fill("AB");
      await continueButton.click();

      errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();
      errorLink = errorSummary.getByRole("link", { name: /court name must be three characters or more/i });
      await expect(errorLink).toBeVisible();

      inlineError = page.locator("#court-error.govuk-error-message");
      await expect(inlineError).toBeVisible();
      await expect(inlineError).toContainText(/court name must be three characters or more/i);

      // Part 4: Test court name validation with invalid input
      await courtInput.fill("Invalid Court Name That Does Not Exist");
      await continueButton.click();

      errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();
      errorLink = errorSummary.getByRole("link", { name: /please enter and select a valid court/i });
      await expect(errorLink).toBeVisible();

      inlineError = page.locator("#court-error.govuk-error-message");
      await expect(inlineError).toBeVisible();
      await expect(inlineError).toContainText(/please enter and select a valid court/i);

      // Part 5: Verify court name value is preserved
      const preservedCourtName = "Invalid Court Name";
      await courtInput.fill(preservedCourtName);
      await continueButton.click();
      await expect(courtInput).toHaveValue(preservedCourtName);

      // Part 6: Test date range validation with complete form
      await page.goto("/manual-upload?locationId=9001");
      await page.waitForTimeout(1000);

      await fileInput.setInputFiles({
        name: "test.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("test content")
      });

      await page.selectOption('select[name="listType"]', "1");
      await page.fill('input[name="hearingStartDate-day"]', "15");
      await page.fill('input[name="hearingStartDate-month"]', "06");
      await page.fill('input[name="hearingStartDate-year"]', "2025");
      await page.selectOption('select[name="sensitivity"]', "PUBLIC");
      await page.selectOption('select[name="language"]', "ENGLISH");
      await page.fill('input[name="displayFrom-day"]', "20");
      await page.fill('input[name="displayFrom-month"]', "06");
      await page.fill('input[name="displayFrom-year"]', "2025");
      await page.fill('input[name="displayTo-day"]', "10");
      await page.fill('input[name="displayTo-month"]', "06");
      await page.fill('input[name="displayTo-year"]', "2025");

      await continueButton.click();

      errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();
      errorLink = errorSummary.getByRole("link", { name: /display to date must be after display from date/i });
      await expect(errorLink).toBeVisible();

      inlineError = page.locator("#displayTo-error.govuk-error-message");
      await expect(inlineError).toBeVisible();
      await expect(inlineError).toContainText(/display to date must be after display from date/i);

      // Part 7: Verify all form data is preserved after validation error
      await page.selectOption('select[name="sensitivity"]', "PRIVATE");
      await page.selectOption('select[name="language"]', "WELSH");
      await page.fill('input[name="displayFrom-day"]', "10");
      await page.fill('input[name="displayTo-day"]', "20");

      await continueButton.click();

      await expect(page.locator('select[name="listType"]')).toHaveValue("1");
      await expect(page.locator('input[name="hearingStartDate-day"]')).toHaveValue("15");
      await expect(page.locator('input[name="hearingStartDate-month"]')).toHaveValue("06");
      await expect(page.locator('input[name="hearingStartDate-year"]')).toHaveValue("2025");
      await expect(page.locator('select[name="sensitivity"]')).toHaveValue("PRIVATE");
      await expect(page.locator('select[name="language"]')).toHaveValue("WELSH");
      await expect(page.locator('input[name="displayFrom-day"]')).toHaveValue("10");
      await expect(page.locator('input[name="displayFrom-month"]')).toHaveValue("06");
      await expect(page.locator('input[name="displayFrom-year"]')).toHaveValue("2025");
      await expect(page.locator('input[name="displayTo-day"]')).toHaveValue("20");
      await expect(page.locator('input[name="displayTo-month"]')).toHaveValue("06");
      await expect(page.locator('input[name="displayTo-year"]')).toHaveValue("2025");
    });

    test("should auto-select default sensitivity when list type is selected", async ({ page }) => {
      await page.goto("/manual-upload?locationId=9001");
      await page.waitForTimeout(1000);

      const listTypeSelect = page.locator('select[name="listType"]');
      const sensitivitySelect = page.locator('select[name="sensitivity"]');

      // Initially, sensitivity should be empty
      await expect(sensitivitySelect).toHaveValue("");

      // Select list type 6 (Crown Daily List) which has default sensitivity PUBLIC
      await listTypeSelect.selectOption("6");

      // Wait a moment for the JavaScript to execute
      await page.waitForTimeout(100);

      // Sensitivity should now be automatically set to PUBLIC
      await expect(sensitivitySelect).toHaveValue("PUBLIC");

      // Change to list type 2 (Family Daily Cause List) which has default sensitivity PRIVATE
      await listTypeSelect.selectOption("2");
      await page.waitForTimeout(100);

      // Sensitivity should now be automatically set to PRIVATE
      await expect(sensitivitySelect).toHaveValue("PRIVATE");

      // Clear the list type selection
      await listTypeSelect.selectOption("");
      await page.waitForTimeout(100);

      // Sensitivity should be cleared
      await expect(sensitivitySelect).toHaveValue("");

      // Select list type 1 (Civil Daily Cause List) which has default sensitivity PUBLIC
      await listTypeSelect.selectOption("1");
      await page.waitForTimeout(100);

      // Sensitivity should now be automatically set to PUBLIC
      await expect(sensitivitySelect).toHaveValue("PUBLIC");
    });
  });

  test.describe("Manual Upload Summary Page", () => {
    test("should display summary page with all elements and correct data", async ({ page }) => {
      await navigateToSummaryPage(page);

      await expect(page).toHaveURL(/\/manual-upload-summary\?uploadId=/);

      const h1 = page.locator("h1");
      await expect(h1).toHaveCount(1);
      await expect(h1).toHaveText("File upload summary");

      const mainHeading = page.getByRole("heading", { name: "File upload summary", level: 1 });
      await expect(mainHeading).toBeVisible();

      const subHeading = page.getByRole("heading", { name: "Check upload details", level: 2 });
      await expect(subHeading).toBeVisible();
      await expect(subHeading).toHaveText("Check upload details");

      const backLink = page.locator(".govuk-back-link");
      await expect(backLink).toBeVisible();

      const summaryList = page.locator(".govuk-summary-list");
      await expect(summaryList).toBeVisible();

      const rows = page.locator(".govuk-summary-list__row");
      await expect(rows).toHaveCount(7);

      const keys = page.locator(".govuk-summary-list__key");
      await expect(keys.nth(0)).toHaveText("Court name");
      await expect(keys.nth(1)).toHaveText("File");
      await expect(keys.nth(2)).toHaveText("List type");
      await expect(keys.nth(3)).toHaveText("Hearing start date");
      await expect(keys.nth(4)).toHaveText("Sensitivity");
      await expect(keys.nth(5)).toHaveText("Language");
      await expect(keys.nth(6)).toHaveText("Display file dates");

      const values = page.locator(".govuk-summary-list__value");
      await expect(values.nth(0)).not.toBeEmpty();
      await expect(values.nth(1)).toContainText("test-document.pdf");
      await expect(values.nth(2)).toContainText("Crown Daily List");
      await expect(values.nth(3)).toContainText("23 October 2025");
      await expect(values.nth(4)).toContainText("Public");
      await expect(values.nth(5)).toContainText("English");
      await expect(values.nth(6)).toContainText("20 October 2025 to 30 October 2025");

      const changeLinks = page.locator(".govuk-summary-list__actions a");
      await expect(changeLinks).toHaveCount(7);

      for (let i = 0; i < 7; i++) {
        await expect(changeLinks.nth(i)).toContainText("Change");
      }

      await expect(changeLinks.nth(0)).toHaveAttribute("href", "/manual-upload#court");
      await expect(changeLinks.nth(1)).toHaveAttribute("href", "/manual-upload#file");
      await expect(changeLinks.nth(2)).toHaveAttribute("href", "/manual-upload#listType");
      await expect(changeLinks.nth(3)).toHaveAttribute("href", "/manual-upload#hearingStartDate-day");
      await expect(changeLinks.nth(4)).toHaveAttribute("href", "/manual-upload#sensitivity");
      await expect(changeLinks.nth(5)).toHaveAttribute("href", "/manual-upload#language");
      await expect(changeLinks.nth(6)).toHaveAttribute("href", "/manual-upload#displayFrom-day");

      const hiddenTexts = ["Court name", "File", "List type", "Hearing start date", "Sensitivity", "Language", "Display file dates"];
      for (let i = 0; i < 7; i++) {
        const visuallyHiddenText = changeLinks.nth(i).locator(".govuk-visually-hidden");
        await expect(visuallyHiddenText).toHaveText(hiddenTexts[i]);
      }

      const confirmButton = page.getByRole("button", { name: "Confirm" });
      await expect(confirmButton).toBeVisible();

      const welshToggle = page.locator('a[href*="lng=cy"]');
      await expect(welshToggle).not.toBeVisible();

      const form = page.locator("form");
      await expect(form).toBeVisible();
      await expect(form).toHaveAttribute("method", "post");
    });

    test("should meet WCAG 2.2 AA standards on summary page", async ({ page }) => {
      await navigateToSummaryPage(page);

      const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe("Manual Upload Success Page", () => {
    test("should display success page with all elements and navigation links", async ({ page }) => {
      await completeManualUploadFlow(page);

      await expect(page).toHaveURL("/manual-upload-success");

      const backLink = page.locator(".govuk-back-link");
      await expect(backLink).not.toBeVisible();

      const successPanel = page.locator(".govuk-panel");
      await expect(successPanel).toBeVisible();

      const title = page.locator(".govuk-panel__title");
      await expect(title).toHaveText("File upload successful");

      await expect(successPanel).toContainText("Your file has been uploaded");

      const heading = page.getByRole("heading", { name: "What do you want to do next?" });
      await expect(heading).toBeVisible();

      const uploadLink = page.getByRole("link", { name: "Upload another file" });
      await expect(uploadLink).toBeVisible();
      await expect(uploadLink).toHaveAttribute("href", "/manual-upload");

      const removeLink = page.getByRole("link", { name: "Remove file" });
      await expect(removeLink).toBeVisible();
      await expect(removeLink).toHaveAttribute("href", "/remove-list-search");

      const homeLink = page.getByRole("link", { name: "Home" });
      await expect(homeLink).toBeVisible();
      await expect(homeLink).toHaveAttribute("href", "/admin-dashboard");

      await uploadLink.click();
      await expect(page).toHaveURL("/manual-upload");
    });

    test("should redirect to manual-upload if accessed directly without upload session", async ({ page }) => {
      await page.goto("/manual-upload-success");
      await expect(page).toHaveURL("/manual-upload");
    });

    test("should support Welsh language with correct translations", async ({ page }) => {
      await completeManualUploadFlow(page);

      const welshToggle = page.locator('a[href*="lng=cy"]');
      await expect(welshToggle).not.toBeVisible();

      await page.goto("/manual-upload-success?lng=cy");

      const title = page.locator(".govuk-panel__title");
      await expect(title).toHaveText("Wedi llwyddo i uwchlwytho ffeiliau");

      const heading = page.getByRole("heading", { name: "Beth yr ydych eisiau ei wneud nesaf?" });
      await expect(heading).toBeVisible();

      const uploadLink = page.getByRole("link", { name: "uwchlwytho ffeil arall" });
      await expect(uploadLink).toBeVisible();

      const removeLink = page.getByRole("link", { name: "Dileu ffeil" });
      await expect(removeLink).toBeVisible();

      const homeLink = page.getByRole("link", { name: "Tudalen hafan" });
      await expect(homeLink).toBeVisible();
    });

    test("should meet WCAG 2.2 AA standards on success page", async ({ page }) => {
      await completeManualUploadFlow(page);

      const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should not allow access after refreshing the page", async ({ page }) => {
      await completeManualUploadFlow(page);

      await page.reload();

      await expect(page).toHaveURL("/manual-upload");
    });

    test("should allow multiple sequential uploads", async ({ page }) => {
      await completeManualUploadFlow(page);
      await expect(page).toHaveURL("/manual-upload-success");

      await page.goto("/manual-upload?locationId=9001");
      await page.waitForTimeout(1000);

      await page.selectOption('select[name="listType"]', "7");
      await page.fill('input[name="hearingStartDate-day"]', "25");
      await page.fill('input[name="hearingStartDate-month"]', "11");
      await page.fill('input[name="hearingStartDate-year"]', "2025");
      await page.selectOption('select[name="sensitivity"]', "PRIVATE");
      await page.selectOption('select[name="language"]', "WELSH");
      await page.fill('input[name="displayFrom-day"]', "24");
      await page.fill('input[name="displayFrom-month"]', "11");
      await page.fill('input[name="displayFrom-year"]', "2025");
      await page.fill('input[name="displayTo-day"]', "26");
      await page.fill('input[name="displayTo-month"]', "11");
      await page.fill('input[name="displayTo-year"]', "2025");

      const fileInput = page.locator('input[name="file"]');
      await fileInput.setInputFiles({
        name: "second-upload.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4\nSecond upload content")
      });

      await page.getByRole("button", { name: /continue/i }).click();
      await page.waitForURL(/\/manual-upload-summary\?uploadId=/);
      await page.getByRole("button", { name: "Confirm" }).click();
      await page.waitForURL("/manual-upload-success");

      await expect(page).toHaveURL("/manual-upload-success");
    });
  });

  test.describe("Responsive Design Across All Pages", () => {
    test("should display correctly on mobile viewport throughout entire flow", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto("/manual-upload?locationId=9001");
      await page.waitForTimeout(1000);

      const fileInput = page.locator('input[name="file"]');
      await expect(fileInput).toBeVisible();
      const courtInput = page.getByRole("combobox", { name: /court name or tribunal name/i });
      await expect(courtInput).toBeVisible();

      await page.selectOption('select[name="listType"]', "6");
      await page.fill('input[name="hearingStartDate-day"]', "23");
      await page.fill('input[name="hearingStartDate-month"]', "10");
      await page.fill('input[name="hearingStartDate-year"]', "2025");
      await page.selectOption('select[name="sensitivity"]', "PUBLIC");
      await page.selectOption('select[name="language"]', "ENGLISH");
      await page.fill('input[name="displayFrom-day"]', "20");
      await page.fill('input[name="displayFrom-month"]', "10");
      await page.fill('input[name="displayFrom-year"]', "2025");
      await page.fill('input[name="displayTo-day"]', "30");
      await page.fill('input[name="displayTo-month"]', "10");
      await page.fill('input[name="displayTo-year"]', "2025");

      await fileInput.setInputFiles({
        name: "test-mobile.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4\nTest mobile content")
      });

      await page.getByRole("button", { name: /continue/i }).click();
      await page.waitForURL(/\/manual-upload-summary\?uploadId=/, { timeout: 10000 });

      const h1Summary = page.locator("h1");
      await expect(h1Summary).toBeVisible();

      const summaryList = page.locator(".govuk-summary-list");
      await expect(summaryList).toBeVisible();

      const confirmButton = page.getByRole("button", { name: "Confirm" });
      await expect(confirmButton).toBeVisible();

      await confirmButton.click();
      await page.waitForURL("/manual-upload-success", { timeout: 10000 });

      const successPanel = page.locator(".govuk-panel");
      await expect(successPanel).toBeVisible();

      const heading = page.getByRole("heading", { name: "What do you want to do next?" });
      await expect(heading).toBeVisible();

      const links = page.locator(".govuk-list a");
      await expect(links).toHaveCount(3);
    });
  });

  test.describe("Manual Upload - Notification E2E Tests", () => {
    const testData: {
      userIds: string[];
      subscriptionIds: string[];
      publicationIds: string[];
    } = {
      userIds: [],
      subscriptionIds: [],
      publicationIds: []
    };

    test.beforeEach(async ({ page }) => {
      await authenticateSystemAdmin(page);
    });

    test.afterEach(async () => {
      await cleanupTestNotifications(testData.publicationIds);
      await cleanupTestSubscriptions(testData.subscriptionIds);
      await cleanupTestUsers(testData.userIds);

      testData.userIds = [];
      testData.subscriptionIds = [];
      testData.publicationIds = [];
    });

    test("should send notifications to subscribers after manual upload confirmation", async ({ page }) => {
      // Create multiple subscribers to test notification delivery
      const user1 = await createTestUser(process.env.CFT_VALID_TEST_ACCOUNT!);
      const user2 = await createTestUser(process.env.CFT_VALID_TEST_ACCOUNT!);
      testData.userIds.push(user1.userId, user2.userId);

      const sub1 = await createTestSubscription(user1.userId, 9001);
      const sub2 = await createTestSubscription(user2.userId, 9001);
      testData.subscriptionIds.push(sub1.subscriptionId, sub2.subscriptionId);

      // Complete manual upload journey
      await page.goto("/manual-upload?locationId=9001");
      await page.waitForTimeout(1000);

      await page.selectOption('select[name="listType"]', "6");
      await page.fill('input[name="hearingStartDate-day"]', "23");
      await page.fill('input[name="hearingStartDate-month"]', "10");
      await page.fill('input[name="hearingStartDate-year"]', "2025");
      await page.selectOption('select[name="sensitivity"]', "PUBLIC");
      await page.selectOption('select[name="language"]', "ENGLISH");
      await page.fill('input[name="displayFrom-day"]', "20");
      await page.fill('input[name="displayFrom-month"]', "10");
      await page.fill('input[name="displayFrom-year"]', "2025");
      await page.fill('input[name="displayTo-day"]', "30");
      await page.fill('input[name="displayTo-month"]', "10");
      await page.fill('input[name="displayTo-year"]', "2025");

      const fileInput = page.locator('input[name="file"]');
      await fileInput.setInputFiles({
        name: "test-notification.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4\nTest content")
      });

      await page.getByRole("button", { name: /continue/i }).click();
      await page.waitForURL(/\/manual-upload-summary\?uploadId=/);

      await page.getByRole("button", { name: "Confirm" }).click();
      await page.waitForURL("/manual-upload-success", { timeout: 10000 });

      const successPanel = page.locator(".govuk-panel");
      await expect(successPanel).toBeVisible();

      // Verify notifications were sent to all subscribers
      // Poll for notifications with retry logic
      let notifications1 = [];
      let notifications2 = [];
      for (let i = 0; i < 10; i++) {
        notifications1 = await getNotificationsBySubscriptionId(sub1.subscriptionId);
        notifications2 = await getNotificationsBySubscriptionId(sub2.subscriptionId);
        if (notifications1.length > 0 && notifications2.length > 0) break;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      expect(notifications1.length).toBeGreaterThan(0);
      expect(notifications1[0].status).toBe("Sent");
      expect(notifications1[0].govNotifyId).toBeDefined();

      expect(notifications2.length).toBeGreaterThan(0);
      expect(notifications2[0].status).toBe("Sent");
      expect(notifications2[0].govNotifyId).toBeDefined();

      // Both notifications should be for the same publication
      expect(notifications1[0].publicationId).toBe(notifications2[0].publicationId);

      // Track publication ID for cleanup
      if (notifications1.length > 0) {
        testData.publicationIds.push(notifications1[0].publicationId);
      }
    });
  });
});
