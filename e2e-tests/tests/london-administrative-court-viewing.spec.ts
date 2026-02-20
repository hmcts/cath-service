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

// Helper function to create valid JSON for London Administrative Court
function createLondonAdminCourtJSON() {
  return JSON.stringify({
    mainHearings: [
      {
        venue: "Court 1",
        judge: "Mr Justice Roberts",
        time: "10:00am",
        caseNumber: "CO/2025/100",
        caseDetails: "R (Brown) v Home Secretary",
        hearingType: "Permission Hearing",
        additionalInformation: "Remote via CVP"
      },
      {
        venue: "Court 2",
        judge: "Mrs Justice Green",
        time: "2.30pm",
        caseNumber: "CO/2025/101",
        caseDetails: "R (White) v NHS Trust",
        hearingType: "Substantive Hearing",
        additionalInformation: ""
      }
    ],
    planningCourt: [
      {
        venue: "Planning Court 1",
        judge: "Mr Justice Black",
        time: "11:00am",
        caseNumber: "CO/2025/200",
        caseDetails: "R (Developer Ltd) v Council",
        hearingType: "Planning Permission",
        additionalInformation: "In person"
      }
    ]
  });
}

// Helper function to upload JSON for London Administrative Court
async function uploadLondonAdminCourtList(page: Page) {
  await page.goto("/manual-upload?locationId=9001");
  await page.waitForTimeout(1000);

  await page.selectOption('select[name="listType"]', "18");
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

  const jsonContent = createLondonAdminCourtJSON();
  const fileInput = page.locator('input[name="file"]');
  await fileInput.setInputFiles({
    name: "london-admin-court-list.json",
    mimeType: "application/json",
    buffer: Buffer.from(jsonContent)
  });

  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForURL(/\/manual-upload-summary\?uploadId=/, { timeout: 10000 });

  await page.getByRole("button", { name: "Confirm" }).click();
  await page.waitForURL("/manual-upload-success", { timeout: 10000 });
}

test.describe("London Administrative Court Daily Cause List - Viewing @nightly", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateSystemAdmin(page);
  });

  test("should view London Administrative Court list with main hearings and planning court sections", async ({ page }) => {
    // Upload list
    await uploadLondonAdminCourtList(page);

    // Navigate to summary of publications
    await page.goto("/summary-of-publications?locationId=9001");
    await page.waitForTimeout(1000);

    // Find and click the publication link
    const publicationLinks = page.locator('.govuk-list a[href*="artefactId="]');
    await expect(publicationLinks.first()).toBeVisible();
    const firstLinkHref = await publicationLinks.first().getAttribute("href");
    expect(firstLinkHref).toContain("/london-administrative-court-daily-cause-list?artefactId=");

    await publicationLinks.first().click();
    await page.waitForLoadState("networkidle");

    // Verify English content
    await expect(page.locator("h1")).toContainText("London Administrative Court Daily Cause List");
    await expect(page.locator("body")).toContainText("List for 15 January 2026");
    await expect(page.locator("body")).toContainText("Last updated");

    // Verify main hearings section
    await expect(page.locator("body")).toContainText("R (Brown) v Home Secretary");
    await expect(page.locator("body")).toContainText("Mr Justice Roberts");

    // Verify planning court section
    await expect(page.locator("h2")).toContainText("Planning Court");
    await expect(page.locator("body")).toContainText("R (Developer Ltd) v Council");
    await expect(page.locator("body")).toContainText("Mr Justice Black");

    // Verify time normalization
    await expect(page.locator("tbody")).toContainText("10:00am");
    await expect(page.locator("tbody")).toContainText("2:30pm");

    // Test Welsh translation
    await page.getByRole("link", { name: "Cymraeg" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toContainText("Rhestr Achosion Dyddiol Llys Gweinyddol Llundain");
    await expect(page.locator("body")).toContainText("Rhestr ar gyfer 15 Ionawr 2026");
    await expect(page.locator("body")).toContainText("Diweddarwyd ddiwethaf");
    await expect(page.locator("h2")).toContainText("Llys Cynllunio");

    // Test accessibility
    const accessibilityScanResults = await new AxeBuilder({ page })
      .disableRules(["target-size", "link-name"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Test table search across both sections
    const searchInput = page.locator('input[id="case-search-input"]');
    await expect(searchInput).toBeVisible();

    // Switch back to English for search test
    await page.getByRole("link", { name: "English" }).click();
    await page.waitForLoadState("networkidle");

    await searchInput.fill("Developer");
    await page.waitForTimeout(500);
    // Should show only the planning court row
    await expect(page.locator("tbody tr:visible")).toHaveCount(1);
  });

  test("should display important information section correctly", async ({ page }) => {
    await uploadLondonAdminCourtList(page);

    await page.goto("/summary-of-publications?locationId=9001");
    await page.waitForTimeout(1000);

    const publicationLinks = page.locator('.govuk-list a[href*="artefactId="]');
    await publicationLinks.first().click();
    await page.waitForLoadState("networkidle");

    // Check for important information section
    const importantInfoDetails = page.locator(".govuk-details");
    await expect(importantInfoDetails).toBeVisible();
    await expect(importantInfoDetails.locator(".govuk-details__summary-text")).toContainText("Important information");

    // Expand the details section
    await importantInfoDetails.locator(".govuk-details__summary").click();
    await expect(importantInfoDetails).toContainText("Hearings take place in public");

    // Check for judgments section
    await expect(importantInfoDetails).toContainText("Judgments");
  });

  test("should verify keyboard navigation works correctly", async ({ page }) => {
    await uploadLondonAdminCourtList(page);

    await page.goto("/summary-of-publications?locationId=9001");
    await page.waitForTimeout(1000);

    const publicationLinks = page.locator('.govuk-list a[href*="artefactId="]');
    await publicationLinks.first().click();
    await page.waitForLoadState("networkidle");

    // Test keyboard navigation to search input
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const searchInput = page.locator('input[id="case-search-input"]');
    await expect(searchInput).toBeFocused();

    // Test keyboard navigation to table
    await page.keyboard.press("Tab");
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();
  });
});
