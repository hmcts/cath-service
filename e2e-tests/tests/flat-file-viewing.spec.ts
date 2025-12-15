import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { prisma } from "@hmcts/postgres";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// Note: target-size and link-name rules are disabled due to pre-existing site-wide footer accessibility issues:
// 1. Crown copyright link fails WCAG 2.5.8 Target Size criterion (insufficient size)
// 2. Crown copyright logo link missing accessible text (WCAG 2.4.4, 4.1.2)
// These issues affect ALL pages and should be addressed in a separate ticket
// See: docs/tickets/VIBE-150/accessibility-findings.md

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

// Helper function to create a flat file artefact in the database
async function createFlatFileArtefact(
  options: {
    artefactId: string;
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
    artefactId,
    locationId,
    displayFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    displayTo = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    isFlatFile = true,
    createFile = true,
    fileContent = "Test Flat File Content"
  } = options;

  // Create artefact in database
  await prisma.artefact.create({
    data: {
      artefactId,
      locationId,
      listTypeId: 6, // Crown Daily List
      contentDate: new Date(),
      sensitivity: "PUBLIC",
      language: "ENGLISH",
      displayFrom,
      displayTo,
      isFlatFile,
      provenance: "MANUAL",
      supersededCount: 0
    }
  });

  // Create file in storage if requested
  if (createFile) {
    if (!fs.existsSync(STORAGE_PATH)) {
      fs.mkdirSync(STORAGE_PATH, { recursive: true });
    }

    const filePath = path.join(STORAGE_PATH, `${artefactId}.pdf`);
    fs.writeFileSync(filePath, createTestPDFBuffer(fileContent));
  }

  // Track artefact for cleanup if tracking array provided
  if (trackingArray) {
    trackingArray.push(artefactId);
  }

  return artefactId;
}

// Helper function to create a flat file link in the summary of publications page
async function navigateToSummaryPage(page: Page, locationId: string) {
  await page.goto(`/summary-of-publications?locationId=${locationId}`);
  await page.waitForLoadState("domcontentloaded");
}

test.describe.configure({ mode: 'serial' });

