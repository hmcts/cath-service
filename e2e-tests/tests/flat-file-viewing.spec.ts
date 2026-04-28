import fs from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createUniqueTestLocation } from "../utils/dynamic-test-data.js";
import { createTestArtefact, deleteTestFlatFile, uploadTestFlatFile } from "../utils/test-support-api.js";

// Note: target-size and link-name rules are disabled due to pre-existing site-wide footer accessibility issues:
// 1. Crown copyright link fails WCAG 2.5.8 Target Size criterion (insufficient size)
// 2. Crown copyright logo link missing accessible text (WCAG 2.4.4, 4.1.2)
// These issues affect ALL pages and should be addressed in a separate ticket
// See: docs/tickets/VIBE-150/accessibility-findings.md

// When running against a deployed environment, files must be uploaded via the test-support API.
// When running locally, files can be written directly to the shared storage directory.
const IS_DEPLOYED = !!process.env.CATH_SERVICE_WEB_URL;
const STORAGE_PATH = path.join(process.cwd(), "..", "storage", "temp", "uploads");

// Helper function to create a test PDF file
function createTestPDFBuffer(content: string): Buffer {
  return Buffer.from(`%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(${content}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000214 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
308
%%EOF`);
}

// Helper function to create a flat file artefact via API
async function createFlatFileArtefact(
  options: {
    locationId: string;
    displayFrom?: Date;
    displayTo?: Date;
    isFlatFile?: boolean;
    createFile?: boolean;
    fileContent?: string;
  },
  trackingArray?: string[]
): Promise<string> {
  const {
    locationId,
    displayFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    displayTo = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    isFlatFile = true,
    createFile = true,
    fileContent = "Test Flat File Content"
  } = options;

  // Create artefact via API and get the returned artefactId
  const createdArtefact = await createTestArtefact({
    locationId,
    listTypeId: 6, // Crown Daily List
    contentDate: new Date().toISOString(),
    sensitivity: "PUBLIC",
    language: "ENGLISH",
    displayFrom: displayFrom.toISOString(),
    displayTo: displayTo.toISOString(),
    isFlatFile,
    provenance: "MANUAL"
  });

  const artefactId = createdArtefact.artefactId;

  // Create file in storage if requested
  if (createFile) {
    const pdfBuffer = createTestPDFBuffer(fileContent);

    if (IS_DEPLOYED) {
      // In deployed environments, upload file via test-support API so it lands on the deployed server's filesystem
      console.log(`[flat-file] Uploading file via API for artefact ${artefactId}`);
      await uploadTestFlatFile({ artefactId, content: pdfBuffer, extension: ".pdf" });
    } else {
      // Locally, write directly to shared storage directory
      if (!fs.existsSync(STORAGE_PATH)) {
        fs.mkdirSync(STORAGE_PATH, { recursive: true });
      }
      const filePath = path.join(STORAGE_PATH, `${artefactId}.pdf`);
      fs.writeFileSync(filePath, pdfBuffer);
    }
  }

  // Track artefact for cleanup if tracking array provided
  if (trackingArray) {
    trackingArray.push(artefactId);
  }

  return artefactId;
}

// Helper to clean up PDF files from storage
async function cleanupPDFFiles(artefactIds: string[]) {
  for (const artefactId of artefactIds) {
    if (IS_DEPLOYED) {
      try {
        await deleteTestFlatFile(artefactId);
      } catch {
        // File might not exist, which is fine
      }
    } else {
      const filePath = path.join(STORAGE_PATH, `${artefactId}.pdf`);
      try {
        await fs.promises.unlink(filePath);
      } catch {
        // File might not exist, which is fine
      }
    }
  }
}

