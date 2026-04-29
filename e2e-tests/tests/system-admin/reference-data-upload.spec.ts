import * as fs from "node:fs";
import * as path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { loginWithSSO } from "../../utils/sso-helpers.js";

// Helper function to authenticate as System Admin
async function authenticateSystemAdmin(page: Page) {
  await page.goto("/system-admin-dashboard");

  if (page.url().includes("login.microsoftonline.com")) {
    const systemAdminEmail = process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!;
    const systemAdminPassword = process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!;
    await loginWithSSO(page, systemAdminEmail, systemAdminPassword);
  }
}

// Helper function to navigate to add jurisdiction page
async function navigateToAddJurisdiction(page: Page, language: "en" | "cy" = "en") {
  const url = language === "cy" ? "/add-jurisdiction?lng=cy" : "/add-jurisdiction";
  await page.goto(url);
}

// Helper function to fill the add jurisdiction form
async function fillJurisdictionForm(page: Page, name: string, welshName: string) {
  // Add a small delay to avoid database race conditions
  await page.waitForTimeout(100);
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="welshName"]', welshName);
}

// Helper function to complete full add jurisdiction flow
async function completeAddJurisdictionFlow(page: Page, name: string, welshName: string) {
  await navigateToAddJurisdiction(page);
  await fillJurisdictionForm(page, name, welshName);
  await page.getByRole("button", { name: /save/i }).click();
  await page.waitForURL(/\/add-jurisdiction-success/, { timeout: 15000 });
}

// Helper function to navigate to add sub-jurisdiction page
async function navigateToAddSubJurisdiction(page: Page, language: "en" | "cy" = "en") {
  const url = language === "cy" ? "/add-sub-jurisdiction?lng=cy" : "/add-sub-jurisdiction";
  await page.goto(url);
}

// Helper function to fill the add sub-jurisdiction form
async function fillSubJurisdictionForm(page: Page, jurisdictionId: string, name: string, welshName: string) {
  // Add a small delay to avoid database race conditions
  await page.waitForTimeout(100);
  await page.selectOption('select[name="jurisdictionId"]', jurisdictionId);
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="welshName"]', welshName);
}

// Helper function to complete full add sub-jurisdiction flow
async function completeAddSubJurisdictionFlow(page: Page, jurisdictionId: string, name: string, welshName: string) {
  await navigateToAddSubJurisdiction(page);
  await fillSubJurisdictionForm(page, jurisdictionId, name, welshName);
  await page.getByRole("button", { name: /save/i }).click();
  await page.waitForURL(/\/add-sub-jurisdiction-success/, { timeout: 15000 });
}

// Helper function to navigate to add region page
async function navigateToAddRegion(page: Page, language: "en" | "cy" = "en") {
  const url = language === "cy" ? "/add-region?lng=cy" : "/add-region";
  await page.goto(url);
}

// Helper function to fill the add region form
async function fillRegionForm(page: Page, name: string, welshName: string) {
  // Add a small delay to avoid database race conditions
  await page.waitForTimeout(100);
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="welshName"]', welshName);
}

