import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockSavePdfToStorage, mockCreatePdfErrorResult, mockConfigureNunjucks, mockLoadTranslations } = vi.hoisted(() => ({
  mockSavePdfToStorage: vi.fn(),
  mockCreatePdfErrorResult: vi.fn(),
  mockConfigureNunjucks: vi.fn(),
  mockLoadTranslations: vi.fn()
}));

vi.mock("@hmcts/list-types-common", () => ({
  savePdfToStorage: mockSavePdfToStorage,
  createPdfErrorResult: mockCreatePdfErrorResult,
  configureNunjucks: mockConfigureNunjucks,
  loadTranslations: mockLoadTranslations,
  PDF_BASE_STYLES: "/* base styles */"
}));

vi.mock("@hmcts/pdf-generation", () => ({
  generatePdfFromHtml: vi.fn()
}));

vi.mock("../rendering/renderer.js", () => ({
  renderMagistratesStandardListData: vi.fn()
}));

vi.mock("@hmcts/publication", () => ({
  PROVENANCE_LABELS: {
    MANUAL_UPLOAD: "Manual Upload",
    SNL: "SNL"
  }
}));

import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { renderMagistratesStandardListData } from "../rendering/renderer.js";
import { generateMagistratesStandardListPdf } from "./pdf-generator.js";

const mockRenderedData = {
  header: {
    locationName: "Manchester Magistrates Court",
    contentDate: "13 January 2025",
    publishedDate: "13 January 2025",
    publishedTime: "9:30am",
    venueAddress: ["THE LAW COURTS", "CROWN SQUARE", "Manchester", "M3 3FL"]
  },
  listData: []
};

const mockJsonData = {
  document: {
    publicationDate: "2025-01-13T09:30:00.000Z"
  },
  venue: {
    venueAddress: {
      line: ["THE LAW COURTS", "CROWN SQUARE"],
      town: "Manchester",
      postCode: "M3 3FL"
    }
  },
  courtLists: []
};

const baseOptions = {
  artefactId: "test-artefact-id",
  jsonData: mockJsonData,
  locale: "en",
  locationId: "123",
  provenance: "MANUAL_UPLOAD",
  contentDate: new Date("2025-01-13")
};

describe("generateMagistratesStandardListPdf", () => {
  const mockNunjucksEnv = {
    render: vi.fn().mockReturnValue("<html>PDF HTML</html>")
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (renderMagistratesStandardListData as ReturnType<typeof vi.fn>).mockResolvedValue(mockRenderedData);
    mockLoadTranslations.mockResolvedValue({ title: "Magistrates Standard List" });
    mockConfigureNunjucks.mockReturnValue(mockNunjucksEnv);
    (generatePdfFromHtml as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("pdf"),
      sizeBytes: 3
    });
    mockSavePdfToStorage.mockResolvedValue({ success: true });
  });

  it("should generate and save a PDF successfully", async () => {
    const result = await generateMagistratesStandardListPdf(baseOptions);

    expect(result.success).toBe(true);
    expect(renderMagistratesStandardListData).toHaveBeenCalledWith(mockJsonData, {
      locale: "en",
      locationId: "123",
      contentDate: baseOptions.contentDate
    });
    expect(mockSavePdfToStorage).toHaveBeenCalledWith("test-artefact-id", expect.any(Buffer), 3);
  });

  it("should pass the MANUAL_UPLOAD provenance label to the template", async () => {
    await generateMagistratesStandardListPdf(baseOptions);

    expect(mockNunjucksEnv.render).toHaveBeenCalledWith("pdf-template.njk", expect.objectContaining({ dataSource: "Manual Upload" }));
  });

  it("should use empty string for unknown provenance", async () => {
    await generateMagistratesStandardListPdf({ ...baseOptions, provenance: "UNKNOWN" });

    expect(mockNunjucksEnv.render).toHaveBeenCalledWith("pdf-template.njk", expect.objectContaining({ dataSource: "UNKNOWN" }));
  });

  it("should use empty string when provenance is undefined", async () => {
    await generateMagistratesStandardListPdf({ ...baseOptions, provenance: undefined });

    expect(mockNunjucksEnv.render).toHaveBeenCalledWith("pdf-template.njk", expect.objectContaining({ dataSource: "" }));
  });

  it("should return an error result when PDF generation fails", async () => {
    (generatePdfFromHtml as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: "Chromium crashed"
    });
    mockCreatePdfErrorResult.mockReturnValue({ success: false, error: "Chromium crashed" });

    const result = await generateMagistratesStandardListPdf(baseOptions);

    expect(result.success).toBe(false);
  });

  it("should call createPdfErrorResult when an exception is thrown", async () => {
    (renderMagistratesStandardListData as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Render failed"));
    mockCreatePdfErrorResult.mockReturnValue({ success: false, error: "Render failed" });

    const result = await generateMagistratesStandardListPdf(baseOptions);

    expect(mockCreatePdfErrorResult).toHaveBeenCalled();
    expect(result.success).toBe(false);
  });

  it("should load Welsh translations for cy locale", async () => {
    await generateMagistratesStandardListPdf({ ...baseOptions, locale: "cy" });

    expect(mockLoadTranslations).toHaveBeenCalledWith("cy", expect.any(Function), expect.any(Function));
  });
});
