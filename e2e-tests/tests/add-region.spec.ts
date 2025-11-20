import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { loginWithSSO } from "../utils/sso-helpers.js";

// Helper function to authenticate as System Admin
async function _authenticateSystemAdmin(page: Page) {
  await page.goto("/system-admin-dashboard");

  if (page.url().includes("login.microsoftonline.com")) {
    const systemAdminEmail = process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!;
    const systemAdminPassword = process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!;
    await loginWithSSO(page, systemAdminEmail, systemAdminPassword);
  }
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

test.describe("Add Region End-to-End Flow", () => {
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

    test("should be keyboard accessible throughout entire flow", async ({ page }) => {
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

    test("should display validation errors when both fields are empty", async ({ page }) => {
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

    test("should display validation error when English name is empty", async ({ page }) => {
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

    test("should display validation error when Welsh name is empty", async ({ page }) => {
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

    test("should display validation error when names contain HTML tags", async ({ page }) => {
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

    test("should display validation error for duplicate English region name", async ({ page }) => {
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

    test("should display validation error for duplicate Welsh region name", async ({ page }) => {
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

    test("should preserve form values after validation error", async ({ page }) => {
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

    test("should meet WCAG 2.2 AA standards with validation errors", async ({ page }) => {
      await page.goto("/add-region");

      const saveButton = page.getByRole("button", { name: /save/i });
      await saveButton.click();

      const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe("Welsh Language Support", () => {
    test("should display Welsh translations on form page", async ({ page }) => {
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

    test("should display Welsh error messages", async ({ page }) => {
      await page.goto("/add-region?lng=cy");

      const saveButton = page.getByRole("button", { name: /cadw/i });
      await saveButton.click();

      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      const errorSummaryHeading = errorSummary.getByRole("heading", { name: /mae yna broblem/i });
      await expect(errorSummaryHeading).toBeVisible();
    });

    test("should complete full flow in Welsh", async ({ page }) => {
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

    test("should maintain language preference through navigation", async ({ page }) => {
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

    test("should redirect to add-region if accessed directly without session", async ({ page }) => {
      await page.goto("/add-region-success");
      await expect(page).toHaveURL("/add-region");
    });

    test("should not allow access after refreshing the page", async ({ page }) => {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000000);
      const workerId = process.env.TEST_WORKER_INDEX || "0";
      await completeAddRegionFlow(page, `Refresh Test ${timestamp}-${random}-${workerId}`, `Prawf Adnewyddu ${timestamp}-${random}-${workerId}`);

      await page.reload();
      await expect(page).toHaveURL("/add-region");
    });

    test("should allow multiple sequential region additions", async ({ page }) => {
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

    test("should meet WCAG 2.2 AA standards on success page", async ({ page }) => {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000000);
      const workerId = process.env.TEST_WORKER_INDEX || "0";
      await completeAddRegionFlow(page, `Accessibility Test ${timestamp}-${random}-${workerId}`, `Prawf Hygyrchedd ${timestamp}-${random}-${workerId}`);

      const accessibilityScanResults = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe("Responsive Design", () => {
    test("should display correctly on mobile viewport (375x667)", async ({ page }) => {
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

    test("should display correctly on tablet viewport (768x1024)", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("/add-region");

      const heading = page.locator("h1");
      await expect(heading).toBeVisible();

      const form = page.locator("form");
      await expect(form).toBeVisible();
    });

    test("should complete flow on mobile viewport", async ({ page }) => {
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
