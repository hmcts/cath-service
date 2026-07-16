import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BlobIngestionRequest, FlatFileIngestionRequest } from "./model.js";
import { processBlobIngestion, processFlatFileBlobIngestion } from "./service.js";

// Mock the dependencies
vi.mock("@hmcts/publication", () => ({
  createArtefact: vi.fn(),
  extractAndStoreArtefactSearch: vi.fn(),
  processPublication: vi.fn(),
  updateSourceArtefactId: vi.fn(),
  Provenance: {
    MANUAL_UPLOAD: "MANUAL_UPLOAD",
    SNL: "SNL",
    COMMON_PLATFORM: "COMMON_PLATFORM",
    CP_CATH: "CP_CATH",
    PDDA: "PDDA"
  }
}));

vi.mock("./queries.js", () => ({
  createIngestionLog: vi.fn()
}));

vi.mock("../validation.js", () => ({
  validateBlobRequest: vi.fn(),
  validateFlatFileRequest: vi.fn()
}));

vi.mock("../file-storage.js", () => ({
  saveUploadedFile: vi.fn()
}));

describe("processBlobIngestion", async () => {
  const { createArtefact, extractAndStoreArtefactSearch, processPublication, updateSourceArtefactId } = await import("@hmcts/publication");
  const { createIngestionLog } = await import("./queries.js");
  const { validateBlobRequest } = await import("../validation.js");
  const { saveUploadedFile } = await import("../file-storage.js");

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(processPublication).mockResolvedValue({});
    vi.mocked(extractAndStoreArtefactSearch).mockResolvedValue(undefined);
    vi.mocked(saveUploadedFile).mockResolvedValue(undefined);
    vi.mocked(updateSourceArtefactId).mockResolvedValue(undefined);
  });

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

  it("should successfully process valid blob with existing location", async () => {
    vi.mocked(validateBlobRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: 8
    });

    vi.mocked(createArtefact).mockResolvedValue({ artefactId: "test-artefact-id", isUpdate: false });

    const result = await processBlobIngestion(validRequest, 1000);

    expect(result.success).toBe(true);
    expect(result.artefact_id).toBeDefined();
    expect(result.no_match).toBe(false);
    expect(result.message).toBe("Blob ingested and published successfully");
    expect(createArtefact).toHaveBeenCalled();
    expect(saveUploadedFile).toHaveBeenCalledWith("test-artefact-id", "upload.json", expect.any(Buffer));
    expect(updateSourceArtefactId).toHaveBeenCalledWith("test-artefact-id", null);
    expect(createIngestionLog).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "SUCCESS",
        sourceSystem: "MANUAL_UPLOAD",
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

    vi.mocked(createArtefact).mockResolvedValue({ artefactId: "test-artefact-id", isUpdate: false });

    const result = await processBlobIngestion(validRequest, 1000);

    expect(result.success).toBe(true);
    expect(result.no_match).toBe(true);
    expect(result.message).toBe("Blob ingested but location not found in reference data");
    expect(createArtefact).toHaveBeenCalledWith(
      expect.objectContaining({
        noMatch: true
      })
    );
    expect(saveUploadedFile).toHaveBeenCalledWith("test-artefact-id", "upload.json", expect.any(Buffer));
    expect(updateSourceArtefactId).toHaveBeenCalledWith("test-artefact-id", null);
  });

  it("should use source_artefact_id from request when provided", async () => {
    // Arrange
    vi.mocked(validateBlobRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: 8
    });
    vi.mocked(createArtefact).mockResolvedValue({ artefactId: "test-artefact-id", isUpdate: false });
    const requestWithSourceId: BlobIngestionRequest = { ...validRequest, source_artefact_id: "civil-daily-cause-list.json" };

    // Act
    const result = await processBlobIngestion(requestWithSourceId, 1000);

    // Assert
    expect(result.success).toBe(true);
    expect(saveUploadedFile).toHaveBeenCalledWith("test-artefact-id", "upload.json", expect.any(Buffer));
    expect(updateSourceArtefactId).toHaveBeenCalledWith("test-artefact-id", "civil-daily-cause-list.json");
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

    vi.mocked(createArtefact).mockResolvedValue({ artefactId: "test-artefact-id", isUpdate: false });

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

    vi.mocked(createArtefact).mockResolvedValue({ artefactId: "test-artefact-id", isUpdate: false });

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

    vi.mocked(createArtefact).mockResolvedValue({ artefactId: "test-artefact-id", isUpdate: false });

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

  it("should call processPublication on successful ingestion with location match", async () => {
    vi.mocked(validateBlobRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: 8
    });

    vi.mocked(createArtefact).mockResolvedValue({ artefactId: "test-artefact-id", isUpdate: false });

    await processBlobIngestion(validRequest, 1000);

    // Wait for async processing
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(processPublication).toHaveBeenCalledWith({
      artefactId: "test-artefact-id",
      locationId: "123",
      listTypeId: 8,
      contentDate: expect.any(Date),
      locale: "en",
      jsonData: expect.anything(),
      provenance: "MANUAL_UPLOAD",
      sensitivity: "PUBLIC",
      language: "ENGLISH",
      displayFrom: expect.any(Date),
      displayTo: expect.any(Date),
      isUpdate: false,
      logPrefix: "[blob-ingestion]"
    });
  });

  it("should use resolvedLocationId when provenance is external", async () => {
    vi.mocked(validateBlobRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: 8,
      resolvedLocationId: "456"
    });

    vi.mocked(createArtefact).mockResolvedValue("test-artefact-id");

    const externalRequest = { ...validRequest, provenance: "SNL", court_id: "snl-ext-id" };
    await processBlobIngestion(externalRequest, 1000);

    expect(createArtefact).toHaveBeenCalledWith(
      expect.objectContaining({
        locationId: "456"
      })
    );

    // Wait for async processing
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(processPublication).toHaveBeenCalledWith(
      expect.objectContaining({
        locationId: "456"
      })
    );
  });

  it("should fall back to court_id when resolvedLocationId is undefined", async () => {
    vi.mocked(validateBlobRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: false,
      listTypeId: 8,
      resolvedLocationId: undefined
    });

    vi.mocked(createArtefact).mockResolvedValue("test-artefact-id");

    await processBlobIngestion(validRequest, 1000);

    expect(createArtefact).toHaveBeenCalledWith(
      expect.objectContaining({
        locationId: "123"
      })
    );
  });

  it("should not call processPublication when noMatch is true", async () => {
    vi.mocked(validateBlobRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: false,
      listTypeId: 8
    });

    vi.mocked(createArtefact).mockResolvedValue({ artefactId: "test-artefact-id", isUpdate: false });

    await processBlobIngestion(validRequest, 1000);

    // Wait to ensure async code has time to execute (if it was going to)
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(processPublication).not.toHaveBeenCalled();
  });

  it("should handle processPublication errors gracefully without failing ingestion", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(validateBlobRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: 8
    });

    vi.mocked(createArtefact).mockResolvedValue({ artefactId: "test-artefact-id", isUpdate: false });
    vi.mocked(processPublication).mockRejectedValue(new Error("Processing failed"));

    const result = await processBlobIngestion(validRequest, 1000);

    // Ingestion should still succeed
    expect(result.success).toBe(true);
    expect(result.artefact_id).toBe("test-artefact-id");

    // Wait for async error to be logged
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(consoleErrorSpy).toHaveBeenCalledWith("[blob-ingestion] Failed to process publication:", {
      artefactId: "test-artefact-id",
      courtId: "123",
      error: "Processing failed"
    });

    consoleErrorSpy.mockRestore();
  });

  it("should use Welsh locale when language is WELSH", async () => {
    vi.mocked(validateBlobRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: 8
    });

    vi.mocked(createArtefact).mockResolvedValue({ artefactId: "test-artefact-id", isUpdate: false });

    const welshRequest = { ...validRequest, language: "WELSH" };
    await processBlobIngestion(welshRequest, 1000);

    // Wait for async processing
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(processPublication).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: "cy"
      })
    );
  });
});

