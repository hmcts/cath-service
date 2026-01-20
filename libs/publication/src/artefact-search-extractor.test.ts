import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractAndStoreArtefactSearch } from "./artefact-search-extractor.js";

vi.mock("@hmcts/list-search-config", () => ({
  getConfigForListType: vi.fn()
}));

vi.mock("./repository/queries.js", () => ({
  createArtefactSearch: vi.fn(),
  deleteArtefactSearchByArtefactId: vi.fn()
}));

const { getConfigForListType } = await import("@hmcts/list-search-config");
const { createArtefactSearch, deleteArtefactSearchByArtefactId } = await import("./repository/queries.js");

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
    vi.mocked(deleteArtefactSearchByArtefactId).mockResolvedValue({} as any);
    vi.mocked(createArtefactSearch).mockResolvedValue({} as any);

    await extractAndStoreArtefactSearch("artefact-1", 1, mockPayload);

    expect(deleteArtefactSearchByArtefactId).toHaveBeenCalledWith("artefact-1");
    expect(createArtefactSearch).toHaveBeenCalledWith("artefact-1", "CASE-123", "Smith vs Jones");
    expect(console.log).toHaveBeenCalledWith("[ArtefactSearch] Extracted 1 case(s) for artefact artefact-1");
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
    vi.mocked(deleteArtefactSearchByArtefactId).mockResolvedValue({} as any);
    vi.mocked(createArtefactSearch).mockResolvedValue({} as any);

    await extractAndStoreArtefactSearch("artefact-2", 1, mockPayload);

    expect(deleteArtefactSearchByArtefactId).toHaveBeenCalledWith("artefact-2");
    expect(createArtefactSearch).toHaveBeenCalledWith("artefact-2", "CASE-456", null);
    expect(console.log).toHaveBeenCalledWith("[ArtefactSearch] Extracted 1 case(s) for artefact artefact-2");
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
    vi.mocked(deleteArtefactSearchByArtefactId).mockResolvedValue({} as any);
    vi.mocked(createArtefactSearch).mockResolvedValue({} as any);

    await extractAndStoreArtefactSearch("artefact-3", 1, mockPayload);

    expect(deleteArtefactSearchByArtefactId).toHaveBeenCalledWith("artefact-3");
    expect(createArtefactSearch).toHaveBeenCalledWith("artefact-3", null, "Jones vs Smith");
    expect(console.log).toHaveBeenCalledWith("[ArtefactSearch] Extracted 1 case(s) for artefact artefact-3");
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

  it("should handle array of cases at root level", async () => {
    const mockConfig = {
      caseNumberFieldName: "caseNumber",
      caseNameFieldName: "caseName"
    };

    const mockPayload = [
      { caseNumber: "CASE-001", caseName: "Case One" },
      { caseNumber: "CASE-002", caseName: "Case Two" }
    ];

    vi.mocked(getConfigForListType).mockResolvedValue(mockConfig as any);
    vi.mocked(deleteArtefactSearchByArtefactId).mockResolvedValue({} as any);
    vi.mocked(createArtefactSearch).mockResolvedValue({} as any);

    await extractAndStoreArtefactSearch("artefact-8", 1, mockPayload);

    expect(deleteArtefactSearchByArtefactId).toHaveBeenCalledWith("artefact-8");
    expect(createArtefactSearch).toHaveBeenCalledTimes(2);
    expect(createArtefactSearch).toHaveBeenNthCalledWith(1, "artefact-8", "CASE-001", "Case One");
    expect(createArtefactSearch).toHaveBeenNthCalledWith(2, "artefact-8", "CASE-002", "Case Two");
    expect(console.log).toHaveBeenCalledWith("[ArtefactSearch] Extracted 2 case(s) for artefact artefact-8");
  });

  it("should handle empty array at root level", async () => {
    const mockConfig = {
      caseNumberFieldName: "caseNumber",
      caseNameFieldName: "caseName"
    };

    vi.mocked(getConfigForListType).mockResolvedValue(mockConfig as any);

    await extractAndStoreArtefactSearch("artefact-8b", 1, []);

    expect(deleteArtefactSearchByArtefactId).not.toHaveBeenCalled();
    expect(createArtefactSearch).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("[ArtefactSearch] No case data found in payload for artefact artefact-8b");
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
    vi.mocked(deleteArtefactSearchByArtefactId).mockResolvedValue({} as any);
    vi.mocked(createArtefactSearch).mockResolvedValue({} as any);

    await extractAndStoreArtefactSearch("artefact-12", 1, mockPayload);

    expect(deleteArtefactSearchByArtefactId).toHaveBeenCalledWith("artefact-12");
    expect(createArtefactSearch).toHaveBeenCalledWith("artefact-12", "CASE-789", null);
    expect(console.log).toHaveBeenCalledWith("[ArtefactSearch] Extracted 1 case(s) for artefact artefact-12");
  });

  it("should extract multiple cases from nested structure by finding field names", async () => {
    const mockConfig = {
      caseNumberFieldName: "caseNumber",
      caseNameFieldName: "caseName"
    };

    const mockPayload = {
      courtLists: [
        {
          courtHouse: {
            courtRoom: [
              {
                session: [
                  {
                    sittings: [
                      {
                        hearing: [
                          {
                            case: [
                              { caseNumber: "CASE-001", caseName: "Smith vs Jones" },
                              { caseNumber: "CASE-002", caseName: "Brown vs Green" }
                            ]
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        }
      ]
    };

    vi.mocked(getConfigForListType).mockResolvedValue(mockConfig as any);
    vi.mocked(deleteArtefactSearchByArtefactId).mockResolvedValue({} as any);
    vi.mocked(createArtefactSearch).mockResolvedValue({} as any);

    await extractAndStoreArtefactSearch("artefact-13", 8, mockPayload);

    expect(deleteArtefactSearchByArtefactId).toHaveBeenCalledWith("artefact-13");
    expect(createArtefactSearch).toHaveBeenCalledTimes(2);
    expect(createArtefactSearch).toHaveBeenNthCalledWith(1, "artefact-13", "CASE-001", "Smith vs Jones");
    expect(createArtefactSearch).toHaveBeenNthCalledWith(2, "artefact-13", "CASE-002", "Brown vs Green");
    expect(console.log).toHaveBeenCalledWith("[ArtefactSearch] Extracted 2 case(s) for artefact artefact-13");
  });

  it("should extract cases from deeply nested structure with multiple arrays", async () => {
    const mockConfig = {
      caseNumberFieldName: "caseNumber",
      caseNameFieldName: "caseName"
    };

    const mockPayload = {
      courtLists: [
        {
          courtHouse: {
            courtRoom: [
              {
                session: [
                  {
                    sittings: [
                      { hearing: [{ case: [{ caseNumber: "CASE-001", caseName: "Case One" }] }] },
                      { hearing: [{ case: [{ caseNumber: "CASE-002", caseName: "Case Two" }] }] }
                    ]
                  }
                ]
              },
              {
                session: [
                  {
                    sittings: [{ hearing: [{ case: [{ caseNumber: "CASE-003", caseName: "Case Three" }] }] }]
                  }
                ]
              }
            ]
          }
        },
        {
          courtHouse: {
            courtRoom: [
              {
                session: [
                  {
                    sittings: [{ hearing: [{ case: [{ caseNumber: "CASE-004", caseName: "Case Four" }] }] }]
                  }
                ]
              }
            ]
          }
        }
      ]
    };

    vi.mocked(getConfigForListType).mockResolvedValue(mockConfig as any);
    vi.mocked(deleteArtefactSearchByArtefactId).mockResolvedValue({} as any);
    vi.mocked(createArtefactSearch).mockResolvedValue({} as any);

    await extractAndStoreArtefactSearch("artefact-14", 8, mockPayload);

    expect(deleteArtefactSearchByArtefactId).toHaveBeenCalledWith("artefact-14");
    expect(createArtefactSearch).toHaveBeenCalledTimes(4);
    expect(createArtefactSearch).toHaveBeenNthCalledWith(1, "artefact-14", "CASE-001", "Case One");
    expect(createArtefactSearch).toHaveBeenNthCalledWith(2, "artefact-14", "CASE-002", "Case Two");
    expect(createArtefactSearch).toHaveBeenNthCalledWith(3, "artefact-14", "CASE-003", "Case Three");
    expect(createArtefactSearch).toHaveBeenNthCalledWith(4, "artefact-14", "CASE-004", "Case Four");
    expect(console.log).toHaveBeenCalledWith("[ArtefactSearch] Extracted 4 case(s) for artefact artefact-14");
  });

  it("should handle nested structure with missing case data", async () => {
    const mockConfig = {
      caseNumberFieldName: "caseNumber",
      caseNameFieldName: "caseName"
    };

    const mockPayload = {
      courtLists: []
    };

    vi.mocked(getConfigForListType).mockResolvedValue(mockConfig as any);

    await extractAndStoreArtefactSearch("artefact-15", 8, mockPayload);

    expect(deleteArtefactSearchByArtefactId).not.toHaveBeenCalled();
    expect(createArtefactSearch).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("[ArtefactSearch] No case data found in payload for artefact artefact-15");
  });

  it("should handle structure without matching field names", async () => {
    const mockConfig = {
      caseNumberFieldName: "caseNumber",
      caseNameFieldName: "caseName"
    };

    const mockPayload = {
      courtLists: [
        {
          courtHouse: {
            courtRoom: [
              {
                someOtherField: "value"
              }
            ]
          }
        }
      ]
    };

    vi.mocked(getConfigForListType).mockResolvedValue(mockConfig as any);

    await extractAndStoreArtefactSearch("artefact-16", 8, mockPayload);

    expect(deleteArtefactSearchByArtefactId).not.toHaveBeenCalled();
    expect(createArtefactSearch).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("[ArtefactSearch] No case data found in payload for artefact artefact-16");
  });

  it("should handle blank configuration fields", async () => {
    const mockConfig = {
      caseNumberFieldName: "",
      caseNameFieldName: ""
    };

    const mockPayload = {
      caseNumber: "CASE-123",
      caseName: "Test Case"
    };

    vi.mocked(getConfigForListType).mockResolvedValue(mockConfig as any);

    await extractAndStoreArtefactSearch("artefact-17", 1, mockPayload);

    expect(deleteArtefactSearchByArtefactId).not.toHaveBeenCalled();
    expect(createArtefactSearch).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith("[ArtefactSearch] No case data found in payload for artefact artefact-17");
  });

  it("should extract when only case number field is configured", async () => {
    const mockConfig = {
      caseNumberFieldName: "caseNumber",
      caseNameFieldName: ""
    };

    const mockPayload = {
      caseNumber: "CASE-123",
      caseName: "Test Case"
    };

    vi.mocked(getConfigForListType).mockResolvedValue(mockConfig as any);
    vi.mocked(deleteArtefactSearchByArtefactId).mockResolvedValue({} as any);
    vi.mocked(createArtefactSearch).mockResolvedValue({} as any);

    await extractAndStoreArtefactSearch("artefact-18", 1, mockPayload);

    expect(deleteArtefactSearchByArtefactId).toHaveBeenCalledWith("artefact-18");
    expect(createArtefactSearch).toHaveBeenCalledWith("artefact-18", "CASE-123", null);
    expect(console.log).toHaveBeenCalledWith("[ArtefactSearch] Extracted 1 case(s) for artefact artefact-18");
  });

  it("should extract when only case name field is configured", async () => {
    const mockConfig = {
      caseNumberFieldName: "",
      caseNameFieldName: "caseName"
    };

    const mockPayload = {
      caseNumber: "CASE-123",
      caseName: "Test Case"
    };

    vi.mocked(getConfigForListType).mockResolvedValue(mockConfig as any);
    vi.mocked(deleteArtefactSearchByArtefactId).mockResolvedValue({} as any);
    vi.mocked(createArtefactSearch).mockResolvedValue({} as any);

    await extractAndStoreArtefactSearch("artefact-19", 1, mockPayload);

    expect(deleteArtefactSearchByArtefactId).toHaveBeenCalledWith("artefact-19");
    expect(createArtefactSearch).toHaveBeenCalledWith("artefact-19", null, "Test Case");
    expect(console.log).toHaveBeenCalledWith("[ArtefactSearch] Extracted 1 case(s) for artefact artefact-19");
  });
});
