import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginWithSSO } from "../utils/sso-helpers.js";
import { prisma } from "@hmcts/postgres";
import fs from "node:fs/promises";
import path from "node:path";

interface TestPublicationData {
  artefactId: string;
  locationId: number;
  locationName: string;
}

const testPublicationMap = new Map<string, TestPublicationData>();

async function createTestPublication(): Promise<TestPublicationData> {
  // Get first location for test
  const location = await prisma.location.findFirst();
  if (!location) {
    throw new Error("No location found in database");
  }

  // Create test artefact (JSON publication) - let Prisma generate UUID
  const artefact = await prisma.artefact.create({
    data: {
      locationId: location.locationId.toString(),
      provenance: "MANUAL_UPLOAD",
      displayFrom: new Date("2024-01-01"),
      displayTo: new Date("2024-12-31"),
      language: "ENGLISH",
      listTypeId: 1, // Family Daily Cause List
      sensitivity: "PUBLIC",
      contentDate: new Date("2024-06-01"),
      isFlatFile: false,
    },
  });

  const artefactId = artefact.artefactId;

  // Create test JSON file in storage
  const storageDir = path.join(process.cwd(), "storage", "temp", "uploads");
  await fs.mkdir(storageDir, { recursive: true });

  const testJsonContent = {
    document: {
      publicationDate: "2024-06-01",
      locationName: location.name,
      language: "ENGLISH",
      listType: "CIVIL_DAILY_CAUSE_LIST",
      courtLists: [
        {
          courtHouse: { courtHouseName: location.name },
          courtListings: [
            { case: { caseName: "Test Case 123" } },
          ],
        },
      ],
    },
  };

  await fs.writeFile(
    path.join(storageDir, `${artefactId}.json`),
    JSON.stringify(testJsonContent, null, 2)
  );

  // Create a test user and subscription for resubmission test
  const testUser = await prisma.user.create({
    data: {
      email: "test-subscriber@example.com",
      userProvenance: "SSO",
      userProvenanceId: `test-${Date.now()}`,
      role: "MEDIA",
    },
  });

  await prisma.subscription.create({
    data: {
      userId: testUser.userId,
      locationId: location.locationId,
    },
  });

  return {
    artefactId,
    locationId: location.locationId,
    locationName: location.name,
  };
}

async function deleteTestPublication(publicationData: TestPublicationData): Promise<void> {
  try {
    if (!publicationData.artefactId) return;

    // Delete artefact
    await prisma.artefact.delete({
      where: { artefactId: publicationData.artefactId },
    });

    // Delete test file
    const storageDir = path.join(process.cwd(), "storage", "temp", "uploads");
    try {
      await fs.unlink(path.join(storageDir, `${publicationData.artefactId}.json`));
    } catch {
      // File may not exist, ignore
    }
  } catch (error) {
    console.log("Test publication cleanup:", error);
  }
}

