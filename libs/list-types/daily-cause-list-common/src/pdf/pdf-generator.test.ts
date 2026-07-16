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
  PDF_BASE_STYLES: "/* base styles */",
  PDF_CIVIL_FAMILY_STYLES: "/* civil family styles */"
}));

vi.mock("@hmcts/pdf-generation", () => ({
  generatePdfFromHtml: vi.fn()
}));

vi.mock("../rendering/renderer.js", () => ({
  renderCauseListData: vi.fn()
}));

import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { renderCauseListData } from "../rendering/renderer.js";
import { generateDailyCauseListPdf } from "./pdf-generator.js";

const mockRenderedData = {
  header: {
    locationName: "Oxford Combined Court Centre",
    addressLines: ["St Aldate's", "Oxford", "OX1 1TL"],
    contentDate: "01 January 2025",
    lastUpdated: "12 November 2025 at 9am"
  },
  openJustice: { venueName: "Oxford Combined Court Centre", email: "", phone: "" },
  listData: { courtLists: [] }
};

const mockCauseListData = {
  document: { publicationDate: "2025-11-12T09:00:00.000Z" },
  venue: {
    venueName: "Oxford Combined Court Centre",
    venueAddress: { line: ["St Aldate's"], town: "Oxford", postCode: "OX1 1TL" }
  },
  courtLists: []
};

const mockImportEn = () => Promise.resolve({ en: { title: "Civil Daily Cause List" } });
const mockImportCy = () => Promise.resolve({ cy: { title: "Rhestr Achosion Sifil Dyddiol" } });

describe("generateDailyCauseListPdf", () => {
  const mockNunjucksEnv = {
    render: vi.fn().mockReturnValue("<html>PDF HTML</html>")
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(renderCauseListData).mockResolvedValue(mockRenderedData);
    mockConfigureNunjucks.mockReturnValue(mockNunjucksEnv);
    mockLoadTranslations.mockResolvedValue({ title: "Civil Daily Cause List" });
    mockSavePdfToStorage.mockResolvedValue({
      success: true,
      pdfPath: "/storage/temp/uploads/test.pdf",
      sizeBytes: 1024,
      exceedsMaxSize: false
    });
    mockCreatePdfErrorResult.mockImplementation((error: unknown) => ({
      success: false,
      error: `Failed to generate PDF: ${error instanceof Error ? error.message : "Unknown error"}`
    }));
  });

  it("should generate PDF successfully", async () => {
    const pdfBuffer = Buffer.from("PDF content");
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer, sizeBytes: 1024 });
    mockSavePdfToStorage.mockResolvedValue({
      success: true,
      pdfPath: "/storage/temp/uploads/test-123.pdf",
      sizeBytes: 1024,
      exceedsMaxSize: false
    });

    const result = await generateDailyCauseListPdf(
      {
        artefactId: "test-123",
        contentDate: new Date("2025-01-01"),
        locale: "en",
        locationId: "240",
        jsonData: mockCauseListData,
        provenanceLabel: "Manual Upload"
      },
      "/tmp/templates",
      mockImportEn,
      mockImportCy
    );

    expect(result.success).toBe(true);
    expect(result.sizeBytes).toBe(1024);
    expect(mockSavePdfToStorage).toHaveBeenCalledWith("test-123", pdfBuffer, 1024);
  });

  it("should return error when PDF generation fails", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: false, error: "Puppeteer crashed" });

    const result = await generateDailyCauseListPdf(
      { artefactId: "failed-pdf", contentDate: new Date("2025-01-01"), locale: "en", locationId: "240", jsonData: mockCauseListData, provenanceLabel: "" },
      "/tmp/templates",
      mockImportEn,
      mockImportCy
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Puppeteer crashed");
  });

  it("should return error when PDF buffer is missing", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: undefined, sizeBytes: 0 });

    const result = await generateDailyCauseListPdf(
      { artefactId: "no-buffer", contentDate: new Date("2025-01-01"), locale: "en", locationId: "240", jsonData: mockCauseListData, provenanceLabel: "" },
      "/tmp/templates",
      mockImportEn,
      mockImportCy
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed");
  });

  it("should handle renderer errors gracefully", async () => {
    vi.mocked(renderCauseListData).mockRejectedValue(new Error("Renderer failed"));

    const result = await generateDailyCauseListPdf(
      { artefactId: "renderer-error", contentDate: new Date("2025-01-01"), locale: "en", locationId: "240", jsonData: mockCauseListData, provenanceLabel: "" },
      "/tmp/templates",
      mockImportEn,
      mockImportCy
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to generate PDF: Renderer failed");
  });

  it("should use provided provenance label in rendered HTML", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: Buffer.from("PDF"), sizeBytes: 100 });

    await generateDailyCauseListPdf(
      {
        artefactId: "provenance-test",
        contentDate: new Date("2025-01-01"),
        locale: "en",
        locationId: "240",
        jsonData: mockCauseListData,
        provenanceLabel: "Manual Upload"
      },
      "/tmp/templates",
      mockImportEn,
      mockImportCy
    );

    expect(mockNunjucksEnv.render).toHaveBeenCalledWith("pdf-template.njk", expect.objectContaining({ dataSource: "Manual Upload" }));
  });

  it("should use empty provenance label when not provided", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: Buffer.from("PDF"), sizeBytes: 100 });

    await generateDailyCauseListPdf(
      { artefactId: "no-provenance", contentDate: new Date("2025-01-01"), locale: "en", locationId: "240", jsonData: mockCauseListData, provenanceLabel: "" },
      "/tmp/templates",
      mockImportEn,
      mockImportCy
    );

    expect(mockNunjucksEnv.render).toHaveBeenCalledWith("pdf-template.njk", expect.objectContaining({ dataSource: "" }));
  });

  it("should pass correct render options for Welsh locale", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: Buffer.from("PDF"), sizeBytes: 100 });

    const contentDate = new Date("2025-06-15");
    await generateDailyCauseListPdf(
      { artefactId: "welsh-pdf", contentDate, locale: "cy", locationId: "999", jsonData: mockCauseListData, provenanceLabel: "" },
      "/tmp/templates",
      mockImportEn,
      mockImportCy
    );

    expect(renderCauseListData).toHaveBeenCalledWith(mockCauseListData, { contentDate, locale: "cy", locationId: "999" });
  });
});
