import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createUniqueTestLocation } from "../../utils/dynamic-test-data.js";
import { uploadTestPublication } from "../../utils/publication-upload.js";
import { checkFlatFileExists, deleteTestArtefact } from "../../utils/test-support-api.js";
import { createVerifiedTestUser, loginAsTestUser } from "../../utils/verified-user-helpers.js";

const GENERATED_FILE_TIMEOUT_MS = 30000;

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
    upload: {
      locationId,
      listTypeName: "SJP_PUBLIC_LIST",
      sensitivity: "PUBLIC" as const,
      contentDate,
      displayFrom: displayFrom.toISOString(),
      displayTo: displayTo.toISOString()
    },
    payload: {
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

async function uploadSjpPublicListViaApi(locationId: number): Promise<string> {
  const { upload, payload } = createSjpPublicListPayload(locationId);
  const { artefactId } = await uploadTestPublication({ ...upload, payload, mirrorJsonToWeb: true });
  return artefactId;
}

async function waitForGeneratedFiles(artefactId: string): Promise<void> {
  // Ingestion renders the PDF and Excel into Blob Storage in the background, so wait for both to land
  for (const extension of [".pdf", ".xlsx"]) {
    await expect
      .poll(async () => (await checkFlatFileExists(artefactId, extension)).exists, {
        message: `Expected generated ${extension} for artefact ${artefactId} in Blob Storage`,
        timeout: GENERATED_FILE_TIMEOUT_MS
      })
      .toBe(true);
  }
}

async function cleanupTestData(artefactId: string): Promise<void> {
  try {
    await deleteTestArtefact(artefactId);
  } catch (error) {
    console.warn(`Failed to delete artefact ${artefactId}:`, error);
  }
}

test.describe("SJP Public List - Verified User @nightly", () => {
  let artefactId: string;
  let listUrl: string;

  test.beforeAll(async () => {
    const testLocation = await createUniqueTestLocation({ namePrefix: "SJP Public Verified Test" });
    artefactId = await uploadSjpPublicListViaApi(testLocation.locationId);
    await waitForGeneratedFiles(artefactId);
    listUrl = `/sjp-public-list?artefactId=${artefactId}`;
    console.log(`Created test SJP public list with artefactId: ${artefactId}`);
  });

  test.afterAll(async () => {
    if (artefactId) {
      await cleanupTestData(artefactId);
    }
  });

  test("verified user can view SJP public list and download files", async ({ page }) => {
    // Step 1: Authenticate as this test's own verified user
    await loginAsTestUser(page, await createVerifiedTestUser());
    await page.goto("/account-home");
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

    // Step 14: Download the PDF from Blob Storage
    const downloadPromise = page.waitForEvent("download");
    await pdfLink.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`${artefactId}.pdf`);

    // Step 15: Test Welsh language on list page
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

    // Step 16: Test Welsh disclaimer page
    await welshDownloadButton.click();
    await expect(page.getByRole("heading", { name: "Telerau ac amodau", level: 1 })).toBeVisible();
  });

  test("verified user can filter cases @nightly", async ({ page }) => {
    // Authenticate
    await loginAsTestUser(page, await createVerifiedTestUser());
    await page.goto("/account-home");
    await expect(page).toHaveURL(/\/account-home/);

    // Navigate to list
    await page.goto(listUrl);

    // The MOJ FilterToggleButton shows/hides the .moj-filter element via the
    // moj-js-hidden class (gated on .js-enabled).
    const filterPanel = page.locator("#filter-panel .moj-filter");

    // Initially filters should be hidden
    await expect(filterPanel).toBeHidden();

    // Show filters
    await page.getByRole("button", { name: "Show filters" }).click();
    await expect(filterPanel).toBeVisible();

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
    await expect(page.locator(".moj-filter__tag").filter({ hasText: postcodeValue! })).toBeVisible();

    // Clear filters
    await page.getByRole("link", { name: "Clear filters" }).click();
    await expect(page.locator(".moj-filter__tag")).toHaveCount(0);

    // Test accessibility with filters
    const accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
