import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BlobIngestionRequest } from "./repository/model.js";
import { validateBlobRequest } from "./validation.js";

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn(),
  getLocationByProvenanceLocationId: vi.fn()
}));

vi.mock("@hmcts/list-types-common", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/list-types-common")>();
  return {
    ...actual,
    validateListTypeJson: vi.fn(() => Promise.resolve({ isValid: true, errors: [], schemaVersion: "1.0" }))
  };
});

vi.mock("@hmcts/system-admin-pages", () => ({
  findAllListTypes: vi.fn(() =>
    Promise.resolve([
      {
        id: 1,
        name: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
        friendlyName: "Civil and Family Daily Cause List",
        welshFriendlyName: "Rhestr Achosion Dyddiol Sifil a Theulu",
        locationType: "VENUE"
      }
    ])
  )
}));

describe("validateBlobRequest", () => {
  const validRequest: BlobIngestionRequest = {
    court_id: "123",
    provenance: "MANUAL_UPLOAD",
    content_date: "2025-01-25",
    list_type: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
    sensitivity: "PUBLIC",
    language: "ENGLISH",
    display_from: "2025-01-25T09:00:00Z",
    display_to: "2025-01-25T17:00:00Z",
    hearing_list: { courtLists: [] }
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const { getLocationById, getLocationByProvenanceLocationId } = await import("@hmcts/location");
    vi.mocked(getLocationById).mockImplementation((id: number) => {
      if (id === 123) {
        return Promise.resolve({ locationId: 123, name: "Test Court", welshName: "Llys Prawf", regions: [], subJurisdictions: [] });
      }
      return Promise.resolve(undefined);
    });
    vi.mocked(getLocationByProvenanceLocationId).mockResolvedValue(undefined);
  });

  it("should validate a complete valid request", async () => {
    const result = await validateBlobRequest(validRequest, 1000);

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.locationExists).toBe(true);
  });

  it("should reject request with missing court_id", async () => {
    const request = { ...validRequest, court_id: "" };
    const result = await validateBlobRequest(request, 1000);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({ field: "court_id", message: "court_id is required" });
  });

  it("should reject request with missing provenance", async () => {
    const request = { ...validRequest, provenance: "" };
    const result = await validateBlobRequest(request, 1000);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({ field: "provenance", message: "provenance is required" });
  });

  it("should reject request with invalid provenance", async () => {
    const request = { ...validRequest, provenance: "INVALID" };
    const result = await validateBlobRequest(request, 1000);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      field: "provenance",
      message: "Invalid provenance. Allowed values: MANUAL_UPLOAD, SNL, COMMON_PLATFORM, CP_CATH, PDDA"
    });
  });

  it("should reject request with missing content_date", async () => {
    const request = { ...validRequest, content_date: "" };
    const result = await validateBlobRequest(request, 1000);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({ field: "content_date", message: "content_date is required" });
  });

  it("should reject request with invalid content_date format", async () => {
    const request = { ...validRequest, content_date: "invalid-date" };
    const result = await validateBlobRequest(request, 1000);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      field: "content_date",
      message: "content_date must be a valid ISO 8601 date"
    });
  });

  it("should reject request with missing list_type", async () => {
    const request = { ...validRequest, list_type: "" };
    const result = await validateBlobRequest(request, 1000);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({ field: "list_type", message: "list_type is required" });
  });

  it("should reject request with invalid list_type", async () => {
    const request = { ...validRequest, list_type: "INVALID_LIST_TYPE" };
    const result = await validateBlobRequest(request, 1000);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      field: "list_type",
      message: "Invalid list type. Allowed values: CIVIL_AND_FAMILY_DAILY_CAUSE_LIST"
    });
  });

  it("should reject request with missing sensitivity", async () => {
    const request = { ...validRequest, sensitivity: "" };
    const result = await validateBlobRequest(request, 1000);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({ field: "sensitivity", message: "sensitivity is required" });
  });

  it("should reject request with invalid sensitivity", async () => {
    const request = { ...validRequest, sensitivity: "INVALID" };
    const result = await validateBlobRequest(request, 1000);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      field: "sensitivity",
      message: "Invalid sensitivity. Allowed values: PUBLIC, PRIVATE, CLASSIFIED"
    });
  });

  it("should reject request with missing language", async () => {
    const request = { ...validRequest, language: "" };
    const result = await validateBlobRequest(request, 1000);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({ field: "language", message: "language is required" });
  });

  it("should reject request with invalid language", async () => {
    const request = { ...validRequest, language: "INVALID" };
    const result = await validateBlobRequest(request, 1000);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      field: "language",
      message: "Invalid language. Allowed values: ENGLISH, WELSH, BILINGUAL"
    });
  });

  it("should reject request with missing display_from", async () => {
    const request = { ...validRequest, display_from: "" };
    const result = await validateBlobRequest(request, 1000);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({ field: "display_from", message: "display_from is required" });
  });

  it("should reject request with invalid display_from format", async () => {
    const request = { ...validRequest, display_from: "2025-01-25" };
    const result = await validateBlobRequest(request, 1000);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      field: "display_from",
      message: "display_from must be a valid ISO 8601 datetime"
    });
  });

  it("should reject request with missing display_to", async () => {
    const request = { ...validRequest, display_to: "" };
    const result = await validateBlobRequest(request, 1000);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({ field: "display_to", message: "display_to is required" });
  });

  it("should reject request with display_to before display_from", async () => {
    const request = {
      ...validRequest,
      display_from: "2025-01-25T17:00:00Z",
      display_to: "2025-01-25T09:00:00Z"
    };
    const result = await validateBlobRequest(request, 1000);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      field: "display_to",
      message: "display_to must be after display_from"
    });
  });

  it("should reject request with missing hearing_list", async () => {
    const request = { ...validRequest, hearing_list: undefined };
    const result = await validateBlobRequest(request, 1000);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({ field: "hearing_list", message: "hearing_list is required" });
  });

  it("should reject request exceeding size limit", async () => {
    const result = await validateBlobRequest(validRequest, 101 * 1024 * 1024);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      field: "body",
      message: "Payload too large. Maximum size is 100MB"
    });
  });

  it("should set locationExists=false when court_id not found", async () => {
    const request = { ...validRequest, court_id: "999" };
    const result = await validateBlobRequest(request, 1000);

    expect(result.isValid).toBe(true);
    expect(result.locationExists).toBe(false);
  });

  it("should reject request with non-numeric court_id", async () => {
    const request = { ...validRequest, court_id: "abc" };
    const result = await validateBlobRequest(request, 1000);

    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({ field: "court_id", message: "court_id must be a valid number" });
  });

  it("should await getLocationById and not treat Promise as truthy", async () => {
    const { getLocationById } = await import("@hmcts/location");

    // Mock non-existent location
    vi.mocked(getLocationById).mockResolvedValue(undefined);

    const request = { ...validRequest, court_id: "999" };
    const result = await validateBlobRequest(request, 1000);

    // This test FAILS before the fix because Promise is truthy
    expect(result.locationExists).toBe(false);
    expect(getLocationById).toHaveBeenCalledWith(999);
  });

  it("should correctly identify existing location", async () => {
    const { getLocationById } = await import("@hmcts/location");

    vi.mocked(getLocationById).mockResolvedValue({
      locationId: 123,
      name: "Test Court",
      welshName: "Llys Prawf",
      regions: [],
      subJurisdictions: []
    });

    const request = { ...validRequest, court_id: "123" };
    const result = await validateBlobRequest(request, 1000);

    expect(result.locationExists).toBe(true);
  });

  it("should accept CP_CATH as a valid provenance", async () => {
    const { getLocationByProvenanceLocationId } = await import("@hmcts/location");
    vi.mocked(getLocationByProvenanceLocationId).mockResolvedValue(undefined);

    const request = { ...validRequest, provenance: "CP_CATH", court_id: "cp-cath-999" };
    const result = await validateBlobRequest(request, 1000);

    expect(result.errors.some((e) => e.field === "provenance")).toBe(false);
  });

  it("should accept PDDA as a valid provenance", async () => {
    const { getLocationByProvenanceLocationId } = await import("@hmcts/location");
    vi.mocked(getLocationByProvenanceLocationId).mockResolvedValue(undefined);

    const request = { ...validRequest, provenance: "PDDA", court_id: "pdda-999" };
    const result = await validateBlobRequest(request, 1000);

    expect(result.errors.some((e) => e.field === "provenance")).toBe(false);
  });

  it("should resolve external provenance location ID when provenance is SNL", async () => {
    const { getLocationByProvenanceLocationId } = await import("@hmcts/location");
    vi.mocked(getLocationByProvenanceLocationId).mockResolvedValue({
      locationId: 456,
      name: "SNL Court",
      welshName: "Llys SNL",
      regions: [],
      subJurisdictions: []
    });

    const request = { ...validRequest, provenance: "SNL", court_id: "snl-456" };
    const result = await validateBlobRequest(request, 1000);

    expect(result.locationExists).toBe(true);
    expect(result.resolvedLocationId).toBe("456");
    expect(getLocationByProvenanceLocationId).toHaveBeenCalledWith("SNL", "snl-456", "VENUE");
  });

  it("should set locationExists=false when external provenance location ID not found", async () => {
    const { getLocationByProvenanceLocationId } = await import("@hmcts/location");
    vi.mocked(getLocationByProvenanceLocationId).mockResolvedValue(undefined);

    const request = { ...validRequest, provenance: "SNL", court_id: "unknown-snl-id" };
    const result = await validateBlobRequest(request, 1000);

    expect(result.isValid).toBe(true);
    expect(result.locationExists).toBe(false);
    expect(result.resolvedLocationId).toBeUndefined();
  });

  it("should not call getLocationById for external provenances", async () => {
    const { getLocationById, getLocationByProvenanceLocationId } = await import("@hmcts/location");
    vi.mocked(getLocationByProvenanceLocationId).mockResolvedValue(undefined);

    const request = { ...validRequest, provenance: "COMMON_PLATFORM", court_id: "cp-123" };
    await validateBlobRequest(request, 1000);

    expect(getLocationById).not.toHaveBeenCalled();
    expect(getLocationByProvenanceLocationId).toHaveBeenCalledWith("COMMON_PLATFORM", "cp-123", "VENUE");
  });

  it("should use getLocationById for internal provenances like MANUAL_UPLOAD", async () => {
    const { getLocationById, getLocationByProvenanceLocationId } = await import("@hmcts/location");
    vi.mocked(getLocationById).mockResolvedValue(undefined);

    const request = { ...validRequest, provenance: "MANUAL_UPLOAD", court_id: "123" };
    await validateBlobRequest(request, 1000);

    expect(getLocationByProvenanceLocationId).not.toHaveBeenCalled();
    expect(getLocationById).toHaveBeenCalledWith(123);
  });

  it("should return resolvedLocationId equal to court_id for internal provenances when location exists", async () => {
    const { getLocationById } = await import("@hmcts/location");
    vi.mocked(getLocationById).mockResolvedValue({
      locationId: 123,
      name: "Test Court",
      welshName: "Llys Prawf",
      regions: [],
      subJurisdictions: []
    });

    const request = { ...validRequest, court_id: "123" };
    const result = await validateBlobRequest(request, 1000);

    expect(result.resolvedLocationId).toBe("123");
  });
});
