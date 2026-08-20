import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { axeCheck } from "../../utils/axe-helper.js";
import { loginWithSSO } from "../../utils/sso-helpers.js";

function validateEnvVars() {
  const missing: string[] = [];
  if (!process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL) {
    missing.push("SSO_TEST_SYSTEM_ADMIN_EMAIL");
  }
  if (!process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD) {
    missing.push("SSO_TEST_SYSTEM_ADMIN_PASSWORD");
  }
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}.`);
  }
}

async function authenticateSystemAdmin(page: Page) {
  validateEnvVars();
  await page.goto("/system-admin-dashboard");
  if (page.url().includes("login.microsoftonline.com")) {
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
  }
  await page.waitForURL("**/system-admin-dashboard");
}

test.describe("MI Report download", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateSystemAdmin(page);
  });

  test("system admin selects a period and report type and downloads the xlsx", async ({ page }) => {
    // Navigate from the dashboard tile
    await page.click('a.admin-tile:has-text("Download MI Report")');
    await page.waitForURL("**/mi-report");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Download MI Report");

    // Accessibility check on the selection page
    const accessibilityScanResults = await axeCheck(page).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Welsh: page content is available via ?lng=cy
    await page.goto("/mi-report?lng=cy");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lawrlwytho Adroddiad MI");

    // Complete the journey: select a period + report type and download
    await page.goto("/mi-report");
    await page.getByLabel("Reporting period").selectOption("30");
    await page.getByLabel("Report type").selectOption("all-data");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download report" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^mi-report-all-data-30days-\d{4}-\d{2}-\d{2}\.xlsx$/);
  });
});
