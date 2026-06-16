import AxeBuilder from "@axe-core/playwright";
import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { getApiAuthToken } from "../utils/api-auth-helpers.js";
import { createUniqueTestLocation } from "../utils/dynamic-test-data.js";
import { uploadTestFlatFileToWeb } from "../utils/test-support-api.js";

const API_BASE_URL = process.env.CATH_SERVICE_API_URL || process.env.API_URL || "http://localhost:3001";
const PUBLICATION_ENDPOINT = `${API_BASE_URL}/v1/publication`;
const IS_DEPLOYED = !!process.env.CATH_SERVICE_WEB_URL;

function createSendDailyHearingListPayload(locationId: number) {
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
    list_type: "SEND_DAILY_HEARING_LIST",
    sensitivity: "CLASSIFIED",
    language: "ENGLISH",
    display_from: displayFrom.toISOString(),
    display_to: displayTo.toISOString(),
    hearing_list: [
      {
        time: "10:30am",
        caseReferenceNumber: "SEND/2026/001",
        respondent: "Birmingham City Council",
        hearingType: "Case Management Hearing",
        venue: "Video Hearing",
        timeEstimate: "2 hours"
      },
      {
        time: "2:00pm",
        caseReferenceNumber: "SEND/2026/002",
        respondent: "Manchester City Council",
        hearingType: "First Hearing",
        venue: "Royal Courts of Justice, Room 4",
        timeEstimate: "1 hour"
      },
      {
        time: "9:00am",
        caseReferenceNumber: "SEND/2026/003",
        respondent: "Leeds City Council",
        hearingType: "Final Hearing",
        venue: "Tribunal Hearing Centre, Room 2",
        timeEstimate: "3 hours"
      }
    ]
  };
}

async function uploadSendDailyHearingListViaApi(request: APIRequestContext, locationId: number): Promise<string> {
  const payload = createSendDailyHearingListPayload(locationId);
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

test.describe("SEND Daily Hearing List @nightly", () => {
  let artefactId: string;
  let listUrl: string;

  test.beforeAll(async ({ request }) => {
    const testLocation = await createUniqueTestLocation({ namePrefix: "SEND Test Tribunal" });
    artefactId = await uploadSendDailyHearingListViaApi(request, testLocation.locationId);
    listUrl = `/send-daily-hearing-list?artefactId=${artefactId}`;
  });

  test("should display SEND daily hearing list with all features @nightly", async ({ page }) => {
    // Navigate to the list
    await page.goto(listUrl);

    // Check page heading in English
    await expect(
      page.getByRole("heading", { name: "First-tier Tribunal (Special Educational Needs and Disability) Daily Hearing List", level: 1 })
    ).toBeVisible();

    // Verify hearing data is displayed
    await expect(page.getByText("SEND/2026/001")).toBeVisible();
    await expect(page.getByText("Birmingham City Council")).toBeVisible();
    await expect(page.getByText("Case Management Hearing")).toBeVisible();

    // Check multiple hearings are shown
    await expect(page.getByText("SEND/2026/002")).toBeVisible();
    await expect(page.getByText("SEND/2026/003")).toBeVisible();

    // Test Welsh translation
    await page.getByRole("link", { name: "Cymraeg" }).click();
    await expect(page.getByRole("heading", { name: /Tribiwnlys Haen Gyntaf.*Rhestr Wrandawiadau Dyddiol/i, level: 1 })).toBeVisible();

    // Verify hearing data still visible in Welsh
    await expect(page.getByText("SEND/2026/001")).toBeVisible();

    // Switch back to English for accessibility test
    await page.getByRole("link", { name: "English" }).click();

    // Test accessibility (disable region rule - known site-wide issue)
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .disableRules(["region"])
      .analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Verify data source is displayed
    await expect(page.getByText(/Manual upload/i)).toBeVisible();

    // Check that times are formatted correctly
    await expect(page.getByText("10:30am")).toBeVisible();
    await expect(page.getByText("2:00pm")).toBeVisible();
    await expect(page.getByText("9:00am")).toBeVisible();
  });
});
