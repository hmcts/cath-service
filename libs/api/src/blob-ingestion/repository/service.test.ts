import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BlobIngestionRequest } from "./model.js";
import { processBlobIngestion } from "./service.js";

// Mock the dependencies
vi.mock("@hmcts/publication", () => ({
  createArtefact: vi.fn(),
  Provenance: {
    MANUAL_UPLOAD: "MANUAL_UPLOAD",
    XHIBIT: "XHIBIT",
    LIBRA: "LIBRA",
    SJP: "SJP",
    SNL: "SNL",
    COMMON_PLATFORM: "COMMON_PLATFORM"
  },
  mockListTypes: [
    { id: 1, englishFriendlyName: "Daily Cause List", welshFriendlyName: "Rhestr Achosion Dyddiol" },
    { id: 8, englishFriendlyName: "Civil And Family Daily Cause List", welshFriendlyName: "Rhestr Achosion Dyddiol Sifil a Theulu" }
  ]
}));

vi.mock("./queries.js", () => ({
  createIngestionLog: vi.fn()
}));

vi.mock("../validation.js", () => ({
  validateBlobRequest: vi.fn()
}));

vi.mock("../file-storage.js", () => ({
  saveUploadedFile: vi.fn()
}));

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn()
}));

vi.mock("@hmcts/notifications", () => ({
  sendPublicationNotifications: vi.fn()
}));

