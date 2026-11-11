import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createUniqueTestLocation } from "../utils/dynamic-test-data.js";
import { uploadTestPublication } from "../utils/publication-upload.js";
import { createVerifiedTestUser, loginAsTestUser, type VerifiedTestUser } from "../utils/verified-user-helpers.js";

// Helper function to create SJP press list payload
function createSjpPressListPayload(locationId: number) {
  // Postcodes must match pattern ^([A-Za-z]{2}|[A-Za-z][0-9])$ - short UK postcode areas only
  const postcodes = ["SW", "M1", "B1", "E1", "BS", "LS"];
  const prosecutors = ["TV Licensing", "Thames Valley Police", "Manchester City Council"];
  const offences = [
    { title: "Use a television set without a licence", wording: "Failed to pay TV license fee" },
    { title: "Exceed the speed limit on a restricted road", wording: "Driving at 45mph in a 30mph zone" },
    { title: "Fail to comply with red traffic light", wording: "Failed to stop at red light" },
    { title: "Use a hand-held mobile telephone whilst driving", wording: "Using phone while driving on M1" }
  ];
  const names = [
    { forenames: "John", surname: "Smith", dob: "1985-05-15", age: 40 },
    { forenames: "Jane", surname: "Doe", dob: "1990-08-22", age: 34 },
    { forenames: "Bob", surname: "Wilson", dob: "1982-03-10", age: 43 },
    { forenames: "Alice", surname: "Brown", dob: "1995-12-05", age: 29 }
  ];

  const hearings = [];

  for (let i = 0; i < 15; i++) {
    const postcode = postcodes[i % postcodes.length];
    const prosecutor = prosecutors[i % prosecutors.length];
    const offence = offences[i % offences.length];
    const name = names[i % names.length];

    hearings.push({
      case: [{ caseUrn: `URN-2025-${String(i + 1).padStart(6, "0")}` }],
      party: [
        {
          partyRole: "ACCUSED",
          individualDetails: {
            title: "Mr",
            individualForenames: name.forenames,
            individualSurname: name.surname,
            dateOfBirth: name.dob,
            age: name.age,
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
          offenceTitle: offence.title,
          offenceWording: offence.wording,
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
    upload: {
      locationId,
      listTypeName: "SJP_PRESS_LIST",
      sensitivity: "CLASSIFIED" as const,
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

// Helper function to upload publication via API
async function uploadSjpPressListViaApi(locationId: number): Promise<string> {
  const { upload, payload } = createSjpPressListPayload(locationId);
  const { artefactId } = await uploadTestPublication({ ...upload, payload, mirrorJsonToWeb: true });
  return artefactId;
}

test.describe("SJP Press List @nightly", () => {
  let artefactId: string;
  let listUrl: string;
  let pressUser: VerifiedTestUser;

  test.beforeAll(async () => {
    // SJP_PRESS_LIST only allows the PI_AAD provenance, so a CFT_IDAM user would be redirected to sign-in
    pressUser = await createVerifiedTestUser({ provenance: "PI_AAD", label: "sjp-press" });
    // Create unique test location for isolation
    const testLocation = await createUniqueTestLocation({ namePrefix: "SJP Press Test Court" });

    // Upload SJP press list via API with proper authentication
    artefactId = await uploadSjpPressListViaApi(testLocation.locationId);
    listUrl = `/sjp-press-list?artefactId=${artefactId}`;
  });

  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page, pressUser);
  });

  test("should display press list page with required elements", async ({ page }) => {
    await page.goto(listUrl);

    // Check page heading
    await expect(page.getByRole("heading", { name: "Single Justice Procedure cases - Press view (Full list)", level: 1 })).toBeVisible();

    // Check details component
    await expect(page.getByText("What are Single Justice Procedure cases?")).toBeVisible();

    // Check Show/Hide filters button
    await expect(page.getByRole("button", { name: /filters/ })).toBeVisible();

    // Test accessibility (disable region rule - known site-wide issue)
    const accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("user can use filter functionality @nightly", async ({ page }) => {
    await page.goto(listUrl);

    // The MOJ FilterToggleButton shows/hides the .moj-filter element via the
    // moj-js-hidden class (gated on .js-enabled).
    const filterPanel = page.locator("#filter-panel .moj-filter");

    // Initially filters should be hidden
    await expect(filterPanel).toBeHidden();

    // Show filters
    await page.getByRole("button", { name: "Show filters" }).click();
    await expect(filterPanel).toBeVisible();

    // Check filter elements are present
    await expect(page.getByRole("heading", { name: "Selected filters" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Clear filters" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Apply filters" })).toBeVisible();

    // Check postcode and prosecutor filters exist
    const postcodeCheckboxes = page.locator('input[name="postcode"]');
    expect(await postcodeCheckboxes.count()).toBeGreaterThan(0);

    // Hide filters
    await page.getByRole("button", { name: "Hide filters" }).click();
    await expect(filterPanel).toBeHidden();

    // Test accessibility (disable region rule - known site-wide issue)
    const accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test("should support Welsh language @nightly", async ({ page }) => {
    await page.goto(`${listUrl}&lng=cy`);

    // Check Welsh heading
    await expect(page.getByRole("heading", { name: "Achosion Gweithdrefn Un Ynad - Golwg i'r Wasg (Rhestr Lawn)", level: 1 })).toBeVisible();

    // Check Welsh button text
    await expect(page.getByRole("button", { name: /hidlwyr/i })).toBeVisible();

    // Test accessibility in Welsh (disable region rule - known site-wide issue)
    const accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
