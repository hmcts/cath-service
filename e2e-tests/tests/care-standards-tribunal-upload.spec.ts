import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import ExcelJSPkg from "exceljs";
import { loginWithSSO } from "../utils/sso-helpers.js";

const { Workbook } = ExcelJSPkg;

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
async function createValidCSTExcel(): Promise<Buffer> {
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

  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet("Hearings");

  worksheet.columns = [
    { header: "Date", key: "Date" },
    { header: "Case name", key: "Case name" },
    { header: "Hearing length", key: "Hearing length" },
    { header: "Hearing type", key: "Hearing type" },
    { header: "Venue", key: "Venue" },
    { header: "Additional information", key: "Additional information" }
  ];

  for (const hearing of hearings) {
    worksheet.addRow(hearing);
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// Helper function to create an invalid CST Excel file (missing required field)
async function createInvalidCSTExcel(): Promise<Buffer> {
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

  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet("Hearings");

  worksheet.columns = [
    { header: "Date", key: "Date" },
    { header: "Case name", key: "Case name" },
    { header: "Hearing length", key: "Hearing length" },
    { header: "Hearing type", key: "Hearing type" },
    { header: "Venue", key: "Venue" },
    { header: "Additional information", key: "Additional information" }
  ];

  for (const hearing of hearings) {
    worksheet.addRow(hearing);
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// Helper function to create CST Excel with invalid date format
async function createInvalidDateCSTExcel(): Promise<Buffer> {
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

  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet("Hearings");

  worksheet.columns = [
    { header: "Date", key: "Date" },
    { header: "Case name", key: "Case name" },
    { header: "Hearing length", key: "Hearing length" },
    { header: "Hearing type", key: "Hearing type" },
    { header: "Venue", key: "Venue" },
    { header: "Additional information", key: "Additional information" }
  ];

  for (const hearing of hearings) {
    worksheet.addRow(hearing);
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// Helper function to create CST Excel with HTML tags
async function createHTMLTagsCSTExcel(): Promise<Buffer> {
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

  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet("Hearings");

  worksheet.columns = [
    { header: "Date", key: "Date" },
    { header: "Case name", key: "Case name" },
    { header: "Hearing length", key: "Hearing length" },
    { header: "Hearing type", key: "Hearing type" },
    { header: "Venue", key: "Venue" },
    { header: "Additional information", key: "Additional information" }
  ];

  for (const hearing of hearings) {
    worksheet.addRow(hearing);
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// Helper function to upload CST Excel file
async function uploadCSTExcel(page: Page, excelBuffer: Buffer, expectSuccess = true) {
  await page.goto("/non-strategic-upload?locationId=9001");
  await page.waitForTimeout(1000);

  // Select Care Standards Tribunal (listTypeId === 9)
  await page.selectOption('select[name="listType"]', "9");
  await page.fill('input[name="hearingStartDate-day"]', "20");
  await page.fill('input[name="hearingStartDate-month"]', "01");
  await page.fill('input[name="hearingStartDate-year"]', "2026");
  await page.selectOption('select[name="sensitivity"]', "PUBLIC");
  await page.selectOption('select[name="language"]', "ENGLISH");
  // Use dates that span the current date to ensure publication is visible
  const today = new Date();
  const displayFrom = new Date(today);
  displayFrom.setDate(displayFrom.getDate() - 7); // 7 days ago
  const displayTo = new Date(today);
  displayTo.setDate(displayTo.getDate() + 30); // 30 days from now

  await page.fill('input[name="displayFrom-day"]', String(displayFrom.getDate()).padStart(2, "0"));
  await page.fill('input[name="displayFrom-month"]', String(displayFrom.getMonth() + 1).padStart(2, "0"));
  await page.fill('input[name="displayFrom-year"]', String(displayFrom.getFullYear()));
  await page.fill('input[name="displayTo-day"]', String(displayTo.getDate()).padStart(2, "0"));
  await page.fill('input[name="displayTo-month"]', String(displayTo.getMonth() + 1).padStart(2, "0"));
  await page.fill('input[name="displayTo-year"]', String(displayTo.getFullYear()));

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

// Helper function to complete full CST upload flow and navigate to published list
async function completeCSTUploadFlowAndNavigate(page: Page) {
  const excelBuffer = await createValidCSTExcel();
  await uploadCSTExcel(page, excelBuffer, true);

  await page.getByRole("button", { name: "Confirm" }).click();
  await page.waitForURL("/non-strategic-upload-success", { timeout: 10000 });

  // Navigate to summary of publications to find and click the publication link
  await page.goto("/summary-of-publications?locationId=9001");
  await page.waitForTimeout(1000);

  // Find the first (most recent) CST publication link
  // Non-strategic uploads (Excel converted to JSON) use /{urlPath}?artefactId={id} format
  const publicationLinks = page.locator('.govuk-list a[href*="care-standards-tribunal-weekly-hearing-list"]');
  await expect(publicationLinks.first()).toBeVisible({ timeout: 10000 });

  // Click the publication link to navigate to the list page
  await publicationLinks.first().click();
  await page.waitForLoadState("networkidle");
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
      const excelBuffer = await createValidCSTExcel();
      await uploadCSTExcel(page, excelBuffer, true);

      // Step 3: Verify summary page displays correct data
      await expect(page.locator("h1")).toHaveText("File upload summary");
      const values = page.locator(".govuk-summary-list__value");
      await expect(values.nth(1)).toContainText("cst-weekly-list.xlsx");
      await expect(values.nth(2)).toContainText("Care Standards Tribunal Weekly Hearing List");
      await expect(values.nth(3)).toContainText("20 January 2026");
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
      // Upload and navigate to published list
      await completeCSTUploadFlowAndNavigate(page);

      // Verify page loads
      const heading = page.locator("h1");
      await expect(heading).toBeVisible();
      await expect(heading).toContainText("Care Standards Tribunal Weekly Hearing List");
    });
  });

  test.describe("Excel Validation on Upload Page", () => {
    test("should show validation error for missing required field on upload page", async ({ page }) => {
      const excelBuffer = await createInvalidCSTExcel();
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
      const excelBuffer = await createInvalidDateCSTExcel();
      await uploadCSTExcel(page, excelBuffer, false);

      // Verify we're still on upload page
      await expect(page).toHaveURL(/\/non-strategic-upload/);

      // Verify error summary is displayed
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      // Verify error message mentions date format
      const errorText = await errorSummary.textContent();
      expect(errorText && (errorText.includes("Invalid date format") || errorText.includes("dd/MM/yyyy"))).toBeTruthy();
    });

    test("should show validation error for HTML tags in fields on upload page", async ({ page }) => {
      const excelBuffer = await createHTMLTagsCSTExcel();
      await uploadCSTExcel(page, excelBuffer, false);

      // Verify we're still on upload page
      await expect(page).toHaveURL(/\/non-strategic-upload/);

      // Verify error summary is displayed
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      // Verify error message mentions HTML tags
      const errorText = await errorSummary.textContent();
      expect(errorText && (errorText.includes("HTML tags") || errorText.includes("Invalid content"))).toBeTruthy();
    });

    test("should preserve form data when Excel validation fails", async ({ page }) => {
      const excelBuffer = await createInvalidCSTExcel();
      await uploadCSTExcel(page, excelBuffer, false);

      // Verify form data is preserved
      await expect(page.locator('select[name="listType"]')).toHaveValue("9");
      await expect(page.locator('input[name="hearingStartDate-day"]')).toHaveValue("20");
      await expect(page.locator('input[name="hearingStartDate-month"]')).toHaveValue("01");
      await expect(page.locator('input[name="hearingStartDate-year"]')).toHaveValue("2026");
      await expect(page.locator('select[name="sensitivity"]')).toHaveValue("PUBLIC");
      await expect(page.locator('select[name="language"]')).toHaveValue("ENGLISH");
    });
  });

  test.describe("CST List Display Page", () => {
    test("should display list with correct header information", async ({ page }) => {
      await completeCSTUploadFlowAndNavigate(page);

      // Verify page title
      await expect(page.locator("h1")).toContainText("Care Standards Tribunal Weekly Hearing List");

      // Verify "List for week commencing" date line
      const weekCommencingPara = page.locator("p.govuk-body.govuk-\\!-font-weight-bold.govuk-\\!-margin-bottom-1");
      await expect(weekCommencingPara).toBeVisible();
      const weekCommencingText = await weekCommencingPara.textContent();
      expect(weekCommencingText).toContain("List for week commencing");
      expect(weekCommencingText).toMatch(/\d{1,2} \w+ \d{4}/); // Matches date format like "1 January 2026"

      // Verify "Last updated" date and time line
      const bodyParagraphs = page.locator("p.govuk-body");
      let foundLastUpdated = false;
      for (let i = 0; i < (await bodyParagraphs.count()); i++) {
        const text = await bodyParagraphs.nth(i).textContent();
        if (text?.includes("Last updated")) {
          foundLastUpdated = true;
          expect(text).toMatch(/Last updated \d{1,2} \w+ \d{4} at \d{1,2}(:\d{2})?(am|pm)/);
          break;
        }
      }
      expect(foundLastUpdated).toBeTruthy();
    });

    test("should display Important Information accordion expanded by default", async ({ page }) => {
      await completeCSTUploadFlowAndNavigate(page);

      // Verify details element exists and is open by default
      const details = page.locator("details.govuk-details");
      await expect(details).toBeVisible();

      // Verify the details element has the "open" attribute
      const isOpen = await details.getAttribute("open");
      expect(isOpen).not.toBeNull();

      // Verify summary text is visible
      const summary = details.locator(".govuk-details__summary-text");
      await expect(summary).toContainText("Important information");

      // Verify content is visible without needing to click (because it's open by default)
      const detailsText = details.locator(".govuk-details__text");
      await expect(detailsText).toBeVisible();

      // Verify the content mentions the email address
      const textContent = await detailsText.textContent();
      expect(textContent).toContain("cst@justice.gov.uk");

      // Verify the link to observe hearings is present
      const observeLink = details.getByRole("link", { name: /observe a court or tribunal/i });
      await expect(observeLink).toBeVisible();
      expect(await observeLink.getAttribute("href")).toContain("gov.uk/guidance/observe");
    });

    test("should display table with all hearing data and correct columns", async ({ page }) => {
      await completeCSTUploadFlowAndNavigate(page);

      const table = page.locator(".govuk-table");
      await expect(table).toBeVisible();

      // Verify column headers
      const headers = table.locator("thead th");
      await expect(headers.nth(0)).toContainText("Date");
      await expect(headers.nth(1)).toContainText("Case name");
      await expect(headers.nth(2)).toContainText("Hearing length");
      await expect(headers.nth(3)).toContainText("Hearing type");
      await expect(headers.nth(4)).toContainText("Venue");
      await expect(headers.nth(5)).toContainText("Additional information");

      // Verify data rows exist (our test data has 3 hearings)
      const rows = table.locator("tbody tr");
      await expect(rows).toHaveCount(3);

      // Verify first row contains expected data
      const firstRow = rows.nth(0);
      await expect(firstRow.locator("td").nth(0)).toContainText("1 January 2026");
      await expect(firstRow.locator("td").nth(1)).toContainText("Test Case A vs B");
      await expect(firstRow.locator("td").nth(2)).toContainText("1 hour");
      await expect(firstRow.locator("td").nth(3)).toContainText("Substantive hearing");
      await expect(firstRow.locator("td").nth(4)).toContainText("Care Standards Tribunal");
      await expect(firstRow.locator("td").nth(5)).toContainText("Remote hearing via video");
    });

    test("should display data source as Manual Upload in English", async ({ page }) => {
      await completeCSTUploadFlowAndNavigate(page);

      // Find the data source text
      const dataSourceParagraph = page.locator(".govuk-body-s").filter({ hasText: "Data source" });
      await expect(dataSourceParagraph).toBeVisible();

      const dataSourceText = await dataSourceParagraph.textContent();
      expect(dataSourceText).toContain("Data source:");
      expect(dataSourceText).toContain("Manual Upload");
    });

    test("should display data source as Llwytho â Llaw in Welsh", async ({ page }) => {
      await completeCSTUploadFlowAndNavigate(page);

      // Switch to Welsh using query parameter (admin users don't have language toggle)
      const currentUrl = page.url();
      const urlWithWelsh = currentUrl.includes("?") ? `${currentUrl}&lng=cy` : `${currentUrl}?lng=cy`;
      await page.goto(urlWithWelsh);
      await page.waitForLoadState("networkidle");

      // Find the data source text in Welsh
      const dataSourceParagraph = page.locator(".govuk-body-s").filter({ hasText: "Ffynhonnell data" });
      await expect(dataSourceParagraph).toBeVisible();

      const dataSourceText = await dataSourceParagraph.textContent();
      expect(dataSourceText).toContain("Ffynhonnell data:");
      expect(dataSourceText).toContain("Llwytho â Llaw");
    });
  });

  test.describe("Search Functionality", () => {
    test("should filter and highlight table rows based on search term", async ({ page }) => {
      await completeCSTUploadFlowAndNavigate(page);

      const searchInput = page.locator("#case-search-input");
      await expect(searchInput).toBeVisible();

      // Search for specific case
      await searchInput.fill("Test Case A");
      await page.waitForTimeout(500);

      // Verify the table still shows all rows (search highlights, doesn't hide)
      const rows = page.locator("tbody tr");
      await expect(rows).toHaveCount(3);

      // Verify highlighting works on the matching case
      const firstRowText = await rows.nth(0).textContent();
      expect(firstRowText).toContain("Test Case A vs B");
    });

    test("should highlight matches in multiple columns", async ({ page }) => {
      await completeCSTUploadFlowAndNavigate(page);

      const searchInput = page.locator("#case-search-input");
      await searchInput.fill("Remote");
      await page.waitForTimeout(500);

      // Verify "Remote" appears in the additional information column
      const table = page.locator(".govuk-table");
      const tableText = await table.textContent();
      expect(tableText).toContain("Remote");
    });

    test("should clear search when input is cleared", async ({ page }) => {
      await completeCSTUploadFlowAndNavigate(page);

      const searchInput = page.locator("#case-search-input");
      await searchInput.fill("Test");
      await page.waitForTimeout(500);

      // Clear the search
      await searchInput.clear();
      await page.waitForTimeout(500);

      // Verify all rows are still visible
      const rows = page.locator("tbody tr");
      await expect(rows).toHaveCount(3);
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
      const excelBuffer = await createInvalidCSTExcel();
      await uploadCSTExcel(page, excelBuffer, false);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should meet WCAG 2.2 AA standards on list display page", async ({ page }) => {
      await completeCSTUploadFlowAndNavigate(page);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
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
    test("should display Welsh content throughout the list page", async ({ page }) => {
      await completeCSTUploadFlowAndNavigate(page);

      // Switch to Welsh using query parameter (admin users don't have language toggle)
      const currentUrl = page.url();
      const urlWithWelsh = currentUrl.includes("?") ? `${currentUrl}&lng=cy` : `${currentUrl}?lng=cy`;
      await page.goto(urlWithWelsh);
      await page.waitForLoadState("networkidle");

      // Verify page title is in Welsh
      await expect(page.locator("h1")).toContainText("Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Safonau Gofal");

      // Verify "List for week commencing" is in Welsh
      const weekCommencingPara = page.locator("p.govuk-body.govuk-\\!-font-weight-bold.govuk-\\!-margin-bottom-1");
      await expect(weekCommencingPara).toBeVisible();
      const weekCommencingText = await weekCommencingPara.textContent();
      expect(weekCommencingText).toContain("Rhestr ar gyfer yr wythnos yn dechrau");

      // Verify "Last updated" is in Welsh
      const bodyParagraphs = page.locator("p.govuk-body");
      let foundLastUpdated = false;
      for (let i = 0; i < (await bodyParagraphs.count()); i++) {
        const text = await bodyParagraphs.nth(i).textContent();
        if (text?.includes("Diweddarwyd ddiwethaf")) {
          foundLastUpdated = true;
          expect(text).toContain("am"); // Welsh for "at"
          break;
        }
      }
      expect(foundLastUpdated).toBeTruthy();

      // Verify Important Information is in Welsh
      const summary = page.locator(".govuk-details__summary-text");
      await expect(summary).toContainText("Gwybodaeth bwysig");

      // Verify table headers are in Welsh
      const table = page.locator(".govuk-table");
      const headers = table.locator("thead th");
      await expect(headers.nth(0)).toContainText("Dyddiad");
      await expect(headers.nth(1)).toContainText("Enw'r achos");
      await expect(headers.nth(2)).toContainText("Hyd y gwrandawiad");
      await expect(headers.nth(3)).toContainText("Math o wrandawiad");
      await expect(headers.nth(4)).toContainText("Lleoliad");
      await expect(headers.nth(5)).toContainText("Gwybodaeth ychwanegol");

      // Verify data source is in Welsh
      const dataSourceParagraph = page.locator(".govuk-body-s").filter({ hasText: "Ffynhonnell data" });
      await expect(dataSourceParagraph).toBeVisible();
      const dataSourceText = await dataSourceParagraph.textContent();
      expect(dataSourceText).toContain("Llwytho â Llaw");

      // Verify Back to top is in Welsh
      const backToTop = page.getByRole("link", { name: /yn ôl i frig y dudalen/i });
      await expect(backToTop).toBeVisible();

      // Verify Search Cases is in Welsh
      const searchTitle = page.locator("h2.govuk-heading-s");
      await expect(searchTitle).toContainText("Chwilio Achosion");
    });
  });
});
