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

// Helper function to create valid JSON for RCJ Standard lists
function createRCJStandardListJSON() {
  return JSON.stringify([
    {
      venue: "Court 1",
      judge: "Mr Justice Smith",
      time: "10:00am",
      caseNumber: "T20257890",
      caseDetails: "R v Jones",
      hearingType: "Trial",
      additionalInformation: "Bring exhibits"
    },
    {
      venue: "Court 2",
      judge: "Judge Brown",
      time: "2.30pm",
      caseNumber: "T20257891",
      caseDetails: "R v Wilson",
      hearingType: "Sentencing",
      additionalInformation: ""
    }
  ]);
}

// Helper function to upload JSON for RCJ list
async function uploadRCJList(page: Page, listTypeId: string) {
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

  const jsonContent = createRCJStandardListJSON();
  const fileInput = page.locator('input[name="file"]');
  await fileInput.setInputFiles({
    name: "rcj-list.json",
    mimeType: "application/json",
    buffer: Buffer.from(jsonContent)
  });

  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForURL(/\/manual-upload-summary\?uploadId=/, { timeout: 10000 });

  await page.getByRole("button", { name: "Confirm" }).click();
  await page.waitForURL("/manual-upload-success", { timeout: 10000 });
}

test.describe("RCJ Standard Daily Cause Lists - Viewing @nightly", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateSystemAdmin(page);
  });

  test("should view Civil Courts at RCJ list with English and Welsh content", async ({ page }) => {
    // Upload list
    await uploadRCJList(page, "10");

    // Navigate to summary of publications
    await page.goto("/summary-of-publications?locationId=9001");
    await page.waitForTimeout(1000);

    // Find and click the publication link
    const publicationLinks = page.locator('.govuk-list a[href*="artefactId="]');
    await expect(publicationLinks.first()).toBeVisible();
    const firstLinkHref = await publicationLinks.first().getAttribute("href");
    expect(firstLinkHref).toContain("/civil-courts-rcj-daily-cause-list?artefactId=");

    await publicationLinks.first().click();
    await page.waitForLoadState("networkidle");

    // Verify English content
    await expect(page.locator("h1")).toContainText("Civil Courts at the Royal Courts of Justice Daily Cause List");
    await expect(page.locator("body")).toContainText("List for 15 January 2026");
    await expect(page.locator("body")).toContainText("Last updated");
    await expect(page.locator("body")).toContainText("Court 1");
    await expect(page.locator("body")).toContainText("Mr Justice Smith");
    await expect(page.locator("body")).toContainText("R v Jones");

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
    await searchInput.fill("Jones");
    await page.waitForTimeout(500);
    await expect(page.locator("tbody tr:visible")).toHaveCount(1);

    // Test back to top link
    const backToTopLink = page.getByRole("link", { name: /yn ôl i'r brig/i });
    await expect(backToTopLink).toBeVisible();
  });

  test("should view King's Bench Division list with proper formatting", async ({ page }) => {
    await uploadRCJList(page, "14");

    await page.goto("/summary-of-publications?locationId=9001");
    await page.waitForTimeout(1000);

    const publicationLinks = page.locator('.govuk-list a[href*="artefactId="]');
    await publicationLinks.first().click();
    await page.waitForLoadState("networkidle");

    // Verify page loads correctly
    await expect(page.locator("h1")).toContainText("King's Bench Division Daily Cause List");
    await expect(page.locator("body")).toContainText("List for");
    await expect(page.locator("body")).toContainText("Royal Courts of Justice");

    // Verify table headers
    await expect(page.locator("th")).toContainText("Venue");
    await expect(page.locator("th")).toContainText("Judge");
    await expect(page.locator("th")).toContainText("Time");
    await expect(page.locator("th")).toContainText("Case number");

    // Test accessibility
    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(["target-size", "link-name"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
