import fs from "node:fs";
import path from "node:path";
import AxeBuilder from "@axe-core/playwright";
import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { getApiAuthToken } from "../../utils/api-auth-helpers.js";
import { loginWithCftIdam } from "../../utils/cft-idam-helpers.js";
import { createUniqueTestLocation } from "../../utils/dynamic-test-data.js";
import { deleteTestArtefact, deleteTestFlatFileFromWeb, uploadTestFlatFileToWeb } from "../../utils/test-support-api.js";

const API_BASE_URL = process.env.CATH_SERVICE_API_URL || process.env.API_URL || "http://localhost:3001";
const PUBLICATION_ENDPOINT = `${API_BASE_URL}/v1/publication`;
const IS_DEPLOYED = !!process.env.CATH_SERVICE_WEB_URL;
// When running tests from e2e-tests/, go up to monorepo root then to storage
const MONOREPO_ROOT = path.join(process.cwd(), "..");
const STORAGE_PATH = process.env.FILE_STORAGE_PATH || path.join(MONOREPO_ROOT, "storage", "temp", "uploads");

function createSjpPublicListPayload(locationId: number) {
  const postcodes = ["SW", "M1", "B1", "E1", "BS", "LS"];
  const prosecutors = ["TV Licensing", "Thames Valley Police", "Manchester City Council"];
  const offences = [
    "Use a television set without a licence",
    "Exceed the speed limit on a restricted road",
    "Fail to comply with red traffic light",
    "Use a hand-held mobile telephone whilst driving"
  ];
  const names = ["John Smith", "Jane Doe", "Bob Wilson", "Alice Brown"];

  const hearings = [];

  for (let i = 0; i < 15; i++) {
    const postcode = postcodes[i % postcodes.length];
    const prosecutor = prosecutors[i % prosecutors.length];
    const offence = offences[i % offences.length];
    const name = names[i % names.length];

    hearings.push({
      case: [{ caseUrn: `URN${2025}${String(i + 1).padStart(6, "0")}` }],
      party: [
        {
          partyRole: "ACCUSED",
          individualDetails: {
            individualForenames: name.split(" ")[0].charAt(0),
            individualSurname: name.split(" ")[1],
            address: {
              line: [`${i + 100} Test Street`],
              town: "Bristol",
              county: "Avon",
              postCode: postcode
            }
          }
        },
        {
          partyRole: "PROSECUTOR",
          organisationDetails: {
            organisationName: prosecutor
          }
        }
      ],
      offence: [
        {
          offenceTitle: offence,
          reportingRestriction: false
        }
      ]
    });
  }

  const today = new Date();
  const displayFrom = new Date(today);
  displayFrom.setDate(displayFrom.getDate() - 7);
  const displayTo = new Date(today);
  displayTo.setDate(displayTo.getDate() + 365);

  const contentDate = today.toISOString().split("T")[0];

  return {
    court_id: locationId.toString(),
    provenance: "MANUAL_UPLOAD",
    content_date: contentDate,
    list_type: "SJP_PUBLIC_LIST",
    sensitivity: "PUBLIC",
    language: "ENGLISH",
    display_from: displayFrom.toISOString(),
    display_to: displayTo.toISOString(),
    hearing_list: {
      document: {
        publicationDate: `${contentDate}T09:00:00Z`,
        version: "1.0"
      },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Bristol Magistrates' Court",
            courtHouseAddress: {
              line: ["Nelson Street"],
              town: "Bristol",
              county: "Avon",
              postCode: "BS1 2JA"
            },
            courtRoom: [
              {
                courtRoomName: "Room 1",
                session: [
                  {
                    sittings: [
                      {
                        sittingStart: `${contentDate}T09:00:00Z`,
                        sittingEnd: `${contentDate}T17:00:00Z`,
                        hearing: hearings
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

async function uploadSjpPublicListViaApi(request: APIRequestContext, locationId: number): Promise<string> {
  const payload = createSjpPublicListPayload(locationId);
  const token = await getApiAuthToken();

  const response = await request.post(PUBLICATION_ENDPOINT, {
    data: payload,
    headers: { Authorization: `Bearer ${token}` }
  });

  const result = await response.json();

  expect(response.status()).toBe(201);
  expect(result.artefact_id).toBeDefined();

  if (IS_DEPLOYED) {
    const jsonBuffer = Buffer.from(JSON.stringify(payload.hearing_list));
    await uploadTestFlatFileToWeb({ artefactId: result.artefact_id, content: jsonBuffer, extension: ".json" });
  }

  return result.artefact_id;
}

async function uploadDownloadableFiles(artefactId: string): Promise<void> {
  // Create a minimal PDF for testing
  const pdfContent = Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj xref 0 4 0000000000 65535 f 0000000009 00000 n 0000000052 00000 n 0000000101 00000 n trailer<</Size 4/Root 1 0 R>>startxref 178 %%EOF"
  );

  // Create a minimal Excel file for testing (XLSX is a ZIP file with XML content)
  const excelContent = Buffer.from("Test Excel Content");

  if (IS_DEPLOYED) {
    await uploadTestFlatFileToWeb({ artefactId, content: pdfContent, extension: ".pdf" });
    await uploadTestFlatFileToWeb({ artefactId, content: excelContent, extension: ".xlsx" });
  } else {
    const storageDir = STORAGE_PATH;
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    fs.writeFileSync(path.join(storageDir, `${artefactId}.pdf`), pdfContent);
    fs.writeFileSync(path.join(storageDir, `${artefactId}.xlsx`), excelContent);
  }
}

async function cleanupTestData(artefactId: string): Promise<void> {
  console.log(`Cleaning up test data for artefactId: ${artefactId}`);

  // Delete the artefact via API
  try {
    await deleteTestArtefact(artefactId);
    console.log(`Deleted artefact: ${artefactId}`);
  } catch (error) {
    console.warn(`Failed to delete artefact ${artefactId}:`, error);
  }

  // Clean up files
  if (IS_DEPLOYED) {
    // Delete flat files from web storage
    try {
      await deleteTestFlatFileFromWeb(artefactId);
      console.log(`Deleted flat files from web for: ${artefactId}`);
    } catch (error) {
      console.warn(`Failed to delete flat files from web for ${artefactId}:`, error);
    }
  } else {
    // Delete local files
    const extensions = [".json", ".pdf", ".xlsx"];
    for (const ext of extensions) {
      const filePath = path.join(STORAGE_PATH, `${artefactId}${ext}`);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Deleted local file: ${filePath}`);
        }
      } catch (error) {
        console.warn(`Failed to delete local file ${filePath}:`, error);
      }
    }
  }
}

test.describe("SJP Public List - Verified User @nightly", () => {
  let artefactId: string;
  let listUrl: string;

  test.beforeAll(async ({ request }) => {
    const testLocation = await createUniqueTestLocation({ namePrefix: "SJP Public Verified Test" });
    artefactId = await uploadSjpPublicListViaApi(request, testLocation.locationId);
    await uploadDownloadableFiles(artefactId);
    listUrl = `/sjp-public-list?artefactId=${artefactId}`;
    console.log(`Created test SJP public list with artefactId: ${artefactId}`);
  });

  test.afterAll(async () => {
    if (artefactId) {
      await cleanupTestData(artefactId);
    }
  });

  test("verified user can view SJP public list and download files", async ({ page }) => {
    // Step 1: Authenticate via CFT IDAM
    await page.goto("/sign-in");
    const hmctsRadio = page.getByRole("radio", { name: /with a myhmcts account/i });
    await hmctsRadio.check();
    await page.getByRole("button", { name: /continue/i }).click();
    await loginWithCftIdam(page, process.env.CFT_VALID_TEST_ACCOUNT!, process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD!);
    await expect(page).toHaveURL(/\/account-home/);

    // Step 2: Navigate to SJP public list
    await page.goto(listUrl);

    // Step 3: Verify page heading and content
    await expect(page.getByRole("heading", { name: "Single Justice Procedure cases that are ready for hearing (Full list)", level: 1 })).toBeVisible();
    await expect(page.getByText(/List containing/)).toBeVisible();
    await expect(page.getByText(/case\(s\)/)).toBeVisible();

    // Step 4: Verify table headers
    await expect(page.getByRole("columnheader", { name: "Name" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Postcode" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Offence" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Prosecutor" })).toBeVisible();

    // Step 5: Verify Download a copy button is visible for verified users
    // Note: The anchor has role="button" per GOV.UK Design System
    const downloadButton = page.getByRole("button", { name: "Download a copy" });
    await expect(downloadButton).toBeVisible();

    // Step 6: Test accessibility on list page
    const listAccessibility = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(listAccessibility.violations).toEqual([]);

    // Step 7: Click Download a copy button - goes to disclaimer page
    await downloadButton.click();
    await expect(page).toHaveURL(/\/sjp-public-list\/list-download-disclaimer/);

    // Step 8: Verify disclaimer page content
    await expect(page.getByRole("heading", { name: "Terms and conditions", level: 1 })).toBeVisible();
    const agreeCheckbox = page.getByRole("checkbox", { name: /tick this box to agree/i });
    await expect(agreeCheckbox).toBeVisible();

    // Step 9: Test validation - try to continue without agreeing
    await page.getByRole("button", { name: "Continue" }).click();
    // Error appears in both error summary (as link) and inline - check the error summary
    await expect(page.getByRole("link", { name: "You must agree to the terms and conditions" })).toBeVisible();

    // Step 10: Agree and continue
    await agreeCheckbox.check();
    await page.getByRole("button", { name: /Continue/i }).click();
    await expect(page).toHaveURL(/\/sjp-public-list\/list-download-files/);

    // Step 11: Verify download files page
    await expect(page.getByRole("heading", { name: /Download your file/i, level: 1 })).toBeVisible();

    // Step 12: Verify download links are present
    const pdfLink = page.getByRole("link", { name: /PDF/i });
    const excelLink = page.getByRole("link", { name: /Excel/i });
    await expect(pdfLink).toBeVisible();
    await expect(excelLink).toBeVisible();

    // Step 13: Test accessibility on download files page
    const downloadAccessibility = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(downloadAccessibility.violations).toEqual([]);

    // Step 14: Test Welsh language on list page
    await page.goto(`${listUrl}&lng=cy`);
    await expect(page.getByRole("heading", { name: "Achosion Gweithdrefn Un Ynad sy'n barod ar gyfer gwrandawiad (Rhestr Lawn)", level: 1 })).toBeVisible();

    // Welsh table headers
    await expect(page.getByRole("columnheader", { name: "Enw" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Cod post" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Trosedd" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Erlynydd" })).toBeVisible();

    // Welsh download button (anchor with role="button")
    const welshDownloadButton = page.getByRole("button", { name: "Lawrlwytho copi" });
    await expect(welshDownloadButton).toBeVisible();

    // Step 15: Test Welsh disclaimer page
    await welshDownloadButton.click();
    await expect(page.getByRole("heading", { name: "Telerau ac amodau", level: 1 })).toBeVisible();
  });

  test("verified user can filter cases @nightly", async ({ page }) => {
    // Authenticate
    await page.goto("/sign-in");
    const hmctsRadio = page.getByRole("radio", { name: /with a myhmcts account/i });
    await hmctsRadio.check();
    await page.getByRole("button", { name: /continue/i }).click();
    await loginWithCftIdam(page, process.env.CFT_VALID_TEST_ACCOUNT!, process.env.CFT_VALID_TEST_ACCOUNT_PASSWORD!);
    await expect(page).toHaveURL(/\/account-home/);

    // Navigate to list
    await page.goto(listUrl);

    const filterPanel = page.locator("#filter-panel");
    const contentArea = page.locator("#content-area");

    // Initially filters should be hidden
    await expect(filterPanel).toBeHidden();
    await expect(contentArea).not.toHaveClass(/with-filters/);

    // Show filters
    await page.getByRole("button", { name: "Show filters" }).click();
    await expect(filterPanel).toBeVisible();
    await expect(contentArea).toHaveClass(/with-filters/);

    // Check filter elements
    await expect(page.getByRole("heading", { name: "Selected filters" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Clear filters" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Apply filters" })).toBeVisible();

    // Test filtering by postcode
    const firstPostcodeCheckbox = page.locator('input[name="postcode"]').first();
    const postcodeValue = await firstPostcodeCheckbox.getAttribute("value");
    await firstPostcodeCheckbox.check();
    await page.getByRole("button", { name: "Apply filters" }).click();

    await expect(page).toHaveURL(/postcode=/);
    await expect(page.locator(".filter-tag").filter({ hasText: postcodeValue! })).toBeVisible();

    // Clear filters
    await page.getByRole("link", { name: "Clear filters" }).click();
    await expect(page.locator(".filter-tag")).toHaveCount(0);

    // Test accessibility with filters
    const accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
