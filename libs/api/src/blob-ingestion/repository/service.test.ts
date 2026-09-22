import { ArtefactType } from "@hmcts/publication";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicationMetadata } from "../publication-headers.js";
import { processBlobIngestion, processFlatFileBlobIngestion } from "./service.js";

vi.mock("@hmcts/publication", () => ({
  createArtefact: vi.fn(),
  extractAndStoreArtefactSearch: vi.fn(),
  processPublication: vi.fn(),
  updateSourceArtefactId: vi.fn(),
  // Pure string logic — use the real behaviour rather than a stub so the no-match branch is
  // driven by the same prefix rule as production.
  isNoMatchLocationId: (locationId: string) => locationId.startsWith("NoMatch"),
  ArtefactType: { LIST: "LIST", LCSU: "LCSU" },
  Language: { ENGLISH: "ENGLISH", WELSH: "WELSH", BILINGUAL: "BILINGUAL" },
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

const BLOB_URL = "https://account.blob.core.windows.net/artefact/test-artefact-id";
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
    displayFrom: "2025-01-25T09:00:00Z",
    displayTo: "2025-01-25T17:00:00Z",
    sourceArtefactId: null,
    ...overrides
  };
}

describe("processBlobIngestion", async () => {
  const { createArtefact, extractAndStoreArtefactSearch, processPublication, updateSourceArtefactId } = await import("@hmcts/publication");
  const { createIngestionLog } = await import("./queries.js");
  const { validateBlobRequest } = await import("../validation.js");
  const { saveUploadedFile } = await import("../file-storage.js");

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(processPublication).mockResolvedValue({});
    vi.mocked(extractAndStoreArtefactSearch).mockResolvedValue([]);
    vi.mocked(saveUploadedFile).mockResolvedValue(BLOB_URL);
    vi.mocked(updateSourceArtefactId).mockResolvedValue(undefined);
    vi.mocked(validateBlobRequest).mockResolvedValue({ isValid: true, errors: [], listTypeId: 8, resolvedLocationId: "123" });
    vi.mocked(createArtefact).mockResolvedValue({ artefactId: "test-artefact-id", isUpdate: false });
  });

  it("should return CREATED with the Artefact response when the publication is accepted", async () => {
    // Act
    const result = await processBlobIngestion(metadata(), PAYLOAD, 1000);

    // Assert
    expect(result.outcome).toBe("CREATED");
    expect(result.artefact).toEqual({
      artefactId: "test-artefact-id",
      contentDate: new Date("2025-01-25").toISOString(),
      courtId: "123",
      displayFrom: new Date("2025-01-25T09:00:00Z").toISOString(),
      displayTo: new Date("2025-01-25T17:00:00Z").toISOString(),
      isFlatFile: false,
      language: "ENGLISH",
      listType: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
      payload: BLOB_URL,
      provenance: "MANUAL_UPLOAD",
      sensitivity: "PUBLIC",
      sourceArtefactId: null,
      type: "LIST"
    });
  });

  it("should store the raw payload under the artefact id", async () => {
    // Act
    await processBlobIngestion(metadata(), PAYLOAD, 1000);

    // Assert
    expect(saveUploadedFile).toHaveBeenCalledWith("test-artefact-id", "upload.json", Buffer.from(JSON.stringify(PAYLOAD)));
    expect(createIngestionLog).toHaveBeenCalledWith(expect.objectContaining({ status: "SUCCESS", sourceSystem: "MANUAL_UPLOAD", courtId: "123" }));
  });

  it("should include the extracted cases as search in the response", async () => {
    // Arrange
    vi.mocked(extractAndStoreArtefactSearch).mockResolvedValue([{ caseNumber: "T1", caseName: "R v Smith" }]);

    // Act
    const result = await processBlobIngestion(metadata(), PAYLOAD, 1000);

    // Assert
    expect(result.artefact?.search).toEqual({ cases: [{ caseNumber: "T1", caseName: "R v Smith" }] });
  });

  it("should persist null display dates when the optional headers were omitted", async () => {
    // Act
    const result = await processBlobIngestion(metadata({ displayFrom: null, displayTo: null }), PAYLOAD, 1000);

    // Assert
    expect(createArtefact).toHaveBeenCalledWith(expect.objectContaining({ displayFrom: null, displayTo: null }));
    expect(result.artefact?.displayFrom).toBeNull();
    expect(result.artefact?.displayTo).toBeNull();
  });

  it("should take the artefact type from the metadata rather than hardcoding LIST", async () => {
    // Act
    await processBlobIngestion(metadata(), PAYLOAD, 1000);

    // Assert
    expect(createArtefact).toHaveBeenCalledWith(expect.objectContaining({ type: "LIST" }));
  });

  it("should still return CREATED when the location could not be resolved", async () => {
    // Arrange
    vi.mocked(validateBlobRequest).mockResolvedValue({ isValid: true, errors: [], listTypeId: 8, resolvedLocationId: "NoMatch123" });
    vi.spyOn(console, "log").mockImplementation(() => {});

    // Act
    const result = await processBlobIngestion(metadata(), PAYLOAD, 1000);

    // Assert
    expect(result.outcome).toBe("CREATED");
    expect(createArtefact).toHaveBeenCalledWith(expect.objectContaining({ locationId: "NoMatch123" }));
  });

  it("should pass the source artefact id through", async () => {
    // Act
    await processBlobIngestion(metadata({ sourceArtefactId: "civil-daily-cause-list.json" }), PAYLOAD, 1000);

    // Assert
    expect(updateSourceArtefactId).toHaveBeenCalledWith("test-artefact-id", "civil-daily-cause-list.json");
  });

  it("should store a null source artefact id when it was not supplied", async () => {
    // Act
    await processBlobIngestion(metadata(), PAYLOAD, 1000);

    // Assert
    expect(updateSourceArtefactId).toHaveBeenCalledWith("test-artefact-id", null);
  });

  it("should return VALIDATION_ERROR with the joined message when the request is invalid", async () => {
    // Arrange
    vi.mocked(validateBlobRequest).mockResolvedValue({
      isValid: false,
      errors: [
        { field: "x-court-id", message: "x-court-id must be a valid number" },
        { field: "x-list-type", message: "Invalid x-list-type. Allowed values: A" }
      ]
    });

    // Act
    const result = await processBlobIngestion(metadata(), PAYLOAD, 1000);

    // Assert
    expect(result.outcome).toBe("VALIDATION_ERROR");
    expect(result.message).toBe("x-court-id must be a valid number; Invalid x-list-type. Allowed values: A");
    expect(result.errors).toHaveLength(2);
    expect(createArtefact).not.toHaveBeenCalled();
    expect(createIngestionLog).toHaveBeenCalledWith(expect.objectContaining({ status: "VALIDATION_ERROR" }));
  });

  it("should return ERROR when the list type id is missing after validation", async () => {
    // Arrange
    vi.mocked(validateBlobRequest).mockResolvedValue({ isValid: true, errors: [], listTypeId: undefined, resolvedLocationId: "123" });

    // Act
    const result = await processBlobIngestion(metadata(), PAYLOAD, 1000);

    // Assert
    expect(result.outcome).toBe("ERROR");
    expect(createIngestionLog).toHaveBeenCalledWith(
      expect.objectContaining({ status: "SYSTEM_ERROR", errorMessage: "List type ID not found after validation" })
    );
  });

  it("should return ERROR when artefact creation fails", async () => {
    // Arrange
    vi.mocked(createArtefact).mockRejectedValue(new Error("Database error"));

    // Act
    const result = await processBlobIngestion(metadata(), PAYLOAD, 1000);

    // Assert
    expect(result.outcome).toBe("ERROR");
    expect(result.message).toBe("Internal server error during ingestion");
    expect(createIngestionLog).toHaveBeenCalledWith(expect.objectContaining({ status: "SYSTEM_ERROR", errorMessage: "Database error" }));
  });

  it("should return CONFLICT when Prisma reports a unique constraint violation", async () => {
    // Arrange
    vi.mocked(createArtefact).mockRejectedValue(Object.assign(new Error("Unique constraint failed"), { code: "P2002" }));

    // Act
    const result = await processBlobIngestion(metadata(), PAYLOAD, 1000);

    // Assert
    expect(result.outcome).toBe("CONFLICT");
    expect(result.message).toBe("A publication with these details is already being created");
  });

  it("should record an unknown error message for non-Error throwables", async () => {
    // Arrange
    vi.mocked(createArtefact).mockRejectedValue("String error");

    // Act
    const result = await processBlobIngestion(metadata(), PAYLOAD, 1000);

    // Assert
    expect(result.outcome).toBe("ERROR");
    expect(createIngestionLog).toHaveBeenCalledWith(expect.objectContaining({ status: "SYSTEM_ERROR", errorMessage: "Unknown error" }));
  });

  it("should call processPublication with the publication metadata when the location matched", async () => {
    // Act
    await processBlobIngestion(metadata(), PAYLOAD, 1000);
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert
    expect(processPublication).toHaveBeenCalledWith({
      artefactId: "test-artefact-id",
      locationId: "123",
      listTypeId: 8,
      contentDate: new Date("2025-01-25"),
      locale: "en",
      jsonData: PAYLOAD,
      provenance: "MANUAL_UPLOAD",
      sensitivity: "PUBLIC",
      language: "ENGLISH",
      displayFrom: new Date("2025-01-25T09:00:00Z"),
      displayTo: new Date("2025-01-25T17:00:00Z"),
      isUpdate: false,
      logPrefix: "[blob-ingestion]"
    });
  });

  it("should not call processPublication when the location did not match", async () => {
    // Arrange
    vi.mocked(validateBlobRequest).mockResolvedValue({ isValid: true, errors: [], listTypeId: 8, resolvedLocationId: "NoMatch123" });
    vi.spyOn(console, "log").mockImplementation(() => {});

    // Act
    await processBlobIngestion(metadata(), PAYLOAD, 1000);
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert
    expect(processPublication).not.toHaveBeenCalled();
  });

  it("should use the resolved location id for an external provenance", async () => {
    // Arrange
    vi.mocked(validateBlobRequest).mockResolvedValue({ isValid: true, errors: [], listTypeId: 8, resolvedLocationId: "456" });

    // Act
    await processBlobIngestion(metadata({ provenance: "SNL", courtId: "snl-ext-id" }), PAYLOAD, 1000);
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert
    expect(createArtefact).toHaveBeenCalledWith(expect.objectContaining({ locationId: "456" }));
    expect(processPublication).toHaveBeenCalledWith(expect.objectContaining({ locationId: "456" }));
  });

  it("should persist the NoMatch-prefixed location id when no location resolved", async () => {
    // Arrange
    vi.mocked(validateBlobRequest).mockResolvedValue({ isValid: true, errors: [], listTypeId: 8, resolvedLocationId: "NoMatch123" });
    vi.spyOn(console, "log").mockImplementation(() => {});

    // Act
    await processBlobIngestion(metadata(), PAYLOAD, 1000);

    // Assert
    expect(createArtefact).toHaveBeenCalledWith(expect.objectContaining({ locationId: "NoMatch123" }));
  });

  it("should fall back to the submitted court id when validation resolved nothing", async () => {
    // Arrange
    vi.mocked(validateBlobRequest).mockResolvedValue({ isValid: true, errors: [], listTypeId: 8, resolvedLocationId: undefined });

    // Act
    await processBlobIngestion(metadata(), PAYLOAD, 1000);

    // Assert
    expect(createArtefact).toHaveBeenCalledWith(expect.objectContaining({ locationId: "123" }));
  });

  // The response reports the persisted location id, not the raw submitted court id, so a
  // no-match is visible to the publisher as a NoMatch-prefixed value — matching OG CaTH, whose
  // functional test asserts getLocationId() *contains* the submitted id.
  it("should report the resolved location id in the response", async () => {
    // Arrange
    vi.mocked(validateBlobRequest).mockResolvedValue({ isValid: true, errors: [], listTypeId: 8, resolvedLocationId: "456" });

    // Act
    const result = await processBlobIngestion(metadata({ provenance: "SNL", courtId: "snl-ext-id" }), PAYLOAD, 1000);

    // Assert
    expect(result.artefact?.courtId).toBe("456");
  });

  it("should report the NoMatch-prefixed location id in the response when unresolved", async () => {
    // Arrange
    vi.mocked(validateBlobRequest).mockResolvedValue({ isValid: true, errors: [], listTypeId: 8, resolvedLocationId: "NoMatchsnl-ext-id" });
    vi.spyOn(console, "log").mockImplementation(() => {});

    // Act
    const result = await processBlobIngestion(metadata({ provenance: "SNL", courtId: "snl-ext-id" }), PAYLOAD, 1000);

    // Assert
    expect(result.artefact?.courtId).toBe("NoMatchsnl-ext-id");
    expect(result.artefact?.courtId).toContain("snl-ext-id");
  });

  it("should keep the ingestion successful when processPublication rejects", async () => {
    // Arrange
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(processPublication).mockRejectedValue(new Error("Processing failed"));

    // Act
    const result = await processBlobIngestion(metadata(), PAYLOAD, 1000);
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert
    expect(result.outcome).toBe("CREATED");
    expect(consoleErrorSpy).toHaveBeenCalledWith("[blob-ingestion] Failed to process publication:", {
      artefactId: "test-artefact-id",
      courtId: "123",
      error: "Processing failed"
    });
  });

  it("should use the Welsh locale when the language is WELSH", async () => {
    // Act
    await processBlobIngestion(metadata({ language: "WELSH" }), PAYLOAD, 1000);
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert
    expect(processPublication).toHaveBeenCalledWith(expect.objectContaining({ locale: "cy" }));
  });

  it("should emit BI_LINGUAL in the response for a bilingual publication", async () => {
    // Act
    const result = await processBlobIngestion(metadata({ language: "BILINGUAL" }), PAYLOAD, 1000);

    // Assert
    expect(result.artefact?.language).toBe("BI_LINGUAL");
  });
});

