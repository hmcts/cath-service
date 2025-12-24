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

test.describe("Add Jurisdiction End-to-End Flow", () => {
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
      await page.keyboard.press('Enter');
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
