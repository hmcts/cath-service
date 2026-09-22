import { ArtefactType } from "@hmcts/publication";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicationMetadata } from "./publication-headers.js";
import { validateBlobRequest, validateFlatFileRequest, validatePublicationMetadata } from "./validation.js";

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

const PAYLOAD = { courtLists: [] };

function metadata(overrides: Partial<PublicationMetadata> = {}): PublicationMetadata {
  return {
    provenance: "MANUAL_UPLOAD",
    courtId: "123",
    contentDate: "2025-01-25",
    listType: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
    language: "ENGLISH",
    type: ArtefactType.LIST,
    sensitivity: "PUBLIC",
    displayFrom: null,
    displayTo: null,
    sourceArtefactId: null,
    ...overrides
  };
}

async function stubLocations() {
  const { getLocationById, getLocationByProvenanceLocationId } = await import("@hmcts/location");
  vi.mocked(getLocationById).mockImplementation((id: number) => {
    if (id === 123) {
      return Promise.resolve({ locationId: 123, name: "Test Court", welshName: "Llys Prawf", regions: [], subJurisdictions: [] });
    }
    return Promise.resolve(undefined);
  });
  vi.mocked(getLocationByProvenanceLocationId).mockResolvedValue(undefined);
}

describe("validatePublicationMetadata", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await stubLocations();
  });

  it("should accept metadata that omits sensitivity, display dates and source artefact id", async () => {
    // Act
    const result = await validatePublicationMetadata(metadata(), 1000);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.resolvedLocationId).toBe("123");
    expect(result.listTypeId).toBe(1);
  });

  it("should not report a missing display date as an error", async () => {
    // Act
    const result = await validatePublicationMetadata(metadata({ displayFrom: "2025-01-25T09:00:00Z", displayTo: null }), 1000);

    // Assert
    expect(result.isValid).toBe(true);
  });

  it("should reject x-display-to earlier than x-display-from", async () => {
    // Act
    const result = await validatePublicationMetadata(metadata({ displayFrom: "2025-01-25T17:00:00Z", displayTo: "2025-01-25T09:00:00Z" }), 1000);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({ field: "x-display-to", message: "x-display-to must be after x-display-from" });
  });

  it("should accept equal display dates", async () => {
    // Act
    const result = await validatePublicationMetadata(metadata({ displayFrom: "2025-01-25T09:00:00Z", displayTo: "2025-01-25T09:00:00Z" }), 1000);

    // Assert
    expect(result.isValid).toBe(true);
  });

  it("should reject an invalid provenance using the header name", async () => {
    // Act
    const result = await validatePublicationMetadata(metadata({ provenance: "INVALID" }), 1000);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      field: "x-provenance",
      message: "Invalid x-provenance. Allowed values: MANUAL_UPLOAD, SNL, COMMON_PLATFORM, CP_CATH, PDDA"
    });
  });

  it("should reject an unknown list type using the header name", async () => {
    // Act
    const result = await validatePublicationMetadata(metadata({ listType: "UNKNOWN_LIST_TYPE" }), 1000);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({
      field: "x-list-type",
      message: "Invalid x-list-type. Allowed values: CIVIL_AND_FAMILY_DAILY_CAUSE_LIST"
    });
  });

  // An LCSU request carries no x-list-type, so there is nothing to resolve and nothing to reject.
  it("should not report a list type error when the list type is absent", async () => {
    // Act
    const result = await validatePublicationMetadata(metadata({ listType: null }), 1000);

    // Assert
    expect(result.errors).not.toContainEqual(expect.objectContaining({ field: "x-list-type" }));
    expect(result.isValid).toBe(true);
    expect(result.listTypeId).toBeUndefined();
  });

  it("should reject a payload over the size limit", async () => {
    // Act
    const result = await validatePublicationMetadata(metadata(), 101 * 1024 * 1024);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({ field: "body", message: "Payload too large. Maximum size is 100MB" });
  });

  it("should reject a non-numeric x-court-id for an internal provenance", async () => {
    // Act
    const result = await validatePublicationMetadata(metadata({ courtId: "abc" }), 1000);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({ field: "x-court-id", message: "x-court-id must be a valid number" });
  });

  // An unresolvable court id is accepted; the submitted id is carried behind the NoMatch prefix.
  it("should accept an unresolvable court id and prefix it with NoMatch", async () => {
    // Act
    const result = await validatePublicationMetadata(metadata({ courtId: "999" }), 1000);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.resolvedLocationId).toBe("NoMatch999");
  });

  it("should resolve the internal location id when the location exists", async () => {
    // Act
    const result = await validatePublicationMetadata(metadata(), 1000);

    // Assert
    expect(result.resolvedLocationId).toBe("123");
  });

  it.each([["SNL"], ["COMMON_PLATFORM"], ["CP_CATH"], ["PDDA"]])("should resolve %s court ids via the provenance lookup", async (provenance) => {
    // Arrange
    const { getLocationById, getLocationByProvenanceLocationId } = await import("@hmcts/location");
    vi.mocked(getLocationByProvenanceLocationId).mockResolvedValue({
      locationId: 456,
      name: "External Court",
      welshName: "Llys",
      regions: [],
      subJurisdictions: []
    });

    // Act
    const result = await validatePublicationMetadata(metadata({ provenance, courtId: "ext-456" }), 1000);

    // Assert
    expect(result.resolvedLocationId).toBe("456");
    expect(getLocationByProvenanceLocationId).toHaveBeenCalledWith(provenance, "ext-456", "VENUE");
    expect(getLocationById).not.toHaveBeenCalled();
  });

  it("should prefix an unresolved external provenance location with NoMatch", async () => {
    // Act
    const result = await validatePublicationMetadata(metadata({ provenance: "SNL", courtId: "unknown-snl-id" }), 1000);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.resolvedLocationId).toBe("NoMatchunknown-snl-id");
  });
});

