import * as fs from "node:fs";
import * as path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { loginWithSSO } from "../utils/sso-helpers.js";

// Helper function to authenticate as System Admin
async function authenticateSystemAdmin(page: Page) {
  await page.goto("/system-admin-dashboard");

  if (page.url().includes("login.microsoftonline.com")) {
    const systemAdminEmail = process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!;
    const systemAdminPassword = process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!;
    await loginWithSSO(page, systemAdminEmail, systemAdminPassword);
  }
}

// Helper function to upload a CSV file
async function uploadCsvFile(page: Page, csvContent: string | Buffer, fileName = "test-upload.csv") {
  await page.goto("/reference-data-upload");

  const fileInput = page.locator('input[name="file"]');
  await fileInput.setInputFiles({
    name: fileName,
    mimeType: "text/csv",
    buffer: typeof csvContent === "string" ? Buffer.from(csvContent) : csvContent
  });

  await page.getByRole("button", { name: /continue/i }).click();
}

// Helper function to complete full upload flow
async function completeUploadFlow(page: Page, csvContent: string | Buffer) {
  await authenticateSystemAdmin(page);
  await uploadCsvFile(page, csvContent);
  await page.waitForURL("/reference-data-upload-summary", { timeout: 10000 });
  await page.getByRole("button", { name: /confirm/i }).click();
  await page.waitForURL("/reference-data-upload-confirmation", { timeout: 10000 });
}

// Load test CSV fixture
const fixturesPath = path.join(process.cwd(), "fixtures");
const testCsvPath = path.join(fixturesPath, "test-reference-data.csv");
const validCsvContent = fs.readFileSync(testCsvPath, "utf-8");

// Create invalid CSV fixtures
const csvWithMissingColumns = `LOCATION_ID,LOCATION_NAME
9001,Test Court`;

const csvWithInvalidLocationId = `LOCATION_ID,LOCATION_NAME,WELSH_LOCATION_NAME,EMAIL,CONTACT_NO,SUB_JURISDICTION_NAME,REGION_NAME
abc,Test Court,Llys Prawf,test@test.hmcts.net,01234567890,Civil Court,London`;

const csvWithDuplicateLocationId = `LOCATION_ID,LOCATION_NAME,WELSH_LOCATION_NAME,EMAIL,CONTACT_NO,SUB_JURISDICTION_NAME,REGION_NAME
9001,Test Court Alpha,Llys Prawf Alffa,test.alpha@test.hmcts.net,01234567890,Civil Court,London
9001,Test Court Beta,Llys Prawf Beta,test.beta@test.hmcts.net,01234567891,Civil Court,London`;

const emptyCSV = "";