test.describe("Flat File Viewing", () => {
  // Track artefact IDs for PDF file cleanup (database cleanup is automatic via prefix)
  const createdArtefactIds: string[] = [];

  test.afterAll(async () => {
    await cleanupPDFFiles(createdArtefactIds);
  });

  test("complete flat file viewing journey with download, headers, accessibility, Welsh, and keyboard navigation", async ({ page, context }) => {
    // Create unique location for this test
    const testLocation = await createUniqueTestLocation({ namePrefix: "Flat File Journey Court" });

    // STEP 1: Create test artefact and navigate to viewer
    const artefactId = await createFlatFileArtefact(
      {
        locationId: testLocation.locationId.toString(),
        fileContent: "Test Hearing List for Journey"
      },
      createdArtefactIds
    );

    await page.goto(`/hearing-lists/${testLocation.locationId}/${artefactId}`);
    await page.waitForLoadState("domcontentloaded");

    // Verify page loaded successfully (not an error page)
    const errorSummary = page.locator(".govuk-error-summary");
    await expect(errorSummary).not.toBeVisible();

    // STEP 2: Verify PDF viewer is present and displays inline
    const pdfObject = page.locator('object[type="application/pdf"]');
    await expect(pdfObject).toBeVisible();
    await expect(pdfObject).toHaveAttribute("data", `/api/flat-file/${artefactId}/download`);

    // Verify page title includes court name and list type
    await expect(page).toHaveTitle(/.*Crown Daily List.*/);

    // STEP 3: Verify download link is present
    const downloadLink = page.locator(`a[href="/api/flat-file/${artefactId}/download"]`);
    await expect(downloadLink).toBeVisible();
    await expect(downloadLink).toContainText(/download/i);
    await expect(downloadLink).toHaveAttribute("download", "");

    // STEP 4: Test opening in new tab
    const [newPage] = await Promise.all([
      context.waitForEvent("page"),
      page.evaluate((url) => window.open(url, "_blank"), `/hearing-lists/${testLocation.locationId}/${artefactId}`)
    ]);

    await newPage.waitForLoadState("domcontentloaded");

    // Verify PDF displays inline in new tab
    const pageUrl = newPage.url();
    expect(pageUrl).toContain(`/hearing-lists/${testLocation.locationId}/${artefactId}`);

    // Verify PDF viewer object is present in new tab
    const newPagePdfObject = newPage.locator('object[type="application/pdf"]');
    await expect(newPagePdfObject).toBeVisible();
    await expect(newPagePdfObject).toHaveAttribute("data", `/api/flat-file/${artefactId}/download`);

    // STEP 5: Run accessibility checks on viewer page
    let accessibilityScanResults = await new AxeBuilder({ page: newPage })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["target-size", "link-name"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    await newPage.close();

    // STEP 6: Test PDF download with correct headers
    const baseUrl = process.env.CATH_SERVICE_WEB_URL || "https://localhost:8080";
    const response = await page.request.get(`${baseUrl}/api/flat-file/${artefactId}/download`, {
      ignoreHTTPSErrors: true
    });

    expect(response.status()).toBe(200);

    const contentType = response.headers()["content-type"];
    expect(contentType).toBe("application/pdf");

    const contentDisposition = response.headers()["content-disposition"];
    expect(contentDisposition).toContain("inline");
    expect(contentDisposition).toContain(`${artefactId}.pdf`);

    const cacheControl = response.headers()["cache-control"];
    expect(cacheControl).toBe("private, max-age=0, no-cache, no-store, must-revalidate");

    // STEP 7: Test Welsh language support on viewer page
    await page.goto(`/hearing-lists/${testLocation.locationId}/${artefactId}?lng=cy`);
    await page.waitForLoadState("domcontentloaded");

    // Verify Welsh download link text
    const welshDownloadLink = page.locator(`a[href="/api/flat-file/${artefactId}/download"]`);
    await expect(welshDownloadLink).toBeVisible();
    await expect(welshDownloadLink).toContainText(/lawrlwytho/i);

    // STEP 8: Test keyboard navigation on viewer page (still on Welsh page)
    await welshDownloadLink.focus();
    await expect(welshDownloadLink).toBeFocused();

    // STEP 9: Full user journey from landing page (reset to English)
    await page.goto("/?lng=en");
    await expect(page).toHaveTitle(/Court and tribunal hearings/);

    // Click continue button
    const continueButtonLanding = page.getByRole("button", { name: /continue/i });
    await continueButtonLanding.click();

    // Select SJP view option
    await expect(page).toHaveURL("/view-option");
    const sjpRadio = page.getByRole("radio", { name: /single justice procedure/i });
    await sjpRadio.check();
    await page.getByRole("button", { name: /continue/i }).click();

    // Verify summary of publications page loads
    await expect(page).toHaveURL(/\/summary-of-publications/);
    await expect(page.locator("h1")).toContainText(/What do you want to view/i);

    // Navigate to flat file viewer
    await page.goto(`/hearing-lists/${testLocation.locationId}/${artefactId}`);
    await page.waitForLoadState("domcontentloaded");

    // Verify viewer loaded successfully
    expect(page.url()).toContain(`/hearing-lists/${testLocation.locationId}/${artefactId}`);
    await expect(page.locator('object[type="application/pdf"]')).toBeVisible();

    // Final accessibility check
    accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["target-size", "link-name"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("error handling journey - expired, missing, invalid files with accessibility, Welsh, and navigation", async ({ page }) => {
    // Create unique locations for different error scenarios
    const [expiredLocation, futureLocation, missingFileLocation, mismatchLocation, wrongLocation, notFlatFileLocation] = await Promise.all([
      createUniqueTestLocation({ namePrefix: "Expired File Court" }),
      createUniqueTestLocation({ namePrefix: "Future File Court" }),
      createUniqueTestLocation({ namePrefix: "Missing File Court" }),
      createUniqueTestLocation({ namePrefix: "Mismatch Court" }),
      createUniqueTestLocation({ namePrefix: "Wrong Court" }),
      createUniqueTestLocation({ namePrefix: "Not Flat File Court" })
    ]);

    // STEP 1: Test expired file (displayTo in past)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    const expiredArtefactId = await createFlatFileArtefact(
      {
        locationId: expiredLocation.locationId.toString(),
        displayFrom: twoDaysAgo,
        displayTo: yesterday, // Expired
        fileContent: "Expired File"
      },
      createdArtefactIds
    );

    await page.goto(`/hearing-lists/${expiredLocation.locationId}/${expiredArtefactId}`);
    await page.waitForLoadState("domcontentloaded");

    // Verify expired file error message
    let errorSummary = page.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();

    let errorTitle = page.locator("h1.govuk-heading-l");
    await expect(errorTitle).toBeVisible();
    await expect(errorTitle).toContainText(/file not available/i);

    let errorMessage = page.locator(".govuk-error-summary__body");
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/not available or has expired/i);

    // Verify back button is present
    let backButton = page.locator("a.govuk-button", { hasText: /back/i });
    await expect(backButton).toBeVisible();

    // STEP 2: Test future file (displayFrom in future)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const futureArtefactId = await createFlatFileArtefact(
      {
        locationId: futureLocation.locationId.toString(),
        displayFrom: tomorrow, // Not yet available
        displayTo: nextWeek,
        fileContent: "Future File"
      },
      createdArtefactIds
    );

    await page.goto(`/hearing-lists/${futureLocation.locationId}/${futureArtefactId}`);
    await page.waitForLoadState("domcontentloaded");

    errorSummary = page.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();

    errorMessage = page.locator(".govuk-error-summary__body");
    await expect(errorMessage).toContainText(/not available or has expired/i);

    // STEP 3: Test missing file from storage
    const missingArtefactId = await createFlatFileArtefact(
      {
        locationId: missingFileLocation.locationId.toString(),
        createFile: false // Don't create file in storage
      },
      createdArtefactIds
    );

    await page.goto(`/hearing-lists/${missingFileLocation.locationId}/${missingArtefactId}`);
    await page.waitForLoadState("domcontentloaded");

    errorSummary = page.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();

    errorTitle = page.locator("h1.govuk-heading-l");
    await expect(errorTitle).toContainText(/file not available/i);

    const errorSummaryList = page.locator(".govuk-error-summary__list");
    await expect(errorSummaryList).toBeVisible();
    await expect(errorSummaryList).toContainText(/could not load the hearing list file/i);

    // STEP 4: Test non-existent artefact
    const nonExistentArtefactId = "00000000-0000-0000-0000-000000000000";
    await page.goto(`/hearing-lists/${missingFileLocation.locationId}/${nonExistentArtefactId}`);
    await page.waitForLoadState("domcontentloaded");

    errorSummary = page.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();

    errorMessage = page.locator(".govuk-error-summary__body");
    await expect(errorMessage).toContainText(/not available or has expired/i);

    // STEP 5: Test location ID mismatch (security)
    const mismatchArtefactId = await createFlatFileArtefact(
      {
        locationId: mismatchLocation.locationId.toString(),
        fileContent: "Location Mismatch Test"
      },
      createdArtefactIds
    );

    // Try to access with different locationId - should fail
    await page.goto(`/hearing-lists/${wrongLocation.locationId}/${mismatchArtefactId}`);
    await page.waitForLoadState("domcontentloaded");

    errorSummary = page.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();

    errorMessage = page.locator(".govuk-error-summary__body");
    await expect(errorMessage).toContainText(/not available or has expired/i);

    // STEP 6: Test non-flat file artefact
    const notFlatFileArtefactId = await createFlatFileArtefact(
      {
        locationId: notFlatFileLocation.locationId.toString(),
        isFlatFile: false, // Not a flat file
        createFile: false
      },
      createdArtefactIds
    );

    await page.goto(`/hearing-lists/${notFlatFileLocation.locationId}/${notFlatFileArtefactId}`);
    await page.waitForLoadState("domcontentloaded");

    errorSummary = page.locator(".govuk-error-summary");
    await expect(errorSummary).toBeVisible();

    const notFlatFileErrorList = page.locator(".govuk-error-summary__list");
    await expect(notFlatFileErrorList).toBeVisible();
    await expect(notFlatFileErrorList).toContainText(/not available as a file/i);

    // STEP 7: Run accessibility checks on error page
    let accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["target-size", "link-name"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    // STEP 8: Test Welsh error messages
    await page.goto(`/hearing-lists/${missingFileLocation.locationId}/${missingArtefactId}?lng=cy`);
    await page.waitForLoadState("domcontentloaded");

    errorTitle = page.locator("h1.govuk-heading-l");
    await expect(errorTitle).toBeVisible();
    await expect(errorTitle).toContainText(/ffeil ddim ar gael/i);

    const welshErrorSummaryList = page.locator(".govuk-error-summary__list");
    await expect(welshErrorSummaryList).toContainText(/ni allwn lwytho/i);

    const welshBackButton = page.locator("a.govuk-button", { hasText: /ôl/i });
    await expect(welshBackButton).toBeVisible();

    // STEP 9: Test keyboard navigation on error page (switch back to English)
    await page.goto(`/hearing-lists/${missingFileLocation.locationId}/${missingArtefactId}?lng=en`);
    await page.waitForLoadState("networkidle");

    // Verify error page elements are keyboard accessible
    backButton = page.locator("a.govuk-button").filter({ hasText: /^back/i });
    await expect(backButton).toBeVisible();

    // Verify back button links to summary of publications with locationId parameter
    const backHref = await backButton.getAttribute("href");
    expect(backHref).toMatch(/\/summary-of-publications\?locationId=\d+/);

    // Test Tab navigation and Enter key activation
    await backButton.focus();
    await expect(backButton).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/summary-of-publications\?locationId=/);

    // STEP 10: Final accessibility check
    accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["target-size", "link-name"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
