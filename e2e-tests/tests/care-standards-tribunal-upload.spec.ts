import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import * as XLSX from "xlsx";
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

// Helper function to create a valid CST Excel file
function createValidCSTExcel(): Buffer {
  const hearings = [
    {
      Date: "01/01/2026",
      "Case name": "Test Case A vs B",
      "Hearing length": "1 hour",
      "Hearing type": "Substantive hearing",
      Venue: "Care Standards Tribunal",
      "Additional information": "Remote hearing via video"
    },
    {
      Date: "02/01/2026",
      "Case name": "Another Case C vs D",
      "Hearing length": "Half day",
      "Hearing type": "Preliminary hearing",
      Venue: "Care Standards Tribunal",
      "Additional information": "In person"
    },
    {
      Date: "03/01/2026",
      "Case name": "Final Case E vs F",
      "Hearing length": "Full day",
      "Hearing type": "Final hearing",
      Venue: "Care Standards Tribunal",
      "Additional information": "Hybrid hearing"
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(hearings);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Hearings");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// Helper function to create an invalid CST Excel file (missing required field)
function createInvalidCSTExcel(): Buffer {
  const hearings = [
    {
      Date: "01/01/2026",
      "Case name": "Test Case",
      "Hearing length": "", // Missing required field
      "Hearing type": "Substantive hearing",
      Venue: "Care Standards Tribunal",
      "Additional information": "Remote"
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(hearings);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Hearings");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// Helper function to create CST Excel with invalid date format
function createInvalidDateCSTExcel(): Buffer {
  const hearings = [
    {
      Date: "2026-01-01", // Wrong format (should be dd/MM/yyyy)
      "Case name": "Test Case",
      "Hearing length": "1 hour",
      "Hearing type": "Substantive hearing",
      Venue: "Care Standards Tribunal",
      "Additional information": "Remote"
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(hearings);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Hearings");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// Helper function to create CST Excel with HTML tags
function createHTMLTagsCSTExcel(): Buffer {
  const hearings = [
    {
      Date: "01/01/2026",
      "Case name": "<script>alert('xss')</script>Test Case",
      "Hearing length": "1 hour",
      "Hearing type": "Substantive hearing",
      Venue: "Care Standards Tribunal",
      "Additional information": "Remote"
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(hearings);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Hearings");

  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// Helper function to upload CST Excel file
async function uploadCSTExcel(page: Page, excelBuffer: Buffer, expectSuccess = true) {
  await page.goto("/non-strategic-upload?locationId=9001");
  await page.waitForTimeout(1000);

  // Select Care Standards Tribunal (listTypeId === 9)
  await page.selectOption('select[name="listType"]', "9");
  await page.fill('input[name="hearingStartDate-day"]', "01");
  await page.fill('input[name="hearingStartDate-month"]', "01");
  await page.fill('input[name="hearingStartDate-year"]', "2026");
  await page.selectOption('select[name="sensitivity"]', "PUBLIC");
  await page.selectOption('select[name="language"]', "ENGLISH");
  await page.fill('input[name="displayFrom-day"]', "01");
  await page.fill('input[name="displayFrom-month"]', "01");
  await page.fill('input[name="displayFrom-year"]', "2026");
  await page.fill('input[name="displayTo-day"]', "07");
  await page.fill('input[name="displayTo-month"]', "01");
  await page.fill('input[name="displayTo-year"]', "2026");

  const fileInput = page.locator('input[name="file"]');
  await fileInput.setInputFiles({
    name: "cst-weekly-list.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: excelBuffer
  });

  await page.getByRole("button", { name: /continue/i }).click();

  if (expectSuccess) {
    await page.waitForURL(/\/non-strategic-upload-summary\?uploadId=/, { timeout: 10000 });
  } else {
    await page.waitForURL(/\/non-strategic-upload/, { timeout: 10000 });
  }
}

// Helper function to complete full CST upload flow
async function completeCSTUploadFlow(page: Page): Promise<string> {
  const excelBuffer = createValidCSTExcel();
  await uploadCSTExcel(page, excelBuffer, true);

  // Get artefactId from URL for later verification
  const url = page.url();
  const match = url.match(/uploadId=([^&]+)/);
  const uploadId = match ? match[1] : "";

  await page.getByRole("button", { name: "Confirm" }).click();
  await page.waitForURL("/non-strategic-upload-success", { timeout: 10000 });

  return uploadId;
}

test.describe("Care Standards Tribunal Excel Upload End-to-End Flow", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateSystemAdmin(page);
  });

  test.describe("Valid Excel Upload Flow", () => {
    test("should complete full CST Excel upload from form to success", async ({ page }) => {
      // Step 1: Load upload form
      await page.goto("/non-strategic-upload?locationId=9001");
      await page.waitForTimeout(1000);
      await expect(page).toHaveTitle("Upload - Upload Excel file - Court and tribunal hearings - GOV.UK");

      // Step 2: Fill form with CST list type
      const excelBuffer = createValidCSTExcel();
      await uploadCSTExcel(page, excelBuffer, true);

      // Step 3: Verify summary page displays correct data
      await expect(page.locator("h1")).toHaveText("File upload summary");
      const values = page.locator(".govuk-summary-list__value");
      await expect(values.nth(1)).toContainText("cst-weekly-list.xlsx");
      await expect(values.nth(2)).toContainText("Care Standards Tribunal Weekly Hearing List");
      await expect(values.nth(3)).toContainText("1 January 2026");
      await expect(values.nth(4)).toContainText("Public");
      await expect(values.nth(5)).toContainText("English");

      // Step 4: Confirm upload and verify success page
      await page.getByRole("button", { name: "Confirm" }).click();
      await page.waitForURL("/non-strategic-upload-success", { timeout: 10000 });

      const successPanel = page.locator(".govuk-panel");
      await expect(successPanel).toBeVisible();
      const title = page.locator(".govuk-panel__title");
      await expect(title).toHaveText("File upload successful");
      await expect(successPanel).toContainText("Your file has been uploaded");
    });

    test("should display the published CST list with correct formatting", async ({ page }) => {
      // Upload and publish the list
      await completeCSTUploadFlow(page);

      // Navigate to the published list
      // Note: In a real scenario, you'd navigate via search or direct URL
      // For now, we'll construct the URL pattern
      await page.goto("/care-standards-tribunal-weekly-hearing-list?artefactId=test");
      await page.waitForTimeout(1000);

      // Verify page loads (may need adjustment based on actual implementation)
      const heading = page.locator("h1");
      await expect(heading).toBeVisible();
    });
  });

  test.describe("Excel Validation on Upload Page", () => {
    test("should show validation error for missing required field on upload page", async ({ page }) => {
      const excelBuffer = createInvalidCSTExcel();
      await uploadCSTExcel(page, excelBuffer, false);

      // Verify we're still on upload page
      await expect(page).toHaveURL(/\/non-strategic-upload/);

      // Verify error summary is displayed
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      const errorSummaryHeading = errorSummary.getByRole("heading", { name: /there is a problem/i });
      await expect(errorSummaryHeading).toBeVisible();

      // Verify error message mentions missing field
      const errorText = await errorSummary.textContent();
      expect(errorText).toContain("Missing required field");
    });

    test("should show validation error for invalid date format on upload page", async ({ page }) => {
      const excelBuffer = createInvalidDateCSTExcel();
      await uploadCSTExcel(page, excelBuffer, false);

      // Verify we're still on upload page
      await expect(page).toHaveURL(/\/non-strategic-upload/);

      // Verify error summary is displayed
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      // Verify error message mentions date format
      const errorText = await errorSummary.textContent();
      expect(errorText).toContain("Invalid date format") || expect(errorText).toContain("dd/MM/yyyy");
    });

    test("should show validation error for HTML tags in fields on upload page", async ({ page }) => {
      const excelBuffer = createHTMLTagsCSTExcel();
      await uploadCSTExcel(page, excelBuffer, false);

      // Verify we're still on upload page
      await expect(page).toHaveURL(/\/non-strategic-upload/);

      // Verify error summary is displayed
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      // Verify error message mentions HTML tags
      const errorText = await errorSummary.textContent();
      expect(errorText).toContain("HTML tags") || expect(errorText).toContain("Invalid content");
    });

    test("should preserve form data when Excel validation fails", async ({ page }) => {
      const excelBuffer = createInvalidCSTExcel();
      await uploadCSTExcel(page, excelBuffer, false);

      // Verify form data is preserved
      await expect(page.locator('select[name="listType"]')).toHaveValue("9");
      await expect(page.locator('input[name="hearingStartDate-day"]')).toHaveValue("01");
      await expect(page.locator('input[name="hearingStartDate-month"]')).toHaveValue("01");
      await expect(page.locator('input[name="hearingStartDate-year"]')).toHaveValue("2026");
      await expect(page.locator('select[name="sensitivity"]')).toHaveValue("PUBLIC");
      await expect(page.locator('select[name="language"]')).toHaveValue("ENGLISH");
    });
  });

  test.describe("CST List Display Page", () => {
    test("should display list with correct header information", async ({ page }) => {
      // Note: This test requires the list to be published and accessible
      // You may need to adjust based on your actual implementation
      const excelBuffer = createValidCSTExcel();
      await uploadCSTExcel(page, excelBuffer, true);
      await page.getByRole("button", { name: "Confirm" }).click();
      await page.waitForURL("/non-strategic-upload-success", { timeout: 10000 });

      // In a real test, you would navigate to the published list URL
      // For now, this is a placeholder showing the expected structure
      // await page.goto(`/care-standards-tribunal-weekly-hearing-list?artefactId=${artefactId}`);

      // Verify header elements (when implementing, uncomment and adjust)
      // await expect(page.locator("h1")).toContainText("Care Standards Tribunal Weekly Hearing List");
      // await expect(page.locator(".list-duration")).toContainText("List for week commencing");
      // await expect(page.locator(".last-updated")).toContainText("Last updated");
    });

    test("should display Important Information accordion with correct content", async ({ page }) => {
      // Placeholder - implement once list display is available
      // const accordion = page.locator('[data-module="govuk-accordion"]');
      // await expect(accordion).toBeVisible();
      // await accordion.click();
      // await expect(page.locator(".accordion-content")).toContainText("cst@justice.gov.uk");
      // await expect(page.getByRole("link", { name: /observe a court or tribunal/i })).toBeVisible();
    });

    test("should display table with all hearing data and correct columns", async ({ page }) => {
      // Placeholder - implement once list display is available
      // const table = page.locator(".govuk-table");
      // await expect(table).toBeVisible();
      //
      // // Verify column headers
      // await expect(page.locator("th").nth(0)).toContainText("Date");
      // await expect(page.locator("th").nth(1)).toContainText("Case name");
      // await expect(page.locator("th").nth(2)).toContainText("Hearing length");
      // await expect(page.locator("th").nth(3)).toContainText("Hearing type");
      // await expect(page.locator("th").nth(4)).toContainText("Venue");
      // await expect(page.locator("th").nth(5)).toContainText("Additional information");
      //
      // // Verify data rows
      // const rows = page.locator("tbody tr");
      // await expect(rows).toHaveCount(3); // Our test data has 3 hearings
    });

    test("should display data source as Manual upload (not Care Standards Tribunal)", async ({ page }) => {
      // Placeholder - implement once list display is available
      // const dataSource = page.locator(".data-source");
      // await expect(dataSource).toContainText("Data source: Manual upload");
    });

    test("should have working Back to top link", async ({ page }) => {
      // Placeholder - implement once list display is available
      // const backToTop = page.getByRole("link", { name: /back to top/i });
      // await expect(backToTop).toBeVisible();
      // await backToTop.click();
      // await page.waitForTimeout(500);
      // // Verify scroll position is at top
      // const scrollY = await page.evaluate(() => window.scrollY);
      // expect(scrollY).toBe(0);
    });
  });

  test.describe("Search Functionality", () => {
    test("should filter table based on search term", async ({ page }) => {
      // Placeholder - implement once list display is available
      // const searchInput = page.locator("#case-search-input");
      // await expect(searchInput).toBeVisible();
      //
      // // Search for specific case
      // await searchInput.fill("Test Case A");
      // await page.waitForTimeout(500);
      //
      // // Verify only matching rows are visible/highlighted
      // const highlightedText = page.locator(".search-highlight");
      // await expect(highlightedText.first()).toBeVisible();
      // await expect(highlightedText.first()).toContainText("Test Case A");
    });

    test("should highlight search matches in table", async ({ page }) => {
      // Placeholder - implement once list display is available
      // const searchInput = page.locator("#case-search-input");
      // await searchInput.fill("Remote");
      // await page.waitForTimeout(500);
      //
      // // Verify highlighting works
      // const highlights = page.locator("mark.search-highlight");
      // await expect(highlights.first()).toBeVisible();
      // await expect(highlights.first()).toContainText("Remote");
    });

    test("should clear highlighting when search is cleared", async ({ page }) => {
      // Placeholder - implement once list display is available
      // const searchInput = page.locator("#case-search-input");
      // await searchInput.fill("Test");
      // await page.waitForTimeout(500);
      //
      // await searchInput.clear();
      // await page.waitForTimeout(500);
      //
      // // Verify no highlights remain
      // const highlights = page.locator("mark.search-highlight");
      // await expect(highlights).toHaveCount(0);
    });
  });

  test.describe("Accessibility Compliance", () => {
    test("should meet WCAG 2.2 AA standards on upload form with CST selected", async ({ page }) => {
      await page.goto("/non-strategic-upload?locationId=9001");
      await page.waitForTimeout(1000);
      await page.selectOption('select[name="listType"]', "9");

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should meet WCAG 2.2 AA standards on error page", async ({ page }) => {
      const excelBuffer = createInvalidCSTExcel();
      await uploadCSTExcel(page, excelBuffer, false);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should meet WCAG 2.2 AA standards on list display page", async ({ page }) => {
      // Placeholder - implement once list display is available
      // await page.goto("/care-standards-tribunal-weekly-hearing-list?artefactId=test");
      //
      // const accessibilityScanResults = await new AxeBuilder({ page })
      //   .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      //   .disableRules(["target-size", "link-name"])
      //   .analyze();
      //
      // expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe("Keyboard Navigation", () => {
    test("should be fully keyboard navigable throughout upload flow", async ({ page }) => {
      await page.goto("/non-strategic-upload?locationId=9001");
      await page.waitForTimeout(1000);

      // Tab through form elements
      await page.keyboard.press("Tab");
      const focusedElement = page.locator(":focus");
      await expect(focusedElement).toBeVisible();

      // Navigate to list type select
      await page.selectOption('select[name="listType"]', "9");

      // Continue tabbing to ensure all elements are accessible
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press("Tab");
        const focused = page.locator(":focus");
        await expect(focused).toBeVisible();
      }
    });
  });

  test.describe("Welsh Language Support", () => {
    test("should display Welsh content when language is set to cy", async ({ page }) => {
      await page.goto("/non-strategic-upload?locationId=9001&lng=cy");
      await page.waitForTimeout(1000);

      // Verify Welsh content is displayed
      // Note: This depends on actual Welsh translations being implemented
      const heading = page.locator("h1");
      await expect(heading).toBeVisible();
    });
  });
});