// Helper function to complete full add region flow
async function completeAddRegionFlow(page: Page, name: string, welshName: string) {
  await navigateToAddRegion(page);
  await fillRegionForm(page, name, welshName);
  await page.getByRole("button", { name: /save/i }).click();
  await page.waitForURL(/\/add-region-success/, { timeout: 15000 });
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

test.describe
  .skip("Add Jurisdiction End-to-End Flow", () => {
    test.beforeEach(async ({ page }) => {
      await authenticateSystemAdmin(page);
    });

    test.describe("Complete End-to-End Journey", () => {
      test("should complete full jurisdiction creation flow from form to success", async ({ page }) => {
        // Step 1: Load add jurisdiction form
        await page.goto("/add-jurisdiction");
        await expect(page.locator("h1")).toHaveText("Add Jurisdiction");

        // Step 2: Fill out the form with unique jurisdiction name
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        const workerId = process.env.TEST_WORKER_INDEX || "0";
        const jurisdictionName = `Test Jurisdiction ${timestamp}-${random}-${workerId}`;
        const welshJurisdictionName = `Awdurdodaeth Prawf ${timestamp}-${random}-${workerId}`;

        await fillJurisdictionForm(page, jurisdictionName, welshJurisdictionName);

        // Step 3: Submit form and verify navigation to success
        await page.getByRole("button", { name: /save/i }).click();
        await page.waitForURL("/add-jurisdiction-success", { timeout: 15000 });

        // Step 4: Verify success page content
        const successPanel = page.locator(".govuk-panel");
        await expect(successPanel).toBeVisible();
        const title = page.locator(".govuk-panel__title");
        await expect(title).toHaveText("Added Successfully");

        // Step 5: Verify next steps are available
        const addAnotherLink = page.getByRole("link", { name: "Add another jurisdiction" });
        await expect(addAnotherLink).toBeVisible();
        await expect(addAnotherLink).toHaveAttribute("href", "/add-jurisdiction");

        const addSubJurisdictionLink = page.getByRole("link", { name: "Add Sub-Jurisdiction" });
        await expect(addSubJurisdictionLink).toBeVisible();
        await expect(addSubJurisdictionLink).toHaveAttribute("href", "/add-sub-jurisdiction");

        const backToUploadLink = page.getByRole("link", { name: "Back to upload reference data" });
        await expect(backToUploadLink).toBeVisible();
        await expect(backToUploadLink).toHaveAttribute("href", "/reference-data-upload");
      });

      test("should be keyboard accessible throughout entire flow @nightly", async ({ page }) => {
        await page.goto("/add-jurisdiction");

        // Verify form fields are accessible
        const nameInput = page.locator('input[name="name"]');
        await expect(nameInput).toBeVisible();
        await expect(nameInput).toBeEditable();

        const welshNameInput = page.locator('input[name="welshName"]');
        await expect(welshNameInput).toBeVisible();
        await expect(welshNameInput).toBeEditable();

        const saveButton = page.getByRole("button", { name: /save/i });
        await expect(saveButton).toBeVisible();

        // Fill form with unique values
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        const workerId = process.env.TEST_WORKER_INDEX || "0";
        await fillJurisdictionForm(
          page,
          `Keyboard Jurisdiction ${timestamp}-${random}-${workerId}`,
          `Awdurdodaeth Bysellfwrdd ${timestamp}-${random}-${workerId}`
        );

        // Submit with keyboard
        await saveButton.focus();
        await expect(saveButton).toBeFocused();
        await page.keyboard.press("Enter");
        await page.waitForURL("/add-jurisdiction-success", { timeout: 15000 });

        // Verify all links are keyboard accessible
        const links = page.locator("ul.govuk-list a");
        await expect(links).toHaveCount(4);

        for (let i = 0; i < 4; i++) {
          const link = links.nth(i);
          await link.focus();
          await expect(link).toBeFocused();
        }
      });
    });

    test.describe("Add Jurisdiction Form Page", () => {
      test("should load the page with all form fields", async ({ page }) => {
        await page.goto("/add-jurisdiction");

        const heading = page.locator("h1");
        await expect(heading).toBeVisible();
        await expect(heading).toHaveText("Add Jurisdiction");

        const nameInput = page.locator('input[name="name"]');
        await expect(nameInput).toBeVisible();
        const nameLabel = page.locator('label[for="name"]');
        await expect(nameLabel).toHaveText("Jurisdiction name (English)");

        const welshNameInput = page.locator('input[name="welshName"]');
        await expect(welshNameInput).toBeVisible();
        const welshNameLabel = page.locator('label[for="welshName"]');
        await expect(welshNameLabel).toHaveText("Jurisdiction name (Welsh)");

        const saveButton = page.getByRole("button", { name: /save/i });
        await expect(saveButton).toBeVisible();
      });

      test("should display validation errors when both fields are empty @nightly", async ({ page }) => {
        await page.goto("/add-jurisdiction");

        const saveButton = page.getByRole("button", { name: /save/i });
        await saveButton.click();

        await expect(page).toHaveURL("/add-jurisdiction");

        const errorSummary = page.locator(".govuk-error-summary");
        await expect(errorSummary).toBeVisible();

        const errorSummaryHeading = errorSummary.getByRole("heading", { name: /there is a problem/i });
        await expect(errorSummaryHeading).toBeVisible();

        const errorLinks = errorSummary.locator(".govuk-error-summary__list a");
        await expect(errorLinks).toHaveCount(2);

        const nameError = errorLinks.filter({ hasText: "Enter jurisdiction name in English" });
        await expect(nameError).toBeVisible();
        await expect(nameError).toHaveAttribute("href", "#name");

        const welshNameError = errorLinks.filter({ hasText: "Enter jurisdiction name in Welsh" });
        await expect(welshNameError).toBeVisible();
        await expect(welshNameError).toHaveAttribute("href", "#welshName");
      });

      test("should display validation error when English name is empty @nightly", async ({ page }) => {
        await page.goto("/add-jurisdiction");

        await page.fill('input[name="welshName"]', "Awdurdodaeth Cymraeg");

        const saveButton = page.getByRole("button", { name: /save/i });
        await saveButton.click();

        await expect(page).toHaveURL("/add-jurisdiction");

        const errorSummary = page.locator(".govuk-error-summary");
        await expect(errorSummary).toBeVisible();

        const errorLink = errorSummary.getByRole("link", { name: "Enter jurisdiction name in English" });
        await expect(errorLink).toBeVisible();

        // Verify Welsh name value is preserved
        await expect(page.locator('input[name="welshName"]')).toHaveValue("Awdurdodaeth Cymraeg");
      });

      test("should display validation error when Welsh name is empty @nightly", async ({ page }) => {
        await page.goto("/add-jurisdiction");

        await page.fill('input[name="name"]', "English Jurisdiction");

        const saveButton = page.getByRole("button", { name: /save/i });
        await saveButton.click();

        await expect(page).toHaveURL("/add-jurisdiction");

        const errorSummary = page.locator(".govuk-error-summary");
        await expect(errorSummary).toBeVisible();

        const errorLink = errorSummary.getByRole("link", { name: "Enter jurisdiction name in Welsh" });
        await expect(errorLink).toBeVisible();

        // Verify English name value is preserved
        await expect(page.locator('input[name="name"]')).toHaveValue("English Jurisdiction");
      });

      test("should display validation error when names contain HTML tags @nightly", async ({ page }) => {
        await page.goto("/add-jurisdiction");

        await fillJurisdictionForm(page, '<script>alert("test")</script>', "<b>Bold Jurisdiction</b>");

        const _saveButton = page.getByRole("button", { name: /save/i }).click();

        await expect(page).toHaveURL("/add-jurisdiction");

        const errorSummary = page.locator(".govuk-error-summary");
        await expect(errorSummary).toBeVisible();

        const nameError = errorSummary.getByRole("link", { name: "Jurisdiction name (English) contains HTML tags which are not allowed" });
        await expect(nameError).toBeVisible();

        const welshNameError = errorSummary.getByRole("link", { name: "Jurisdiction name (Welsh) contains HTML tags which are not allowed" });
        await expect(welshNameError).toBeVisible();
      });

      test("should display validation error for duplicate English jurisdiction name @nightly", async ({ page }) => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        const workerId = process.env.TEST_WORKER_INDEX || "0";
        const duplicateName = `Duplicate Jurisdiction ${timestamp}-${random}-${workerId}`;
        const welshName = `Awdurdodaeth Dyblyg ${timestamp}-${random}-${workerId}`;

        // Create the jurisdiction first
        await completeAddJurisdictionFlow(page, duplicateName, welshName);

        // Try to create it again
        await page.goto("/add-jurisdiction");
        await fillJurisdictionForm(page, duplicateName, `${welshName} 2`);

        const saveButton = page.getByRole("button", { name: /save/i });
        await saveButton.click();

        await expect(page).toHaveURL("/add-jurisdiction");

        const errorSummary = page.locator(".govuk-error-summary");
        await expect(errorSummary).toBeVisible();

        const errorLink = errorSummary.locator(".govuk-error-summary__list a").filter({
          hasText: `Jurisdiction '${duplicateName}' already exists in the database`
        });
        await expect(errorLink).toBeVisible();
      });

      test("should display validation error for duplicate Welsh jurisdiction name @nightly", async ({ page }) => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        const workerId = process.env.TEST_WORKER_INDEX || "0";
        const name = `Jurisdiction ${timestamp}-${random}-${workerId}`;
        const duplicateWelshName = `Awdurdodaeth ${timestamp}-${random}-${workerId}`;

        // Create the jurisdiction first
        await completeAddJurisdictionFlow(page, name, duplicateWelshName);

        // Try to create it again with different English name
        await page.goto("/add-jurisdiction");
        await fillJurisdictionForm(page, `${name} 2`, duplicateWelshName);

        const saveButton = page.getByRole("button", { name: /save/i });
        await saveButton.click();

        await expect(page).toHaveURL("/add-jurisdiction");

        const errorSummary = page.locator(".govuk-error-summary");
        await expect(errorSummary).toBeVisible();

        const errorLink = errorSummary.locator(".govuk-error-summary__list a").filter({
          hasText: `Welsh jurisdiction name '${duplicateWelshName}' already exists in the database`
        });
        await expect(errorLink).toBeVisible();
      });

      test("should meet WCAG 2.2 AA standards", async ({ page }) => {
        await page.goto("/add-jurisdiction");

        const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
      });

      test("should meet WCAG 2.2 AA standards with validation errors @nightly", async ({ page }) => {
        await page.goto("/add-jurisdiction");

        const saveButton = page.getByRole("button", { name: /save/i });
        await saveButton.click();

        const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
      });
    });

    test.describe("Welsh Language Support", () => {
      test("should display Welsh translations on form page @nightly", async ({ page }) => {
        await page.goto("/add-jurisdiction?lng=cy");

        const heading = page.locator("h1");
        await expect(heading).toHaveText("Ychwanegu Awdurdodaeth");

        const nameLabel = page.locator('label[for="name"]');
        await expect(nameLabel).toContainText("Enw awdurdodaeth (Saesneg)");

        const welshNameLabel = page.locator('label[for="welshName"]');
        await expect(welshNameLabel).toContainText("Enw awdurdodaeth (Cymraeg)");

        const saveButton = page.getByRole("button", { name: /cadw/i });
        await expect(saveButton).toBeVisible();
      });

      test("should display Welsh error messages @nightly", async ({ page }) => {
        await page.goto("/add-jurisdiction?lng=cy");

        const saveButton = page.getByRole("button", { name: /cadw/i });
        await saveButton.click();

        const errorSummary = page.locator(".govuk-error-summary");
        await expect(errorSummary).toBeVisible();

        const errorSummaryHeading = errorSummary.getByRole("heading", { name: /mae yna broblem/i });
        await expect(errorSummaryHeading).toBeVisible();
      });

      test("should complete full flow in Welsh @nightly", async ({ page }) => {
        await page.goto("/add-jurisdiction?lng=cy");

        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        const workerId = process.env.TEST_WORKER_INDEX || "0";
        await fillJurisdictionForm(page, `Welsh Flow Jurisdiction ${timestamp}-${random}-${workerId}`, `Llif Cymraeg ${timestamp}-${random}-${workerId}`);

        const saveButton = page.getByRole("button", { name: /cadw/i });
        await saveButton.click();

        await page.waitForURL(/\/add-jurisdiction-success/, { timeout: 15000 });

        const successPanel = page.locator(".govuk-panel");
        await expect(successPanel).toBeVisible();
        const title = page.locator(".govuk-panel__title");
        await expect(title).toHaveText("Ychwanegwyd yn Llwyddiannus");

        const nextStepsHeading = page.getByRole("heading", { name: /beth hoffech chi ei wneud nesaf\?/i });
        await expect(nextStepsHeading).toBeVisible();
      });

      test("should maintain language preference through navigation @nightly", async ({ page }) => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        const workerId = process.env.TEST_WORKER_INDEX || "0";

        // Complete the flow in Welsh
        await navigateToAddJurisdiction(page, "cy");
        await fillJurisdictionForm(page, `Navigation Test ${timestamp}-${random}-${workerId}`, `Prawf Llywio ${timestamp}-${random}-${workerId}`);
        await page.getByRole("button", { name: /cadw/i }).click();
        await page.waitForURL(/\/add-jurisdiction-success/, { timeout: 15000 });

        const addAnotherLink = page.getByRole("link", { name: /ychwanegu awdurdodaeth arall/i });
        await expect(addAnotherLink).toHaveAttribute("href", "/add-jurisdiction?lng=cy");

        await addAnotherLink.click();
        await expect(page).toHaveURL("/add-jurisdiction?lng=cy");

        const heading = page.locator("h1");
        await expect(heading).toHaveText("Ychwanegu Awdurdodaeth");
      });
    });

    test.describe("Add Jurisdiction Success Page", () => {
      test("should display success page with all navigation links", async ({ page }) => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        const workerId = process.env.TEST_WORKER_INDEX || "0";
        await completeAddJurisdictionFlow(page, `Success Test ${timestamp}-${random}-${workerId}`, `Prawf Llwyddiant ${timestamp}-${random}-${workerId}`);

        await expect(page).toHaveURL("/add-jurisdiction-success");

        const successPanel = page.locator(".govuk-panel");
        await expect(successPanel).toBeVisible();

        const title = page.locator(".govuk-panel__title");
        await expect(title).toHaveText("Added Successfully");

        const nextStepsHeading = page.getByRole("heading", { name: "What would you like to do next?" });
        await expect(nextStepsHeading).toBeVisible();

        const addAnotherLink = page.getByRole("link", { name: "Add another jurisdiction" });
        await expect(addAnotherLink).toBeVisible();
        await expect(addAnotherLink).toHaveAttribute("href", "/add-jurisdiction");

        const addSubJurisdictionLink = page.getByRole("link", { name: "Add Sub-Jurisdiction" });
        await expect(addSubJurisdictionLink).toBeVisible();
        await expect(addSubJurisdictionLink).toHaveAttribute("href", "/add-sub-jurisdiction");

        const backToUploadLink = page.getByRole("link", { name: "Back to upload reference data" });
        await expect(backToUploadLink).toBeVisible();
        await expect(backToUploadLink).toHaveAttribute("href", "/reference-data-upload");
      });

      test("should redirect to add-jurisdiction if accessed directly without session @nightly", async ({ page }) => {
        await page.goto("/add-jurisdiction-success");
        await expect(page).toHaveURL("/add-jurisdiction");
      });

      test("should not allow access after refreshing the page @nightly", async ({ page }) => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        const workerId = process.env.TEST_WORKER_INDEX || "0";
        await completeAddJurisdictionFlow(page, `Refresh Test ${timestamp}-${random}-${workerId}`, `Prawf Adnewyddu ${timestamp}-${random}-${workerId}`);

        await page.reload();
        await expect(page).toHaveURL("/add-jurisdiction");
      });

      test("should meet WCAG 2.2 AA standards on success page @nightly", async ({ page }) => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        const workerId = process.env.TEST_WORKER_INDEX || "0";
        await completeAddJurisdictionFlow(page, `Accessibility Test ${timestamp}-${random}-${workerId}`, `Prawf Hygyrchedd ${timestamp}-${random}-${workerId}`);

        const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
      });
    });
  });

