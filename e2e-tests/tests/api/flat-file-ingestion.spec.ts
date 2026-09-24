import { expect, test } from "@playwright/test";
import { getApiAuthToken } from "../../utils/api-auth-helpers.js";

const API_BASE_URL = process.env.CATH_SERVICE_API_URL || "http://localhost:3001";
const ENDPOINT = `${API_BASE_URL}/publication`;

// All publication metadata travels in x-* headers; the multipart form carries only `file`.
const REQUIRED_HEADERS = {
  "x-provenance": "MANUAL_UPLOAD",
  "x-court-id": "1",
  "x-content-date": "2024-01-15",
  "x-list-type": "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
  "x-language": "ENGLISH",
  "x-type": "LIST"
};

function createMinimalPdfBuffer(): Buffer {
  return Buffer.from(
    "%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n" +
      "2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n" +
      "3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n>>\nendobj\n" +
      "xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n" +
      "0000000058 00000 n\n0000000115 00000 n\n" +
      "trailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n190\n%%EOF"
  );
}

function pdfPart(name = "test.pdf") {
  return { name, mimeType: "application/pdf", buffer: createMinimalPdfBuffer() };
}

test.describe("POST /publication - flat file publication", () => {
  test("authentication validation - missing, invalid format, and invalid token @nightly", async ({ request }) => {
    const file = pdfPart();

    // STEP 1: Missing Authorization header
    let response = await request.post(ENDPOINT, { multipart: { file }, headers: REQUIRED_HEADERS });

    expect(response.status()).toBe(401);
    let body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe("Access denied due to invalid OAuth information");

    // STEP 2: Invalid Authorization format
    response = await request.post(ENDPOINT, {
      multipart: { file },
      headers: { ...REQUIRED_HEADERS, Authorization: "InvalidFormat token123" }
    });

    expect(response.status()).toBe(401);
    body = await response.json();
    expect(body.success).toBe(false);

    // STEP 3: Invalid Bearer token
    response = await request.post(ENDPOINT, {
      multipart: { file },
      headers: { ...REQUIRED_HEADERS, Authorization: "Bearer invalid-token" }
    });

    expect(response.status()).toBe(401);
    body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe("Access denied due to invalid OAuth information");

    // STEP 4: Empty Bearer token
    response = await request.post(ENDPOINT, {
      multipart: { file },
      headers: { ...REQUIRED_HEADERS, Authorization: "Bearer " }
    });

    expect(response.status()).toBe(401);

    // STEP 5: Malformed JWT token
    response = await request.post(ENDPOINT, {
      multipart: { file },
      headers: { ...REQUIRED_HEADERS, Authorization: "Bearer not.a.valid.jwt" }
    });

    expect(response.status()).toBe(401);
  });

  test("publishes a flat file from headers plus a file part @nightly", async ({ request }) => {
    const token = await getApiAuthToken();
    const auth = { Authorization: `Bearer ${token}` };

    // STEP 1: Minimal spec-valid flat file publication
    let response = await request.post(ENDPOINT, {
      multipart: { file: pdfPart("civil-daily-cause-list.pdf") },
      headers: { ...REQUIRED_HEADERS, ...auth, "x-source-artefact-id": "civil-daily-cause-list.pdf" }
    });

    expect(response.status()).toBe(201);
    let body = await response.json();
    expect(body.artefactId).toBeTruthy();
    expect(body.isFlatFile).toBe(true);
    expect(body.type).toBe("LIST");
    expect(body.locationId).toBe("1");
    expect(body.contentDate).toBe("2024-01-15T00:00:00.000Z");
    expect(body.listType).toBe("CIVIL_AND_FAMILY_DAILY_CAUSE_LIST");
    expect(body.sensitivity).toBe("PUBLIC");
    expect(body.displayFrom).toBeNull();
    expect(body.displayTo).toBeNull();
    expect(body.sourceArtefactId).toBe("civil-daily-cause-list.pdf");
    // The Artefact body carries no search field
    expect(body).not.toHaveProperty("search");
    expect(body).not.toHaveProperty("artefact_id");

    // STEP 2: A `type` form field is ignored — metadata only ever comes from headers,
    // so this is still a flat file and never reaches S3
    response = await request.post(ENDPOINT, {
      multipart: { type: "LCSU", file: pdfPart() },
      headers: { ...REQUIRED_HEADERS, ...auth }
    });

    expect(response.status()).toBe(201);
    body = await response.json();
    expect(body.isFlatFile).toBe(true);
    expect(body.type).toBe("LIST");

    // STEP 3: SNL provenance resolves the court from the provenance location id
    response = await request.post(ENDPOINT, {
      multipart: { file: pdfPart("snl-hearing-list.pdf") },
      headers: { ...REQUIRED_HEADERS, ...auth, "x-provenance": "SNL", "x-court-id": "9001" }
    });

    expect(response.status()).toBe(201);
    body = await response.json();
    expect(body.artefactId).toBeTruthy();
    // locationId is the *resolved* id, so the exact value depends on the seeded SNL/9001
    // location reference. A NoMatch prefix would mean missing reference data, not an API fault.
    expect(body.locationId).toBeTruthy();
    expect(body.locationId).not.toMatch(/^NoMatch/);
  });

  test("rejects a flat file with a missing file part or invalid headers @nightly", async ({ request }) => {
    const token = await getApiAuthToken();
    const auth = { Authorization: `Bearer ${token}` };

    // STEP 1: No file part
    let response = await request.post(ENDPOINT, {
      multipart: { unused: "value" },
      headers: { ...REQUIRED_HEADERS, ...auth }
    });

    expect(response.status()).toBe(400);
    let body = await response.json();
    expect(body.message).toContain("No file provided");
    expect(body.timestamp).toBeTruthy();

    // STEP 2: Each required header is individually enforced, before the file is looked at
    for (const header of Object.keys(REQUIRED_HEADERS)) {
      const headers: Record<string, string> = { ...REQUIRED_HEADERS, ...auth };
      delete headers[header];

      response = await request.post(ENDPOINT, { multipart: { file: pdfPart() }, headers });

      expect(response.status()).toBe(400);
      body = await response.json();
      expect(body.message).toContain(`${header} is mandatory however an empty value is provided`);
    }

    // STEP 3: Invalid header values
    const invalidHeaderCases: Record<string, string>[] = [
      { "x-provenance": "INVALID_PROVENANCE" },
      { "x-list-type": "INVALID_LIST_TYPE" },
      { "x-language": "INVALID_LANGUAGE" },
      { "x-sensitivity": "INVALID_SENSITIVITY" },
      { "x-display-from": "2024-01-16T00:00:00.000Z", "x-display-to": "2024-01-15T00:00:00.000Z" }
    ];

    for (const overrides of invalidHeaderCases) {
      response = await request.post(ENDPOINT, {
        multipart: { file: pdfPart() },
        headers: { ...REQUIRED_HEADERS, ...auth, ...overrides }
      });

      expect(response.status()).toBe(400);
      body = await response.json();
      expect(body.message).toBeTruthy();
      expect(body.timestamp).toBeTruthy();
    }
  });
});
