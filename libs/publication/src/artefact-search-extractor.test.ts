import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractAndStoreArtefactSearch } from "./artefact-search-extractor.js";

vi.mock("@hmcts/list-search-config", () => ({
  getConfigForListType: vi.fn()
}));

vi.mock("./repository/queries.js", () => ({
  createArtefactSearch: vi.fn()
}));

const { getConfigForListType } = await import("@hmcts/list-search-config");
const { createArtefactSearch } = await import("./repository/queries.js");

describe("extractAndStoreArtefactSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should extract and store case data from valid payload", async () => {
    const mockConfig = {
      caseNumberFieldName: "caseNumber",
      caseNameFieldName: "caseName"
    };

    const mockPayload = {
      caseNumber: "CASE-123",
      caseName: "Smith vs Jones"
    };

    vi.mocked(getConfigForListType).mockResolvedValue(mockConfig as any);
    vi.mocked(createArtefactSearch).mockResolvedValue({} as any);

    await extractAndStoreArtefactSearch("artefact-1", 1, mockPayload);

    expect(createArtefactSearch).toHaveBeenCalledWith("artefact-1", "CASE-123", "Smith vs Jones");
    expect(console.log).toHaveBeenCalledWith("[ArtefactSearch] Extracted case data for artefact artefact-1", {
      caseNumber: "present",
      caseName: "present"
    });
  });

  it("should extract only case number when case name is missing", async () => {
    const mockConfig = {
      caseNumberFieldName: "caseNumber",
      caseNameFieldName: "caseName"
    };

    const mockPayload = {
      caseNumber: "CASE-456"
    };

    vi.mocked(getConfigForListType).mockResolvedValue(mockConfig as any);
    vi.mocked(createArtefactSearch).mockResolvedValue({} as any);

    await extractAndStoreArtefactSearch("artefact-2", 1, mockPayload);

    expect(createArtefactSearch).toHaveBeenCalledWith("artefact-2", "CASE-456", null);
    expect(console.log).toHaveBeenCalledWith("[ArtefactSearch] Extracted case data for artefact artefact-2", {
      caseNumber: "present",
      caseName: "null"
    });
  });

  it("should extract only case name when case number is missing", async () => {
    const mockConfig = {
      caseNumberFieldName: "caseNumber",
      caseNameFieldName: "caseName"
    };

    const mockPayload = {
      caseName: "Jones vs Smith"
    };

    vi.mocked(getConfigForListType).mockResolvedValue(mockConfig as any);
    vi.mocked(createArtefactSearch).mockResolvedValue({} as any);

    await extractAndStoreArtefactSearch("artefact-3", 1, mockPayload);

    expect(createArtefactSearch).toHaveBeenCalledWith("artefact-3", null, "Jones vs Smith");
    expect(console.log).toHaveBeenCalledWith("[ArtefactSearch] Extracted case data for artefact artefact-3", {
      caseNumber: "null",
      caseName: "present"
    });
  });

  it("should not store when no case data is present", async () => {
    const mockConfig = {
      caseNumberFieldName: "caseNumber",
      caseNameFieldName: "caseName"
    };

    const mockPayload = {
      otherField: "value"
    };

    vi.mocked(getConfigForListType).mockResolvedValue(mockConfig as any);

    await extractAndStoreArtefactSearch("artefact-4", 1, mockPayload);

    expect(createArtefactSearch).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("[ArtefactSearch] No case data found in payload for artefact artefact-4");
  });

  it("should not store when both case fields are non-string types", async () => {
    const mockConfig = {
      caseNumberFieldName: "caseNumber",
      caseNameFieldName: "caseName"
    };

    const mockPayload = {
      caseNumber: 123,
      caseName: { name: "test" }
    };

    vi.mocked(getConfigForListType).mockResolvedValue(mockConfig as any);

    await extractAndStoreArtefactSearch("artefact-5", 1, mockPayload);

    expect(createArtefactSearch).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("[ArtefactSearch] No case data found in payload for artefact artefact-5");
  });

  it("should not process when config is not found", async () => {
    vi.mocked(getConfigForListType).mockResolvedValue(null);

    await extractAndStoreArtefactSearch("artefact-6", 1, { caseNumber: "CASE-123" });

    expect(createArtefactSearch).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("[ArtefactSearch] No config found for listTypeId 1");
  });

  it("should not process when payload is null", async () => {
    const mockConfig = {
      caseNumberFieldName: "caseNumber",
      caseNameFieldName: "caseName"
    };

    vi.mocked(getConfigForListType).mockResolvedValue(mockConfig as any);

    await extractAndStoreArtefactSearch("artefact-7", 1, null);

    expect(createArtefactSearch).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("[ArtefactSearch] Invalid JSON payload for artefact artefact-7");
  });

  it("should not process when payload is an array", async () => {
    const mockConfig = {
      caseNumberFieldName: "caseNumber",
      caseNameFieldName: "caseName"
    };

    vi.mocked(getConfigForListType).mockResolvedValue(mockConfig as any);

    await extractAndStoreArtefactSearch("artefact-8", 1, []);

    expect(createArtefactSearch).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("[ArtefactSearch] Invalid JSON payload for artefact artefact-8");
  });

  it("should not process when payload is not an object", async () => {
    const mockConfig = {
      caseNumberFieldName: "caseNumber",
      caseNameFieldName: "caseName"
    };

    vi.mocked(getConfigForListType).mockResolvedValue(mockConfig as any);

    await extractAndStoreArtefactSearch("artefact-9", 1, "string");

    expect(createArtefactSearch).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("[ArtefactSearch] Invalid JSON payload for artefact artefact-9");
  });

  it("should handle errors during extraction and storage", async () => {
    const mockConfig = {
      caseNumberFieldName: "caseNumber",
      caseNameFieldName: "caseName"
    };

    const mockPayload = {
      caseNumber: "CASE-123",
      caseName: "Test Case"
    };

    const error = new Error("Database error");

    vi.mocked(getConfigForListType).mockResolvedValue(mockConfig as any);
    vi.mocked(createArtefactSearch).mockRejectedValue(error);

    await extractAndStoreArtefactSearch("artefact-10", 1, mockPayload);

    expect(console.error).toHaveBeenCalledWith("[ArtefactSearch] Failed to extract/store for artefact artefact-10:", error);
  });

  it("should handle errors during config retrieval", async () => {
    const error = new Error("Config retrieval failed");

    vi.mocked(getConfigForListType).mockRejectedValue(error);

    await extractAndStoreArtefactSearch("artefact-11", 1, { caseNumber: "CASE-123" });

    expect(console.error).toHaveBeenCalledWith("[ArtefactSearch] Failed to extract/store for artefact artefact-11:", error);
  });

  it("should handle mixed string and non-string values correctly", async () => {
    const mockConfig = {
      caseNumberFieldName: "caseNumber",
      caseNameFieldName: "caseName"
    };

    const mockPayload = {
      caseNumber: "CASE-789",
      caseName: 12345
    };

    vi.mocked(getConfigForListType).mockResolvedValue(mockConfig as any);
    vi.mocked(createArtefactSearch).mockResolvedValue({} as any);

    await extractAndStoreArtefactSearch("artefact-12", 1, mockPayload);

    expect(createArtefactSearch).toHaveBeenCalledWith("artefact-12", "CASE-789", null);
    expect(console.log).toHaveBeenCalledWith("[ArtefactSearch] Extracted case data for artefact artefact-12", {
      caseNumber: "present",
      caseName: "null"
    });
  });
});