test.describe("Blob Explorer", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/system-admin-dashboard");
    await loginWithSSO(page, process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!, process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!);
    await page.waitForURL("/system-admin-dashboard");
  });

  test("System admin can browse and resubmit publication @nightly", async ({ page }, testInfo) => {
    // Create test publication
    const publicationData = await createTestPublication();
    testPublicationMap.set(testInfo.testId, publicationData);

    try {
      // STEP 1: Navigate from dashboard to Blob Explorer Locations
      await page.goto("/system-admin-dashboard");
      await expect(page.getByRole("heading", { name: /System Admin Dashboard/i })).toBeVisible();

      // Find and click Blob Explorer tile
      const blobExplorerTile = page.locator('a.admin-tile[href="/blob-explorer"]');
      await expect(blobExplorerTile).toBeVisible();
      await expect(blobExplorerTile).toContainText("Blob Explorer");
      await blobExplorerTile.click();

      // STEP 2: Verify Blob Explorer Locations page
      await expect(page).toHaveURL("/blob-explorer");
      await expect(page.getByRole("heading", { name: /Blob Explorer Locations/i, level: 1 })).toBeVisible();

      // Test Welsh translation on locations page
      await page.getByRole("link", { name: /Cymraeg/i }).click();
      await page.waitForURL(/lng=cy/);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      // Switch back to English
      await page.getByRole("link", { name: /English/i }).click();
      await page.waitForURL(/lng=en/);

      // Check accessibility on locations page
      let accessibilityScanResults = await new AxeBuilder({ page })
        .disableRules(["region"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Test keyboard navigation - tab to first location link
      await page.keyboard.press("Tab");

      // STEP 3: Select location and view publications
      const locationTable = page.locator("table.govuk-table");
      await expect(locationTable).toBeVisible();

      // Find row with our test location and click it
      const locationLink = page.locator(`a[href*="/blob-explorer/publications?locationId=${publicationData.locationId}"]`).first();
      await expect(locationLink).toBeVisible();
      await locationLink.click();

      // STEP 4: Verify Publications page
      await expect(page).toHaveURL(new RegExp(`/blob-explorer/publications.*locationId=${publicationData.locationId}`));
      await expect(page.getByRole("heading", { name: /Blob Explorer Publications/i })).toBeVisible();

      // Test Welsh on publications page
      await page.getByRole("link", { name: /Cymraeg/i }).click();
      await page.waitForURL(/lng=cy/);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.getByRole("link", { name: /English/i }).click();
      await page.waitForURL(/lng=en/);

      // Check accessibility on publications page
      accessibilityScanResults = await new AxeBuilder({ page })
        .disableRules(["region"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // STEP 5: Select JSON publication and view metadata
      const publicationsTable = page.locator("table.govuk-table");
      await expect(publicationsTable).toBeVisible();

      const artefactLink = page.locator(`a[href*="/blob-explorer/json-file?artefactId=${publicationData.artefactId}"]`).first();
      await expect(artefactLink).toBeVisible();
      await artefactLink.click();

      // STEP 6: Verify JSON File page with metadata
      await expect(page).toHaveURL(new RegExp(`/blob-explorer/json-file.*artefactId=${publicationData.artefactId}`));
      await expect(page.getByRole("heading", { name: /Blob Explorer – JSON file/i })).toBeVisible();

      // Verify metadata table is visible
      const metadataTable = page.locator("table.govuk-table").first();
      await expect(metadataTable).toBeVisible();

      // Verify Re-submit subscription button
      const resubmitButton = page.getByRole("button", { name: /Re-submit subscription/i });
      await expect(resubmitButton).toBeVisible();

      // Test Welsh on JSON file page
      await page.getByRole("link", { name: /Cymraeg/i }).click();
      await page.waitForURL(/lng=cy/);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.getByRole("link", { name: /English/i }).click();
      await page.waitForURL(/lng=en/);

      // Check accessibility on JSON file page
      accessibilityScanResults = await new AxeBuilder({ page })
        .disableRules(["region"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // STEP 7: Test accordion with raw JSON content
      const accordion = page.locator("details.govuk-details");
      await expect(accordion).toBeVisible();

      // Open accordion
      const accordionSummary = accordion.locator("summary");
      await accordionSummary.click();

      // Verify JSON content is visible
      const jsonContent = accordion.locator(".govuk-details__text");
      await expect(jsonContent).toBeVisible();

      // STEP 8: Test viewing rendered template link
      const renderedLink = page.getByRole("link", { name: /Link to rendered template/i });
      await expect(renderedLink).toBeVisible();

      // STEP 9: Trigger resubmission workflow
      await resubmitButton.click();

      // STEP 10: Verify confirmation page
      await expect(page).toHaveURL(new RegExp(`/blob-explorer/confirm-resubmission.*artefactId=${publicationData.artefactId}`));
      await expect(page.getByRole("heading", { name: /Confirm subscription re-submission/i })).toBeVisible();

      // Verify summary table
      const summaryTable = page.locator("table.govuk-table");
      await expect(summaryTable).toBeVisible();

      // Test Welsh on confirmation page
      await page.getByRole("link", { name: /Cymraeg/i }).click();
      await page.waitForURL(/lng=cy/);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.getByRole("link", { name: /English/i }).click();
      await page.waitForURL(/lng=en/);

      // Check accessibility on confirmation page
      accessibilityScanResults = await new AxeBuilder({ page })
        .disableRules(["region"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // Test Cancel link (should return to locations)
      const cancelLink = page.getByRole("link", { name: /Cancel/i });
      await expect(cancelLink).toBeVisible();

      // Test keyboard navigation to Cancel link
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");

      // Don't click Cancel, proceed with Confirm instead

      // STEP 11: Confirm submission
      const confirmButton = page.getByRole("button", { name: /Confirm/i });
      await expect(confirmButton).toBeVisible();
      await confirmButton.click();

      // STEP 12: Verify success page
      await expect(page).toHaveURL("/blob-explorer/resubmission-success");
      await expect(page.getByRole("heading", { name: /Submission re-submitted/i })).toBeVisible();

      // Verify success panel/banner
      const successPanel = page.locator(".govuk-panel");
      await expect(successPanel).toBeVisible();

      // Test Welsh on success page
      await page.getByRole("link", { name: /Cymraeg/i }).click();
      await page.waitForURL(/lng=cy/);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.getByRole("link", { name: /English/i }).click();
      await page.waitForURL(/lng=en/);

      // Check accessibility on success page
      accessibilityScanResults = await new AxeBuilder({ page })
        .disableRules(["region"])
        .analyze();
      expect(accessibilityScanResults.violations).toEqual([]);

      // STEP 13: Test POST/Redirect/GET pattern - browser back should not re-submit
      await page.goBack();
      await expect(page).toHaveURL("/blob-explorer/resubmission-success");
      // Should still be on success page, not trigger another submission

      // STEP 14: Navigate back to locations
      const locationsLink = page.getByRole("link", { name: /Blob explorer – Locations/i });
      await expect(locationsLink).toBeVisible();
      await locationsLink.click();
      await expect(page).toHaveURL("/blob-explorer");

    } finally {
      // Cleanup test publication
      const pubData = testPublicationMap.get(testInfo.testId);
      if (pubData) {
        await deleteTestPublication(pubData);
        testPublicationMap.delete(testInfo.testId);
      }
    }
  });
});
