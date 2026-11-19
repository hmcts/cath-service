import { stat } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { createUniqueTestLocation } from "../../utils/dynamic-test-data.js";
import { switchLanguage } from "../../utils/language-helpers.js";
import { loadListTypeFixture } from "../../utils/publication-payloads.js";
import { uploadTestPublication } from "../../utils/publication-upload.js";
import { loginWithSSO } from "../../utils/sso-helpers.js";
import { checkFlatFileExists } from "../../utils/test-support-api.js";

test.describe("Blob Explorer", () => {
  // Browse only this test's own court and publication; nobody subscribes to the court
  let court: { locationId: number; name: string };
  let artefactId: string;

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    court = await createUniqueTestLocation({ namePrefix: "Blob Explorer Court" });
    ({ artefactId } = await uploadTestPublication({
      locationId: court.locationId,
      listTypeName: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
      payload: loadListTypeFixture("civil-and-family-daily-cause-list"),
      mirrorJsonToWeb: true
    }));

    // This list type generates both a PDF and an Excel file; wait for both so the download links are shown
    for (const extension of [".pdf", ".xlsx"]) {
      await expect.poll(async () => (await checkFlatFileExists(artefactId, extension)).exists, { timeout: 45000, intervals: [2000] }).toBe(true);
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/system-admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await page.waitForURL("/system-admin-dashboard");
  });

  test("System admin can browse blob explorer locations and publications @nightly", async ({ page }) => {
    // STEP 1: Navigate from dashboard to Blob Explorer Locations
    await expect(page.getByRole("heading", { name: /System Admin Dashboard/i })).toBeVisible();

    // Find and click Blob Explorer tile
    const blobExplorerTile = page.locator('a.admin-tile[href="/blob-explorer-locations"]');
    await expect(blobExplorerTile).toBeVisible();
    await expect(blobExplorerTile).toContainText("Blob Explorer");
    await blobExplorerTile.click();

    // STEP 2: Verify Blob Explorer Locations page
    await expect(page).toHaveURL("/blob-explorer-locations");
    await expect(page.getByRole("heading", { name: /Blob Explorer Locations/i, level: 1 })).toBeVisible();

    // Check accessibility on locations page
    let accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Test Welsh translation on locations page
    await switchLanguage(page, "cy");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // Switch back to English
    await switchLanguage(page, "en");

    // STEP 3: Verify table structure
    const locationTable = page.locator("table.govuk-table");
    await expect(locationTable).toBeVisible();

    // Check table headers
    await expect(page.getByRole("columnheader", { name: "Location" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Number of publications per venue" })).toBeVisible();

    // Test keyboard navigation
    await page.keyboard.press("Tab");

    // STEP 4: Open this test's own court (a location is only listed once it has publications)
    await page.getByRole("link", { name: court.name, exact: true }).click();

    // STEP 5: Verify Publications page
    await expect(page).toHaveURL(new RegExp(`blob-explorer-publications.*locationId=${court.locationId}`));
    await expect(page.getByRole("heading", { name: /Blob Explorer Publications/i })).toBeVisible();

    // Check accessibility on publications page
    accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Test Welsh on publications page
    await switchLanguage(page, "cy");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await switchLanguage(page, "en");

    // STEP 6: Verify publications table
    const publicationsTable = page.locator("table.govuk-table");
    await expect(publicationsTable).toBeVisible();

    // STEP 7: Open this test's own artefact to view the JSON file page
    await page.getByRole("link", { name: artefactId, exact: true }).click();

    await expect(page).toHaveURL(new RegExp(`blob-explorer-json-file.*artefactId=${artefactId}`));
    await expect(page.getByRole("heading", { name: /Blob Explorer – JSON file/i })).toBeVisible();

    // Verify metadata summary list is visible
    const metadataSummaryList = page.locator(".govuk-summary-list").first();
    await expect(metadataSummaryList).toBeVisible();

    // Re-submit is only checked for presence: clicking it would send subscription notifications
    const resubmitButton = page.getByRole("button", { name: /Re-submit subscription/i });
    await expect(resubmitButton).toBeVisible();

    // STEP 8: Download both generated files (beforeAll waits until both exist)
    await expect(page.getByRole("heading", { name: "Generated files", level: 2 })).toBeVisible();
    await expectDownloadMatchesStoredFile(page, /^Download PDF \(.+\)$/, ".pdf");
    await expectDownloadMatchesStoredFile(page, /^Download Excel \(.+\)$/, ".xlsx");

    // Check accessibility on JSON file page
    accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["region"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Test Welsh on JSON file page: only the download links are translated (as OG CaTH)
    await switchLanguage(page, "cy");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Llwytho’r PDF \(.+\) i lawr$/ })).toHaveAttribute("href", /lng=cy/);
    await expect(page.getByRole("link", { name: /^Llwytho’r daenlen Excel \(.+\) i lawr$/ })).toHaveAttribute("href", /lng=cy/);
    accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["region"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
    await switchLanguage(page, "en");

    // Navigate back to locations
    await page.goto("/blob-explorer-locations");
    await expect(page).toHaveURL("/blob-explorer-locations");
  });

  async function expectDownloadMatchesStoredFile(page: Page, linkName: RegExp, extension: string) {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: linkName }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe(`${artefactId}${extension}`);

    const stored = await checkFlatFileExists(artefactId, extension);
    const downloaded = await stat(await download.path());
    expect(downloaded.size).toBe(stored.sizeBytes);
  }
});
