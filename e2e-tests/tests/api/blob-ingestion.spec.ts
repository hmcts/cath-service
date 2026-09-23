import { expect, test } from "@playwright/test";
import { getApiAuthToken } from "../../utils/api-auth-helpers.js";

const API_BASE_URL = "http://localhost:3001";
const ENDPOINT = `${API_BASE_URL}/publication`;
const LEGACY_ENDPOINT = `${API_BASE_URL}/v1/publication`;

// All publication metadata travels in x-* headers; the body is the payload itself.
const REQUIRED_HEADERS = {
  "x-provenance": "MANUAL_UPLOAD",
  "x-court-id": "1",
  "x-content-date": "2024-01-15",
  "x-list-type": "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
  "x-language": "ENGLISH",
  "x-type": "LIST"
};

const PAYLOAD = { cases: [] };

test.describe("POST /publication - JSON publication", () => {
  test("authentication validation - missing, invalid format, invalid token, empty, and malformed JWT @nightly", async ({ request }) => {
    // STEP 1: Test missing Authorization header
    let response = await request.post(ENDPOINT, { data: PAYLOAD, headers: REQUIRED_HEADERS });

    expect(response.status()).toBe(401);
    let body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain("Authorization");

    // STEP 2: Test invalid Authorization format
    response = await request.post(ENDPOINT, {
      data: PAYLOAD,
      headers: { ...REQUIRED_HEADERS, Authorization: "InvalidFormat token123" }
    });

    expect(response.status()).toBe(401);
    body = await response.json();
    expect(body.success).toBe(false);

    // STEP 3: Test invalid Bearer token
    response = await request.post(ENDPOINT, {
      data: PAYLOAD,
      headers: { ...REQUIRED_HEADERS, Authorization: "Bearer invalid-token" }
    });

    expect(response.status()).toBe(401);
    body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain("Invalid or expired token");

    // STEP 4: Test empty Bearer token
    response = await request.post(ENDPOINT, {
      data: PAYLOAD,
      headers: { ...REQUIRED_HEADERS, Authorization: "Bearer " }
    });

    expect(response.status()).toBe(401);

    // STEP 5: Test malformed JWT token
    response = await request.post(ENDPOINT, {
      data: PAYLOAD,
      headers: { ...REQUIRED_HEADERS, Authorization: "Bearer not.a.valid.jwt" }
    });

    expect(response.status()).toBe(401);

    // STEP 6: Verify endpoint accepts POST only (GET should fail)
    response = await request.get(ENDPOINT);

    expect([404, 405]).toContain(response.status());
  });

  test("publishes with headers only and returns the Artefact body @nightly", async ({ request }) => {
    const token = await getApiAuthToken();

    // STEP 1: A minimal spec-valid request — no x-sensitivity, no display dates, no wrapper
    let response = await request.post(ENDPOINT, {
      data: PAYLOAD,
      headers: { ...REQUIRED_HEADERS, Authorization: `Bearer ${token}` }
    });

    expect(response.status()).toBe(201);
    let body = await response.json();
    expect(body.artefactId).toBeTruthy();
    expect(body.locationId).toBe("1");
    expect(body.contentDate).toBe("2024-01-15T00:00:00.000Z");
    expect(body.listType).toBe("CIVIL_AND_FAMILY_DAILY_CAUSE_LIST");
    expect(body.language).toBe("ENGLISH");
    expect(body.type).toBe("LIST");
    expect(body.isFlatFile).toBe(false);
    expect(body.provenance).toBe("MANUAL_UPLOAD");
    // Optional headers omitted: sensitivity defaults to PUBLIC and display dates are null
    expect(body.sensitivity).toBe("PUBLIC");
    expect(body.displayFrom).toBeNull();
    expect(body.displayTo).toBeNull();
    expect(body.payload).toContain(body.artefactId);
    // The snake_case envelope is gone
    expect(body).not.toHaveProperty("success");
    expect(body).not.toHaveProperty("artefact_id");
    expect(body).not.toHaveProperty("no_match");

    // STEP 2: The same request against the legacy /v1 path behaves identically
    response = await request.post(LEGACY_ENDPOINT, {
      data: PAYLOAD,
      headers: { ...REQUIRED_HEADERS, Authorization: `Bearer ${token}` }
    });

    expect(response.status()).toBe(201);
    body = await response.json();
    expect(body.artefactId).toBeTruthy();

    // STEP 3: Explicit optional headers are echoed back
    response = await request.post(ENDPOINT, {
      data: PAYLOAD,
      headers: {
        ...REQUIRED_HEADERS,
        "x-sensitivity": "CLASSIFIED",
        "x-display-from": "2024-01-15T00:00:00.000Z",
        "x-display-to": "2024-01-16T00:00:00.000Z",
        "x-source-artefact-id": "SNL-2024-01-15-001",
        Authorization: `Bearer ${token}`
      }
    });

    expect(response.status()).toBe(201);
    body = await response.json();
    expect(body.sensitivity).toBe("CLASSIFIED");
    expect(body.displayFrom).toBe("2024-01-15T00:00:00.000Z");
    expect(body.displayTo).toBe("2024-01-16T00:00:00.000Z");
    expect(body.sourceArtefactId).toBe("SNL-2024-01-15-001");

    // STEP 4: A provenance location id resolves for SNL
    response = await request.post(ENDPOINT, {
      data: PAYLOAD,
      headers: { ...REQUIRED_HEADERS, "x-provenance": "SNL", "x-court-id": "9001", Authorization: `Bearer ${token}` }
    });

    expect(response.status()).toBe(201);
    body = await response.json();
    expect(body.artefactId).toBeTruthy();
    // locationId is the *resolved* id, so its exact value depends on the seeded location
    // reference for SNL/9001. Asserting only that it resolved rather than hardcoding an id:
    // a NoMatch prefix here would mean the reference data is missing, not that the API is wrong.
    expect(body.locationId).toBeTruthy();
    expect(body.locationId).not.toMatch(/^NoMatch/);
  });

  test("rejects invalid headers and payloads with a Message body @nightly", async ({ request }) => {
    const token = await getApiAuthToken();
    const auth = { Authorization: `Bearer ${token}` };

    // STEP 1: Each required header is individually enforced
    for (const header of Object.keys(REQUIRED_HEADERS)) {
      const headers: Record<string, string> = { ...REQUIRED_HEADERS, ...auth };
      delete headers[header];

      const response = await request.post(ENDPOINT, { data: PAYLOAD, headers });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.message).toContain(`${header} is mandatory however an empty value is provided`);
      expect(body.timestamp).toBeTruthy();
      expect(body).not.toHaveProperty("errors");
    }

    // STEP 2: An unrecognised x-type is rejected, never treated as LIST
    let response = await request.post(ENDPOINT, {
      data: PAYLOAD,
      headers: { ...REQUIRED_HEADERS, ...auth, "x-type": "FOO" }
    });

    expect(response.status()).toBe(400);
    let body = await response.json();
    expect(body.message).toBe("x-type must be one of LIST, LCSU");

    // STEP 3: LCSU is file-only
    response = await request.post(ENDPOINT, {
      data: PAYLOAD,
      headers: { ...REQUIRED_HEADERS, ...auth, "x-type": "LCSU" }
    });

    expect(response.status()).toBe(400);
    body = await response.json();
    expect(body.message).toBe("LCSU publications must be sent as multipart/form-data");

    // STEP 4: Invalid enum and date values
    const invalidHeaderCases: Record<string, string>[] = [
      { "x-provenance": "INVALID_PROVENANCE" },
      { "x-list-type": "INVALID_LIST_TYPE" },
      { "x-language": "INVALID_LANGUAGE" },
      { "x-sensitivity": "INVALID_SENSITIVITY" },
      { "x-content-date": "15-01-2024" },
      { "x-display-from": "2024-01-15" },
      { "x-display-from": "2024-01-16T00:00:00.000Z", "x-display-to": "2024-01-15T00:00:00.000Z" }
    ];

    for (const overrides of invalidHeaderCases) {
      response = await request.post(ENDPOINT, {
        data: PAYLOAD,
        headers: { ...REQUIRED_HEADERS, ...auth, ...overrides }
      });

      expect(response.status()).toBe(400);
      body = await response.json();
      expect(body.message).toBeTruthy();
      expect(body.timestamp).toBeTruthy();
    }

    // STEP 5: An empty body is rejected — the body must be the payload
    response = await request.post(ENDPOINT, {
      data: {},
      headers: { ...REQUIRED_HEADERS, ...auth }
    });

    expect(response.status()).toBe(400);

    // STEP 6: An over-size payload is rejected
    response = await request.post(ENDPOINT, {
      data: { cases: Array(100000).fill({ caseNumber: `A${"x".repeat(100)}`, caseName: `B${"x".repeat(100)}` }) },
      headers: { ...REQUIRED_HEADERS, ...auth }
    });

    expect([400, 413, 500]).toContain(response.status());
  });
});
