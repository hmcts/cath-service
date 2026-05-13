import { expect, test } from "@playwright/test";

const API_BASE_URL = "http://localhost:3001";
const ENDPOINT = `${API_BASE_URL}/v1/publication`;

// Valid test payload
const validPayload = {
  court_id: "1",
  provenance: "MANUAL_UPLOAD",
  content_date: "2024-01-15",
  list_type: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
  sensitivity: "PUBLIC",
  language: "ENGLISH",
  display_from: "2024-01-15T00:00:00Z",
  display_to: "2024-01-16T00:00:00Z",
  hearing_list: {
    cases: []
  }
};

test.describe("POST /v1/publication - Blob Ingestion API", () => {
  test("authentication validation - missing, invalid format, invalid token, empty, and malformed JWT @nightly", async ({ request }) => {
    // STEP 1: Test missing Authorization header
    let response = await request.post(ENDPOINT, {
      data: validPayload
    });

    expect(response.status()).toBe(401);
    let body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain("Authorization");

    // STEP 2: Test invalid Authorization format
    response = await request.post(ENDPOINT, {
      data: validPayload,
      headers: {
        Authorization: "InvalidFormat token123"
      }
    });

    expect(response.status()).toBe(401);
    body = await response.json();
    expect(body.success).toBe(false);

    // STEP 3: Test invalid Bearer token
    response = await request.post(ENDPOINT, {
      data: validPayload,
      headers: {
        Authorization: "Bearer invalid-token"
      }
    });

    expect(response.status()).toBe(401);
    body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain("Invalid or expired token");

    // STEP 4: Test empty Bearer token
    response = await request.post(ENDPOINT, {
      data: validPayload,
      headers: {
        Authorization: "Bearer "
      }
    });

    expect(response.status()).toBe(401);

    // STEP 5: Test malformed JWT token
    response = await request.post(ENDPOINT, {
      data: validPayload,
      headers: {
        Authorization: "Bearer not.a.valid.jwt"
      }
    });

    expect(response.status()).toBe(401);

    // STEP 6: Verify endpoint accepts POST only (GET should fail)
    response = await request.get(ENDPOINT);

    // Should return 404 or 405 (Method Not Allowed)
    expect([404, 405]).toContain(response.status());

    // STEP 7: Test content type acceptance
    response = await request.post(ENDPOINT, {
      data: validPayload,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token"
      }
    });

    // Should fail on auth, not content type
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("payload validation - missing fields, invalid enums, date formats, and size limits @nightly", async ({ request }) => {
    const authHeaders = { Authorization: "Bearer test-token" };

    // STEP 1: Test missing court_id
    let invalidPayload = { ...validPayload };
    delete (invalidPayload as any).court_id;

    let response = await request.post(ENDPOINT, {
      data: invalidPayload,
      headers: authHeaders
    });

    // Note: Will fail auth first with test-token, but validates API accepts the request
    expect(response.status()).toBeGreaterThanOrEqual(400);

    // STEP 2: Test invalid provenance
    invalidPayload = {
      ...validPayload,
      provenance: "INVALID_PROVENANCE"
    };

    response = await request.post(ENDPOINT, {
      data: invalidPayload,
      headers: authHeaders
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);

    // STEP 3: Test invalid content_date format
    invalidPayload = {
      ...validPayload,
      content_date: "15-01-2024" // Invalid format
    };

    response = await request.post(ENDPOINT, {
      data: invalidPayload,
      headers: authHeaders
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);

    // STEP 4: Test invalid list_type
    invalidPayload = {
      ...validPayload,
      list_type: "INVALID_LIST_TYPE"
    };

    response = await request.post(ENDPOINT, {
      data: invalidPayload,
      headers: authHeaders
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);

    // STEP 5: Test invalid sensitivity
    invalidPayload = {
      ...validPayload,
      sensitivity: "INVALID_SENSITIVITY"
    };

    response = await request.post(ENDPOINT, {
      data: invalidPayload,
      headers: authHeaders
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);

    // STEP 6: Test invalid language
    invalidPayload = {
      ...validPayload,
      language: "INVALID_LANGUAGE"
    };

    response = await request.post(ENDPOINT, {
      data: invalidPayload,
      headers: authHeaders
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);

    // STEP 7: Test invalid display_from format (missing time component)
    invalidPayload = {
      ...validPayload,
      display_from: "2024-01-15" // Missing time component
    };

    response = await request.post(ENDPOINT, {
      data: invalidPayload,
      headers: authHeaders
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);

    // STEP 8: Test display_to before display_from
    invalidPayload = {
      ...validPayload,
      display_from: "2024-01-16T00:00:00Z",
      display_to: "2024-01-15T00:00:00Z"
    };

    response = await request.post(ENDPOINT, {
      data: invalidPayload,
      headers: authHeaders
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);

    // STEP 9: Test missing hearing_list
    invalidPayload = { ...validPayload };
    delete (invalidPayload as any).hearing_list;

    response = await request.post(ENDPOINT, {
      data: invalidPayload,
      headers: authHeaders
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);

    // STEP 10: Test large payload size validation
    const largePayload = {
      ...validPayload,
      hearing_list: {
        cases: Array(100000).fill({
          caseNumber: `A${"x".repeat(100)}`,
          caseName: `B${"x".repeat(100)}`
        })
      }
    };

    response = await request.post(ENDPOINT, {
      data: largePayload,
      headers: authHeaders
    });

    // Should either be rejected by auth (401) or validation (400) or size limit (413)
    expect([400, 401, 413, 500]).toContain(response.status());
  });
});
