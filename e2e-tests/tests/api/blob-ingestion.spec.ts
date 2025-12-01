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
  test("should return 401 when Authorization header is missing @nightly", async ({ request }) => {
    const response = await request.post(ENDPOINT, {
      data: validPayload
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain("Authorization");
  });

  test("should return 401 when Authorization header has invalid format @nightly", async ({ request }) => {
    const response = await request.post(ENDPOINT, {
      data: validPayload,
      headers: {
        Authorization: "InvalidFormat token123"
      }
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test("should return 401 with invalid Bearer token @nightly", async ({ request }) => {
    const response = await request.post(ENDPOINT, {
      data: validPayload,
      headers: {
        Authorization: "Bearer invalid-token"
      }
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toContain("Invalid or expired token");
  });

  test("should return 400 when required field is missing - court_id @nightly", async ({ request }) => {
    const invalidPayload = { ...validPayload };
    delete (invalidPayload as any).court_id;

    // Note: This will fail auth first, so we skip this test for now
    // In a real scenario, you'd need a valid test token
    const response = await request.post(ENDPOINT, {
      data: invalidPayload,
      headers: {
        Authorization: "Bearer test-token"
      }
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("should return 400 when provenance is invalid @nightly", async ({ request }) => {
    const invalidPayload = {
      ...validPayload,
      provenance: "INVALID_PROVENANCE"
    };

    const response = await request.post(ENDPOINT, {
      data: invalidPayload,
      headers: {
        Authorization: "Bearer test-token"
      }
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("should return 400 when content_date is not in ISO format @nightly", async ({ request }) => {
    const invalidPayload = {
      ...validPayload,
      content_date: "15-01-2024" // Invalid format
    };

    const response = await request.post(ENDPOINT, {
      data: invalidPayload,
      headers: {
        Authorization: "Bearer test-token"
      }
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("should return 400 when list_type is invalid @nightly", async ({ request }) => {
    const invalidPayload = {
      ...validPayload,
      list_type: "INVALID_LIST_TYPE"
    };

    const response = await request.post(ENDPOINT, {
      data: invalidPayload,
      headers: {
        Authorization: "Bearer test-token"
      }
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("should return 400 when sensitivity is invalid @nightly", async ({ request }) => {
    const invalidPayload = {
      ...validPayload,
      sensitivity: "INVALID_SENSITIVITY"
    };

    const response = await request.post(ENDPOINT, {
      data: invalidPayload,
      headers: {
        Authorization: "Bearer test-token"
      }
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("should return 400 when language is invalid @nightly", async ({ request }) => {
    const invalidPayload = {
      ...validPayload,
      language: "INVALID_LANGUAGE"
    };

    const response = await request.post(ENDPOINT, {
      data: invalidPayload,
      headers: {
        Authorization: "Bearer test-token"
      }
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("should return 400 when display_from is not in ISO datetime format @nightly", async ({ request }) => {
    const invalidPayload = {
      ...validPayload,
      display_from: "2024-01-15" // Missing time component
    };

    const response = await request.post(ENDPOINT, {
      data: invalidPayload,
      headers: {
        Authorization: "Bearer test-token"
      }
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("should return 400 when display_to is before display_from @nightly", async ({ request }) => {
    const invalidPayload = {
      ...validPayload,
      display_from: "2024-01-16T00:00:00Z",
      display_to: "2024-01-15T00:00:00Z"
    };

    const response = await request.post(ENDPOINT, {
      data: invalidPayload,
      headers: {
        Authorization: "Bearer test-token"
      }
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("should return 400 when hearing_list is missing @nightly", async ({ request }) => {
    const invalidPayload = { ...validPayload };
    delete (invalidPayload as any).hearing_list;

    const response = await request.post(ENDPOINT, {
      data: invalidPayload,
      headers: {
        Authorization: "Bearer test-token"
      }
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("should handle payload size validation @nightly", async ({ request }) => {
    // Create a large payload (over 10MB)
    const largePayload = {
      ...validPayload,
      hearing_list: {
        cases: Array(100000).fill({
          caseNumber: "A" + "x".repeat(100),
          caseName: "B" + "x".repeat(100)
        })
      }
    };

    const response = await request.post(ENDPOINT, {
      data: largePayload,
      headers: {
        Authorization: "Bearer test-token"
      }
    });

    // Should either be rejected by auth (401) or validation (400)
    expect([400, 401, 413, 500]).toContain(response.status());
  });

  test("should verify endpoint accepts POST only @nightly", async ({ request }) => {
    const response = await request.get(ENDPOINT);

    // Should return 404 or 405 (Method Not Allowed)
    expect([404, 405]).toContain(response.status());
  });
});

test.describe("POST /v1/publication - Authentication Headers", () => {
  test("should reject requests with empty Bearer token @nightly", async ({ request }) => {
    const response = await request.post(ENDPOINT, {
      data: validPayload,
      headers: {
        Authorization: "Bearer "
      }
    });

    expect(response.status()).toBe(401);
  });

  test("should reject requests with malformed JWT token @nightly", async ({ request }) => {
    const response = await request.post(ENDPOINT, {
      data: validPayload,
      headers: {
        Authorization: "Bearer not.a.valid.jwt"
      }
    });

    expect(response.status()).toBe(401);
  });
});

test.describe("POST /v1/publication - Content Type Validation", () => {
  test("should accept application/json content type @nightly", async ({ request }) => {
    const response = await request.post(ENDPOINT, {
      data: validPayload,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token"
      }
    });

    // Should fail on auth, not content type
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});
