import AxeBuilder from "@axe-core/playwright";
import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { getApiAuthToken } from "../utils/api-auth-helpers.js";
import { createUniqueTestLocation } from "../utils/dynamic-test-data.js";
import { uploadTestFlatFileToWeb } from "../utils/test-support-api.js";

const API_BASE_URL = process.env.CATH_SERVICE_API_URL || process.env.API_URL || "http://localhost:3001";
const PUBLICATION_ENDPOINT = `${API_BASE_URL}/v1/publication`;
const IS_DEPLOYED = !!process.env.CATH_SERVICE_WEB_URL;

function createAstDailyHearingListPayload(locationId: number) {
  const today = new Date();
  const displayFrom = new Date(today);
  displayFrom.setDate(displayFrom.getDate() - 7);
  const displayTo = new Date(today);
  displayTo.setDate(displayTo.getDate() + 365);

  const contentDate = today.toISOString().split("T")[0];

  const hearingList = [
    {
      appellant: "John Smith",
      appealReferenceNumber: "AST/2025/00123",
      caseType: "Section 95",
      hearingType: "Remote - Teams",
      hearingTime: "10:30am",
      additionalInformation: "Interpreter required - Arabic"
    },
    {
      appellant: "Jane Doe",
      appealReferenceNumber: "AST/2025/00124",
      caseType: "Section 4",
      hearingType: "In-person",
      hearingTime: "2pm",
      additionalInformation: ""
    },
    {
      appellant: "Robert Johnson",
      appealReferenceNumber: "AST/2025/00125",
      caseType: "Section 95",
      hearingType: "Remote - CVP",
      hearingTime: "9am",
      additionalInformation: "Representative attending"
    }
  ];

  return {
    court_id: locationId.toString(),
    provenance: "MANUAL_UPLOAD",
    content_date: contentDate,
    list_type: "AST_DAILY_HEARING_LIST",
    sensitivity: "PUBLIC",
    language: "ENGLISH",
    display_from: displayFrom.toISOString(),
    display_to: displayTo.toISOString(),
    hearing_list: hearingList
  };
}

async function uploadAstDailyHearingListViaApi(request: APIRequestContext, locationId: number): Promise<string> {
  const payload = createAstDailyHearingListPayload(locationId);
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

test.describe("AST Daily Hearing List @nightly", () => {
  let artefactId: string;
  let listUrl: string;

  test.beforeAll(async ({ request }) => {
    const testLocation = await createUniqueTestLocation({ namePrefix: "AST Test Court" });
    artefactId = await uploadAstDailyHearingListViaApi(request, testLocation.locationId);
    listUrl = `/ast-daily-hearing-list?artefactId=${artefactId}`;
  });

  test("user can view complete AST daily hearing list with accessibility and Welsh support @nightly", async ({ page }) => {
    // Arrange - Navigate to page
    await page.goto(listUrl);

    // Act & Assert - Check page heading
    await expect(page.getByRole("heading", { name: "Asylum Support Tribunal Daily Hearing List", level: 1 })).toBeVisible();

    // Assert - Check important information section
    await expect(page.getByRole("heading", { name: "Important information", level: 2 })).toBeVisible();
    await expect(page.getByText(/Open justice is a fundamental principle/)).toBeVisible();

    // Assert - Check table headers are present
    await expect(page.getByRole("columnheader", { name: "Appellant" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Appeal reference number" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Case type" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Hearing type" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Hearing time" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Additional information" })).toBeVisible();

    // Assert - Check first hearing data is displayed
    await expect(page.getByText("John Smith")).toBeVisible();
    await expect(page.getByText("AST/2025/00123")).toBeVisible();
    await expect(page.getByText("Section 95")).toBeVisible();
    await expect(page.getByText("10:30am")).toBeVisible();

    // Assert - Check contact email is present
    await expect(page.getByRole("link", { name: "asylumsupporttribunals@justice.gov.uk" })).toBeVisible();

    // Act - Test accessibility in English (disable region rule - known site-wide issue)
    const accessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    // Act - Switch to Welsh
    await page.goto(`${listUrl}&lng=cy`);

    // Assert - Check Welsh heading
    await expect(page.getByRole("heading", { name: "Rhestr o Wrandawiadau Dyddiol Tribiwnlys Cefnogi Ceiswyr Lloches", level: 1 })).toBeVisible();

    // Assert - Check Welsh table headers
    await expect(page.getByRole("columnheader", { name: "Apelydd" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Cyfeirnod apêl" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Math o achos" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Math o wrandawiad" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Amser y gwrandawiad" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Gwybodaeth ychwanegol" })).toBeVisible();

    // Assert - Check Welsh important information section
    await expect(page.getByRole("heading", { name: "Gwybodaeth bwysig", level: 2 })).toBeVisible();
    await expect(page.getByText(/Mae cyfiawnder agored yn egwyddor sylfaenol/)).toBeVisible();

    // Assert - Hearing data still visible (data doesn't translate)
    await expect(page.getByText("John Smith")).toBeVisible();
    await expect(page.getByText("AST/2025/00123")).toBeVisible();

    // Act - Test accessibility in Welsh (disable region rule - known site-wide issue)
    const welshAccessibilityScanResults = await new AxeBuilder({ page }).disableRules(["region"]).analyze();
    expect(welshAccessibilityScanResults.violations).toEqual([]);

    // Act - Test keyboard navigation
    await page.goto(listUrl);
    await page.keyboard.press("Tab");
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeDefined();

    // Assert - Check data source is displayed
    await expect(page.getByText(/Data Source:/)).toBeVisible();

    // Assert - Check list date is displayed
    await expect(page.getByText(/List for/)).toBeVisible();

    // Assert - Check last updated is displayed
    await expect(page.getByText(/Last updated/)).toBeVisible();
  });
});
