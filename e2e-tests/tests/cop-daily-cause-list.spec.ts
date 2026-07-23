import AxeBuilder from "@axe-core/playwright";
import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { getApiAuthToken } from "../utils/api-auth-helpers.js";
import { createUniqueTestLocation } from "../utils/dynamic-test-data.js";
import { uploadTestFlatFileToWeb } from "../utils/test-support-api.js";

const API_BASE_URL = process.env.CATH_SERVICE_API_URL || process.env.API_URL || "http://localhost:3001";
const PUBLICATION_ENDPOINT = `${API_BASE_URL}/v1/publication`;
const IS_DEPLOYED = !!process.env.CATH_SERVICE_WEB_URL;

function createCopDailyCauseListPayload(locationId: number) {
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
    list_type: "COP_DAILY_CAUSE_LIST",
    sensitivity: "PUBLIC",
    language: "ENGLISH",
    display_from: displayFrom.toISOString(),
    display_to: displayTo.toISOString(),
    hearing_list: {
      document: {
        publicationDate: `${contentDate}T09:00:00Z`
      },
      venue: {
        venueName: "Court of Protection",
        venueContact: {
          venueEmail: "cop@example.com",
          venueTelephone: "01234 567890"
        }
      },
      courtLists: [
        {
          courtHouse: {
            courtHouseName: "Court of Protection",
            courtHouseAddress: {
              line: ["First Avenue House", "42-49 High Holborn"],
              town: "London",
              county: "Greater London",
              postCode: "WC1V 6NP"
            },
            courtRoom: [
              {
                courtRoomName: "Court Room 1",
                session: [
                  {
                    judiciary: [{ johKnownAs: "District Judge Smith", isPresiding: true }],
                    sittings: [
                      {
                        sittingStart: `${contentDate}T10:00:00Z`,
                        sittingEnd: `${contentDate}T11:00:00Z`,
                        channel: ["Video Hearing"],
                        hearing: [
                          {
                            hearingType: "Directions",
                            case: [
                              {
                                caseNumber: "COP-2025-000001",
                                caseName: "Re ABC",
                                caseType: "Property and Affairs",
                                reportingRestrictions: "true"
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

async function uploadCopDailyCauseListViaApi(request: APIRequestContext, locationId: number): Promise<string> {
  const payload = createCopDailyCauseListPayload(locationId);
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

test.describe("COP Daily Cause List @nightly", () => {
  let listUrl: string;

  test.beforeAll(async ({ request }) => {
    const testLocation = await createUniqueTestLocation({ namePrefix: "COP Daily Cause Test Court" });
    const artefactId = await uploadCopDailyCauseListViaApi(request, testLocation.locationId);
    listUrl = `/cop-daily-cause-list?artefactId=${artefactId}`;
  });

  test("user can view the COP daily cause list @nightly", async ({ page }) => {
    await page.goto(listUrl);

    // Page heading includes the list title
    await expect(page.getByRole("heading", { name: /Court of Protection Daily Cause List/ })).toBeVisible();

    // Hearings table headings (all 8 columns)
    for (const columnHeading of [
      "Start time",
      "Case ref",
      "Case name",
      "Case type",
      "Hearing type",
      "Time estimate",
      "Mode of hearing",
      "Reporting restriction"
    ]) {
      await expect(page.getByRole("columnheader", { name: columnHeading })).toBeVisible();
    }

    // Case data rendered
    await expect(page.getByText("COP-2025-000001")).toBeVisible();

    // Open Justice / important information section present
    await expect(page.getByText("Open justice is a fundamental principle of our justice system.")).toBeVisible();

    // Case search input present
    await expect(page.locator("#case-search-input")).toBeVisible();

    // Data source attribution present
    await expect(page.getByText(/Data Source/i)).toBeVisible();

    // Accessibility (disable region rule - known site-wide issue)
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["region"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Welsh translation
    await page.goto(`${listUrl}&lng=cy`);
    await expect(page.getByRole("heading", { name: /Rhestr Achosion Dyddiol/ })).toBeVisible();

    const welshAccessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["region"])
      .analyze();
    expect(welshAccessibilityScanResults.violations).toEqual([]);
  });
});