describe("validateBlobRequest", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await stubLocations();
  });

  it("should validate the raw body as the payload with no hearing_list wrapper", async () => {
    // Arrange
    const { validateListTypeJson } = await import("@hmcts/list-types-common");

    // Act
    const result = await validateBlobRequest(metadata(), PAYLOAD, 1000);

    // Assert
    expect(result.isValid).toBe(true);
    expect(validateListTypeJson).toHaveBeenCalledWith("1", PAYLOAD, expect.any(Array));
  });

  it("should accept an array payload", async () => {
    // Act
    const result = await validateBlobRequest(metadata(), [{ caseNumber: "T1" }], 1000);

    // Assert
    expect(result.isValid).toBe(true);
  });

  it.each([[null], [undefined], [{}], [[]]])("should reject an empty payload of %s", async (payload) => {
    // Act
    const result = await validateBlobRequest(metadata(), payload, 1000);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({ field: "body", message: "Request body is required and must be the publication payload" });
  });

  it("should report schema failures against the body field", async () => {
    // Arrange
    const { validateListTypeJson } = await import("@hmcts/list-types-common");
    vi.mocked(validateListTypeJson).mockResolvedValue({
      isValid: false,
      errors: [{ message: "must have required property 'courtLists'" }],
      schemaVersion: "1.0"
    } as never);

    // Act
    const result = await validateBlobRequest(metadata(), PAYLOAD, 1000);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({ field: "body", message: "must have required property 'courtLists'" });
  });

  it("should report a schema lookup failure against the body field", async () => {
    // Arrange
    const { validateListTypeJson } = await import("@hmcts/list-types-common");
    vi.mocked(validateListTypeJson).mockRejectedValue(new Error("schema unavailable"));

    // Act
    const result = await validateBlobRequest(metadata(), PAYLOAD, 1000);

    // Assert
    expect(result.errors).toContainEqual({ field: "body", message: "Failed to validate the publication payload against the schema" });
  });

  it("should skip schema validation when the metadata is already invalid", async () => {
    // Arrange
    const { validateListTypeJson } = await import("@hmcts/list-types-common");

    // Act
    await validateBlobRequest(metadata({ provenance: "INVALID" }), PAYLOAD, 1000);

    // Assert
    expect(validateListTypeJson).not.toHaveBeenCalled();
  });
});

describe("validateFlatFileRequest", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await stubLocations();
  });

  it("should validate metadata without requiring a payload", async () => {
    // Act
    const result = await validateFlatFileRequest(metadata(), 1000);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.resolvedLocationId).toBe("123");
  });

  it("should never run schema validation for a flat file", async () => {
    // Arrange
    const { validateListTypeJson } = await import("@hmcts/list-types-common");

    // Act
    await validateFlatFileRequest(metadata(), 1000);

    // Assert
    expect(validateListTypeJson).not.toHaveBeenCalled();
  });

  it("should reject a file over the size limit", async () => {
    // Act
    const result = await validateFlatFileRequest(metadata(), 101 * 1024 * 1024);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors).toContainEqual({ field: "body", message: "Payload too large. Maximum size is 100MB" });
  });
});