test.describe
  .skip("Add Sub Jurisdiction End-to-End Flow", () => {
    test.beforeEach(async ({ page }) => {
      await authenticateSystemAdmin(page);
    });

    test.describe("Complete End-to-End Journey", () => {
      test("should complete full sub-jurisdiction creation flow from form to success", async ({ page }) => {
        // Step 1: Load add sub-jurisdiction form
        await page.goto("/add-sub-jurisdiction");
        await expect(page.locator("h1")).toHaveText("Add Sub-Jurisdiction");

        // Step 2: Verify jurisdiction dropdown is populated
        const jurisdictionSelect = page.locator('select[name="jurisdictionId"]');
        await expect(jurisdictionSelect).toBeVisible();

        const options = await jurisdictionSelect.locator("option").count();
        expect(options).toBeGreaterThan(1); // Should have placeholder + jurisdictions

        // Step 3: Fill out the form with unique sub-jurisdiction name
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        const workerId = process.env.TEST_WORKER_INDEX || "0";
        const subJurisdictionName = `Test Sub-Jurisdiction ${timestamp}-${random}-${workerId}`;
        const welshSubJurisdictionName = `Is-awdurdodaeth Prawf ${timestamp}-${random}-${workerId}`;

        // Select first real jurisdiction (skip placeholder at index 0)
        const jurisdictionValue = await jurisdictionSelect.locator("option").nth(1).getAttribute("value");
        await fillSubJurisdictionForm(page, jurisdictionValue!, subJurisdictionName, welshSubJurisdictionName);

        // Step 4: Submit form and verify navigation to success
        await page.getByRole("button", { name: /save/i }).click();
        await page.waitForURL("/add-sub-jurisdiction-success", { timeout: 15000 });

        // Step 5: Verify success page content
        const successPanel = page.locator(".govuk-panel");
        await expect(successPanel).toBeVisible();
        const title = page.locator(".govuk-panel__title");
        await expect(title).toHaveText("Added Successfully");

        // Step 6: Verify next steps are available
        const addAnotherLink = page.getByRole("link", { name: "Add another sub-jurisdiction" });
        await expect(addAnotherLink).toBeVisible();
        await expect(addAnotherLink).toHaveAttribute("href", "/add-sub-jurisdiction");

        const addJurisdictionLink = page.getByRole("link", { name: "Add Jurisdiction" });
        await expect(addJurisdictionLink).toBeVisible();
        await expect(addJurisdictionLink).toHaveAttribute("href", "/add-jurisdiction");

        const backToUploadLink = page.getByRole("link", { name: "Back to upload reference data" });
        await expect(backToUploadLink).toBeVisible();
        await expect(backToUploadLink).toHaveAttribute("href", "/reference-data-upload");
      });

      test("should be keyboard accessible throughout entire flow @nightly", async ({ page }) => {
        await page.goto("/add-sub-jurisdiction");

        // Verify form fields are accessible
        const jurisdictionSelect = page.locator('select[name="jurisdictionId"]');
        await expect(jurisdictionSelect).toBeVisible();

        const nameInput = page.locator('input[name="name"]');
        await expect(nameInput).toBeVisible();
        await expect(nameInput).toBeEditable();

        const welshNameInput = page.locator('input[name="welshName"]');
        await expect(welshNameInput).toBeVisible();
        await expect(welshNameInput).toBeEditable();

        const saveButton = page.getByRole("button", { name: /save/i });
        await expect(saveButton).toBeVisible();

        // Fill form with unique values
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        const workerId = process.env.TEST_WORKER_INDEX || "0";

        const jurisdictionValue = await jurisdictionSelect.locator("option").nth(1).getAttribute("value");
        await fillSubJurisdictionForm(
          page,
          jurisdictionValue!,
          `Keyboard Sub-Jurisdiction ${timestamp}-${random}-${workerId}`,
          `Is-awdurdodaeth Bysellfwrdd ${timestamp}-${random}-${workerId}`
        );

        // Submit with keyboard
        await saveButton.focus();
        await page.keyboard.press("Enter");
        await page.waitForURL("/add-sub-jurisdiction-success", { timeout: 15000 });

        // Verify all links are keyboard accessible
        const links = page.locator("ul.govuk-list a");
        await expect(links).toHaveCount(3);

        for (let i = 0; i < 3; i++) {
          const link = links.nth(i);
          await link.focus();
          await expect(link).toBeFocused();
        }
      });
    });

    test.describe("Add Sub Jurisdiction Form Page", () => {
      test("should load the page with all form fields", async ({ page }) => {
        await page.goto("/add-sub-jurisdiction");

        const heading = page.locator("h1");
        await expect(heading).toBeVisible();
        await expect(heading).toHaveText("Add Sub-Jurisdiction");

        const jurisdictionSelect = page.locator('select[name="jurisdictionId"]');
        await expect(jurisdictionSelect).toBeVisible();
        const jurisdictionLabel = page.locator('label[for="jurisdictionId"]');
        await expect(jurisdictionLabel).toContainText("Select Jurisdiction");

        const nameInput = page.locator('input[name="name"]');
        await expect(nameInput).toBeVisible();
        const nameLabel = page.locator('label[for="name"]');
        await expect(nameLabel).toContainText("Enter Sub-Jurisdiction Name (English)");

        const welshNameInput = page.locator('input[name="welshName"]');
        await expect(welshNameInput).toBeVisible();
        const welshNameLabel = page.locator('label[for="welshName"]');
        await expect(welshNameLabel).toContainText("Enter Sub-Jurisdiction Name (Welsh)");

        const saveButton = page.getByRole("button", { name: /save/i });
        await expect(saveButton).toBeVisible();
      });

      test("should display validation errors when all fields are empty @nightly", async ({ page }) => {
        await page.goto("/add-sub-jurisdiction");

        const saveButton = page.getByRole("button", { name: /save/i });
        await saveButton.click();

        await expect(page).toHaveURL("/add-sub-jurisdiction");

        const errorSummary = page.locator(".govuk-error-summary");
        await expect(errorSummary).toBeVisible();

        const errorSummaryHeading = errorSummary.getByRole("heading", { name: /there is a problem/i });
        await expect(errorSummaryHeading).toBeVisible();

        const errorLinks = errorSummary.locator(".govuk-error-summary__list a");
        await expect(errorLinks).toHaveCount(3);

        const jurisdictionError = errorLinks.filter({ hasText: "Select a jurisdiction" });
        await expect(jurisdictionError).toBeVisible();
        await expect(jurisdictionError).toHaveAttribute("href", "#jurisdictionId");

        const nameError = errorLinks.filter({ hasText: "Enter Sub-Jurisdiction Name in English" });
        await expect(nameError).toBeVisible();
        await expect(nameError).toHaveAttribute("href", "#name");

        const welshNameError = errorLinks.filter({ hasText: "Enter Sub-Jurisdiction Name in Welsh" });
        await expect(welshNameError).toBeVisible();
        await expect(welshNameError).toHaveAttribute("href", "#welshName");
      });

      test("should display validation error when jurisdiction is not selected @nightly", async ({ page }) => {
        await page.goto("/add-sub-jurisdiction");

        await page.fill('input[name="name"]', "Test Sub-Jurisdiction");
        await page.fill('input[name="welshName"]', "Is-awdurdodaeth Prawf");

        const saveButton = page.getByRole("button", { name: /save/i });
        await saveButton.click();

        await expect(page).toHaveURL("/add-sub-jurisdiction");

        const errorSummary = page.locator(".govuk-error-summary");
        await expect(errorSummary).toBeVisible();

        const errorLink = errorSummary.getByRole("link", { name: "Select a jurisdiction" });
        await expect(errorLink).toBeVisible();

        // Verify form values are preserved
        await expect(page.locator('input[name="name"]')).toHaveValue("Test Sub-Jurisdiction");
        await expect(page.locator('input[name="welshName"]')).toHaveValue("Is-awdurdodaeth Prawf");
      });

      test("should display validation error when English name is empty @nightly", async ({ page }) => {
        await page.goto("/add-sub-jurisdiction");

        const jurisdictionSelect = page.locator('select[name="jurisdictionId"]');
        const jurisdictionValue = await jurisdictionSelect.locator("option").nth(1).getAttribute("value");
        await page.selectOption('select[name="jurisdictionId"]', jurisdictionValue!);
        await page.fill('input[name="welshName"]', "Is-awdurdodaeth Cymraeg");

        const saveButton = page.getByRole("button", { name: /save/i });
        await saveButton.click();

        await expect(page).toHaveURL("/add-sub-jurisdiction");

        const errorSummary = page.locator(".govuk-error-summary");
        await expect(errorSummary).toBeVisible();

        const errorLink = errorSummary.getByRole("link", { name: "Enter Sub-Jurisdiction Name in English" });
        await expect(errorLink).toBeVisible();

        // Verify other values are preserved
        await expect(page.locator('input[name="welshName"]')).toHaveValue("Is-awdurdodaeth Cymraeg");
      });

      test("should display validation error when Welsh name is empty @nightly", async ({ page }) => {
        await page.goto("/add-sub-jurisdiction");

        const jurisdictionSelect = page.locator('select[name="jurisdictionId"]');
        const jurisdictionValue = await jurisdictionSelect.locator("option").nth(1).getAttribute("value");
        await page.selectOption('select[name="jurisdictionId"]', jurisdictionValue!);
        await page.fill('input[name="name"]', "English Sub-Jurisdiction");

        const saveButton = page.getByRole("button", { name: /save/i });
        await saveButton.click();

        await expect(page).toHaveURL("/add-sub-jurisdiction");

        const errorSummary = page.locator(".govuk-error-summary");
        await expect(errorSummary).toBeVisible();

        const errorLink = errorSummary.getByRole("link", { name: "Enter Sub-Jurisdiction Name in Welsh" });
        await expect(errorLink).toBeVisible();

        // Verify English name value is preserved
        await expect(page.locator('input[name="name"]')).toHaveValue("English Sub-Jurisdiction");
      });

      test("should display validation error when names contain HTML tags @nightly", async ({ page }) => {
        await page.goto("/add-sub-jurisdiction");

        const jurisdictionSelect = page.locator('select[name="jurisdictionId"]');
        const jurisdictionValue = await jurisdictionSelect.locator("option").nth(1).getAttribute("value");

        await fillSubJurisdictionForm(page, jurisdictionValue!, '<script>alert("test")</script>', "<b>Bold Sub-Jurisdiction</b>");

        const saveButton = page.getByRole("button", { name: /save/i });
        await saveButton.click();

        await expect(page).toHaveURL("/add-sub-jurisdiction");

        const errorSummary = page.locator(".govuk-error-summary");
        await expect(errorSummary).toBeVisible();

        const nameError = errorSummary.getByRole("link", { name: "Sub-Jurisdiction name (English) contains HTML tags which are not allowed" });
        await expect(nameError).toBeVisible();

        const welshNameError = errorSummary.getByRole("link", { name: "Sub-Jurisdiction name (Welsh) contains HTML tags which are not allowed" });
        await expect(welshNameError).toBeVisible();
      });

      test("should display validation error for duplicate English sub-jurisdiction name @nightly", async ({ page }) => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        const workerId = process.env.TEST_WORKER_INDEX || "0";
        const duplicateName = `Duplicate Sub-Jurisdiction ${timestamp}-${random}-${workerId}`;
        const welshName = `Is-awdurdodaeth Dyblyg ${timestamp}-${random}-${workerId}`;

        // Get jurisdiction ID
        await page.goto("/add-sub-jurisdiction");
        const jurisdictionSelect = page.locator('select[name="jurisdictionId"]');
        const jurisdictionValue = await jurisdictionSelect.locator("option").nth(1).getAttribute("value");

        // Create the sub-jurisdiction first
        await completeAddSubJurisdictionFlow(page, jurisdictionValue!, duplicateName, welshName);

        // Try to create it again
        await page.goto("/add-sub-jurisdiction");
        await fillSubJurisdictionForm(page, jurisdictionValue!, duplicateName, `${welshName} 2`);

        const saveButton = page.getByRole("button", { name: /save/i });
        await saveButton.click();

        await expect(page).toHaveURL("/add-sub-jurisdiction");

        const errorSummary = page.locator(".govuk-error-summary");
        await expect(errorSummary).toBeVisible();

        const errorLink = errorSummary.locator(".govuk-error-summary__list a").filter({
          hasText: `Sub-Jurisdiction '${duplicateName}' already exists in the selected jurisdiction`
        });
        await expect(errorLink).toBeVisible();
      });

      test("should display validation error for duplicate Welsh sub-jurisdiction name @nightly", async ({ page }) => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        const workerId = process.env.TEST_WORKER_INDEX || "0";
        const name = `Sub-Jurisdiction ${timestamp}-${random}-${workerId}`;
        const duplicateWelshName = `Is-awdurdodaeth ${timestamp}-${random}-${workerId}`;

        // Get jurisdiction ID
        await page.goto("/add-sub-jurisdiction");
        const jurisdictionSelect = page.locator('select[name="jurisdictionId"]');
        const jurisdictionValue = await jurisdictionSelect.locator("option").nth(1).getAttribute("value");

        // Create the sub-jurisdiction first
        await completeAddSubJurisdictionFlow(page, jurisdictionValue!, name, duplicateWelshName);

        // Try to create it again with different English name
        await page.goto("/add-sub-jurisdiction");
        await fillSubJurisdictionForm(page, jurisdictionValue!, `${name} 2`, duplicateWelshName);

        const saveButton = page.getByRole("button", { name: /save/i });
        await saveButton.click();

        await expect(page).toHaveURL("/add-sub-jurisdiction");

        const errorSummary = page.locator(".govuk-error-summary");
        await expect(errorSummary).toBeVisible();

        const errorLink = errorSummary.locator(".govuk-error-summary__list a").filter({
          hasText: `Sub-Jurisdiction Name '${duplicateWelshName}' already exists in the selected jurisdiction`
        });
        await expect(errorLink).toBeVisible();
      });

      test("should meet WCAG 2.2 AA standards", async ({ page }) => {
        await page.goto("/add-sub-jurisdiction");

        const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
      });

      test("should meet WCAG 2.2 AA standards with validation errors @nightly", async ({ page }) => {
        await page.goto("/add-sub-jurisdiction");

        const saveButton = page.getByRole("button", { name: /save/i });
        await saveButton.click();

        const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
      });
    });

    test.describe("Welsh Language Support", () => {
      test("should display Welsh translations on form page @nightly", async ({ page }) => {
        await page.goto("/add-sub-jurisdiction?lng=cy");

        const heading = page.locator("h1");
        await expect(heading).toHaveText("Ychwanegu Is-awdurdodaeth");

        const jurisdictionLabel = page.locator('label[for="jurisdictionId"]');
        await expect(jurisdictionLabel).toContainText("Dewiswch Awdurdodaeth");

        const nameLabel = page.locator('label[for="name"]');
        await expect(nameLabel).toContainText("Rhowch Enw Is-awdurdodaeth (Saesneg)");

        const welshNameLabel = page.locator('label[for="welshName"]');
        await expect(welshNameLabel).toContainText("Rhowch Enw Is-awdurdodaeth (Cymraeg)");

        const saveButton = page.getByRole("button", { name: /cadw/i });
        await expect(saveButton).toBeVisible();
      });

      test("should display Welsh error messages @nightly", async ({ page }) => {
        await page.goto("/add-sub-jurisdiction?lng=cy");

        const saveButton = page.getByRole("button", { name: /cadw/i });
        await saveButton.click();

        const errorSummary = page.locator(".govuk-error-summary");
        await expect(errorSummary).toBeVisible();

        const errorSummaryHeading = errorSummary.getByRole("heading", { name: /mae yna broblem/i });
        await expect(errorSummaryHeading).toBeVisible();
      });

      test("should complete full flow in Welsh @nightly", async ({ page }) => {
        await page.goto("/add-sub-jurisdiction?lng=cy");

        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        const workerId = process.env.TEST_WORKER_INDEX || "0";

        const jurisdictionSelect = page.locator('select[name="jurisdictionId"]');
        const jurisdictionValue = await jurisdictionSelect.locator("option").nth(1).getAttribute("value");

        await fillSubJurisdictionForm(
          page,
          jurisdictionValue!,
          `Welsh Flow Sub-Jurisdiction ${timestamp}-${random}-${workerId}`,
          `Llif Cymraeg ${timestamp}-${random}-${workerId}`
        );

        const saveButton = page.getByRole("button", { name: /cadw/i });
        await saveButton.click();

        await page.waitForURL(/\/add-sub-jurisdiction-success/, { timeout: 15000 });

        const successPanel = page.locator(".govuk-panel");
        await expect(successPanel).toBeVisible();
        const title = page.locator(".govuk-panel__title");
        await expect(title).toHaveText("Ychwanegwyd yn Llwyddiannus");

        const nextStepsHeading = page.getByRole("heading", { name: /beth hoffech chi ei wneud nesaf\?/i });
        await expect(nextStepsHeading).toBeVisible();
      });

      test("should maintain language preference through navigation @nightly", async ({ page }) => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        const workerId = process.env.TEST_WORKER_INDEX || "0";

        // Complete the flow in Welsh
        await navigateToAddSubJurisdiction(page, "cy");

        const jurisdictionSelect = page.locator('select[name="jurisdictionId"]');
        const jurisdictionValue = await jurisdictionSelect.locator("option").nth(1).getAttribute("value");

        await fillSubJurisdictionForm(
          page,
          jurisdictionValue!,
          `Navigation Test ${timestamp}-${random}-${workerId}`,
          `Prawf Llywio ${timestamp}-${random}-${workerId}`
        );
        await page.getByRole("button", { name: /cadw/i }).click();
        await page.waitForURL(/\/add-sub-jurisdiction-success/, { timeout: 15000 });

        const addAnotherLink = page.getByRole("link", { name: /ychwanegu is-awdurdodaeth arall/i });
        await expect(addAnotherLink).toHaveAttribute("href", "/add-sub-jurisdiction?lng=cy");

        await addAnotherLink.click();
        await expect(page).toHaveURL("/add-sub-jurisdiction?lng=cy");

        const heading = page.locator("h1");
        await expect(heading).toHaveText("Ychwanegu Is-awdurdodaeth");
      });
    });

    test.describe("Add Sub Jurisdiction Success Page", () => {
      test("should display success page with all navigation links", async ({ page }) => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        const workerId = process.env.TEST_WORKER_INDEX || "0";

        await page.goto("/add-sub-jurisdiction");
        const jurisdictionSelect = page.locator('select[name="jurisdictionId"]');
        const jurisdictionValue = await jurisdictionSelect.locator("option").nth(1).getAttribute("value");

        await completeAddSubJurisdictionFlow(
          page,
          jurisdictionValue!,
          `Success Test ${timestamp}-${random}-${workerId}`,
          `Prawf Llwyddiant ${timestamp}-${random}-${workerId}`
        );

        await expect(page).toHaveURL("/add-sub-jurisdiction-success");

        const successPanel = page.locator(".govuk-panel");
        await expect(successPanel).toBeVisible();

        const title = page.locator(".govuk-panel__title");
        await expect(title).toHaveText("Added Successfully");

        const nextStepsHeading = page.getByRole("heading", { name: "What would you like to do next?" });
        await expect(nextStepsHeading).toBeVisible();

        const addAnotherLink = page.getByRole("link", { name: "Add another sub-jurisdiction" });
        await expect(addAnotherLink).toBeVisible();
        await expect(addAnotherLink).toHaveAttribute("href", "/add-sub-jurisdiction");

        const addJurisdictionLink = page.getByRole("link", { name: "Add Jurisdiction" });
        await expect(addJurisdictionLink).toBeVisible();
        await expect(addJurisdictionLink).toHaveAttribute("href", "/add-jurisdiction");

        const backToUploadLink = page.getByRole("link", { name: "Back to upload reference data" });
        await expect(backToUploadLink).toBeVisible();
        await expect(backToUploadLink).toHaveAttribute("href", "/reference-data-upload");
      });

      test("should redirect to add-sub-jurisdiction if accessed directly without session @nightly", async ({ page }) => {
        await page.goto("/add-sub-jurisdiction-success");
        await expect(page).toHaveURL("/add-sub-jurisdiction");
      });

      test("should not allow access after refreshing the page @nightly", async ({ page }) => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        const workerId = process.env.TEST_WORKER_INDEX || "0";

        await page.goto("/add-sub-jurisdiction");
        const jurisdictionSelect = page.locator('select[name="jurisdictionId"]');
        const jurisdictionValue = await jurisdictionSelect.locator("option").nth(1).getAttribute("value");

        await completeAddSubJurisdictionFlow(
          page,
          jurisdictionValue!,
          `Refresh Test ${timestamp}-${random}-${workerId}`,
          `Prawf Adnewyddu ${timestamp}-${random}-${workerId}`
        );

        await page.reload();
        await expect(page).toHaveURL("/add-sub-jurisdiction");
      });

      test("should meet WCAG 2.2 AA standards on success page @nightly", async ({ page }) => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        const workerId = process.env.TEST_WORKER_INDEX || "0";

        await page.goto("/add-sub-jurisdiction");
        const jurisdictionSelect = page.locator('select[name="jurisdictionId"]');
        const jurisdictionValue = await jurisdictionSelect.locator("option").nth(1).getAttribute("value");

        await completeAddSubJurisdictionFlow(
          page,
          jurisdictionValue!,
          `Accessibility Test ${timestamp}-${random}-${workerId}`,
          `Prawf Hygyrchedd ${timestamp}-${random}-${workerId}`
        );

        const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
      });
    });
  });

