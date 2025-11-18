import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loginWithSSO } from "../utils/sso-helpers.js";
import { seedAllReferenceData } from "../utils/seed-reference-data.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function authenticateSystemAdmin(page: Page) {
  await page.goto("/system-admin-dashboard");

  if (page.url().includes("login.microsoftonline.com")) {
    const systemAdminEmail = process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!;
    const systemAdminPassword = process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!;
    await loginWithSSO(page, systemAdminEmail, systemAdminPassword);
  }
}

test.describe("Reference Data Setup", () => {
  test("should seed reference data and upload locations for e2e tests", async ({ page }) => {
    console.log("Starting reference data setup for e2e tests...");

    // Step 1: Seed jurisdictions, sub-jurisdictions, and regions
    console.log("Seeding jurisdictions, sub-jurisdictions, and regions...");
    await seedAllReferenceData();

    // Step 2: Authenticate as System Admin
    await authenticateSystemAdmin(page);

    // Step 3: Navigate to reference data upload page
    await page.goto("/reference-data-upload");
    await expect(page).toHaveTitle(/Upload reference data/i);

    // Step 4: Upload the CSV file
    const csvPath = path.join(__dirname, "..", "fixtures", "test-reference-data.csv");
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Step 5: Submit the form
    const continueButton = page.getByRole("button", { name: /continue/i });
    await continueButton.click();

    // Step 6: Wait for upload summary page
    await page.waitForURL(/\/reference-data-upload-summary/, { timeout: 10000 });
    await expect(page.locator("h1")).toHaveText("Reference data upload summary");

    // Step 7: Verify the data in the summary (table rows in tbody, not summary list rows)
    const dataRows = page.locator(".govuk-table__body .govuk-table__row");
    await expect(dataRows).toHaveCount(10);

    // Step 8: Confirm the upload
    const confirmButton = page.getByRole("button", { name: /confirm/i });
    await confirmButton.click();

    // Step 9: Wait for confirmation page
    await page.waitForURL("/reference-data-upload-confirmation", { timeout: 10000 });

    // Step 10: Verify success
    const successPanel = page.locator(".govuk-panel--confirmation");
    await expect(successPanel).toBeVisible();

    const successTitle = page.locator(".govuk-panel__title");
    await expect(successTitle).toContainText(/success/i);

    console.log("Reference data setup completed successfully");
    console.log("Location ID 9009 (Test SJP Court) is now available for tests");
  });
});
