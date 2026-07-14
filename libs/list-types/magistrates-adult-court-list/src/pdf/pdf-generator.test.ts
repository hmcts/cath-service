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
  renderMagistratesAdultCourtList: vi.fn()
}));

vi.mock("@hmcts/publication", () => ({
  PROVENANCE_LABELS: {
    MANUAL_UPLOAD: "Manual Upload",
    SNL: "SNL"
  }
}));

import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { renderMagistratesAdultCourtList } from "../rendering/renderer.js";
import { generateMagistratesAdultCourtListPdf } from "./pdf-generator.js";

const mockRenderedData = {
  header: {
    locationName: "North Shields Magistrates' Court",
    contentDate: "13 January 2025",
    publishedDate: "13 January 2025",
    publishedTime: "9am",
    venueAddress: []
  },
  openJustice: null,
  listData: { sessions: [] }
};

const mockJsonData = {
  document: {
    info: { start_time: "09:00:00" },
    data: {
      job: {
        printdate: "13/01/2025",
        sessions: { session: [] }
      }
    }
  }
};

const baseOptions = {
  artefactId: "test-artefact-id",
  jsonData: mockJsonData,
  locale: "en",
  locationId: "123",
  provenance: "MANUAL_UPLOAD",
  contentDate: new Date("2025-01-13")
};

describe("generateMagistratesAdultCourtListPdf", () => {
  const mockNunjucksEnv = {
    render: vi.fn().mockReturnValue("<html>PDF HTML</html>")
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (renderMagistratesAdultCourtList as ReturnType<typeof vi.fn>).mockResolvedValue(mockRenderedData);
    mockLoadTranslations.mockResolvedValue({ title: "Magistrates Adult Court List" });
    mockConfigureNunjucks.mockReturnValue(mockNunjucksEnv);
    (generatePdfFromHtml as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("pdf"),
      sizeBytes: 3
    });
    mockSavePdfToStorage.mockResolvedValue({ success: true });
  });

  it("should generate and save a PDF successfully", async () => {
    const result = await generateMagistratesAdultCourtListPdf(baseOptions);

    expect(result.success).toBe(true);
    expect(renderMagistratesAdultCourtList).toHaveBeenCalledWith(mockJsonData, {
      locale: "en",
      locationId: "123",
      contentDate: baseOptions.contentDate
    });
    expect(mockSavePdfToStorage).toHaveBeenCalledWith("test-artefact-id", expect.any(Buffer), 3);
  });

  it("should pass the MANUAL_UPLOAD provenance label to the template", async () => {
    await generateMagistratesAdultCourtListPdf(baseOptions);

    expect(mockNunjucksEnv.render).toHaveBeenCalledWith("pdf-template.njk", expect.objectContaining({ dataSource: "Manual Upload" }));
  });

  it("should use the raw provenance string for unknown provenance", async () => {
    await generateMagistratesAdultCourtListPdf({ ...baseOptions, provenance: "UNKNOWN" });

    expect(mockNunjucksEnv.render).toHaveBeenCalledWith("pdf-template.njk", expect.objectContaining({ dataSource: "UNKNOWN" }));
  });

  it("should use empty string when provenance is undefined", async () => {
    await generateMagistratesAdultCourtListPdf({ ...baseOptions, provenance: undefined });

    expect(mockNunjucksEnv.render).toHaveBeenCalledWith("pdf-template.njk", expect.objectContaining({ dataSource: "" }));
  });

  it("should pass rendered header and listData to the template", async () => {
    await generateMagistratesAdultCourtListPdf(baseOptions);

    expect(mockNunjucksEnv.render).toHaveBeenCalledWith(
      "pdf-template.njk",
      expect.objectContaining({
        header: mockRenderedData.header,
        listData: mockRenderedData.listData,
        pdfStyles: "/* base styles */"
      })
    );
  });

  it("should return an error result when PDF generation fails", async () => {
    (generatePdfFromHtml as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: "Chromium crashed"
    });
    mockCreatePdfErrorResult.mockReturnValue({ success: false, error: "Chromium crashed" });

    const result = await generateMagistratesAdultCourtListPdf(baseOptions);

    expect(result.success).toBe(false);
  });

  it("should call createPdfErrorResult when an exception is thrown", async () => {
    (renderMagistratesAdultCourtList as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Render failed"));
    mockCreatePdfErrorResult.mockReturnValue({ success: false, error: "Render failed" });

    const result = await generateMagistratesAdultCourtListPdf(baseOptions);

    expect(mockCreatePdfErrorResult).toHaveBeenCalled();
    expect(result.success).toBe(false);
  });

  it("should load Welsh translations for cy locale", async () => {
    await generateMagistratesAdultCourtListPdf({ ...baseOptions, locale: "cy" });

    expect(mockLoadTranslations).toHaveBeenCalledWith("cy", expect.any(Function), expect.any(Function));
  });
});
