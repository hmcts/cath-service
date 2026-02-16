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

// Helper function to create valid JSON for Court of Appeal Civil
function createCourtOfAppealCivilJSON() {
  return JSON.stringify({
    dailyHearings: [
      {
        venue: "Court 71",
        judge: "Lord Justice Smith",
        time: "10:30am",
        caseNumber: "CA-2025-000123",
        caseDetails: "Appellant v Respondent",
        hearingType: "Appeal hearing",
        additionalInformation: "Reserved judgment"
      },
      {
        venue: "Court 73",
        judge: "Lady Justice Brown",
        time: "2.00pm",
        caseNumber: "CA-2025-000456",
        caseDetails: "Company Ltd v Director",
        hearingType: "Permission to appeal",
        additionalInformation: ""
      }
    ],
    futureJudgments: [
      {
        date: "20/01/2026",
        venue: "Court 71",
        judge: "Lord Justice Williams",
        time: "10:00am",
        caseNumber: "CA-2025-000789",
        caseDetails: "Estate of Smith v Executor",
        hearingType: "Judgment",
        additionalInformation: "Hand down"
      }
    ]
  });
}

// Helper function to upload JSON for Court of Appeal Civil
async function uploadCourtOfAppealCivilList(page: Page) {
  await page.goto("/manual-upload?locationId=9001");
  await page.waitForTimeout(1000);

  await page.selectOption('select[name="listType"]', "19");
  await page.fill('input[name="hearingStartDate-day"]', "15");
  await page.fill('input[name="hearingStartDate-month"]', "01");
  await page.fill('input[name="hearingStartDate-year"]', "2026");
  await page.selectOption('select[name="sensitivity"]', "PUBLIC");
  await page.selectOption('select[name="language"]', "ENGLISH");
  await page.fill('input[name="displayFrom-day"]', "15");
  await page.fill('input[name="displayFrom-month"]', "01");
  await page.fill('input[name="displayFrom-year"]', "2026");
  await page.fill('input[name="displayTo-day"]', "25");
  await page.fill('input[name="displayTo-month"]', "01");
  await page.fill('input[name="displayTo-year"]', "2026");

  const jsonContent = createCourtOfAppealCivilJSON();
  const fileInput = page.locator('input[name="file"]');
  await fileInput.setInputFiles({
    name: "court-of-appeal-civil-list.json",
    mimeType: "application/json",
    buffer: Buffer.from(jsonContent)
  });

  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForURL(/\/manual-upload-summary\?uploadId=/, { timeout: 10000 });

  await page.getByRole("button", { name: "Confirm" }).click();
  await page.waitForURL("/manual-upload-success", { timeout: 10000 });
}