describe("processBlobIngestion", async () => {
  const { createArtefact, mockListTypes } = await import("@hmcts/publication");
  const { createIngestionLog } = await import("./queries.js");
  const { validateBlobRequest } = await import("../validation.js");
  const { saveUploadedFile } = await import("../file-storage.js");
  const { getLocationById } = await import("@hmcts/location");
  const { sendPublicationNotifications } = await import("@hmcts/notifications");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validRequest: BlobIngestionRequest = {
    court_id: "123",
    provenance: "XHIBIT",
    content_date: "2025-01-25",
    list_type: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
    sensitivity: "PUBLIC",
    language: "ENGLISH",
    display_from: "2025-01-25T09:00:00Z",
    display_to: "2025-01-25T17:00:00Z",
    hearing_list: { courtLists: [] }
  };

  it("should successfully process valid blob with existing location", async () => {
    vi.mocked(validateBlobRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: 8
    });

    vi.mocked(createArtefact).mockResolvedValue("test-artefact-id");

    const result = await processBlobIngestion(validRequest, 1000);

    expect(result.success).toBe(true);
    expect(result.artefact_id).toBeDefined();
    expect(result.no_match).toBe(false);
    expect(result.message).toBe("Blob ingested and published successfully");
    expect(createArtefact).toHaveBeenCalled();
    expect(saveUploadedFile).toHaveBeenCalledWith("test-artefact-id", "upload.json", expect.any(Buffer));
    expect(createIngestionLog).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "SUCCESS",
        sourceSystem: "XHIBIT",
        courtId: "123"
      })
    );
  });

  it("should process blob with no_match=true when location not found", async () => {
    vi.mocked(validateBlobRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: false,
      listTypeId: 8
    });

    vi.mocked(createArtefact).mockResolvedValue("test-artefact-id");

    const result = await processBlobIngestion(validRequest, 1000);

    expect(result.success).toBe(true);
    expect(result.no_match).toBe(true);
    expect(result.message).toBe("Blob ingested but location not found in reference data (no_match=true)");
    expect(createArtefact).toHaveBeenCalledWith(
      expect.objectContaining({
        noMatch: true
      })
    );
    expect(saveUploadedFile).toHaveBeenCalledWith("test-artefact-id", "upload.json", expect.any(Buffer));
  });

  it("should return validation errors when request is invalid", async () => {
    vi.mocked(validateBlobRequest).mockResolvedValue({
      isValid: false,
      errors: [
        { field: "court_id", message: "court_id is required" },
        { field: "provenance", message: "provenance is required" }
      ],
      locationExists: false
    });

    const result = await processBlobIngestion(validRequest, 1000);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Validation failed");
    expect(result.errors).toHaveLength(2);
    expect(createArtefact).not.toHaveBeenCalled();
    expect(createIngestionLog).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "VALIDATION_ERROR"
      })
    );
  });

  it("should handle system errors during artefact creation", async () => {
    vi.mocked(validateBlobRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: 8
    });

    vi.mocked(createArtefact).mockRejectedValue(new Error("Database error"));

    const result = await processBlobIngestion(validRequest, 1000);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Internal server error during ingestion");
    expect(createIngestionLog).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "SYSTEM_ERROR",
        errorMessage: "Database error"
      })
    );
  });

  it("should map provenance correctly", async () => {
    vi.mocked(validateBlobRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: 8
    });

    vi.mocked(createArtefact).mockResolvedValue("test-artefact-id");

    await processBlobIngestion({ ...validRequest, provenance: "LIBRA" }, 1000);

    expect(createArtefact).toHaveBeenCalledWith(
      expect.objectContaining({
        provenance: "LIBRA"
      })
    );
  });

  it("should parse date fields correctly", async () => {
    vi.mocked(validateBlobRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: 8
    });

    vi.mocked(createArtefact).mockResolvedValue("test-artefact-id");

    await processBlobIngestion(validRequest, 1000);

    expect(createArtefact).toHaveBeenCalledWith(
      expect.objectContaining({
        contentDate: new Date("2025-01-25"),
        displayFrom: new Date("2025-01-25T09:00:00Z"),
        displayTo: new Date("2025-01-25T17:00:00Z")
      })
    );
  });

  it("should set isFlatFile to false for JSON blobs", async () => {
    vi.mocked(validateBlobRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: 8
    });

    vi.mocked(createArtefact).mockResolvedValue("test-artefact-id");

    await processBlobIngestion(validRequest, 1000);

    expect(createArtefact).toHaveBeenCalledWith(
      expect.objectContaining({
        isFlatFile: false
      })
    );
  });

  it("should handle missing provenance in validation error logging", async () => {
    const requestWithoutProvenance = { ...validRequest, provenance: undefined as any };

    vi.mocked(validateBlobRequest).mockResolvedValue({
      isValid: false,
      errors: [{ field: "provenance", message: "Missing provenance" }],
      locationExists: false
    });

    const result = await processBlobIngestion(requestWithoutProvenance, 1000);

    expect(result.success).toBe(false);
    expect(createIngestionLog).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceSystem: "UNKNOWN",
        status: "VALIDATION_ERROR"
      })
    );
  });

  it("should handle missing court_id in validation error logging", async () => {
    const requestWithoutCourtId = { ...validRequest, court_id: undefined as any };

    vi.mocked(validateBlobRequest).mockResolvedValue({
      isValid: false,
      errors: [{ field: "court_id", message: "Missing court ID" }],
      locationExists: false
    });

    const result = await processBlobIngestion(requestWithoutCourtId, 1000);

    expect(result.success).toBe(false);
    expect(createIngestionLog).toHaveBeenCalledWith(
      expect.objectContaining({
        courtId: "UNKNOWN",
        status: "VALIDATION_ERROR"
      })
    );
  });

  it("should return system error when list type ID is missing after validation", async () => {
    vi.mocked(validateBlobRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: null as any
    });

    const result = await processBlobIngestion(validRequest, 1000);

    expect(result.success).toBe(false);
    expect(result.message).toBe("Internal server error during ingestion");
    expect(createIngestionLog).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "SYSTEM_ERROR",
        errorMessage: "List type ID not found after validation"
      })
    );
  });

  it("should handle non-Error exceptions during processing", async () => {
    vi.mocked(validateBlobRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: 8
    });

    vi.mocked(createArtefact).mockRejectedValue("String error");

    const result = await processBlobIngestion(validRequest, 1000);

    expect(result.success).toBe(false);
    expect(createIngestionLog).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "SYSTEM_ERROR",
        errorMessage: "Unknown error"
      })
    );
  });

  it("should trigger notifications on successful ingestion with location match", async () => {
    vi.mocked(validateBlobRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: 8
    });

    vi.mocked(createArtefact).mockResolvedValue("test-artefact-id");
    vi.mocked(getLocationById).mockResolvedValue({
      id: 123,
      name: "Test Court",
      welshName: "Llys Prawf"
    });
    vi.mocked(sendPublicationNotifications).mockResolvedValue({
      totalSubscriptions: 5,
      sent: 5,
      failed: 0,
      skipped: 0,
      duplicates: 0,
      errors: []
    });

    await processBlobIngestion(validRequest, 1000);

    // Wait for async notification processing
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(sendPublicationNotifications).toHaveBeenCalledWith({
      publicationId: "test-artefact-id",
      locationId: "123",
      locationName: "Test Court",
      hearingListName: "Civil And Family Daily Cause List",
      publicationDate: expect.any(Date)
    });
  });

  it("should not trigger notifications when noMatch is true", async () => {
    vi.mocked(validateBlobRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: false,
      listTypeId: 8
    });

    vi.mocked(createArtefact).mockResolvedValue("test-artefact-id");

    await processBlobIngestion(validRequest, 1000);

    // Wait to ensure async code has time to execute (if it was going to)
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(sendPublicationNotifications).not.toHaveBeenCalled();
  });

  it("should handle notification errors gracefully without failing ingestion", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(validateBlobRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: 8
    });

    vi.mocked(createArtefact).mockResolvedValue("test-artefact-id");
    vi.mocked(getLocationById).mockResolvedValue({
      id: 123,
      name: "Test Court",
      welshName: "Llys Prawf"
    });
    vi.mocked(sendPublicationNotifications).mockRejectedValue(new Error("Notification service down"));

    const result = await processBlobIngestion(validRequest, 1000);

    // Ingestion should still succeed
    expect(result.success).toBe(true);
    expect(result.artefact_id).toBe("test-artefact-id");

    // Wait for async notification error to be logged
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to trigger publication notifications:", {
      artefactId: "test-artefact-id",
      courtId: "123",
      error: "Notification service down"
    });

    consoleErrorSpy.mockRestore();
  });

  it("should handle invalid location ID in triggerPublicationNotifications", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(validateBlobRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: 8
    });

    vi.mocked(createArtefact).mockResolvedValue("test-artefact-id");

    const invalidRequest = { ...validRequest, court_id: "invalid-id" };
    await processBlobIngestion(invalidRequest, 1000);

    // Wait for async notification processing
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(getLocationById).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith("Invalid location ID for notifications:", "invalid-id");

    consoleErrorSpy.mockRestore();
  });

  it("should handle location not found in triggerPublicationNotifications", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(validateBlobRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: 8
    });

    vi.mocked(createArtefact).mockResolvedValue("test-artefact-id");
    vi.mocked(getLocationById).mockResolvedValue(null);

    await processBlobIngestion(validRequest, 1000);

    // Wait for async notification processing
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(getLocationById).toHaveBeenCalledWith(123);
    expect(consoleErrorSpy).toHaveBeenCalledWith("Location not found for notifications:", "123");

    consoleErrorSpy.mockRestore();
  });

  it("should handle list type not found in triggerPublicationNotifications", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(validateBlobRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: 999
    });

    vi.mocked(createArtefact).mockResolvedValue("test-artefact-id");
    vi.mocked(getLocationById).mockResolvedValue({
      id: 123,
      name: "Test Court",
      welshName: "Llys Prawf"
    });

    await processBlobIngestion(validRequest, 1000);

    // Wait for async notification processing
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(consoleErrorSpy).toHaveBeenCalledWith("List type not found for notifications:", 999);

    consoleErrorSpy.mockRestore();
  });

  it("should log notification results including errors", async () => {
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(validateBlobRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: 8
    });

    vi.mocked(createArtefact).mockResolvedValue("test-artefact-id");
    vi.mocked(getLocationById).mockResolvedValue({
      id: 123,
      name: "Test Court",
      welshName: "Llys Prawf"
    });
    vi.mocked(sendPublicationNotifications).mockResolvedValue({
      totalSubscriptions: 5,
      sent: 3,
      failed: 2,
      skipped: 0,
      duplicates: 0,
      errors: [
        { email: "user1@example.com", error: "Invalid email" },
        { email: "user2@example.com", error: "Service unavailable" }
      ]
    });

    await processBlobIngestion(validRequest, 1000);

    // Wait for async notification processing
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(consoleLogSpy).toHaveBeenCalledWith("Publication notifications sent:", {
      publicationId: "test-artefact-id",
      totalSubscriptions: 5,
      sent: 3,
      failed: 2,
      skipped: 0,
      duplicates: 0
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith("Notification errors:", [
      { email: "user1@example.com", error: "Invalid email" },
      { email: "user2@example.com", error: "Service unavailable" }
    ]);

    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });
});