describe("processFlatFileBlobIngestion", async () => {
  const { createArtefact, processPublication, updateSourceArtefactId } = await import("@hmcts/publication");
  const { createIngestionLog } = await import("./queries.js");
  const { validateFlatFileRequest } = await import("../validation.js");
  const { saveUploadedFile } = await import("../file-storage.js");

  const validRequest: FlatFileIngestionRequest = {
    court_id: "123",
    provenance: "MANUAL_UPLOAD",
    content_date: "2025-01-25",
    list_type: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
    sensitivity: "PUBLIC",
    language: "ENGLISH",
    display_from: "2025-01-25T09:00:00Z",
    display_to: "2025-01-25T17:00:00Z"
  };

  const fileBuffer = Buffer.from("%PDF-1.4");

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(processPublication).mockResolvedValue({});
    vi.mocked(saveUploadedFile).mockResolvedValue(undefined);
    vi.mocked(updateSourceArtefactId).mockResolvedValue(undefined);
  });

  it("should successfully ingest a flat file with location match", async () => {
    // Arrange
    vi.mocked(validateFlatFileRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: 8
    });
    vi.mocked(createArtefact).mockResolvedValue({ artefactId: "flat-artefact-id", isUpdate: false });

    // Act
    const result = await processFlatFileBlobIngestion(validRequest, fileBuffer, fileBuffer.length);

    // Assert
    expect(result.success).toBe(true);
    expect(result.artefact_id).toBe("flat-artefact-id");
    expect(result.no_match).toBe(false);
    expect(result.message).toBe("Flat file ingested successfully");
  });

  it("should set isFlatFile to true on created artefact", async () => {
    // Arrange
    vi.mocked(validateFlatFileRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: 8
    });
    vi.mocked(createArtefact).mockResolvedValue({ artefactId: "flat-artefact-id", isUpdate: false });

    // Act
    await processFlatFileBlobIngestion(validRequest, fileBuffer, fileBuffer.length);

    // Assert
    expect(createArtefact).toHaveBeenCalledWith(expect.objectContaining({ isFlatFile: true }));
  });

  it("should store the file buffer directly to blob storage", async () => {
    // Arrange
    vi.mocked(validateFlatFileRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: 8
    });
    vi.mocked(createArtefact).mockResolvedValue({ artefactId: "flat-artefact-id", isUpdate: false });

    // Act
    await processFlatFileBlobIngestion(validRequest, fileBuffer, fileBuffer.length);

    // Assert: blob stored using artefactId only (no extension)
    expect(saveUploadedFile).toHaveBeenCalledWith("flat-artefact-id", "flat-artefact-id", fileBuffer);
  });

  it("should store source_artefact_id in database when provided", async () => {
    // Arrange
    vi.mocked(validateFlatFileRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: 8
    });
    vi.mocked(createArtefact).mockResolvedValue({ artefactId: "flat-artefact-id", isUpdate: false });
    const requestWithSourceId: FlatFileIngestionRequest = { ...validRequest, source_artefact_id: "civil-daily.pdf" };

    // Act
    await processFlatFileBlobIngestion(requestWithSourceId, fileBuffer, fileBuffer.length);

    // Assert: blob name is always artefactId; source_artefact_id is stored in the DB
    expect(saveUploadedFile).toHaveBeenCalledWith("flat-artefact-id", "flat-artefact-id", fileBuffer);
    expect(updateSourceArtefactId).toHaveBeenCalledWith("flat-artefact-id", "civil-daily.pdf");
  });

  it("should store null in source_artefact_id column when not provided", async () => {
    // Arrange
    vi.mocked(validateFlatFileRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: 8
    });
    vi.mocked(createArtefact).mockResolvedValue({ artefactId: "flat-artefact-id", isUpdate: false });

    // Act
    await processFlatFileBlobIngestion(validRequest, fileBuffer, fileBuffer.length);

    // Assert
    expect(updateSourceArtefactId).toHaveBeenCalledWith("flat-artefact-id", null);
  });

  it("should return no_match=true and 'location not found' message when location absent", async () => {
    // Arrange
    vi.mocked(validateFlatFileRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: false,
      listTypeId: 8
    });
    vi.mocked(createArtefact).mockResolvedValue({ artefactId: "flat-artefact-id", isUpdate: false });

    // Act
    const result = await processFlatFileBlobIngestion(validRequest, fileBuffer, fileBuffer.length);

    // Assert
    expect(result.success).toBe(true);
    expect(result.no_match).toBe(true);
    expect(result.message).toBe("Flat file ingested but location not found in reference data");
    expect(createArtefact).toHaveBeenCalledWith(expect.objectContaining({ noMatch: true }));
  });

  it("should not call processPublication when noMatch is true", async () => {
    // Arrange
    vi.mocked(validateFlatFileRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: false,
      listTypeId: 8
    });
    vi.mocked(createArtefact).mockResolvedValue({ artefactId: "flat-artefact-id", isUpdate: false });

    // Act
    await processFlatFileBlobIngestion(validRequest, fileBuffer, fileBuffer.length);
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert
    expect(processPublication).not.toHaveBeenCalled();
  });

  it("should return validation errors when request is invalid", async () => {
    // Arrange
    vi.mocked(validateFlatFileRequest).mockResolvedValue({
      isValid: false,
      errors: [{ field: "list_type", message: "list_type is required" }],
      locationExists: false
    });

    // Act
    const result = await processFlatFileBlobIngestion(validRequest, fileBuffer, fileBuffer.length);

    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toBe("Validation failed");
    expect(result.errors).toHaveLength(1);
    expect(createArtefact).not.toHaveBeenCalled();
    expect(createIngestionLog).toHaveBeenCalledWith(expect.objectContaining({ status: "VALIDATION_ERROR" }));
  });

  it("should return system error when list type ID is missing after validation", async () => {
    // Arrange
    vi.mocked(validateFlatFileRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: null as any
    });

    // Act
    const result = await processFlatFileBlobIngestion(validRequest, fileBuffer, fileBuffer.length);

    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toBe("Internal server error during ingestion");
    expect(createIngestionLog).toHaveBeenCalledWith(
      expect.objectContaining({ status: "SYSTEM_ERROR", errorMessage: "List type ID not found after validation" })
    );
  });

  it("should handle system errors during artefact creation", async () => {
    // Arrange
    vi.mocked(validateFlatFileRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: 8
    });
    vi.mocked(createArtefact).mockRejectedValue(new Error("Database error"));

    // Act
    const result = await processFlatFileBlobIngestion(validRequest, fileBuffer, fileBuffer.length);

    // Assert
    expect(result.success).toBe(false);
    expect(result.message).toBe("Internal server error during ingestion");
    expect(createIngestionLog).toHaveBeenCalledWith(expect.objectContaining({ status: "SYSTEM_ERROR", errorMessage: "Database error" }));
  });

  it("should use Welsh locale when language is WELSH", async () => {
    // Arrange
    vi.mocked(validateFlatFileRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: 8
    });
    vi.mocked(createArtefact).mockResolvedValue({ artefactId: "flat-artefact-id", isUpdate: false });
    const welshRequest = { ...validRequest, language: "WELSH" };

    // Act
    await processFlatFileBlobIngestion(welshRequest, fileBuffer, fileBuffer.length);
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert
    expect(processPublication).toHaveBeenCalledWith(expect.objectContaining({ locale: "cy" }));
  });

  it("should use resolvedLocationId when provenance is external", async () => {
    // Arrange
    vi.mocked(validateFlatFileRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: 8,
      resolvedLocationId: "456"
    });
    vi.mocked(createArtefact).mockResolvedValue({ artefactId: "flat-artefact-id", isUpdate: false });
    const externalRequest = { ...validRequest, provenance: "SNL", court_id: "snl-ext-id" };

    // Act
    await processFlatFileBlobIngestion(externalRequest, fileBuffer, fileBuffer.length);

    // Assert
    expect(createArtefact).toHaveBeenCalledWith(expect.objectContaining({ locationId: "456" }));
  });

  it("should log successful ingestion", async () => {
    // Arrange
    vi.mocked(validateFlatFileRequest).mockResolvedValue({
      isValid: true,
      errors: [],
      locationExists: true,
      listTypeId: 8
    });
    vi.mocked(createArtefact).mockResolvedValue({ artefactId: "flat-artefact-id", isUpdate: false });

    // Act
    await processFlatFileBlobIngestion(validRequest, fileBuffer, fileBuffer.length);

    // Assert
    expect(createIngestionLog).toHaveBeenCalledWith(expect.objectContaining({ status: "SUCCESS", artefactId: "flat-artefact-id", courtId: "123" }));
  });
});
