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

// Helper function to create valid JSON for Administrative Court lists
function createAdminCourtListJSON() {
  return JSON.stringify([
    {
      venue: "Court 1",
      judge: "Mr Justice Williams",
      time: "10:00am",
      caseNumber: "CO/2025/000123",
      caseDetails: "R (Smith) v Secretary of State",
      hearingType: "Permission Hearing",
      additionalInformation: "Remote hearing"
    },
    {
      venue: "Court 2",
      judge: "Mrs Justice Taylor",
      time: "2.30pm",
      caseNumber: "CO/2025/000456",
      caseDetails: "R (Jones) v Local Authority",
      hearingType: "Substantive Hearing",
      additionalInformation: ""
    }
  ]);
}

// Helper function to upload JSON for Administrative Court list
async function uploadAdminCourtList(page: Page, listTypeId: string) {
  await page.goto("/manual-upload?locationId=9001");
  await page.waitForTimeout(1000);

  await page.selectOption('select[name="listType"]', listTypeId);
  await page.fill('input[name="hearingStartDate-day"]', "15");
  await page.fill('input[name="hearingStartDate-month"]', "01");
  await page.fill('input[name="hearingStartDate-year"]', "2026");
  await page.selectOption('select[name="sensitivity"]', "PUBLIC");
  await page.selectOption('select[name="language"]', "ENGLISH");
  await page.fill('input[name="displayFrom-day"]', "15");
  await page.fill('input[name="displayFrom-month"]', "01");
  await page.fill('input[name="displayFrom-year"]', "2026");
  await page.fill('input[name="displayTo-day"]', "15");
  await page.fill('input[name="displayTo-month"]', "01");
  await page.fill('input[name="displayTo-year"]', "2026");

  const jsonContent = createAdminCourtListJSON();
  const fileInput = page.locator('input[name="file"]');
  await fileInput.setInputFiles({
    name: "admin-court-list.json",
    mimeType: "application/json",
    buffer: Buffer.from(jsonContent)
  });

  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForURL(/\/manual-upload-summary\?uploadId=/, { timeout: 10000 });

  await page.getByRole("button", { name: "Confirm" }).click();
  await page.waitForURL("/manual-upload-success", { timeout: 10000 });
}

test.describe("Administrative Court Daily Cause Lists - Viewing @nightly", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateSystemAdmin(page);
  });

  test("should view Birmingham Administrative Court list with English and Welsh content", async ({ page }) => {
    // Upload list
    await uploadAdminCourtList(page, "20");

    // Navigate to summary of publications
    await page.goto("/summary-of-publications?locationId=9001");
    await page.waitForTimeout(1000);

    // Find and click the publication link
    const publicationLinks = page.locator('.govuk-list a[href*="artefactId="]');
    await expect(publicationLinks.first()).toBeVisible();
    const firstLinkHref = await publicationLinks.first().getAttribute("href");
    expect(firstLinkHref).toContain("/birmingham-administrative-court-daily-cause-list?artefactId=");

    await publicationLinks.first().click();
    await page.waitForLoadState("networkidle");

    // Verify English content
    await expect(page.locator("h1")).toContainText("Birmingham Administrative Court Daily Cause List");
    await expect(page.locator("body")).toContainText("List for 15 January 2026");
    await expect(page.locator("body")).toContainText("Last updated");
    await expect(page.locator("body")).toContainText("Court 1");
    await expect(page.locator("body")).toContainText("Mr Justice Williams");
    await expect(page.locator("body")).toContainText("R (Smith) v Secretary of State");

    // Verify time normalization (dot replaced with colon)
    await expect(page.locator("tbody")).toContainText("10:00am");
    await expect(page.locator("tbody")).toContainText("2:30pm");

    // Test Welsh translation
    await page.getByRole("link", { name: "Cymraeg" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toContainText("Rhestr ar gyfer 15 Ionawr 2026");
    await expect(page.locator("body")).toContainText("Diweddarwyd ddiwethaf");
    await expect(page.locator("body")).toContainText("Lleoliad");

    // Test accessibility
    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(["target-size", "link-name"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Test table search functionality
    const searchInput = page.locator('input[id="case-search-input"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Smith");
    await page.waitForTimeout(500);
    await expect(page.locator("tbody tr:visible")).toHaveCount(1);
  });

  test("should view Leeds Administrative Court list with proper formatting", async ({ page }) => {
    await uploadAdminCourtList(page, "21");

    await page.goto("/summary-of-publications?locationId=9001");
    await page.waitForTimeout(1000);

    const publicationLinks = page.locator('.govuk-list a[href*="artefactId="]');
    await publicationLinks.first().click();
    await page.waitForLoadState("networkidle");

    // Verify page loads correctly
    await expect(page.locator("h1")).toContainText("Leeds Administrative Court Daily Cause List");
    await expect(page.locator("body")).toContainText("List for");

    // Verify table headers
    await expect(page.locator("th")).toContainText("Venue");
    await expect(page.locator("th")).toContainText("Judge");
    await expect(page.locator("th")).toContainText("Time");
    await expect(page.locator("th")).toContainText("Case Number");

    // Test accessibility
    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(["target-size", "link-name"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should view Manchester Administrative Court list and verify data source", async ({ page }) => {
    await uploadAdminCourtList(page, "23");

    await page.goto("/summary-of-publications?locationId=9001");
    await page.waitForTimeout(1000);

    const publicationLinks = page.locator('.govuk-list a[href*="artefactId="]');
    await publicationLinks.first().click();
    await page.waitForLoadState("networkidle");

    // Verify data source is shown
    await expect(page.locator("body")).toContainText("Data source");
    await expect(page.locator("body")).toContainText("Manual Upload");

    // Test Welsh data source
    await page.getByRole("link", { name: "Cymraeg" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toContainText("Ffynhonnell data");
    await expect(page.locator("body")).toContainText("Llwytho â Llaw");
  });
});
