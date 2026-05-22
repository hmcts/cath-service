import AxeBuilder from "@axe-core/playwright";
import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { getApiAuthToken } from "../utils/api-auth-helpers.js";
import { createUniqueTestLocation } from "../utils/dynamic-test-data.js";
import { uploadTestFlatFileToWeb } from "../utils/test-support-api.js";

const API_BASE_URL = process.env.CATH_SERVICE_API_URL || process.env.API_URL || "http://localhost:3001";
const PUBLICATION_ENDPOINT = `${API_BASE_URL}/v1/publication`;
const IS_DEPLOYED = !!process.env.CATH_SERVICE_WEB_URL;

// Helper function to create SJP public list payload
function createSjpPublicListPayload(locationId: number) {
  // Postcodes must match pattern ^([A-Za-z]{2}|[A-Za-z][0-9])$ - short UK postcode areas only
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

  // Create 15 test cases with varied data
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
            individualForenames: name.split(" ")[0].charAt(0), // Just initial for public list
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

  // Use dates that span the current date to ensure publication is visible
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

// Helper function to upload publication via API
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

  // In deployed environments, API and web are separate pods with separate filesystems.
  // Upload the JSON to the web pod so the list type page can render it.
  if (IS_DEPLOYED) {
    const jsonBuffer = Buffer.from(JSON.stringify(payload.hearing_list));
    await uploadTestFlatFileToWeb({ artefactId: result.artefact_id, content: jsonBuffer, extension: ".json" });
  }

  return result.artefact_id;
}

test.describe("SJP Public List @nightly", () => {
  let artefactId: string;
  let listUrl: string;

  test.beforeAll(async ({ request }) => {
    // Create unique test location for isolation
    const testLocation = await createUniqueTestLocation({ namePrefix: "SJP Public Test Court" });

    // Upload SJP public list via API with proper authentication
    artefactId = await uploadSjpPublicListViaApi(request, testLocation.locationId);
    listUrl = `/sjp-public-list?artefactId=${artefactId}`;
    console.log(`Created test SJP public list with artefactId: ${artefactId}`);
  });

  test("should display public list with all required elements", async ({ page }) => {
    await page.goto(listUrl);

    // Check page heading
    await expect(page.getByRole("heading", { name: "Single Justice Procedure cases that are ready for hearing (Full list)", level: 1 })).toBeVisible();

    // Check list summary is visible
    await expect(page.getByText(/List containing/)).toBeVisible();
    await expect(page.getByText(/case\(s\)/)).toBeVisible();

    // Check Show/Hide filters button is visible
    const filterToggle = page.getByRole("button", { name: /filters/ });
    await expect(filterToggle).toBeVisible();

    // Check table headers using columnheader role
    await expect(page.getByRole("columnheader", { name: "Name" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Postcode" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Offence" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Prosecutor" })).toBeVisible();

    // Check Back to top link is visible
    await expect(page.getByRole("link", { name: /Back to top/i })).toBeVisible();

    // Test accessibility (disable region rule - known site-wide issue)
    const accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("user can filter cases using all filter options @nightly", async ({ page }) => {
    await page.goto(listUrl);

    const filterPanel = page.locator("#filter-panel");
    const contentArea = page.locator("#content-area");

    // Initially filters should be hidden and content area full width
    await expect(filterPanel).toBeHidden();
    await expect(contentArea).not.toHaveClass(/with-filters/);

    // Show filters
    await page.getByRole("button", { name: "Show filters" }).click();
    await expect(filterPanel).toBeVisible();
    await expect(contentArea).toHaveClass(/with-filters/);

    // Check filter elements are present
    await expect(page.getByRole("heading", { name: "Selected filters" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Clear filters" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Apply filters" })).toBeVisible();
    await expect(page.getByLabel("Search filters")).toBeVisible();
    // Check filter sections
    await expect(page.locator("#postcodes-anchor")).toBeVisible();
    await expect(page.locator("#prosecutor-anchor")).toBeVisible();

    // Check dynamically generated checkboxes are present
    const postcodeCheckboxes = page.locator('input[name="postcode"]');
    expect(await postcodeCheckboxes.count()).toBeGreaterThan(0);
    const prosecutorCheckboxes = page.locator('input[name="prosecutor"]');
    expect(await prosecutorCheckboxes.count()).toBeGreaterThan(0);

    // Hide and show filters again to test toggle
    await page.getByRole("button", { name: "Hide filters" }).click();
    await expect(filterPanel).toBeHidden();
    await page.getByRole("button", { name: "Show filters" }).click();
    await expect(filterPanel).toBeVisible();

    // Test filtering by postcode
    const firstPostcodeCheckbox = page.locator('input[name="postcode"]').first();
    const postcodeValue = await firstPostcodeCheckbox.getAttribute("value");
    await firstPostcodeCheckbox.check();
    await page.getByRole("button", { name: "Apply filters" }).click();

    // Wait for page to reload with filter applied
    await expect(page).toHaveURL(/postcode=/);

    // Verify postcode filter is applied (filter panel stays open when filters are active)
    await expect(page.locator("#filter-panel")).toBeVisible();
    await expect(page.locator(".filter-tag").filter({ hasText: postcodeValue! })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Name" })).toBeVisible();

    // Clear filters
    await page.getByRole("link", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/artefactId=/);

    // Verify filters are cleared (filter panel stays expanded after clearing)
    await expect(page.locator("#filter-panel")).toBeVisible();
    await expect(page.locator(".filter-tag")).toHaveCount(0);

    // Test accessibility (disable region rule - known site-wide issue)
    const accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should support Welsh language @nightly", async ({ page }) => {
    await page.goto(`${listUrl}&lng=cy`);

    // Check Welsh heading
    await expect(page.getByRole("heading", { name: "Achosion Gweithdrefn Un Ynad sy'n barod ar gyfer gwrandawiad (Rhestr Lawn)", level: 1 })).toBeVisible();

    // Check Welsh button text
    await expect(page.getByRole("button", { name: /hidlwyr/i })).toBeVisible();

    // Check Welsh table headers using columnheader role
    await expect(page.getByRole("columnheader", { name: "Enw" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Cod post" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Trosedd" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Erlynydd" })).toBeVisible();

    // Test accessibility in Welsh (disable region rule - known site-wide issue)
    const accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