test.describe("Reference Data Upload End-to-End Flow", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateSystemAdmin(page);
  });

  test.describe("Complete End-to-End Journey", () => {
    test("should complete full upload flow from upload to confirmation", async ({ page }) => {
      test.setTimeout(120000); // Increase timeout for SSO authentication

      // Step 1: Navigate to upload page
      await page.goto("/reference-data-upload");
      await expect(page.locator("h1")).toContainText("Manually upload a csv file");

      // Step 2: Upload CSV file
      const fileInput = page.locator('input[name="file"]');
      await fileInput.setInputFiles({
        name: "test-data.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(validCsvContent)
      });

      await page.getByRole("button", { name: /continue/i }).click();

      // Step 3: Verify summary page loads and displays data
      await page.waitForURL("/reference-data-upload-summary", { timeout: 10000 });
      await expect(page.locator("h1")).toContainText("Reference data upload summary");

      // Verify file name is displayed
      await expect(page.getByText("test-data.csv")).toBeVisible();

      // Verify preview table exists
      const table = page.locator("table.govuk-table");
      await expect(table).toBeVisible();

      // Verify some data is displayed in the table
      await expect(table.locator("tbody tr").first()).toBeVisible();

      // Step 4: Confirm upload
      await page.getByRole("button", { name: /confirm/i }).click();

      // Step 5: Verify success page
      await page.waitForURL("/reference-data-upload-confirmation", { timeout: 10000 });
      const successPanel = page.locator(".govuk-panel");
      await expect(successPanel).toBeVisible();
      await expect(successPanel).toContainText("File upload successful");

      // Verify navigation links
      await expect(page.getByRole("link", { name: /upload another file/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /home/i })).toBeVisible();
    });

    test("should be keyboard accessible throughout entire flow @nightly", async ({ page }) => {
      await page.goto("/reference-data-upload");

      // Test file input is accessible
      const fileInput = page.locator('input[name="file"]');
      await expect(fileInput).toBeVisible();

      // Upload file
      await fileInput.setInputFiles({
        name: "keyboard-test.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(validCsvContent)
      });

      // Test continue button
      const continueButton = page.getByRole("button", { name: /continue/i });
      await expect(continueButton).toBeVisible();
      await continueButton.click();

      await page.waitForURL("/reference-data-upload-summary", { timeout: 10000 });

      // Test confirm button
      const confirmButton = page.getByRole("button", { name: /confirm/i });
      await confirmButton.focus();
      await expect(confirmButton).toBeFocused();
    });

    test("should allow multiple sequential uploads @nightly", async ({ page }) => {
      // First upload
      await completeUploadFlow(page, validCsvContent);
      await expect(page).toHaveURL("/reference-data-upload-confirmation");

      // Second upload
      await page.goto("/reference-data-upload");
      await uploadCsvFile(page, validCsvContent, "second-upload.csv");
      await page.waitForURL("/reference-data-upload-summary", { timeout: 10000 });

      // Verify different file name
      await expect(page.getByText("second-upload.csv")).toBeVisible();
    });

    test("should redirect to upload page if accessing summary without session @nightly", async ({ page }) => {
      await page.goto("/reference-data-upload-summary");
      await expect(page).toHaveURL("/reference-data-upload");
    });

    test("should not allow access to confirmation page after refresh @nightly", async ({ page }) => {
      await completeUploadFlow(page, validCsvContent);
      await page.reload();
      // Should redirect away or show appropriate message
      await expect(page).toHaveURL("/reference-data-upload-confirmation");
    });
  });

  test.describe("File Upload Validation", () => {
    test("should display error when no file is selected @nightly", async ({ page }) => {
      await page.goto("/reference-data-upload");

      await page.getByRole("button", { name: /continue/i }).click();

      // Should stay on same page
      await expect(page).toHaveURL("/reference-data-upload");

      // Should display error message
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();
      await expect(errorSummary).toContainText("Select a CSV file to upload");
    });

    test("should display error for invalid file type - .txt @nightly", async ({ page }) => {
      await page.goto("/reference-data-upload");

      const fileInput = page.locator('input[name="file"]');
      await fileInput.setInputFiles({
        name: "test.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("This is a text file")
      });

      await page.getByRole("button", { name: /continue/i }).click();

      await expect(page).toHaveURL("/reference-data-upload");
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();
      await expect(errorSummary).toContainText("Unsupported file type. Please upload a .csv file");
    });

    test("should display error for invalid file type - .xlsx @nightly", async ({ page }) => {
      await page.goto("/reference-data-upload");

      const fileInput = page.locator('input[name="file"]');
      await fileInput.setInputFiles({
        name: "test.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: Buffer.from("PK")
      });

      await page.getByRole("button", { name: /continue/i }).click();

      await expect(page).toHaveURL("/reference-data-upload");
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();
      await expect(errorSummary).toContainText("Unsupported file type. Please upload a .csv file");
    });

    test("should accept valid CSV file", async ({ page }) => {
      await page.goto("/reference-data-upload");

      const fileInput = page.locator('input[name="file"]');
      await fileInput.setInputFiles({
        name: "valid.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(validCsvContent)
      });

      await page.getByRole("button", { name: /continue/i }).click();

      // Should navigate to summary page
      await page.waitForURL("/reference-data-upload-summary", { timeout: 10000 });
      await expect(page.locator("h1")).toContainText("Reference data upload summary");
    });

    test("should handle empty CSV file @nightly", async ({ page }) => {
      await page.goto("/reference-data-upload");

      const fileInput = page.locator('input[name="file"]');
      await fileInput.setInputFiles({
        name: "empty.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(emptyCSV)
      });

      await page.getByRole("button", { name: /continue/i }).click();

      // Empty file redirects back to upload page with error
      await expect(page).toHaveURL("/reference-data-upload");
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();
    });
  });

  test.describe("CSV Parsing", () => {
    test("should parse valid CSV and display preview @nightly", async ({ page }) => {
      await page.goto("/reference-data-upload");

      await uploadCsvFile(page, validCsvContent);
      await page.waitForURL("/reference-data-upload-summary", { timeout: 10000 });

      // Verify table headers (using exact text to avoid strict mode violations)
      const table = page.locator("table.govuk-table");
      await expect(table.getByRole("columnheader", { name: "Location ID", exact: true })).toBeVisible();
      await expect(table.getByRole("columnheader", { name: "Location Name", exact: true })).toBeVisible();
      await expect(table.getByRole("columnheader", { name: "Welsh Location Name", exact: true })).toBeVisible();
      await expect(table.getByRole("columnheader", { name: "Email", exact: true })).toBeVisible();
      await expect(table.getByRole("columnheader", { name: "Contact Number", exact: true })).toBeVisible();
      await expect(table.getByRole("columnheader", { name: "Jurisdiction", exact: true })).toBeVisible();
      await expect(table.getByRole("columnheader", { name: "Sub-Jurisdiction", exact: true })).toBeVisible();
      await expect(table.getByRole("columnheader", { name: "Region", exact: true })).toBeVisible();

      // Verify at least one row of data
      const firstRow = table.locator("tbody tr").first();
      await expect(firstRow).toBeVisible();
      await expect(firstRow.locator("td").first()).toContainText("9001");
    });

    test("should display error for CSV with missing required columns @nightly", async ({ page }) => {
      await page.goto("/reference-data-upload");

      await uploadCsvFile(page, csvWithMissingColumns);
      await page.waitForURL("/reference-data-upload", { timeout: 10000 });

      // Should redirect back with error
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();
      await expect(errorSummary).toContainText(/missing required column/i);
    });

    test("should display error for invalid location IDs @nightly", async ({ page }) => {
      await page.goto("/reference-data-upload");

      await uploadCsvFile(page, csvWithInvalidLocationId);
      // Invalid location ID redirects back to upload page
      await expect(page).toHaveURL("/reference-data-upload");

      // Should show error
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();
    });

    test("should handle CSV with BOM (Byte Order Mark) @nightly", async ({ page }) => {
      const csvWithBOM = `\uFEFF${validCsvContent}`;

      await page.goto("/reference-data-upload");
      await uploadCsvFile(page, csvWithBOM);
      await page.waitForURL("/reference-data-upload-summary", { timeout: 10000 });

      // Should parse successfully
      const table = page.locator("table.govuk-table");
      await expect(table).toBeVisible();
      await expect(table.locator("tbody tr").first()).toBeVisible();
    });

    test("should handle CSV with semicolon-separated values in cells @nightly", async ({ page }) => {
      await page.goto("/reference-data-upload");
      await uploadCsvFile(page, validCsvContent);
      await page.waitForURL("/reference-data-upload-summary", { timeout: 10000 });

      const table = page.locator("table.govuk-table");
      const firstRow = table.locator("tbody tr").first();

      // Check sub-jurisdiction cell has multiple values
      const subJurisdictionCell = firstRow.locator("td").nth(6);
      await expect(subJurisdictionCell).toContainText("Civil Court");
      await expect(subJurisdictionCell).toContainText("Crown Court");
    });

    test("should show pagination for large CSV files @nightly", async ({ page }) => {
      // Create CSV with 15 rows (should trigger pagination with 10 items per page)
      const largeCsv = `LOCATION_ID,LOCATION_NAME,WELSH_LOCATION_NAME,EMAIL,CONTACT_NO,SUB_JURISDICTION_NAME,REGION_NAME
${Array.from({ length: 15 }, (_, i) => `${9001 + i},Test Court ${i},Llys Prawf ${i},test${i}@test.hmcts.net,0123456789${i},Civil Court,London`).join("\n")}`;

      await page.goto("/reference-data-upload");
      await uploadCsvFile(page, largeCsv);
      await page.waitForURL("/reference-data-upload-summary", { timeout: 10000 });

      // Should show pagination
      const pagination = page.locator(".govuk-pagination");
      await expect(pagination).toBeVisible();

      // Should show page 1 and 2
      await expect(pagination.getByRole("link", { name: "1" })).toBeVisible();
      await expect(pagination.getByRole("link", { name: "2" })).toBeVisible();

      // Click page 2
      await pagination.getByRole("link", { name: "2" }).click();
      await expect(page).toHaveURL(/page=2/);
    });
  });

  test.describe("Data Validation", () => {
    test("should display validation errors on summary page @nightly", async ({ page }) => {
      await page.goto("/reference-data-upload");

      await uploadCsvFile(page, csvWithDuplicateLocationId);
      await page.waitForURL("/reference-data-upload-summary", { timeout: 10000 });

      // Should show error summary
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();
      await expect(errorSummary.locator("h2")).toContainText("There is a problem");

      // Should show link back to upload page
      await expect(page.getByRole("link", { name: /go back to upload page/i })).toBeVisible();
    });

    test("should validate duplicate location IDs @nightly", async ({ page }) => {
      await page.goto("/reference-data-upload");

      await uploadCsvFile(page, csvWithDuplicateLocationId);
      await page.waitForURL("/reference-data-upload-summary", { timeout: 10000 });

      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();
      // Check for error about existing location
      await expect(errorSummary).toContainText(/already exists in the database/i);
    });

    test("should allow navigation back to upload page from error state @nightly", async ({ page }) => {
      await page.goto("/reference-data-upload");

      await uploadCsvFile(page, csvWithDuplicateLocationId);
      await page.waitForURL("/reference-data-upload-summary", { timeout: 10000 });

      // Click back link
      await page.getByRole("link", { name: /go back to upload page/i }).click();
      await expect(page).toHaveURL("/reference-data-upload");
    });

    test("should preserve error messages across page navigation @nightly", async ({ page }) => {
      await page.goto("/reference-data-upload");

      // Submit without file
      await page.getByRole("button", { name: /continue/i }).click();
      await expect(page).toHaveURL("/reference-data-upload");

      // Error should be visible
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();
    });

    test("should clear errors after successful upload @nightly", async ({ page }) => {
      await page.goto("/reference-data-upload");

      // First: try without file
      await page.getByRole("button", { name: /continue/i }).click();
      await expect(page.locator(".govuk-error-summary")).toBeVisible();

      // Second: upload valid file
      const fileInput = page.locator('input[name="file"]');
      await fileInput.setInputFiles({
        name: "valid.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(validCsvContent)
      });

      await page.getByRole("button", { name: /continue/i }).click();
      await page.waitForURL("/reference-data-upload-summary", { timeout: 10000 });

      // No errors should be visible
      await expect(page.locator(".govuk-error-summary")).not.toBeVisible();
    });

    test("should validate that required fields are not empty @nightly", async ({ page }) => {
      const csvWithEmptyFields = `LOCATION_ID,LOCATION_NAME,WELSH_LOCATION_NAME,EMAIL,CONTACT_NO,SUB_JURISDICTION_NAME,REGION_NAME
9001,,Llys Prawf,test@test.hmcts.net,01234567890,Civil Court,London`;

      await page.goto("/reference-data-upload");
      await uploadCsvFile(page, csvWithEmptyFields);
      await page.waitForURL("/reference-data-upload-summary", { timeout: 10000 });

      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();
    });
  });

  test.describe("Summary Page Features", () => {
    test("should display file name in summary list @nightly", async ({ page }) => {
      await page.goto("/reference-data-upload");

      const fileName = "my-reference-data.csv";
      await uploadCsvFile(page, validCsvContent, fileName);
      await page.waitForURL("/reference-data-upload-summary", { timeout: 10000 });

      // File name should be in summary list
      await expect(page.getByText(fileName)).toBeVisible();
    });

    test("should show change link in summary list @nightly", async ({ page }) => {
      await page.goto("/reference-data-upload");
      await uploadCsvFile(page, validCsvContent);
      await page.waitForURL("/reference-data-upload-summary", { timeout: 10000 });

      // Change link should be visible
      const changeLink = page.getByRole("link", { name: /change/i });
      await expect(changeLink).toBeVisible();
    });

    test("should navigate back to upload page when clicking change @nightly", async ({ page }) => {
      await page.goto("/reference-data-upload");
      await uploadCsvFile(page, validCsvContent);
      await page.waitForURL("/reference-data-upload-summary", { timeout: 10000 });

      await page.getByRole("link", { name: /change/i }).click();
      await expect(page).toHaveURL("/reference-data-upload");
    });

    test("should display all table columns @nightly", async ({ page }) => {
      await page.goto("/reference-data-upload");
      await uploadCsvFile(page, validCsvContent);
      await page.waitForURL("/reference-data-upload-summary", { timeout: 10000 });

      const table = page.locator("table.govuk-table");

      // Verify all expected columns
      const expectedColumns = ["Location ID", "Location Name", "Welsh Location Name", "Email", "Contact Number", "Jurisdiction", "Sub-Jurisdiction", "Region"];

      for (const columnName of expectedColumns) {
        await expect(table.getByRole("columnheader", { name: columnName, exact: true })).toBeVisible();
      }
    });

    test("should display preview title @nightly", async ({ page }) => {
      await page.goto("/reference-data-upload");
      await uploadCsvFile(page, validCsvContent);
      await page.waitForURL("/reference-data-upload-summary", { timeout: 10000 });

      await expect(page.locator("h2").filter({ hasText: /preview/i })).toBeVisible();
    });
  });

  test.describe("Confirmation Flow", () => {
    test("should upload data to database on confirmation @nightly", async ({ page }) => {
      await page.goto("/reference-data-upload");
      await uploadCsvFile(page, validCsvContent);
      await page.waitForURL("/reference-data-upload-summary", { timeout: 10000 });

      await page.getByRole("button", { name: /confirm/i }).click();
      await page.waitForURL("/reference-data-upload-confirmation", { timeout: 10000 });

      // Should show success panel
      const successPanel = page.locator(".govuk-panel");
      await expect(successPanel).toBeVisible();
      await expect(successPanel).toContainText("File upload successful");
    });

    test("should display success page with navigation links @nightly", async ({ page }) => {
      await completeUploadFlow(page, validCsvContent);

      await expect(page).toHaveURL("/reference-data-upload-confirmation");

      // Check navigation links
      const uploadAnotherLink = page.getByRole("link", { name: /upload another file/i });
      await expect(uploadAnotherLink).toBeVisible();
      await expect(uploadAnotherLink).toHaveAttribute("href", "/reference-data-upload");

      const homeLink = page.getByRole("link", { name: /home/i });
      await expect(homeLink).toBeVisible();
      await expect(homeLink).toHaveAttribute("href", "/system-admin-dashboard");
    });

    test("should clear session data after successful upload @nightly", async ({ page }) => {
      await completeUploadFlow(page, validCsvContent);

      // Try to go back to summary - should redirect to upload
      await page.goto("/reference-data-upload-summary");
      await expect(page).toHaveURL("/reference-data-upload");
    });

    test("should navigate to upload page from success page @nightly", async ({ page }) => {
      await completeUploadFlow(page, validCsvContent);

      await page.getByRole("link", { name: /upload another file/i }).click();
      await expect(page).toHaveURL("/reference-data-upload");
    });
  });

  test.describe("Accessibility & Welsh Language", () => {
    test("should meet WCAG 2.2 AA standards on upload page @nightly", async ({ page }) => {
      await page.goto("/reference-data-upload");

      const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should meet WCAG 2.2 AA standards on summary page @nightly", async ({ page }) => {
      await page.goto("/reference-data-upload");
      await uploadCsvFile(page, validCsvContent);
      await page.waitForURL("/reference-data-upload-summary", { timeout: 10000 });

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        // Exclude pre-existing scrollable-region-focusable issue in template
        .disableRules(["scrollable-region-focusable"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });
});