test.describe("Court of Appeal (Civil Division) Daily Cause List - Viewing @nightly", () => {
  test.beforeEach(async ({ page }) => {
    await authenticateSystemAdmin(page);
  });

  test("should view Court of Appeal Civil list with daily hearings and future judgments sections", async ({ page }) => {
    // Upload list
    await uploadCourtOfAppealCivilList(page);

    // Navigate to summary of publications
    await page.goto("/summary-of-publications?locationId=9001");
    await page.waitForTimeout(1000);

    // Find and click the publication link
    const publicationLinks = page.locator('.govuk-list a[href*="artefactId="]');
    await expect(publicationLinks.first()).toBeVisible();
    const firstLinkHref = await publicationLinks.first().getAttribute("href");
    expect(firstLinkHref).toContain("/court-of-appeal-civil-division-daily-cause-list?artefactId=");

    await publicationLinks.first().click();
    await page.waitForLoadState("networkidle");

    // Verify English content
    await expect(page.locator("h1")).toContainText("Court of Appeal (Civil Division) Daily Cause List");
    await expect(page.locator("body")).toContainText("List for 15 January 2026");
    await expect(page.locator("body")).toContainText("Last updated");

    // Verify daily hearings section
    await expect(page.locator("body")).toContainText("Lord Justice Smith");
    await expect(page.locator("body")).toContainText("Appellant v Respondent");
    await expect(page.locator("body")).toContainText("CA-2025-000123");

    // Verify future judgments section
    await expect(page.locator("h2")).toContainText("Future Judgments");
    await expect(page.locator("body")).toContainText("Lord Justice Williams");
    await expect(page.locator("body")).toContainText("Estate of Smith v Executor");
    await expect(page.locator("body")).toContainText("20 January 2026");

    // Verify future judgments table has Date column
    const futureJudgmentsTable = page.locator("#future-judgments-table-container table");
    await expect(futureJudgmentsTable.locator("th").first()).toContainText("Date");

    // Verify time normalization (dot to colon)
    await expect(page.locator("tbody")).toContainText("10:30am");
    await expect(page.locator("tbody")).toContainText("2:00pm");

    // Test Welsh translation
    await page.getByRole("link", { name: "Cymraeg" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h1")).toContainText("Rhestr Achosion Dyddiol y Llys Apêl (Adran Sifil)");
    await expect(page.locator("body")).toContainText("Rhestr ar gyfer 15 Ionawr 2026");
    await expect(page.locator("body")).toContainText("Diweddarwyd ddiwethaf");

    // Future Judgments section in Welsh
    await expect(page.locator("h2")).toContainText("Dyfarniadau yn y Dyfodol");

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

    await searchInput.fill("Estate");
    await page.waitForTimeout(500);
    // Should show only the future judgment row
    await expect(page.locator("tbody tr:visible")).toHaveCount(1);
  });

  test("should display important information with live streaming and judgments sections", async ({ page }) => {
    await uploadCourtOfAppealCivilList(page);

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

    // Check for live streaming section
    await expect(importantInfoDetails).toContainText("Live streaming of Court of Appeal hearings");

    // Check for judgments section
    await expect(importantInfoDetails).toContainText("Judgments");
  });

  test("should handle empty future judgments section correctly", async ({ page }) => {
    // Create JSON with only daily hearings
    const jsonWithNoDailyHearings = JSON.stringify({
      dailyHearings: [
        {
          venue: "Court 71",
          judge: "Lord Justice Test",
          time: "10:00am",
          caseNumber: "CA-2025-999",
          caseDetails: "Test Case",
          hearingType: "Appeal",
          additionalInformation: ""
        }
      ],
      futureJudgments: []
    });

    await page.goto("/manual-upload?locationId=9001");
    await page.waitForTimeout(1000);

    await page.selectOption('select[name="listType"]', "19");
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

    const fileInput = page.locator('input[name="file"]');
    await fileInput.setInputFiles({
      name: "list-no-judgments.json",
      mimeType: "application/json",
      buffer: Buffer.from(jsonWithNoDailyHearings)
    });

    await page.getByRole("button", { name: /continue/i }).click();
    await page.waitForURL(/\/manual-upload-summary\?uploadId=/, { timeout: 10000 });
    await page.getByRole("button", { name: "Confirm" }).click();
    await page.waitForURL("/manual-upload-success", { timeout: 10000 });

    await page.goto("/summary-of-publications?locationId=9001");
    await page.waitForTimeout(1000);

    const publicationLinks = page.locator('.govuk-list a[href*="artefactId="]');
    await publicationLinks.first().click();
    await page.waitForLoadState("networkidle");

    // Verify daily hearings are shown
    await expect(page.locator("body")).toContainText("Test Case");

    // Verify future judgments section shows "No hearings scheduled" message
    await expect(page.locator("h2")).toContainText("Future Judgments");
    await expect(page.locator(".hearings-section")).toContainText("No hearings scheduled");
  });

  test("should verify keyboard navigation and back to top link", async ({ page }) => {
    await uploadCourtOfAppealCivilList(page);

    await page.goto("/summary-of-publications?locationId=9001");
    await page.waitForTimeout(1000);

    const publicationLinks = page.locator('.govuk-list a[href*="artefactId="]');
    await publicationLinks.first().click();
    await page.waitForLoadState("networkidle");

    // Test keyboard navigation
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const searchInput = page.locator('input[id="case-search-input"]');
    await expect(searchInput).toBeFocused();

    // Test back to top link
    const backToTopLink = page.getByRole("link", { name: /back to top/i });
    await expect(backToTopLink).toBeVisible();
    await backToTopLink.click();
    await page.waitForTimeout(500);

    // Verify we're at the top of the page
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBe(0);
  });
});
