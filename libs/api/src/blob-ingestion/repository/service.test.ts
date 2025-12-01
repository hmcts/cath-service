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
    SJP: "SJP"
  }
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

describe("processBlobIngestion", async () => {
  const { createArtefact } = await import("@hmcts/publication");
  const { createIngestionLog } = await import("./queries.js");
  const { validateBlobRequest } = await import("../validation.js");
  const { saveUploadedFile } = await import("../file-storage.js");

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
});