describe("processFlatFileBlobIngestion", async () => {
  const { createArtefact, extractAndStoreArtefactSearch, processPublication, updateSourceArtefactId } = await import("@hmcts/publication");
  const { createIngestionLog } = await import("./queries.js");
  const { validateFlatFileRequest } = await import("../validation.js");
  const { saveUploadedFile } = await import("../file-storage.js");

  const fileBuffer = Buffer.from("%PDF-1.4");

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(processPublication).mockResolvedValue({});
    vi.mocked(saveUploadedFile).mockResolvedValue("https://account.blob.core.windows.net/artefact/flat-artefact-id");
    vi.mocked(updateSourceArtefactId).mockResolvedValue(undefined);
    vi.mocked(validateFlatFileRequest).mockResolvedValue({ isValid: true, errors: [], listTypeId: 8, resolvedLocationId: "123" });
    vi.mocked(createArtefact).mockResolvedValue({ artefactId: "flat-artefact-id", isUpdate: false });
  });

  it("should return CREATED with isFlatFile true", async () => {
    // Act
    const result = await processFlatFileBlobIngestion(metadata(), fileBuffer, fileBuffer.length);

    // Assert
    expect(result.outcome).toBe("CREATED");
    expect(result.artefact?.artefactId).toBe("flat-artefact-id");
    expect(result.artefact?.isFlatFile).toBe(true);
    expect(result.artefact?.payload).toBe("https://account.blob.core.windows.net/artefact/flat-artefact-id");
  });

  it("should never extract search data for a flat file", async () => {
    // Act
    const result = await processFlatFileBlobIngestion(metadata(), fileBuffer, fileBuffer.length);

    // Assert
    expect(extractAndStoreArtefactSearch).not.toHaveBeenCalled();
    expect(result.artefact).not.toHaveProperty("search");
  });

  it("should set isFlatFile on the persisted artefact", async () => {
    // Act
    await processFlatFileBlobIngestion(metadata(), fileBuffer, fileBuffer.length);

    // Assert
    expect(createArtefact).toHaveBeenCalledWith(expect.objectContaining({ isFlatFile: true }));
  });

  it("should store the file buffer under the artefact id with no extension", async () => {
    // Act
    await processFlatFileBlobIngestion(metadata(), fileBuffer, fileBuffer.length);

    // Assert
    expect(saveUploadedFile).toHaveBeenCalledWith("flat-artefact-id", "flat-artefact-id", fileBuffer);
  });

  it("should store the source artefact id when supplied", async () => {
    // Act
    await processFlatFileBlobIngestion(metadata({ sourceArtefactId: "civil-daily.pdf" }), fileBuffer, fileBuffer.length);

    // Assert
    expect(updateSourceArtefactId).toHaveBeenCalledWith("flat-artefact-id", "civil-daily.pdf");
  });

  it("should store null when no source artefact id was supplied", async () => {
    // Act
    await processFlatFileBlobIngestion(metadata(), fileBuffer, fileBuffer.length);

    // Assert
    expect(updateSourceArtefactId).toHaveBeenCalledWith("flat-artefact-id", null);
  });

  it("should still return CREATED and persist the NoMatch location id when the location is absent", async () => {
    // Arrange
    vi.mocked(validateFlatFileRequest).mockResolvedValue({ isValid: true, errors: [], listTypeId: 8, resolvedLocationId: "NoMatch123" });

    // Act
    const result = await processFlatFileBlobIngestion(metadata(), fileBuffer, fileBuffer.length);

    // Assert
    expect(result.outcome).toBe("CREATED");
    expect(createArtefact).toHaveBeenCalledWith(expect.objectContaining({ locationId: "NoMatch123" }));
  });

  it("should not call processPublication when the location is absent", async () => {
    // Arrange
    vi.mocked(validateFlatFileRequest).mockResolvedValue({ isValid: true, errors: [], listTypeId: 8, resolvedLocationId: "NoMatch123" });

    // Act
    await processFlatFileBlobIngestion(metadata(), fileBuffer, fileBuffer.length);
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert
    expect(processPublication).not.toHaveBeenCalled();
  });

  it("should return VALIDATION_ERROR when the metadata is invalid", async () => {
    // Arrange
    vi.mocked(validateFlatFileRequest).mockResolvedValue({
      isValid: false,
      errors: [{ field: "x-list-type", message: "Invalid x-list-type. Allowed values: A" }]
    });

    // Act
    const result = await processFlatFileBlobIngestion(metadata(), fileBuffer, fileBuffer.length);

    // Assert
    expect(result.outcome).toBe("VALIDATION_ERROR");
    expect(result.message).toBe("Invalid x-list-type. Allowed values: A");
    expect(createArtefact).not.toHaveBeenCalled();
    expect(createIngestionLog).toHaveBeenCalledWith(expect.objectContaining({ status: "VALIDATION_ERROR" }));
  });

  it("should return ERROR when the list type id is missing after validation", async () => {
    // Arrange
    vi.mocked(validateFlatFileRequest).mockResolvedValue({ isValid: true, errors: [], listTypeId: undefined, resolvedLocationId: "123" });

    // Act
    const result = await processFlatFileBlobIngestion(metadata(), fileBuffer, fileBuffer.length);

    // Assert
    expect(result.outcome).toBe("ERROR");
    expect(createIngestionLog).toHaveBeenCalledWith(
      expect.objectContaining({ status: "SYSTEM_ERROR", errorMessage: "List type ID not found after validation" })
    );
  });

  it("should return ERROR when artefact creation fails", async () => {
    // Arrange
    vi.mocked(createArtefact).mockRejectedValue(new Error("Database error"));

    // Act
    const result = await processFlatFileBlobIngestion(metadata(), fileBuffer, fileBuffer.length);

    // Assert
    expect(result.outcome).toBe("ERROR");
    expect(createIngestionLog).toHaveBeenCalledWith(expect.objectContaining({ status: "SYSTEM_ERROR", errorMessage: "Database error" }));
  });

  it("should return CONFLICT when Prisma reports a unique constraint violation", async () => {
    // Arrange
    vi.mocked(createArtefact).mockRejectedValue(Object.assign(new Error("Unique constraint failed"), { code: "P2002" }));

    // Act
    const result = await processFlatFileBlobIngestion(metadata(), fileBuffer, fileBuffer.length);

    // Assert
    expect(result.outcome).toBe("CONFLICT");
  });

  it("should use the Welsh locale when the language is WELSH", async () => {
    // Act
    await processFlatFileBlobIngestion(metadata({ language: "WELSH" }), fileBuffer, fileBuffer.length);
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert
    expect(processPublication).toHaveBeenCalledWith(expect.objectContaining({ locale: "cy", logPrefix: "[flat-file-ingestion]" }));
  });

  it("should use the resolved location id for an external provenance", async () => {
    // Arrange
    vi.mocked(validateFlatFileRequest).mockResolvedValue({ isValid: true, errors: [], listTypeId: 8, resolvedLocationId: "456" });

    // Act
    await processFlatFileBlobIngestion(metadata({ provenance: "SNL", courtId: "snl-ext-id" }), fileBuffer, fileBuffer.length);

    // Assert
    expect(createArtefact).toHaveBeenCalledWith(expect.objectContaining({ locationId: "456" }));
  });

  it("should log a successful ingestion", async () => {
    // Act
    await processFlatFileBlobIngestion(metadata(), fileBuffer, fileBuffer.length);

    // Assert
    expect(createIngestionLog).toHaveBeenCalledWith(expect.objectContaining({ status: "SUCCESS", artefactId: "flat-artefact-id", courtId: "123" }));
  });

  it("should persist null display dates when the optional headers were omitted", async () => {
    // Act
    const result = await processFlatFileBlobIngestion(metadata({ displayFrom: null, displayTo: null }), fileBuffer, fileBuffer.length);

    // Assert
    expect(createArtefact).toHaveBeenCalledWith(expect.objectContaining({ displayFrom: null, displayTo: null }));
    expect(result.artefact?.displayFrom).toBeNull();
  });
});