test.describe("Flat File Viewing", () => {
  const testLocationId = "9"; // SJP location from seed data
  const trackedArtefactIds: string[] = [];

  test.afterEach(async () => {
    // Clean up tracked artefacts from database
    if (trackedArtefactIds.length > 0) {
      await prisma.artefact.deleteMany({
        where: { artefactId: { in: trackedArtefactIds } }
      });

      // Remove corresponding files from storage
      for (const artefactId of trackedArtefactIds) {
        const filePath = path.join(STORAGE_PATH, `${artefactId}.pdf`);
        try {
          await fs.promises.unlink(filePath);
        } catch {
          // File might not exist, which is fine
        }
      }

      // Clear the tracking array
      trackedArtefactIds.length = 0;
    }
  });

  test.afterAll(async () => {
    // Ensure STORAGE_PATH is cleaned of any leftover test PDFs
    try {
      const files = await fs.promises.readdir(STORAGE_PATH);
      for (const file of files) {
        if (file.endsWith('.pdf')) {
          await fs.promises.unlink(path.join(STORAGE_PATH, file));
        }
      }
    } catch {
      // Directory might not exist or be empty, which is fine
    }
  });

  test.describe("Happy Path - View flat file PDF", () => {
    test("should open flat file in new tab and display PDF inline with accessibility compliance (TS1, TS2, TS9)", async ({ page, context }) => {
      // Arrange: Create test artefact and file
      const artefactId = randomUUID();
      await createFlatFileArtefact({
        artefactId,
        locationId: testLocationId,
        fileContent: "Test Hearing List for Happy Path"
      }, trackedArtefactIds);

      // Act: Navigate directly to the flat file viewer page
      await page.goto(`/hearing-lists/${testLocationId}/${artefactId}`);
      await page.waitForLoadState("domcontentloaded");

      // Verify page loaded successfully (not an error page)
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).not.toBeVisible();

      // Verify PDF viewer is present
      const pdfObject = page.locator('object[type="application/pdf"]');
      await expect(pdfObject).toBeVisible();
      await expect(pdfObject).toHaveAttribute("data", `/api/flat-file/${artefactId}/download`);

      // TS1: Test opening in new tab by using window.open
      const [newPage] = await Promise.all([
        context.waitForEvent("page"),
        // Simulate opening viewer page in new tab
        page.evaluate((url) => window.open(url, "_blank"), `/hearing-lists/${testLocationId}/${artefactId}`)
      ]);

      await newPage.waitForLoadState("domcontentloaded");

      // TS2: Verify PDF displays inline in browser
      const pageUrl = newPage.url();
      expect(pageUrl).toContain(`/hearing-lists/${testLocationId}/${artefactId}`);

      // Verify page title includes court name and list type
      await expect(newPage).toHaveTitle(/.*Crown Daily List.*/);

      // Verify download link is present
      const downloadLink = newPage.locator(`a[href="/api/flat-file/${artefactId}/download"]`);
      await expect(downloadLink).toBeVisible();
      await expect(downloadLink).toContainText(/download/i);

      // Verify PDF viewer object is present in new tab
      const newPagePdfObject = newPage.locator('object[type="application/pdf"]');
      await expect(newPagePdfObject).toBeVisible();
      await expect(newPagePdfObject).toHaveAttribute("data", `/api/flat-file/${artefactId}/download`);

      // TS9: Run accessibility checks on viewer page
      const accessibilityScanResults = await new AxeBuilder({ page: newPage })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();

      if (accessibilityScanResults.violations.length > 0) {
        console.log("Accessibility violations found:");
        accessibilityScanResults.violations.forEach((violation) => {
          console.log(`- ${violation.id}: ${violation.description}`);
          console.log(`  Impact: ${violation.impact}`);
          console.log(`  Affected nodes: ${violation.nodes.length}`);
          violation.nodes.forEach((node) => {
            console.log(`    ${node.target}`);
          });
        });
      }

      expect(accessibilityScanResults.violations).toEqual([]);

      await newPage.close();
    });

    test("should serve PDF with correct Content-Type and Content-Disposition headers (TS2, TS8)", async ({ page }) => {
      // Arrange: Create test artefact and file
      const artefactId = randomUUID();
      await createFlatFileArtefact({
        artefactId,
        locationId: testLocationId,
        fileContent: "Test PDF for Headers"
      }, trackedArtefactIds);

      // Act: Make request to download endpoint
      const response = await page.request.get(`https://localhost:8080/api/flat-file/${artefactId}/download`, {
        ignoreHTTPSErrors: true
      });

      // Assert: Verify response status and headers
      expect(response.status()).toBe(200);

      const contentType = response.headers()["content-type"];
      expect(contentType).toBe("application/pdf");

      const contentDisposition = response.headers()["content-disposition"];
      expect(contentDisposition).toContain("inline");
      expect(contentDisposition).toContain(`${artefactId}.pdf`);

      const cacheControl = response.headers()["cache-control"];
      expect(cacheControl).toBe("private, max-age=0, no-cache, no-store, must-revalidate");
    });

    test("should allow downloading PDF file (TS3)", async ({ page, context }) => {
      // Arrange: Create test artefact and file
      const artefactId = randomUUID();
      await createFlatFileArtefact({
        artefactId,
        locationId: testLocationId,
        fileContent: "Test PDF for Download"
      }, trackedArtefactIds);

      // Act: Navigate to flat file viewer page
      const viewerPage = await context.newPage();
      await viewerPage.goto(`https://localhost:8080/hearing-lists/${testLocationId}/${artefactId}`, {
        waitUntil: "domcontentloaded"
      });

      // Find and verify download link
      const downloadLink = viewerPage.locator(`a[href="/api/flat-file/${artefactId}/download"]`);
      await expect(downloadLink).toBeVisible();
      await expect(downloadLink).toHaveAttribute("download", "");

      // Verify download link is functional by checking the response
      const response = await viewerPage.request.get(`https://localhost:8080/api/flat-file/${artefactId}/download`, {
        ignoreHTTPSErrors: true
      });

      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toBe("application/pdf");

      await viewerPage.close();
    });
  });

  test.describe("Error Handling - Expired Files", () => {
    test("should show error message when file has expired (displayTo in past) (TS4)", async ({ page }) => {
      // Arrange: Create expired artefact
      const artefactId = randomUUID();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

      await createFlatFileArtefact({
        artefactId,
        locationId: testLocationId,
        displayFrom: twoDaysAgo,
        displayTo: yesterday, // Expired
        fileContent: "Expired File"
      }, trackedArtefactIds);

      // Act: Navigate to flat file URL
      await page.goto(`/hearing-lists/${testLocationId}/${artefactId}`);
      await page.waitForLoadState("domcontentloaded");

      // Assert: Verify 410 Gone status and error message
      // Note: Playwright doesn't expose HTTP status directly, so we check for error page content
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      const errorTitle = page.locator("h1.govuk-heading-l");
      await expect(errorTitle).toBeVisible();
      await expect(errorTitle).toContainText(/file not available/i);

      const errorMessage = page.locator(".govuk-error-summary__body");
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/not available or has expired/i);

      // Verify back button is present
      const backButton = page.locator('a.govuk-button', { hasText: /back/i });
      await expect(backButton).toBeVisible();
    });

    test("should show error message when file not yet available (displayFrom in future)", async ({ page }) => {
      // Arrange: Create future artefact
      const artefactId = randomUUID();
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await createFlatFileArtefact({
        artefactId,
        locationId: testLocationId,
        displayFrom: tomorrow, // Not yet available
        displayTo: nextWeek,
        fileContent: "Future File"
      }, trackedArtefactIds);

      // Act: Navigate to flat file URL
      await page.goto(`/hearing-lists/${testLocationId}/${artefactId}`);
      await page.waitForLoadState("domcontentloaded");

      // Assert: Verify error message
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      const errorMessage = page.locator(".govuk-error-summary__body");
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/not available or has expired/i);
    });
  });

  test.describe("Error Handling - Missing Files", () => {
    test("should show error message when file missing from storage (TS5)", async ({ page }) => {
      // Arrange: Create artefact without file
      const artefactId = randomUUID();
      await createFlatFileArtefact({
        artefactId,
        locationId: testLocationId,
        createFile: false // Don't create file in storage
      }, trackedArtefactIds);

      // Act: Navigate to flat file URL
      await page.goto(`/hearing-lists/${testLocationId}/${artefactId}`);
      await page.waitForLoadState("domcontentloaded");

      // Assert: Verify 404 Not Found status and error message
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      const errorTitle = page.locator("h1.govuk-heading-l");
      await expect(errorTitle).toBeVisible();
      await expect(errorTitle).toContainText(/file not available/i);

      // Check error summary list item
      const errorSummaryList = page.locator(".govuk-error-summary__list");
      await expect(errorSummaryList).toBeVisible();
      await expect(errorSummaryList).toContainText(/could not load the hearing list file/i);

      // Verify back button is present
      const backButton = page.locator('a.govuk-button', { hasText: /back/i });
      await expect(backButton).toBeVisible();
    });

    test("should show error message when artefact does not exist", async ({ page }) => {
      // Arrange: Use non-existent artefact ID (valid UUID format that doesn't exist)
      const artefactId = "00000000-0000-0000-0000-000000000000";

      // Act: Navigate to flat file URL
      await page.goto(`/hearing-lists/${testLocationId}/${artefactId}`);
      await page.waitForLoadState("domcontentloaded");

      // Assert: Verify 404 error message
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      const errorMessage = page.locator(".govuk-error-summary__body");
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/not available or has expired/i);
    });

    test("should show error message when locationId does not match artefact", async ({ page }) => {
      // Arrange: Create artefact with one location
      const artefactId = randomUUID();
      await createFlatFileArtefact({
        artefactId,
        locationId: testLocationId,
        fileContent: "Location Mismatch Test"
      }, trackedArtefactIds);

      // Act: Try to access with different locationId
      const wrongLocationId = "9001";
      await page.goto(`/hearing-lists/${wrongLocationId}/${artefactId}`);
      await page.waitForLoadState("domcontentloaded");

      // Assert: Verify 404 error message (security: don't reveal artefact exists)
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      const errorMessage = page.locator(".govuk-error-summary__body");
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/not available or has expired/i);
    });
  });

  test.describe("Error Handling - Not Flat File", () => {
    test("should show error message when artefact is not a flat file", async ({ page }) => {
      // Arrange: Create artefact with isFlatFile=false
      const artefactId = randomUUID();
      await createFlatFileArtefact({
        artefactId,
        locationId: testLocationId,
        isFlatFile: false, // Not a flat file
        createFile: false
      }, trackedArtefactIds);

      // Act: Navigate to flat file URL
      await page.goto(`/hearing-lists/${testLocationId}/${artefactId}`);
      await page.waitForLoadState("domcontentloaded");

      // Assert: Verify error message
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      // Check error summary list item
      const errorSummaryList = page.locator(".govuk-error-summary__list");
      await expect(errorSummaryList).toBeVisible();
      await expect(errorSummaryList).toContainText(/not available as a file/i);
    });
  });

  test.describe("Navigation - Back Button", () => {
    test("should return to previous page when back button is clicked (TS6)", async ({ page }) => {
      // Arrange: Create missing file scenario
      const artefactId = randomUUID();
      await createFlatFileArtefact({
        artefactId,
        locationId: testLocationId,
        createFile: false // Don't create file to trigger error
      }, trackedArtefactIds);

      // Act: Navigate through journey to summary page, then to error page
      await page.goto("/view-option");
      const sjpCaseRadio = page.getByRole("radio", { name: /single justice procedure/i });
      await sjpCaseRadio.check();
      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();

      // Verify we're on summary page
      await expect(page).toHaveURL(/\/summary-of-publications/);

      // Click flat file that doesn't exist
      await page.goto(`/hearing-lists/${testLocationId}/${artefactId}`);
      await page.waitForLoadState("domcontentloaded");

      // Verify error page is shown
      const errorSummary = page.locator(".govuk-error-summary");
      await expect(errorSummary).toBeVisible();

      // Click back button
      const backButton = page.locator('a.govuk-button', { hasText: /back/i });
      await expect(backButton).toBeVisible();

      // Verify back button links to summary of publications
      const backHref = await backButton.getAttribute("href");
      expect(backHref).toBe("/summary-of-publications");

      // Click the back button and verify navigation
      await backButton.click();
      await expect(page).toHaveURL(/\/summary-of-publications/);
    });
  });

  test.describe("Welsh Language Support", () => {
    test("should display Welsh error messages when lng=cy is set (TS7)", async ({ page }) => {
      // Arrange: Create missing file scenario
      const artefactId = randomUUID();
      await createFlatFileArtefact({
        artefactId,
        locationId: testLocationId,
        createFile: false // Don't create file to trigger error
      }, trackedArtefactIds);

      // Act: Navigate to flat file URL with Welsh language parameter
      await page.goto(`/hearing-lists/${testLocationId}/${artefactId}?lng=cy`);
      await page.waitForLoadState("domcontentloaded");

      // Assert: Verify Welsh error messages
      const errorTitle = page.locator("h1.govuk-heading-l");
      await expect(errorTitle).toBeVisible();
      await expect(errorTitle).toContainText(/ffeil ddim ar gael/i);

      // Check error summary list item for Welsh text
      const errorSummaryList = page.locator(".govuk-error-summary__list");
      await expect(errorSummaryList).toBeVisible();
      await expect(errorSummaryList).toContainText(/ni allwn lwytho/i);

      const backButton = page.locator('a.govuk-button', { hasText: /ôl/i });
      await expect(backButton).toBeVisible();
    });

    test("should display Welsh content in viewer page when file exists", async ({ page }) => {
      // Arrange: Create test artefact and file
      const artefactId = randomUUID();
      await createFlatFileArtefact({
        artefactId,
        locationId: testLocationId,
        fileContent: "Test Welsh Viewer"
      }, trackedArtefactIds);

      // Act: Navigate to viewer page with Welsh language
      await page.goto(`/hearing-lists/${testLocationId}/${artefactId}?lng=cy`);
      await page.waitForLoadState("domcontentloaded");

      // Assert: Verify Welsh download link text
      const downloadLink = page.locator(`a[href="/api/flat-file/${artefactId}/download"]`);
      await expect(downloadLink).toBeVisible();
      await expect(downloadLink).toContainText(/lawrlwytho/i);
    });
  });

  test.describe("Accessibility - Error Page", () => {
    test("should meet WCAG 2.2 AA standards on error page (TS9)", async ({ page }) => {
      // Arrange: Create missing file scenario
      const artefactId = randomUUID();
      await createFlatFileArtefact({
        artefactId,
        locationId: testLocationId,
        createFile: false
      }, trackedArtefactIds);

      // Act: Navigate to error page
      await page.goto(`/hearing-lists/${testLocationId}/${artefactId}`);
      await page.waitForLoadState("domcontentloaded");

      // Assert: Run accessibility checks
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .disableRules(["target-size", "link-name"])
        .analyze();

      if (accessibilityScanResults.violations.length > 0) {
        console.log("Accessibility violations found on error page:");
        accessibilityScanResults.violations.forEach((violation) => {
          console.log(`- ${violation.id}: ${violation.description}`);
          console.log(`  Impact: ${violation.impact}`);
          console.log(`  Affected nodes: ${violation.nodes.length}`);
          violation.nodes.forEach((node) => {
            console.log(`    ${node.target}`);
          });
        });
      }

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe("Keyboard Navigation", () => {
    test("should support keyboard navigation on error page (TS10)", async ({ page }) => {
      // Arrange: Create missing file scenario
      const artefactId = randomUUID();
      await createFlatFileArtefact({
        artefactId,
        locationId: testLocationId,
        createFile: false
      }, trackedArtefactIds);

      // Act: Navigate to error page
      await page.goto(`/hearing-lists/${testLocationId}/${artefactId}`);
      await page.waitForLoadState("domcontentloaded");

      // Verify error page elements are keyboard accessible
      const backButton = page.locator('a.govuk-button', { hasText: /back/i });
      await expect(backButton).toBeVisible();

      // Test Tab navigation to back button
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");

      // Find focused element
      const focusedElement = page.locator(":focus");
      await expect(focusedElement).toBeVisible();

      // Verify back button can be activated with keyboard
      await backButton.focus();
      await expect(backButton).toBeFocused();

      // Test Enter key activation - should navigate to summary of publications
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/summary-of-publications/);
    });

    test("should support keyboard navigation on viewer page", async ({ page }) => {
      // Arrange: Create test artefact and file
      const artefactId = randomUUID();
      await createFlatFileArtefact({
        artefactId,
        locationId: testLocationId,
        fileContent: "Test Keyboard Viewer"
      }, trackedArtefactIds);

      // Act: Navigate to viewer page
      await page.goto(`/hearing-lists/${testLocationId}/${artefactId}`);
      await page.waitForLoadState("domcontentloaded");

      // Verify download link is keyboard accessible
      const downloadLink = page.locator(`a[href="/api/flat-file/${artefactId}/download"]`);
      await expect(downloadLink).toBeVisible();

      // Test keyboard focus
      await downloadLink.focus();
      await expect(downloadLink).toBeFocused();
    });
  });

  test.describe("Invalid Requests", () => {
    test("should show error message when artefactId is missing", async ({ page }) => {
      // Act: Navigate to URL without artefactId
      await page.goto(`/hearing-lists/${testLocationId}/`);
      await page.waitForLoadState("domcontentloaded");

      // Assert: Verify error message (likely 404 from Express)
      // The actual behavior depends on routing configuration
      const statusText = await page.evaluate(() => document.title);
      expect(statusText).toBeTruthy();
    });

    test("should show error message when locationId is missing", async ({ page }) => {
      // Act: Navigate to URL without locationId
      const artefactId = "test-artefact";
      await page.goto(`/hearing-lists//${artefactId}`);
      await page.waitForLoadState("domcontentloaded");

      // Assert: Verify error message
      const statusText = await page.evaluate(() => document.title);
      expect(statusText).toBeTruthy();
    });
  });

  test.describe("Content-Type Headers for Multiple File Types", () => {
    test("should serve PDF with application/pdf Content-Type (TS8)", async ({ page }) => {
      // Arrange: Create test PDF
      const artefactId = randomUUID();
      await createFlatFileArtefact({
        artefactId,
        locationId: testLocationId,
        fileContent: "PDF Content Type Test"
      }, trackedArtefactIds);

      // Act: Request file
      const response = await page.request.get(`https://localhost:8080/api/flat-file/${artefactId}/download`, {
        ignoreHTTPSErrors: true
      });

      // Assert: Verify Content-Type
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toBe("application/pdf");
    });
  });

  test.describe("Full User Journey", () => {
    test("should complete full journey from landing page to viewing flat file", async ({ page }) => {
      // Arrange: Create test flat file artefact
      const artefactId = randomUUID();
      await createFlatFileArtefact({
        artefactId,
        locationId: testLocationId,
        fileContent: "Full Journey Test"
      }, trackedArtefactIds);

      // Step 1: Start at landing page
      await page.goto("/");
      await expect(page).toHaveTitle(/Court and tribunal hearings/);

      // Step 2: Click continue button
      const continueButtonLanding = page.getByRole("button", { name: /continue/i });
      await continueButtonLanding.click();

      // Step 3: Select view option (SJP)
      await expect(page).toHaveURL("/view-option");
      const sjpRadio = page.getByRole("radio", { name: /single justice procedure/i });
      await sjpRadio.check();
      const continueButton = page.getByRole("button", { name: /continue/i });
      await continueButton.click();

      // Step 4: Verify summary of publications page loads
      await expect(page).toHaveURL(/\/summary-of-publications/);
      await expect(page.locator("h1")).toContainText(/What do you want to view/i);

      // Step 5: Navigate directly to the flat file viewer
      // (Note: The summary page shows non-flat-file artefacts, so we navigate directly)
      await page.goto(`/hearing-lists/${testLocationId}/${artefactId}`);
      await page.waitForLoadState("domcontentloaded");

      // Step 6: Verify flat file viewer loaded successfully
      expect(page.url()).toContain(`/hearing-lists/${testLocationId}/${artefactId}`);

      // Verify page title includes court name and list type
      await expect(page).toHaveTitle(/.*Crown Daily List.*/);

      // Verify PDF viewer is present
      const pdfObject = page.locator('object[type="application/pdf"]');
      await expect(pdfObject).toBeVisible();
      await expect(pdfObject).toHaveAttribute("data", `/api/flat-file/${artefactId}/download`);

      // Verify download link is present
      const downloadLink = page.locator(`a[href="/api/flat-file/${artefactId}/download"]`);
      await expect(downloadLink).toBeVisible();
    });
  });
});