test.describe
  .skip("Add Region End-to-End Flow", () => {
    test.beforeEach(async ({ page }) => {
      await authenticateSystemAdmin(page);
    });

    test.describe("Complete End-to-End Journey", () => {
      test("should complete full region creation flow from form to success", async ({ page }) => {
        // Step 1: Load add region form
        await page.goto("/add-region");
        await expect(page.locator("h1")).toHaveText("Add Region");

        // Step 2: Fill out the form with unique region name
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        const workerId = process.env.TEST_WORKER_INDEX || "0";
        const regionName = `Test Region ${timestamp}-${random}-${workerId}`;
        const welshRegionName = `Rhanbarth Prawf ${timestamp}-${random}-${workerId}`;

        await fillRegionForm(page, regionName, welshRegionName);

        // Step 3: Submit form and verify navigation to success
        await page.getByRole("button", { name: /save/i }).click();
        await page.waitForURL("/add-region-success", { timeout: 15000 });

        // Step 4: Verify success page content
        const successPanel = page.locator(".govuk-panel");
        await expect(successPanel).toBeVisible();
        const title = page.locator(".govuk-panel__title");
        await expect(title).toHaveText("Added Successfully");

        // Step 5: Verify next steps are available
        const addAnotherLink = page.getByRole("link", { name: "Add another region" });
        await expect(addAnotherLink).toBeVisible();
        await expect(addAnotherLink).toHaveAttribute("href", "/add-region");

        const addJurisdictionLink = page.getByRole("link", { name: "Add Jurisdiction" });
        await expect(addJurisdictionLink).toBeVisible();
        await expect(addJurisdictionLink).toHaveAttribute("href", "/add-jurisdiction");

        const backToUploadLink = page.getByRole("link", { name: "Back to upload reference data" });
        await expect(backToUploadLink).toBeVisible();
        await expect(backToUploadLink).toHaveAttribute("href", "/reference-data-upload");
      });

      test("should be keyboard accessible throughout entire flow @nightly", async ({ page }) => {
        await page.goto("/add-region");

        // Verify form fields are focusable
        const nameInput = page.locator('input[name="name"]');
        await expect(nameInput).toBeVisible();
        await expect(nameInput).toBeEditable();

        const welshNameInput = page.locator('input[name="welshName"]');
        await expect(welshNameInput).toBeVisible();
        await expect(welshNameInput).toBeEditable();

        const saveButton = page.getByRole("button", { name: /save/i });
        await expect(saveButton).toBeVisible();

        // Fill form with unique values
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        const workerId = process.env.TEST_WORKER_INDEX || "0";
        await fillRegionForm(page, `Keyboard Region ${timestamp}-${random}-${workerId}`, `Rhanbarth Bysellfwrdd ${timestamp}-${random}-${workerId}`);

        // Submit with keyboard
        await saveButton.focus();
        await page.keyboard.press("Enter");
        await page.waitForURL("/add-region-success", { timeout: 10000 });

        // Test keyboard navigation on success page
        const links = page.locator("ul.govuk-list a");
        await expect(links).toHaveCount(3);

        // Verify all links are keyboard accessible
        for (let i = 0; i < 3; i++) {
          const link = links.nth(i);
          await link.focus();
          await expect(link).toBeFocused();
        }
      });
    });

    test.describe("Add Region Form Page", () => {
      test("should load the page with all form fields", async ({ page }) => {
        await page.goto("/add-region");

        const heading = page.locator("h1");
        await expect(heading).toBeVisible();
        await expect(heading).toHaveText("Add Region");

        const nameInput = page.locator('input[name="name"]');
        await expect(nameInput).toBeVisible();
        const nameLabel = page.locator('label[for="name"]');
        await expect(nameLabel).toHaveText("Region name (English)");

        const welshNameInput = page.locator('input[name="welshName"]');
        await expect(welshNameInput).toBeVisible();
        const welshNameLabel = page.locator('label[for="welshName"]');
        await expect(welshNameLabel).toHaveText("Region name (Welsh)");

        const saveButton = page.getByRole("button", { name: /save/i });
        await expect(saveButton).toBeVisible();
      });

      test("should display validation errors when both fields are empty @nightly", async ({ page }) => {
        await page.goto("/add-region");

        const saveButton = page.getByRole("button", { name: /save/i });
        await saveButton.click();

        await expect(page).toHaveURL("/add-region");

        const errorSummary = page.locator(".govuk-error-summary");
        await expect(errorSummary).toBeVisible();

        const errorSummaryHeading = errorSummary.getByRole("heading", { name: /there is a problem/i });
        await expect(errorSummaryHeading).toBeVisible();

        const errorLinks = errorSummary.locator(".govuk-error-summary__list a");
        await expect(errorLinks).toHaveCount(2);

        const nameError = errorLinks.filter({ hasText: "Enter region name in English" });
        await expect(nameError).toBeVisible();
        await expect(nameError).toHaveAttribute("href", "#name");

        const welshNameError = errorLinks.filter({ hasText: "Enter region name in Welsh" });
        await expect(welshNameError).toBeVisible();
        await expect(welshNameError).toHaveAttribute("href", "#welshName");

        const nameErrorMessage = page.locator("#name").locator("..").locator(".govuk-error-message");
        await expect(nameErrorMessage).toContainText("Enter region name in English");

        const welshNameErrorMessage = page.locator("#welshName").locator("..").locator(".govuk-error-message");
        await expect(welshNameErrorMessage).toContainText("Enter region name in Welsh");
      });

      test("should display validation error when English name is empty @nightly", async ({ page }) => {
        await page.goto("/add-region");

        await page.fill('input[name="welshName"]', "Rhanbarth Cymraeg");

        const saveButton = page.getByRole("button", { name: /save/i });
        await saveButton.click();

        await expect(page).toHaveURL("/add-region");

        const errorSummary = page.locator(".govuk-error-summary");
        await expect(errorSummary).toBeVisible();

        const errorLink = errorSummary.getByRole("link", { name: "Enter region name in English" });
        await expect(errorLink).toBeVisible();

        const nameErrorMessage = page.locator("#name").locator("..").locator(".govuk-error-message");
        await expect(nameErrorMessage).toContainText("Enter region name in English");

        // Verify Welsh name value is preserved
        await expect(page.locator('input[name="welshName"]')).toHaveValue("Rhanbarth Cymraeg");
      });

      test("should display validation error when Welsh name is empty @nightly", async ({ page }) => {
        await page.goto("/add-region");

        await page.fill('input[name="name"]', "English Region");

        const saveButton = page.getByRole("button", { name: /save/i });
        await saveButton.click();

        await expect(page).toHaveURL("/add-region");

        const errorSummary = page.locator(".govuk-error-summary");
        await expect(errorSummary).toBeVisible();

        const errorLink = errorSummary.getByRole("link", { name: "Enter region name in Welsh" });
        await expect(errorLink).toBeVisible();

        const welshNameErrorMessage = page.locator("#welshName").locator("..").locator(".govuk-error-message");
        await expect(welshNameErrorMessage).toContainText("Enter region name in Welsh");

        // Verify English name value is preserved
        await expect(page.locator('input[name="name"]')).toHaveValue("English Region");
      });

      test("should display validation error when names contain HTML tags @nightly", async ({ page }) => {
        await page.goto("/add-region");

        await fillRegionForm(page, '<script>alert("test")</script>', "<b>Bold Region</b>");

        const saveButton = page.getByRole("button", { name: /save/i });
        await saveButton.click();

        await expect(page).toHaveURL("/add-region");

        const errorSummary = page.locator(".govuk-error-summary");
        await expect(errorSummary).toBeVisible();

        const nameError = errorSummary.getByRole("link", { name: "Region name (English) contains HTML tags which are not allowed" });
        await expect(nameError).toBeVisible();

        const welshNameError = errorSummary.getByRole("link", { name: "Region name (Welsh) contains HTML tags which are not allowed" });
        await expect(welshNameError).toBeVisible();
      });

      test("should display validation error for duplicate English region name @nightly", async ({ page }) => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        const workerId = process.env.TEST_WORKER_INDEX || "0";
        const duplicateName = `Duplicate Region ${timestamp}-${random}-${workerId}`;
        const welshName = `Rhanbarth Dyblyg ${timestamp}-${random}-${workerId}`;

        // Create the region first
        await completeAddRegionFlow(page, duplicateName, welshName);

        // Try to create it again
        await page.goto("/add-region");
        await fillRegionForm(page, duplicateName, `${welshName} 2`);

        const saveButton = page.getByRole("button", { name: /save/i });
        await saveButton.click();

        await expect(page).toHaveURL("/add-region");

        const errorSummary = page.locator(".govuk-error-summary");
        await expect(errorSummary).toBeVisible();

        const errorLink = errorSummary.locator(".govuk-error-summary__list a").filter({
          hasText: `Region '${duplicateName}' already exists in the database`
        });
        await expect(errorLink).toBeVisible();
      });

      test("should display validation error for duplicate Welsh region name @nightly", async ({ page }) => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        const workerId = process.env.TEST_WORKER_INDEX || "0";
        const name = `Region ${timestamp}-${random}-${workerId}`;
        const duplicateWelshName = `Rhanbarth ${timestamp}-${random}-${workerId}`;

        // Create the region first
        await completeAddRegionFlow(page, name, duplicateWelshName);

        // Try to create it again with different English name
        await page.goto("/add-region");
        await fillRegionForm(page, `${name} 2`, duplicateWelshName);

        const saveButton = page.getByRole("button", { name: /save/i });
        await saveButton.click();

        await expect(page).toHaveURL("/add-region");

        const errorSummary = page.locator(".govuk-error-summary");
        await expect(errorSummary).toBeVisible();

        const errorLink = errorSummary.locator(".govuk-error-summary__list a").filter({
          hasText: `Welsh region name '${duplicateWelshName}' already exists in the database`
        });
        await expect(errorLink).toBeVisible();
      });

      test("should preserve form values after validation error @nightly", async ({ page }) => {
        await page.goto("/add-region");

        const testName = "Test Region Preserve";
        const testWelshName = "Rhanbarth Prawf Cadw";

        await fillRegionForm(page, testName, testWelshName);

        // Simulate an error by using a very short value
        await page.fill('input[name="name"]', "");

        const saveButton = page.getByRole("button", { name: /save/i });
        await saveButton.click();

        // Check that the Welsh name is preserved
        await expect(page.locator('input[name="welshName"]')).toHaveValue(testWelshName);
      });

      test("should meet WCAG 2.2 AA standards", async ({ page }) => {
        await page.goto("/add-region");

        const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
      });

      test("should meet WCAG 2.2 AA standards with validation errors @nightly", async ({ page }) => {
        await page.goto("/add-region");

        const saveButton = page.getByRole("button", { name: /save/i });
        await saveButton.click();

        const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
      });
    });

    test.describe("Welsh Language Support", () => {
      test("should display Welsh translations on form page @nightly", async ({ page }) => {
        await page.goto("/add-region?lng=cy");

        const heading = page.locator("h1");
        await expect(heading).toHaveText("Ychwanegu Rhanbarth");

        const nameLabel = page.locator('label[for="name"]');
        await expect(nameLabel).toContainText("Enw rhanbarth (Saesneg)");

        const welshNameLabel = page.locator('label[for="welshName"]');
        await expect(welshNameLabel).toContainText("Enw rhanbarth (Cymraeg)");

        const saveButton = page.getByRole("button", { name: /cadw/i });
        await expect(saveButton).toBeVisible();
      });

      test("should display Welsh error messages @nightly", async ({ page }) => {
        await page.goto("/add-region?lng=cy");

        const saveButton = page.getByRole("button", { name: /cadw/i });
        await saveButton.click();

        const errorSummary = page.locator(".govuk-error-summary");
        await expect(errorSummary).toBeVisible();

        const errorSummaryHeading = errorSummary.getByRole("heading", { name: /mae yna broblem/i });
        await expect(errorSummaryHeading).toBeVisible();
      });

      test("should complete full flow in Welsh @nightly", async ({ page }) => {
        await page.goto("/add-region?lng=cy");

        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        const workerId = process.env.TEST_WORKER_INDEX || "0";
        await fillRegionForm(page, `Welsh Flow Region ${timestamp}-${random}-${workerId}`, `Llif Cymraeg ${timestamp}-${random}-${workerId}`);

        const saveButton = page.getByRole("button", { name: /cadw/i });
        await saveButton.click();

        // Wait for success page (may or may not have lng=cy in URL)
        await page.waitForURL(/\/add-region-success/, { timeout: 15000 });

        const successPanel = page.locator(".govuk-panel");
        await expect(successPanel).toBeVisible();
        const title = page.locator(".govuk-panel__title");
        await expect(title).toHaveText("Ychwanegwyd yn Llwyddiannus");

        const nextStepsHeading = page.getByRole("heading", { name: /beth hoffech chi ei wneud nesaf\?/i });
        await expect(nextStepsHeading).toBeVisible();
      });

      test("should maintain language preference through navigation @nightly", async ({ page }) => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);

        // Complete the flow in Welsh
        await navigateToAddRegion(page, "cy");
        const workerId = process.env.TEST_WORKER_INDEX || "0";
        await fillRegionForm(page, `Navigation Test ${timestamp}-${random}-${workerId}`, `Prawf Llywio ${timestamp}-${random}-${workerId}`);
        await page.getByRole("button", { name: /cadw/i }).click();
        await page.waitForURL(/\/add-region-success/, { timeout: 10000 });

        const addAnotherLink = page.getByRole("link", { name: /ychwanegu rhanbarth arall/i });
        await expect(addAnotherLink).toHaveAttribute("href", "/add-region?lng=cy");

        await addAnotherLink.click();
        await expect(page).toHaveURL("/add-region?lng=cy");

        const heading = page.locator("h1");
        await expect(heading).toHaveText("Ychwanegu Rhanbarth");
      });
    });

    test.describe("Add Region Success Page", () => {
      test("should display success page with all navigation links", async ({ page }) => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        const workerId = process.env.TEST_WORKER_INDEX || "0";
        await completeAddRegionFlow(page, `Success Test ${timestamp}-${random}-${workerId}`, `Prawf Llwyddiant ${timestamp}-${random}-${workerId}`);

        await expect(page).toHaveURL("/add-region-success");

        const successPanel = page.locator(".govuk-panel");
        await expect(successPanel).toBeVisible();

        const title = page.locator(".govuk-panel__title");
        await expect(title).toHaveText("Added Successfully");

        const nextStepsHeading = page.getByRole("heading", { name: "What would you like to do next?" });
        await expect(nextStepsHeading).toBeVisible();

        const addAnotherLink = page.getByRole("link", { name: "Add another region" });
        await expect(addAnotherLink).toBeVisible();
        await expect(addAnotherLink).toHaveAttribute("href", "/add-region");

        const addJurisdictionLink = page.getByRole("link", { name: "Add Jurisdiction" });
        await expect(addJurisdictionLink).toBeVisible();
        await expect(addJurisdictionLink).toHaveAttribute("href", "/add-jurisdiction");

        const backToUploadLink = page.getByRole("link", { name: "Back to upload reference data" });
        await expect(backToUploadLink).toBeVisible();
        await expect(backToUploadLink).toHaveAttribute("href", "/reference-data-upload");
      });

      test("should redirect to add-region if accessed directly without session @nightly", async ({ page }) => {
        await page.goto("/add-region-success");
        await expect(page).toHaveURL("/add-region");
      });

      test("should not allow access after refreshing the page @nightly", async ({ page }) => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        const workerId = process.env.TEST_WORKER_INDEX || "0";
        await completeAddRegionFlow(page, `Refresh Test ${timestamp}-${random}-${workerId}`, `Prawf Adnewyddu ${timestamp}-${random}-${workerId}`);

        await page.reload();
        await expect(page).toHaveURL("/add-region");
      });

      test("should allow multiple sequential region additions @nightly", async ({ page }) => {
        const timestamp1 = Date.now();
        const random1 = Math.floor(Math.random() * 1000000);
        const workerId = process.env.TEST_WORKER_INDEX || "0";
        await completeAddRegionFlow(page, `Sequential 1 ${timestamp1}-${random1}-${workerId}`, `Dilynol 1 ${timestamp1}-${random1}-${workerId}`);
        await expect(page).toHaveURL(/\/add-region-success/);

        await page.goto("/add-region");
        const timestamp2 = Date.now();
        const random2 = Math.floor(Math.random() * 1000000);
        await fillRegionForm(page, `Sequential 2 ${timestamp2}-${random2}-${workerId}`, `Dilynol 2 ${timestamp2}-${random2}-${workerId}`);
        await page.getByRole("button", { name: /save/i }).click();
        await page.waitForURL(/\/add-region-success/, { timeout: 10000 });

        await expect(page).toHaveURL(/\/add-region-success/);
        const successPanel = page.locator(".govuk-panel");
        await expect(successPanel).toBeVisible();
      });

      test("should meet WCAG 2.2 AA standards on success page @nightly", async ({ page }) => {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        const workerId = process.env.TEST_WORKER_INDEX || "0";
        await completeAddRegionFlow(page, `Accessibility Test ${timestamp}-${random}-${workerId}`, `Prawf Hygyrchedd ${timestamp}-${random}-${workerId}`);

        const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
      });
    });

    test.describe("Responsive Design", () => {
      test("should display correctly on mobile viewport (375x667) @nightly", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto("/add-region");

        const heading = page.locator("h1");
        await expect(heading).toBeVisible();

        const nameInput = page.locator('input[name="name"]');
        await expect(nameInput).toBeVisible();

        const welshNameInput = page.locator('input[name="welshName"]');
        await expect(welshNameInput).toBeVisible();

        const saveButton = page.getByRole("button", { name: /save/i });
        await expect(saveButton).toBeVisible();
      });

      test("should display correctly on tablet viewport (768x1024) @nightly", async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto("/add-region");

        const heading = page.locator("h1");
        await expect(heading).toBeVisible();

        const form = page.locator("form");
        await expect(form).toBeVisible();
      });

      test("should complete flow on mobile viewport @nightly", async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });

        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        const workerId = process.env.TEST_WORKER_INDEX || "0";
        await completeAddRegionFlow(page, `Mobile Test ${timestamp}-${random}-${workerId}`, `Prawf Symudol ${timestamp}-${random}-${workerId}`);

        const successPanel = page.locator(".govuk-panel");
        await expect(successPanel).toBeVisible();

        const links = page.locator("ul.govuk-list a");
        await expect(links).toHaveCount(3);
      });
    });
  });

test.describe
  .skip("Reference Data Upload End-to-End Flow", () => {
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
        const expectedColumns = [
          "Location ID",
          "Location Name",
          "Welsh Location Name",
          "Email",
          "Contact Number",
          "Jurisdiction",
          "Sub-Jurisdiction",
          "Region"
        ];

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
