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

test.describe("Add Sub Jurisdiction End-to-End Flow", () => {
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
