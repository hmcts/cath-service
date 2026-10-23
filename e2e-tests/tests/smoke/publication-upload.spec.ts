import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { getApiAuthToken } from "../../utils/api-auth-helpers.js";
import { createTestLocation, deleteTestArtefact, deleteTestArtefacts, deleteTestLocations } from "../../utils/test-support-api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_BASE_URL = process.env.CATH_SERVICE_API_URL;
const ENDPOINT = `${API_BASE_URL}/v1/publication`;
const LIST_TYPE = "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST";
const FIXTURE_PATH = path.join(__dirname, "../../fixtures/civil-and-family-daily-cause-list-smoke.json");
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

let locationId: number | undefined;
let artefactId: string | undefined;

test.describe("Publication upload smoke test", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(() => {
    if (!API_BASE_URL) {
      throw new Error("CATH_SERVICE_API_URL must be set to the API under test");
    }
  });

  test.beforeEach(async () => {
    locationId = undefined;
    artefactId = undefined;

    const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const location = await createTestLocation({
      name: `SMOKE_TEST_LOCATION_${uniqueSuffix}`,
      welshName: `SMOKE_TEST_LOCATION_CY_${uniqueSuffix}`
    });
    locationId = location.locationId;
  });

  test.afterEach(async () => {
    // Must stay: deleteTestArtefacts with no locationId sends an empty filter, which deletes every artefact
    if (locationId === undefined) {
      return;
    }

    await runCleanup("artefact", () => (artefactId ? deleteTestArtefact(artefactId) : deleteTestArtefacts({ locationId: String(locationId) })));
    await runCleanup("location", () => deleteTestLocations([locationId as number]));
  });

  test("uploads a civil and family daily cause list with a client credentials token", async ({ request }) => {
    const token = await getApiAuthToken();
    const now = new Date();
    const payload = JSON.parse(fs.readFileSync(FIXTURE_PATH, "utf-8"));

    const response = await request.post(ENDPOINT, {
      data: payload,
      headers: {
        Authorization: `Bearer ${token}`,
        "x-provenance": "MANUAL_UPLOAD",
        "x-court-id": String(locationId),
        "x-content-date": now.toISOString().slice(0, 10),
        "x-list-type": LIST_TYPE,
        "x-language": "ENGLISH",
        "x-type": "LIST",
        "x-sensitivity": "PUBLIC",
        "x-display-from": now.toISOString(),
        "x-display-to": new Date(now.getTime() + ONE_DAY_MS).toISOString()
      }
    });

    const responseText = await response.text();
    expect(response.status(), `POST ${ENDPOINT} returned ${response.status()}: ${responseText}`).toBe(201);

    const body = JSON.parse(responseText);
    artefactId = body.artefactId;

    expect(body.artefactId).toBeTruthy();
    expect(body.locationId).toBe(String(locationId));
    expect(body.listType).toBe(LIST_TYPE);
  });
});

async function runCleanup(resource: string, cleanup: () => Promise<unknown>) {
  try {
    await cleanup();
  } catch (error) {
    console.error(`[smoke] Failed to clean up ${resource} for location ${locationId}:`, error);
  }
}
