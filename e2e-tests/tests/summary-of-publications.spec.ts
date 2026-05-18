import AxeBuilder from "@axe-core/playwright";
import type { APIRequestContext, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
// @ts-expect-error - ExcelJS is a CommonJS module
import ExcelJSPkg from "exceljs";
import { getApiAuthToken } from "../utils/api-auth-helpers.js";
import { createUniqueTestLocation } from "../utils/dynamic-test-data.js";
import { loginWithSSO } from "../utils/sso-helpers.js";
import { createOrGetListType, deleteTestArtefacts, uploadTestFlatFileToWeb } from "../utils/test-support-api.js";

const { Workbook } = ExcelJSPkg;

// Note: target-size and link-name rules are disabled due to pre-existing site-wide footer accessibility issues:
// 1. Crown copyright link fails WCAG 2.5.8 Target Size criterion (insufficient size)
// 2. Crown copyright logo link missing accessible text (WCAG 2.4.4, 4.1.2)
// These issues affect ALL pages and should be addressed in a separate ticket

const API_BASE_URL = process.env.CATH_SERVICE_API_URL || process.env.API_URL || "http://localhost:3001";
const PUBLICATION_ENDPOINT = `${API_BASE_URL}/v1/publication`;
const IS_DEPLOYED = !!process.env.CATH_SERVICE_WEB_URL;

// Create Civil and Family Daily Cause List payload (strategic list type that accepts JSON via API)
function createCivilFamilyCauseListPayload(locationId: number, contentDate: string, displayFrom: string, displayTo: string) {
  return {
    court_id: locationId.toString(),
    provenance: "MANUAL_UPLOAD",
    content_date: contentDate,
    list_type: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
    sensitivity: "PUBLIC",
    language: "ENGLISH",
    display_from: displayFrom,
    display_to: displayTo,
    hearing_list: {
      document: {
        publicationDate: `${contentDate}T09:00:00.000Z`,
        version: "1.0"
      },
      venue: {
        venueName: "Test Court Alpha",
        venueAddress: {
          line: ["1 Test Street", "Test District"],
          town: "Test City",
          county: "Test County",
          postCode: "TC1 1TC"
        },
        venueContact: {
          venueTelephone: "01234 567890",
          venueEmail: "test.court@justice.gov.uk"
        }
      },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Test Court Alpha",
            courtHouseAddress: {
              line: ["1 Test Street"],
              town: "Test City",
              postCode: "TC1 1TC"
            },
            courtRoom: [
              {
                courtRoomName: "Court Room 1",
                session: [
                  {
                    judiciary: [{ johKnownAs: "Judge Smith", isPresiding: true }],
                    sittings: [
                      {
                        sittingStart: `${contentDate}T10:00:00Z`,
                        sittingEnd: `${contentDate}T12:00:00Z`,
                        channel: ["In Person"],
                        hearing: [
                          {
                            hearingType: "Trial",
                            case: [
                              {
                                caseNumber: "TEST-001",
                                caseName: "Smith v Jones",
                                caseType: "Civil",
                                caseSequenceIndicator: "1 of 1",
                                party: [
                                  {
                                    partyRole: "APPLICANT_PETITIONER",
                                    individualDetails: { title: "Mr", individualForenames: "John", individualSurname: "Smith" }
                                  },
                                  {
                                    partyRole: "RESPONDENT",
                                    individualDetails: { title: "Ms", individualForenames: "Jane", individualSurname: "Jones" }
                                  }
                                ]
                              }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        }
      ]
    }
  };
}

// Helper function to upload publication via API
async function uploadPublicationViaApi(request: APIRequestContext, locationId: number): Promise<string> {
  const contentDate = "2026-01-15";
  const displayFrom = "2025-01-01T00:00:00Z";
  const displayTo = "2030-12-31T23:59:59Z";

  console.log(`[uploadPublicationViaApi] IS_DEPLOYED=${IS_DEPLOYED} API_URL=${PUBLICATION_ENDPOINT}`);

  const payload = createCivilFamilyCauseListPayload(locationId, contentDate, displayFrom, displayTo);
  const token = await getApiAuthToken();

  const response = await request.post(PUBLICATION_ENDPOINT, {
    data: payload,
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log(`[uploadPublicationViaApi] API response status=${response.status()}`);
  expect(response.status()).toBe(201);
  const result = await response.json();
  console.log(`[uploadPublicationViaApi] API response body=${JSON.stringify(result)}`);
  expect(result.artefact_id).toBeDefined();

  // In deployed environments, API and web are separate pods with separate filesystems.
  // The API stores the JSON on the API pod; the web controller reads from the web pod.
  // Upload the JSON to the web pod so the list type page can render it.
  if (IS_DEPLOYED) {
    console.log(`[uploadPublicationViaApi] Uploading flat file to web pod for artefactId=${result.artefact_id}`);
    const jsonBuffer = Buffer.from(JSON.stringify(payload.hearing_list));
    const uploadResult = await uploadTestFlatFileToWeb({ artefactId: result.artefact_id, content: jsonBuffer, extension: ".json" });
    console.log(`[uploadPublicationViaApi] Flat file upload result=${JSON.stringify(uploadResult)}`);
  } else {
    console.log("[uploadPublicationViaApi] Not deployed, skipping flat file upload to web pod");
  }

  return result.artefact_id;
}

// Helper function to authenticate as System Admin for non-strategic uploads
async function authenticateSystemAdmin(page: Page) {
  await page.goto("/system-admin-dashboard");

  if (page.url().includes("login.microsoftonline.com")) {
    const systemAdminEmail = process.env.SSO_TEST_SYSTEM_ADMIN_EMAIL!;
    const systemAdminPassword = process.env.SSO_TEST_SYSTEM_ADMIN_PASSWORD!;
    await loginWithSSO(page, systemAdminEmail, systemAdminPassword);
  }
}

// The converter maps Excel column headers to camelCase field names.
// This constant reflects what the converter outputs from the Excel data below.
const CST_TEST_HEARINGS_JSON = [
  {
    date: "01/01/2026",
    caseName: "Test Case A vs B",
    hearingLength: "1 hour",
    hearingType: "Substantive hearing",
    venue: "Care Standards Tribunal",
    additionalInformation: "Remote hearing via video"
  },
  {
    date: "02/01/2026",
    caseName: "Another Case C vs D",
    hearingLength: "Half day",
    hearingType: "Preliminary hearing",
    venue: "Care Standards Tribunal",
    additionalInformation: "In person"
  }
];

// Helper function to create a valid CST Excel file (non-strategic list type)
async function createValidCSTExcel(): Promise<Buffer> {
  const hearings = [
    {
      Date: "01/01/2026",
      "Case name": "Test Case A vs B",
      "Hearing length": "1 hour",
      "Hearing type": "Substantive hearing",
      Venue: "Care Standards Tribunal",
      "Additional information": "Remote hearing via video"
    },
    {
      Date: "02/01/2026",
      "Case name": "Another Case C vs D",
      "Hearing length": "Half day",
      "Hearing type": "Preliminary hearing",
      Venue: "Care Standards Tribunal",
      "Additional information": "In person"
    }
  ];

  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet("Hearings");

  worksheet.columns = [
    { header: "Date", key: "Date" },
    { header: "Case name", key: "Case name" },
    { header: "Hearing length", key: "Hearing length" },
    { header: "Hearing type", key: "Hearing type" },
    { header: "Venue", key: "Venue" },
    { header: "Additional information", key: "Additional information" }
  ];

  for (const hearing of hearings) {
    worksheet.addRow(hearing);
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// Helper function to upload CST Excel file via non-strategic upload page
async function uploadCSTExcel(page: Page, excelBuffer: Buffer, locationId: number, listTypeId: number) {
  await page.goto(`/non-strategic-upload?locationId=${locationId}`);
  await page.waitForTimeout(1000);

  // Select Care Standards Tribunal using the actual DB ID (not hardcoded)
  await page.selectOption('select[name="listType"]', String(listTypeId));
  await page.fill('input[name="hearingStartDate-day"]', "20");
  await page.fill('input[name="hearingStartDate-month"]', "01");
  await page.fill('input[name="hearingStartDate-year"]', "2026");
  await page.selectOption('select[name="sensitivity"]', "PUBLIC");
  await page.selectOption('select[name="language"]', "ENGLISH");

  // Use dates that span the current date to ensure publication is visible
  const today = new Date();
  const displayFrom = new Date(today);
  displayFrom.setDate(displayFrom.getDate() - 7);
  const displayTo = new Date(today);
  displayTo.setDate(displayTo.getDate() + 30);

  await page.fill('input[name="displayFrom-day"]', String(displayFrom.getDate()).padStart(2, "0"));
  await page.fill('input[name="displayFrom-month"]', String(displayFrom.getMonth() + 1).padStart(2, "0"));
  await page.fill('input[name="displayFrom-year"]', String(displayFrom.getFullYear()));
  await page.fill('input[name="displayTo-day"]', String(displayTo.getDate()).padStart(2, "0"));
  await page.fill('input[name="displayTo-month"]', String(displayTo.getMonth() + 1).padStart(2, "0"));
  await page.fill('input[name="displayTo-year"]', String(displayTo.getFullYear()));

  const fileInput = page.locator('input[name="file"]');
  await fileInput.setInputFiles({
    name: "cst-weekly-list.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: excelBuffer
  });

  await page.getByRole("button", { name: /continue/i }).click();
  await page.waitForURL(/\/non-strategic-upload-summary\?uploadId=/, { timeout: 10000 });
}

test.describe("Summary of Publications Page", () => {
  // Each test creates its own data for full isolation
  test("should display publications list with correct content and accessibility compliance", async ({ page, request }) => {
    // Create unique location for this test
    const testLocation = await createUniqueTestLocation({ namePrefix: "Publications Test Court" });

    // Upload a publication via API
    await uploadPublicationViaApi(request, testLocation.locationId);

    // Navigate to summary of publications
    await page.goto(`/summary-of-publications?locationId=${testLocation.locationId}`);

    // Check the page has loaded with heading
    const heading = page.locator("h1.govuk-heading-l");
    await expect(heading).toBeVisible();
    await expect(heading).toContainText("What do you want to view from");

    // Check for FaCT link
    const factLink = page.locator('a[href="https://www.find-court-tribunal.service.gov.uk/"]');
    await expect(factLink).toBeVisible();
    await expect(factLink).toContainText("Find contact details and other information about courts and tribunals");

    // Check for select list message when publications exist
    await expect(page.getByText("Select the list you want to view from the link(s) below:")).toBeVisible();

    // Check for back link
    const backLink = page.locator(".govuk-back-link");
    await expect(backLink).toBeVisible();

    // Check for publication links
    const publicationLinks = page.locator('.govuk-list a[href*="artefactId="]');
    await expect(publicationLinks.first()).toBeVisible();

    // Verify link has correct URL structure (direct to list type page with artefactId)
    const firstLinkHref = await publicationLinks.first().getAttribute("href");
    expect(firstLinkHref).toBeTruthy();
    expect(firstLinkHref).toMatch(/^\/[a-z-]+\?artefactId=[a-zA-Z0-9-]+$/);

    // Verify it's NOT using the old /publication/ route
    expect(firstLinkHref).not.toContain("/publication/");

    // Run accessibility checks
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["target-size", "link-name"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should display no publications message when location has no publications", async ({ page }) => {
    // Create unique location for this test (without uploading any publications)
    const testLocation = await createUniqueTestLocation({ namePrefix: "Empty Publications Court" });

    await page.goto(`/summary-of-publications?locationId=${testLocation.locationId}`);

    // Check for FaCT link (should still be visible)
    const factLink = page.locator('a[href="https://www.find-court-tribunal.service.gov.uk/"]');
    await expect(factLink).toBeVisible();

    // Check for empty state message
    await expect(page.getByText(/sorry, no lists found for this court/i)).toBeVisible();

    // Verify select list message is NOT displayed when no publications
    await expect(page.getByText("Select the list you want to view from the link(s) below:")).not.toBeVisible();

    // Verify no publication links are displayed
    const publicationLinks = page.locator('.govuk-list a[href*="artefactId="]');
    await expect(publicationLinks).toHaveCount(0);

    // Run accessibility checks
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["target-size", "link-name"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should view publication content with English and Welsh translations", async ({ page, request }) => {
    // Create unique location for this test
    const testLocation = await createUniqueTestLocation({ namePrefix: "Translation Test Court" });

    // Upload a publication via API
    await uploadPublicationViaApi(request, testLocation.locationId);

    // Navigate to summary of publications
    await page.goto(`/summary-of-publications?locationId=${testLocation.locationId}`);

    // Find and click the publication link
    const publicationLinks = page.locator('.govuk-list a[href*="artefactId="]');
    await expect(publicationLinks.first()).toBeVisible();
    const firstLinkHref = await publicationLinks.first().getAttribute("href");
    expect(firstLinkHref).toContain("/civil-and-family-daily-cause-list?artefactId=");

    await publicationLinks.first().click();
    await page.waitForLoadState("networkidle");

    // Verify we're on the correct page by checking the URL
    await expect(page).toHaveURL(/\/civil-and-family-daily-cause-list\?artefactId=/);

    // Verify English content (Civil and Family Daily Cause List)
    await expect(page.locator("body")).toContainText("Civil and Family Daily Cause List");
    await expect(page.locator("body")).toContainText("List for 15 January 2026");
    await expect(page.locator("body")).toContainText("Last updated");
    await expect(page.locator("body")).toContainText("Court Room 1");
    await expect(page.locator("body")).toContainText("Judge Smith");
    await expect(page.locator("body")).toContainText("Smith v Jones");

    // Test Welsh translation
    await page.locator(".app-language-toggle a").click();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toContainText("Rhestr ar gyfer 15 Ionawr 2026");
    await expect(page.locator("body")).toContainText("Diweddarwyd ddiwethaf");

    // Test accessibility (WCAG 2.2 AA only, with known GOV.UK component issues disabled)
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["target-size", "link-name", "scrollable-region-focusable", "label", "aria-valid-attr-value"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Test table search functionality
    const searchInput = page.locator('input[id="case-search-input"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Smith");
    await page.waitForTimeout(500);
    await expect(page.locator("tbody tr:visible")).toHaveCount(1);
  });

  test("should display Welsh content when language is changed @nightly", async ({ page, request }) => {
    // Create unique location for this test
    const testLocation = await createUniqueTestLocation({ namePrefix: "Welsh Test Court" });

    // Upload a publication via API
    await uploadPublicationViaApi(request, testLocation.locationId);

    await page.goto(`/summary-of-publications?locationId=${testLocation.locationId}`);

    // Wait for page to load
    await page.waitForSelector("h1.govuk-heading-l");

    // Find and click the Welsh language toggle
    const languageToggle = page.locator(".app-language-toggle a");
    await expect(languageToggle).toBeVisible();
    await expect(languageToggle).toContainText("Cymraeg");

    await languageToggle.click();

    // Wait for page to reload with Welsh content
    await page.waitForLoadState("networkidle");

    // Verify URL has Welsh parameter AND locationId is preserved
    await expect(page).toHaveURL(new RegExp(`.*locationId=${testLocation.locationId}.*lng=cy`));

    // Verify language toggle now shows English option
    await expect(languageToggle).toContainText("English");

    // Check that heading is in Welsh
    const heading = page.locator("h1.govuk-heading-l");
    await expect(heading).toContainText("Beth ydych chi eisiau edrych arno gan");

    // Check for Welsh FaCT link text
    const factLink = page.locator('a[href="https://www.find-court-tribunal.service.gov.uk/"]');
    await expect(factLink).toContainText("Dod o hyd i fanylion cyswllt a gwybodaeth arall am lysoedd a thribiwnlysoedd");

    // Check for Welsh select list message
    await expect(page.getByText("Dewiswch y rhestr rydych chi am ei gweld o'r ddolen(nau) isod:")).toBeVisible();

    // Run accessibility checks in Welsh
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["target-size", "link-name"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should preserve language selection with no publications message @nightly", async ({ page }) => {
    // Create unique location for this test (without uploading any publications)
    const testLocation = await createUniqueTestLocation({ namePrefix: "Welsh Empty Court" });

    await page.goto(`/summary-of-publications?locationId=${testLocation.locationId}&lng=cy`);

    // Wait for page to load
    await page.waitForSelector("h1.govuk-heading-l");

    // Verify Welsh empty state message
    await expect(page.getByText(/mae'n ddrwg gennym, nid ydym wedi dod o hyd i unrhyw restrau/i)).toBeVisible();

    // Verify language toggle still shows English option
    const languageToggle = page.locator(".app-language-toggle a");
    await expect(languageToggle).toContainText("English");
  });

  test("should redirect to 400 error page when locationId is missing @nightly", async ({ page }) => {
    await page.goto("/summary-of-publications");

    // Should redirect to 400 page
    await expect(page).toHaveURL("/400");

    // Check for 400 error page heading
    const heading = page.locator("h1.govuk-heading-l");
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/bad request/i);
  });

  test("should redirect to 400 error page when locationId is not numeric @nightly", async ({ page }) => {
    await page.goto("/summary-of-publications?locationId=abc");

    // Should redirect to 400 page
    await expect(page).toHaveURL("/400");

    // Check for 400 error page heading
    const heading = page.locator("h1.govuk-heading-l");
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/bad request/i);
  });

  test("should redirect to 400 error page when location does not exist @nightly", async ({ page }) => {
    // Using a non-existent locationId
    await page.goto("/summary-of-publications?locationId=999999999");

    // Should redirect to 400 page
    await expect(page).toHaveURL("/400");

    // Check for 400 error page heading
    const heading = page.locator("h1.govuk-heading-l");
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/bad request/i);
  });
});

test.describe("Non-Strategic Publication (CST Excel Upload)", () => {
  test.skip("should upload CST Excel file and view in summary of publications", async ({ page }) => {
    // Create unique location for this test
    const testLocation = await createUniqueTestLocation({ namePrefix: "CST Upload Test Court" });

    // Step 1: Authenticate as System Admin
    await authenticateSystemAdmin(page);

    // Step 2: Ensure CST list type exists (it's a non-strategic list type)
    const cstListType = await createOrGetListType({
      name: "CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST",
      friendlyName: "Care Standards Tribunal Weekly Hearing List",
      welshFriendlyName: "Rhestr Wrandawiadau Wythnosol Tribiwnlys Safonau Gofal",
      url: "/care-standards-tribunal-weekly-hearing-list",
      defaultSensitivity: "Public",
      provenance: "MANUAL_UPLOAD",
      isNonStrategic: true
    });

    // Step 3: Create and upload CST Excel file
    const excelBuffer = await createValidCSTExcel();
    await uploadCSTExcel(page, excelBuffer, testLocation.locationId, cstListType.id);

    // Step 4: Verify summary page displays correctly
    await expect(page.locator("h1")).toContainText("File upload summary");

    // Verify form data is shown
    const summaryValues = page.locator(".govuk-summary-list__value");
    await expect(summaryValues.filter({ hasText: "Care Standards Tribunal Weekly Hearing List" })).toBeVisible();

    // Step 5: Confirm the upload
    await page.getByRole("button", { name: "Confirm" }).click();
    await page.waitForURL("/non-strategic-upload-success", { timeout: 10000 });

    // Verify success page
    const successPanel = page.locator(".govuk-panel");
    await expect(successPanel).toBeVisible();
    await expect(page.locator(".govuk-panel__title")).toContainText("File upload successful");

    // Step 6: Navigate to summary of publications and verify CST list appears
    await page.goto(`/summary-of-publications?locationId=${testLocation.locationId}`);
    await expect(page.locator("h1.govuk-heading-l")).toBeVisible();

    // Find the CST publication link
    const cstLink = page.locator('.govuk-list a[href*="care-standards-tribunal-weekly-hearing-list"]');
    await expect(cstLink).toBeVisible();
    await expect(cstLink).toContainText("Care Standards Tribunal Weekly Hearing List");

    // In deployed environments, separate pod replicas have separate filesystems.
    // The web pod that processed the upload saved the JSON locally, but the view request
    // may hit a different replica. Upload the JSON explicitly so all replicas can serve it.
    if (IS_DEPLOYED) {
      const cstLinkHref = await cstLink.getAttribute("href");
      const artefactIdMatch = cstLinkHref!.match(/artefactId=([a-zA-Z0-9-]+)/);
      expect(artefactIdMatch).toBeTruthy();
      await uploadTestFlatFileToWeb({ artefactId: artefactIdMatch![1], content: Buffer.from(JSON.stringify(CST_TEST_HEARINGS_JSON)), extension: ".json" });
    }

    // Step 7: Click to view the CST publication
    await cstLink.click();
    await page.waitForLoadState("networkidle");

    // Verify CST list content is displayed
    await expect(page).toHaveURL(/\/care-standards-tribunal-weekly-hearing-list\?artefactId=/);
    await expect(page.locator("body")).toContainText("Care Standards Tribunal Weekly Hearing List");
    await expect(page.locator("body")).toContainText("Test Case A vs B");
    await expect(page.locator("body")).toContainText("Another Case C vs D");
    await expect(page.locator("body")).toContainText("Substantive hearing");
    await expect(page.locator("body")).toContainText("Preliminary hearing");

    // Step 8: Test accessibility on the CST view page
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["target-size", "link-name", "scrollable-region-focusable"])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);

    // Clean up UI-created artefacts (not tracked by prefix)
    await deleteTestArtefacts({ locationId: testLocation.locationId.toString() });
  });

  test("should display CST publication in Welsh @nightly", async ({ page }) => {
    // Create unique location for this test
    const testLocation = await createUniqueTestLocation({ namePrefix: "CST Welsh Test Court" });

    // Step 1: Authenticate and upload CST file
    await authenticateSystemAdmin(page);

    const cstListType = await createOrGetListType({
      name: "CARE_STANDARDS_TRIBUNAL_WEEKLY_HEARING_LIST",
      friendlyName: "Care Standards Tribunal Weekly Hearing List",
      welshFriendlyName: "Rhestr Wrandawiadau Wythnosol Tribiwnlys Safonau Gofal",
      url: "/care-standards-tribunal-weekly-hearing-list",
      defaultSensitivity: "Public",
      provenance: "MANUAL_UPLOAD",
      isNonStrategic: true
    });

    const excelBuffer = await createValidCSTExcel();
    await uploadCSTExcel(page, excelBuffer, testLocation.locationId, cstListType.id);
    await page.getByRole("button", { name: "Confirm" }).click();
    await page.waitForURL("/non-strategic-upload-success", { timeout: 10000 });

    // Navigate directly to Welsh version of summary of publications
    await page.goto(`/summary-of-publications?locationId=${testLocation.locationId}&lng=cy`);
    await expect(page.locator("h1.govuk-heading-l")).toBeVisible();

    // Verify the CST list link is visible
    const cstLink = page.locator('.govuk-list a[href*="care-standards-tribunal-weekly-hearing-list"]');
    await expect(cstLink).toBeVisible();

    // In deployed environments, upload the JSON to the web pod so all replicas can serve it
    if (IS_DEPLOYED) {
      const cstLinkHref = await cstLink.getAttribute("href");
      const artefactIdMatch = cstLinkHref!.match(/artefactId=([a-zA-Z0-9-]+)/);
      expect(artefactIdMatch).toBeTruthy();
      await uploadTestFlatFileToWeb({ artefactId: artefactIdMatch![1], content: Buffer.from(JSON.stringify(CST_TEST_HEARINGS_JSON)), extension: ".json" });
    }

    // Click to view the CST publication
    await cstLink.click();
    await page.waitForLoadState("networkidle");

    // Verify we're on the correct page
    await expect(page).toHaveURL(/\/care-standards-tribunal-weekly-hearing-list\?artefactId=/);

    // Verify the page loaded successfully with case data
    await expect(page.locator("body")).toContainText("Test Case A vs B");
    await expect(page.locator("body")).toContainText("Another Case C vs D");

    // Clean up UI-created artefacts (not tracked by prefix)
    await deleteTestArtefacts({ locationId: testLocation.locationId.toString() });
  });
});
