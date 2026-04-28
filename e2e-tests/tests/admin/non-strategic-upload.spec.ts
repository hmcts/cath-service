import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
// @ts-expect-error - ExcelJS is a CommonJS module, TypeScript doesn't recognize default export but it works at runtime
import ExcelJSPkg from "exceljs";
import { createUniqueTestLocation } from "../../utils/dynamic-test-data.js";
import { loginWithSSO } from "../../utils/sso-helpers.js";

const { Workbook } = ExcelJSPkg;

let testLocationId: number;

// Note: target-size and link-name rules are disabled due to pre-existing site-wide footer accessibility issues

async function createMinimalExcelFile(): Promise<Buffer> {
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet("Sheet1");

  // CST required headers
  worksheet.addRow(["Date", "Case name", "Hearing length", "Hearing type", "Venue", "Additional information"]);
  // CST data row
  worksheet.addRow(["01/01/2026", "Test Case A vs B", "1 hour", "Substantive hearing", "Care Standards Tribunal", "Remote hearing"]);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function authenticateSystemAdmin(page: Page) {
  await page.goto("/system-admin-dashboard");
  if (page.url().includes("login.microsoftonline.com")) {
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
  }
}

test.describe
  .skip("Non-Strategic Upload", () => {
    test.beforeAll(async () => {
      const testLocation = await createUniqueTestLocation({ namePrefix: "Non-Strategic Upload Court" });
      testLocationId = testLocation.locationId;
    });

    test.beforeEach(async ({ page }) => {
      await authenticateSystemAdmin(page);
    });

    test("complete non-strategic upload journey with form validation, summary, success, Welsh, and accessibility", async ({ page }) => {
      // STEP 1: Load form page and verify all elements
      await page.goto("/non-strategic-upload");
      await expect(page).toHaveTitle("Upload - Upload Excel file - Court and tribunal hearings - GOV.UK");

      const heading = page.getByRole("heading", { name: /upload Excel file/i });
      await expect(heading).toBeVisible();

      // Verify form fields exist
      const fileUpload = page.locator('input[name="file"]');
      await expect(fileUpload).toBeVisible();

      const courtInput = page.getByRole("combobox", { name: /court name or tribunal name/i });
      await courtInput.waitFor({ state: "visible", timeout: 10000 });
      await expect(courtInput).toBeVisible();

      await expect(page.locator('select[name="listType"]')).toBeVisible();
      await expect(page.locator('input[name="hearingStartDate-day"]')).toBeVisible();
      await expect(page.locator('select[name="sensitivity"]')).toBeVisible();
      await expect(page.locator('select[name="language"]')).toBeVisible();
      await expect(page.locator('input[name="displayFrom-day"]')).toBeVisible();
      await expect(page.locator('input[name="displayTo-day"]')).toBeVisible();

      // STEP 2: Test empty form validation
      await page.getByRole("button", { name: /continue/i }).click();
      await expect(page).toHaveURL("/non-strategic-upload");

      let errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      const fileErrorMessage = page.locator("#file").locator("..").locator(".govuk-error-message");
      await expect(fileErrorMessage).toBeVisible();

      // STEP 3: Test accessibility with error state
      let accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // STEP 4: Test invalid file type validation
      await page.goto(`/non-strategic-upload?locationId=${testLocationId}`);
      await page.waitForTimeout(1000);

      await page.selectOption('select[name="listType"]', "9");
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

      await page.getByRole("button", { name: /continue/i }).click();
      await expect(page).toHaveURL(/\/non-strategic-upload/);

      errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();
      const errorLink = errorSummary.getByRole("link", { name: /the selected file type is not supported/i });
      await expect(errorLink).toBeVisible();

      // STEP 5: Test file size validation
      const largeBuffer = Buffer.alloc(3 * 1024 * 1024);
      await fileInput.setInputFiles({
        name: "large-file.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: largeBuffer
      });

      await page.getByRole("button", { name: /continue/i }).click();
      errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();
      await expect(errorSummary.getByRole("link", { name: /the selected file must be smaller than 2mb/i })).toBeVisible();

      // STEP 6: Test date range validation (re-fill all fields since form state may be lost after validation errors)
      await page.goto(`/non-strategic-upload?locationId=${testLocationId}`);
      await page.waitForTimeout(1000);

      await page.selectOption('select[name="listType"]', "9");
      await page.fill('input[name="hearingStartDate-day"]', "15");
      await page.fill('input[name="hearingStartDate-month"]', "06");
      await page.fill('input[name="hearingStartDate-year"]', "2025");
      await page.selectOption('select[name="sensitivity"]', "PUBLIC");
      await page.selectOption('select[name="language"]', "ENGLISH");
      await page.fill('input[name="displayFrom-day"]', "20");
      await page.fill('input[name="displayFrom-month"]', "06");
      await page.fill('input[name="displayFrom-year"]', "2025");
      await page.fill('input[name="displayTo-day"]', "10"); // Invalid: to date (10) before from date (20)
      await page.fill('input[name="displayTo-month"]', "06");
      await page.fill('input[name="displayTo-year"]', "2025");

      const fileInputStep6 = page.locator('input[name="file"]');
      await fileInputStep6.setInputFiles({
        name: "test.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: await createMinimalExcelFile()
      });

      await page.getByRole("button", { name: /continue/i }).click();
      errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();
      await expect(errorSummary.getByRole("link", { name: /'display to' date must be the same as or later than 'display from' date/i })).toBeVisible();

      // STEP 7: Complete valid form submission
      await page.goto(`/non-strategic-upload?locationId=${testLocationId}`);
      await page.waitForTimeout(1000);

      await page.selectOption('select[name="listType"]', "9");
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
        name: "test-hearing-list.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: await createMinimalExcelFile()
      });

      await page.getByRole("button", { name: /continue/i }).click();
      await page.waitForURL(/\/non-strategic-upload-summary\?uploadId=/, { timeout: 10000 });

      // STEP 8: Verify summary page
      await expect(page.locator("h1")).toHaveText("File upload summary");

      const values = page.locator(".govuk-summary-list__value");
      await expect(values.nth(1)).toContainText("test-hearing-list.xlsx");
      await expect(values.nth(2)).toContainText("Care Standards Tribunal Weekly Hearing List");
      await expect(values.nth(3)).toContainText("23 October 2025");
      await expect(values.nth(4)).toContainText("Public");
      await expect(values.nth(5)).toContainText("English");
      await expect(values.nth(6)).toContainText("20 October 2025 to 30 October 2025");

      // Verify change links
      const changeLinks = page.locator(".govuk-summary-list__actions a");
      await expect(changeLinks).toHaveCount(7);
      for (let i = 0; i < 7; i++) {
        await expect(changeLinks.nth(i)).toContainText("Change");
      }

      // Test accessibility on summary page
      accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // STEP 9: Confirm upload
      await page.getByRole("button", { name: "Confirm" }).click();
      await page.waitForURL("/non-strategic-upload-success", { timeout: 10000 });

      // STEP 10: Verify success page
      const successPanel = page.locator(".govuk-panel");
      await expect(successPanel).toBeVisible();
      await expect(page.locator(".govuk-panel__title")).toHaveText("File upload successful");
      await expect(successPanel).toContainText("Your file has been uploaded");

      // Verify next steps links
      const uploadLink = page.getByRole("link", { name: "Upload another file" });
      await expect(uploadLink).toBeVisible();
      await expect(uploadLink).toHaveAttribute("href", "/non-strategic-upload");

      const removeLink = page.getByRole("link", { name: "Remove file" });
      await expect(removeLink).toBeVisible();

      const homeLink = page.getByRole("link", { name: "Home" });
      await expect(homeLink).toBeVisible();

      // Test accessibility on success page
      accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // STEP 11: Test Welsh on success page
      await page.goto("/non-strategic-upload-success?lng=cy");
      await expect(page.locator(".govuk-panel__title")).toHaveText("Wedi llwyddo i uwchlwytho ffeiliau");
      await expect(page.getByRole("heading", { name: "Beth yr ydych eisiau ei wneud nesaf?" })).toBeVisible();
      await expect(page.getByRole("link", { name: "uwchlwytho ffeil arall" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Dileu ffeil" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Tudalen hafan" })).toBeVisible();

      // STEP 12: Test keyboard navigation - navigate back to upload (from Welsh page)
      const welshUploadLink = page.getByRole("link", { name: "uwchlwytho ffeil arall" });
      await welshUploadLink.focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL("/non-strategic-upload");
    });

    test("court name validation and autocomplete functionality @nightly", async ({ page }) => {
      await page.goto("/non-strategic-upload");

      const courtInput = page.getByRole("combobox", { name: /court name or tribunal name/i });
      await courtInput.waitFor({ state: "visible", timeout: 10000 });
      await expect(courtInput).toHaveAttribute("role", "combobox");

      const fileInput = page.locator('input[name="file"]');
      await fileInput.setInputFiles({
        name: "test.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: await createMinimalExcelFile()
      });

      // Test empty court name validation
      await page.getByRole("button", { name: /continue/i }).click();
      let errorSummary = page.locator(".govuk-error-summary");
      let errorLink = errorSummary.getByRole("link", { name: /court name must be three characters or more/i });
      await expect(errorLink).toBeVisible();

      // Test short court name validation
      await courtInput.fill("AB");
      await page.getByRole("button", { name: /continue/i }).click();
      errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();
      errorLink = errorSummary.getByRole("link", { name: /court name must be three characters or more/i });
      await expect(errorLink).toBeVisible();

      // Test invalid court name validation
      await courtInput.fill("Invalid Court Name That Does Not Exist");
      await page.waitForTimeout(500); // Wait for autocomplete to settle
      await page.getByRole("button", { name: /continue/i }).click();
      errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible({ timeout: 10000 });
      errorLink = errorSummary.getByRole("link", { name: /please enter and select a valid court/i });
      await expect(errorLink).toBeVisible();

      // Verify court name value is preserved after validation error
      const preservedCourtName = "Invalid Court Name";
      await courtInput.fill(preservedCourtName);
      await page.waitForTimeout(500); // Wait for autocomplete to settle
      await page.getByRole("button", { name: /continue/i }).click();
      await page.waitForTimeout(500); // Wait for page to reload with preserved value
      await expect(courtInput).toHaveValue(preservedCourtName, { timeout: 10000 });
    });

    test("session management - redirect and refresh behavior @nightly", async ({ page }) => {
      // Test direct access to success page without session redirects
      await page.goto("/non-strategic-upload-success");
      await expect(page).toHaveURL("/non-strategic-upload");

      // Complete an upload
      await page.goto(`/non-strategic-upload?locationId=${testLocationId}`);
      await page.waitForTimeout(1000);

      await page.selectOption('select[name="listType"]', "9");
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
        name: "test-session.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: await createMinimalExcelFile()
      });

      await page.getByRole("button", { name: /continue/i }).click();
      await page.waitForURL(/\/non-strategic-upload-summary\?uploadId=/);
      await page.getByRole("button", { name: "Confirm" }).click();
      await page.waitForURL("/non-strategic-upload-success");

      // Refresh should redirect back to non-strategic-upload (session cleared)
      await page.reload();
      await expect(page).toHaveURL("/non-strategic-upload");

      // Test multiple sequential uploads work
      await page.goto(`/non-strategic-upload?locationId=${testLocationId}`);
      await page.waitForTimeout(1000);

      await page.selectOption('select[name="listType"]', "9");
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

      await fileInput.setInputFiles({
        name: "second-upload.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: await createMinimalExcelFile()
      });

      await page.getByRole("button", { name: /continue/i }).click();
      await page.waitForURL(/\/non-strategic-upload-summary\?uploadId=/);
      await page.getByRole("button", { name: "Confirm" }).click();
      await page.waitForURL("/non-strategic-upload-success");
      await expect(page).toHaveURL("/non-strategic-upload-success");
    });
  });
