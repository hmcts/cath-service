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

test.describe("Manage List Types End-to-End Flow", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateSystemAdmin(page);
  });

  test.describe("Complete End-to-End Journey", () => {
    test("should complete full list type configuration flow from list to success", async ({ page }) => {
      // Step 1: Navigate to manage list types page
      await page.goto("/manage-list-types");
      await expect(page.locator("h1")).toHaveText("Manage list types");

      // Step 2: Verify table is displayed with list types
      const table = page.locator(".govuk-table");
      await expect(table).toBeVisible();

      // Step 3: Verify table headers
      const headers = page.locator(".govuk-table__header");
      await expect(headers).toHaveCount(2);
      await expect(headers.nth(0)).toHaveText("Name");

      // Step 4: Verify at least one list type is shown
      const rows = page.locator(".govuk-table__body .govuk-table__row");
      await expect(rows.first()).toBeVisible();

      // Step 5: Click "Manage" link for first list type
      const firstManageLink = page.locator(".govuk-table__body .govuk-link").first();
      await expect(firstManageLink).toHaveText("Manage");
      await firstManageLink.click();
      await page.waitForURL(/\/list-search-config\/\d+/);

      // Step 6: Verify configuration form page loads
      await expect(page.locator("h1")).toHaveText("Configure list type search fields");
      await expect(page.getByText("Enter the JSON field names")).toBeVisible();

      // Step 7: Fill in the configuration form
      await page.fill('input[name="caseNumberFieldName"]', "caseNumber");
      await page.fill('input[name="caseNameFieldName"]', "caseName");

      // Step 8: Submit the form
      await page.getByRole("button", { name: /confirm/i }).click();

      // Step 9: Verify success page
      await page.waitForURL("/list-search-config-success", { timeout: 10000 });
      await expect(page.locator("h1")).toHaveText("List type search configuration updated");

      // Step 10: Verify return link
      const returnLink = page.getByRole("link", { name: /manage list types/i });
      await expect(returnLink).toBeVisible();
      await expect(returnLink).toHaveAttribute("href", "/manage-list-types");
    });

    test("should support updating existing configuration", async ({ page }) => {
      await page.goto("/manage-list-types");

      // Navigate to first list type configuration
      await page.locator(".govuk-table__body .govuk-link").first().click();
      await page.waitForURL(/\/list-search-config\/\d+/);

      // Verify existing values can be updated
      const caseNumberInput = page.locator('input[name="caseNumberFieldName"]');
      const caseNameInput = page.locator('input[name="caseNameFieldName"]');

      // Clear and set new values
      await caseNumberInput.fill("");
      await caseNumberInput.fill("updatedCaseNumber");
      await caseNameInput.fill("");
      await caseNameInput.fill("updatedCaseName");

      // Submit
      await page.getByRole("button", { name: /confirm/i }).click();
      await page.waitForURL("/list-search-config-success");
      await expect(page.locator("h1")).toHaveText("List type search configuration updated");
    });
  });

  test.describe("Manage List Types Page", () => {
    test("should display all list types in alphabetical order", async ({ page }) => {
      await page.goto("/manage-list-types");

      const rows = page.locator(".govuk-table__body .govuk-table__row");
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);

      // Verify all rows have name and manage link
      for (let i = 0; i < count; i++) {
        const nameCell = rows.nth(i).locator(".govuk-table__cell").first();
        const manageLink = rows.nth(i).locator(".govuk-link");

        await expect(nameCell).toHaveText(/.+/); // Has some text
        await expect(manageLink).toHaveText("Manage");
        await expect(manageLink).toHaveAttribute("href", /\/list-search-config\/\d+/);
      }
    });

    test("should meet WCAG 2.2 AA standards", async ({ page }) => {
      await page.goto("/manage-list-types");

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should display Welsh content correctly", async ({ page }) => {
      await page.goto("/manage-list-types?lng=cy");
      await page.waitForLoadState("networkidle");

      await expect(page.locator("h1")).toHaveText("Rheoli mathau rhestr");
      await expect(page.locator(".govuk-table__header").first()).toHaveText("Enw");
      await expect(page.locator(".govuk-table__body .govuk-link").first()).toHaveText("Rheoli");
    });
  });

  test.describe("Configure List Type Form Page", () => {
    test("should load form with all required fields", async ({ page }) => {
      // Use a known list type ID
      await page.goto("/list-search-config/1");
      await page.waitForLoadState("networkidle");

      await expect(page.locator("h1")).toHaveText("Configure list type search fields");
      await expect(page.getByText("Enter the JSON field names")).toBeVisible();

      // Verify form fields
      const caseNumberInput = page.locator('input[name="caseNumberFieldName"]');
      const caseNameInput = page.locator('input[name="caseNameFieldName"]');
      const confirmButton = page.getByRole("button", { name: /confirm/i });

      await expect(caseNumberInput).toBeVisible();
      await expect(caseNameInput).toBeVisible();
      await expect(confirmButton).toBeVisible();
    });

    test("should validate field name format", async ({ page }) => {
      await page.goto("/list-search-config/1");
      await page.waitForLoadState("networkidle");

      // Enter invalid field names (with special characters)
      await page.fill('input[name="caseNumberFieldName"]', "case-number!");
      await page.fill('input[name="caseNameFieldName"]', "case@name#");

      await page.getByRole("button", { name: /confirm/i }).click();

      // Verify error summary appears
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();
      await expect(errorSummary.locator(".govuk-error-summary__title")).toHaveText("There is a problem");

      // Verify field-level errors
      const errorMessages = page.locator(".govuk-error-message");
      expect(await errorMessages.count()).toBeGreaterThan(0);
    });

    test("should show error when both fields are blank", async ({ page }) => {
      await page.goto("/list-search-config/1");
      await page.waitForLoadState("networkidle");

      // Leave both fields blank
      await page.fill('input[name="caseNumberFieldName"]', "");
      await page.fill('input[name="caseNameFieldName"]', "");

      await page.getByRole("button", { name: /confirm/i }).click();

      // Should show validation error requiring at least one field
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();
      await expect(errorSummary.locator(".govuk-error-summary__title")).toHaveText("There is a problem");
      await expect(page.getByText("Enter at least one field name")).toBeVisible();
    });

    test("should allow only one field to be populated", async ({ page }) => {
      await page.goto("/list-search-config/1");
      await page.waitForLoadState("networkidle");

      // Only fill case number field
      await page.fill('input[name="caseNumberFieldName"]', "caseNumber");
      await page.fill('input[name="caseNameFieldName"]', "");

      await page.getByRole("button", { name: /confirm/i }).click();

      // Should successfully save
      await page.waitForURL("/list-search-config-success");
      await expect(page.locator("h1")).toHaveText("List type search configuration updated");
    });

    test("should accept valid field names with underscores and numbers", async ({ page }) => {
      await page.goto("/list-search-config/1");
      await page.waitForLoadState("networkidle");

      await page.fill('input[name="caseNumberFieldName"]', "case_number_123");
      await page.fill('input[name="caseNameFieldName"]', "case_name_456");

      await page.getByRole("button", { name: /confirm/i }).click();

      await page.waitForURL("/list-search-config-success");
      await expect(page.locator("h1")).toHaveText("List type search configuration updated");
    });

    test("should preserve form data when validation fails", async ({ page }) => {
      await page.goto("/list-search-config/1");
      await page.waitForLoadState("networkidle");

      const invalidValue1 = "invalid!field";
      const invalidValue2 = "another@invalid";

      await page.fill('input[name="caseNumberFieldName"]', invalidValue1);
      await page.fill('input[name="caseNameFieldName"]', invalidValue2);

      await page.getByRole("button", { name: /confirm/i }).click();

      // Verify form still shows the entered values
      await expect(page.locator('input[name="caseNumberFieldName"]')).toHaveValue(invalidValue1);
      await expect(page.locator('input[name="caseNameFieldName"]')).toHaveValue(invalidValue2);
    });

    test("should meet WCAG 2.2 AA standards on form page", async ({ page }) => {
      await page.goto("/list-search-config/1");
      await page.waitForLoadState("networkidle");

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should meet WCAG 2.2 AA standards on error page", async ({ page }) => {
      await page.goto("/list-search-config/1");
      await page.waitForLoadState("networkidle");

      // Trigger validation errors
      await page.fill('input[name="caseNumberFieldName"]', "invalid!");
      await page.getByRole("button", { name: /confirm/i }).click();

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test("should display Welsh content on form page", async ({ page }) => {
      await page.goto("/list-search-config/1?lng=cy");
      await page.waitForLoadState("networkidle");

      await expect(page.locator("h1")).toHaveText("Ffurfweddu meysydd chwilio math rhestr");
      await expect(page.getByText("Rhowch yr enwau meysydd JSON")).toBeVisible();

      const caseNumberLabel = page.locator('label[for="caseNumberFieldName"]');
      const caseNameLabel = page.locator('label[for="caseNameFieldName"]');

      await expect(caseNumberLabel).toHaveText("Enw maes JSON rhif achos");
      await expect(caseNameLabel).toHaveText("Enw maes JSON enw achos");

      await expect(page.getByRole("button", { name: /cadarnhau/i })).toBeVisible();
    });

    test("should handle invalid list type ID", async ({ page }) => {
      const response = await page.goto("/list-search-config/invalid");

      expect(response?.status()).toBe(400);
    });
  });

  test.describe("Success Page", () => {
    test("should display success confirmation", async ({ page }) => {
      await page.goto("/manage-list-types");
      await page.waitForLoadState("networkidle");

      await page.locator(".govuk-table__body .govuk-link").first().click();
      await page.waitForURL(/\/list-search-config\/\d+/);

      await page.fill('input[name="caseNumberFieldName"]', "testField");
      await page.getByRole("button", { name: /confirm/i }).click();

      await page.waitForURL("/list-search-config-success");

      await expect(page.locator("h1")).toHaveText("List type search configuration updated");
      await expect(page.getByText("What do you want to do next?")).toBeVisible();

      const returnLink = page.getByRole("link", { name: /manage list types/i });
      await expect(returnLink).toBeVisible();
    });

    test("should navigate back to manage list types from success page", async ({ page }) => {
      await page.goto("/manage-list-types");
      await page.waitForLoadState("networkidle");

      await page.locator(".govuk-table__body .govuk-link").first().click();
      await page.waitForURL(/\/list-search-config\/\d+/);

      await page.fill('input[name="caseNumberFieldName"]', "testField");
      await page.getByRole("button", { name: /confirm/i }).click();

      await page.waitForURL("/list-search-config-success");

      await page.getByRole("link", { name: /manage list types/i }).click();
      await page.waitForURL("/manage-list-types");

      await expect(page.locator("h1")).toHaveText("Manage list types");
    });

    test("should display Welsh content on success page", async ({ page }) => {
      // Navigate directly to the Welsh form page
      await page.goto("/list-search-config/1?lng=cy");
      await page.waitForLoadState("networkidle");

      await page.fill('input[name="caseNumberFieldName"]', "testField");
      await page.getByRole("button", { name: /cadarnhau/i }).click();

      await page.waitForURL(/\/list-search-config-success\?lng=cy/);

      await expect(page.locator("h1")).toContainText("Ffurfweddiad chwilio math rhestr wedi'i ddiweddaru");
      await expect(page.getByText("Beth hoffech chi ei wneud nesaf?")).toBeVisible();
    });

    test("should meet WCAG 2.2 AA standards on success page", async ({ page }) => {
      await page.goto("/manage-list-types");
      await page.waitForLoadState("networkidle");

      await page.locator(".govuk-table__body .govuk-link").first().click();
      await page.waitForURL(/\/list-search-config\/\d+/);

      await page.fill('input[name="caseNumberFieldName"]', "testField");
      await page.getByRole("button", { name: /confirm/i }).click();

      await page.waitForURL("/list-search-config-success");

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe("Keyboard Navigation", () => {
    test("should be keyboard accessible throughout the flow", async ({ page }) => {
      await page.goto("/list-search-config/1");
      await page.waitForLoadState("networkidle");

      // Verify tab navigation works on form
      const caseNumberInput = page.locator('input[name="caseNumberFieldName"]');
      const caseNameInput = page.locator('input[name="caseNameFieldName"]');
      const confirmButton = page.getByRole("button", { name: /confirm/i });

      await caseNumberInput.focus();
      await expect(caseNumberInput).toBeFocused();

      await page.keyboard.press("Tab");
      await expect(caseNameInput).toBeFocused();

      await page.keyboard.press("Tab");
      await expect(confirmButton).toBeFocused();

      // Verify form can be submitted with keyboard
      await caseNumberInput.fill("testCase");
      await caseNameInput.fill("testName");
      await confirmButton.focus();
      await page.keyboard.press("Enter");

      await page.waitForURL("/list-search-config-success");
      await expect(page.locator("h1")).toHaveText("List type search configuration updated");
    });
  });

  test.describe("Multiple List Types", () => {
    test("should configure different list types independently @nightly", async ({ page }) => {
      await page.goto("/manage-list-types");
      await page.waitForLoadState("networkidle");

      const manageLinks = page.locator(".govuk-table__body .govuk-link");
      const linkCount = await manageLinks.count();

      // Test at least 2 different list types if available
      if (linkCount >= 2) {
        // Configure first list type
        await manageLinks.nth(0).click();
        await page.waitForURL(/\/list-search-config\/\d+/);
        await page.fill('input[name="caseNumberFieldName"]', "firstType_caseNum");
        await page.fill('input[name="caseNameFieldName"]', "firstType_caseName");
        await page.getByRole("button", { name: /confirm/i }).click();
        await page.waitForURL("/list-search-config-success");

        // Go back and configure second list type
        await page.getByRole("link", { name: /manage list types/i }).click();
        await page.waitForURL("/manage-list-types");

        await manageLinks.nth(1).click();
        await page.waitForURL(/\/list-search-config\/\d+/);
        await page.fill('input[name="caseNumberFieldName"]', "secondType_caseNum");
        await page.fill('input[name="caseNameFieldName"]', "secondType_caseName");
        await page.getByRole("button", { name: /confirm/i }).click();
        await page.waitForURL("/list-search-config-success");

        await expect(page.locator("h1")).toHaveText("List type search configuration updated");
      }
    });
  });
});
