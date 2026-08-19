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

vi.mock("@hmcts/publication", () => ({
  PROVENANCE_LABELS: {
    CFT_IDAM: "Court and tribunal hearings service"
  }
}));

vi.mock("../rendering/renderer.js", () => ({
  renderIacDailyList: vi.fn()
}));

import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { renderIacDailyList } from "../rendering/renderer.js";
import { generateIacDailyListPdf } from "./pdf-generator.js";

const mockRenderedData = {
  header: {
    listTitle: "Immigration and Asylum Chamber Daily List",
    venueName: "Manchester",
    contentDate: "15 January 2026",
    lastUpdatedDate: "14 January 2026",
    lastUpdatedTime: "12pm"
  },
  hearings: { courtLists: [] }
};

const mockJsonData = {
  document: { publicationDate: "2026-01-14T12:00:00Z" },
  venue: { venueName: "Manchester" },
  courtLists: []
};

describe("generateIacDailyListPdf", () => {
  const mockNunjucksEnv = {
    render: vi.fn().mockReturnValue("<html>PDF HTML</html>")
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(renderIacDailyList).mockReturnValue(mockRenderedData as never);
    mockConfigureNunjucks.mockReturnValue(mockNunjucksEnv);
    mockLoadTranslations.mockResolvedValue({ common: { heading: "Daily List" } });
    mockCreatePdfErrorResult.mockImplementation((error: unknown) => ({
      success: false,
      error: `Failed to generate PDF: ${error instanceof Error ? error.message : "Unknown error"}`
    }));
  });

  it("should generate the PDF successfully", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: Buffer.from("PDF"), sizeBytes: 1024 });
    mockSavePdfToStorage.mockResolvedValue({ success: true, pdfPath: "test-artefact-123.pdf", sizeBytes: 1024, exceedsMaxSize: false });

    const result = await generateIacDailyListPdf({
      artefactId: "test-artefact-123",
      contentDate: new Date("2026-01-15"),
      locale: "en",
      locationId: "240",
      jsonData: mockJsonData,
      listTypeName: "IAC_DAILY_LIST"
    });

    expect(result.success).toBe(true);
    expect(result.pdfPath).toBe("test-artefact-123.pdf");
  });

  it("should use the additional cases title when the list type name is additional cases", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: Buffer.from("PDF"), sizeBytes: 100 });
    mockSavePdfToStorage.mockResolvedValue({ success: true, pdfPath: "x.pdf", sizeBytes: 100, exceedsMaxSize: false });

    await generateIacDailyListPdf({
      artefactId: "x",
      contentDate: new Date("2026-01-15"),
      locale: "en",
      locationId: "240",
      jsonData: mockJsonData,
      listTypeName: "IAC_DAILY_LIST_ADDITIONAL_CASES"
    });

    expect(renderIacDailyList).toHaveBeenCalledWith(
      mockJsonData,
      expect.objectContaining({
        listTypeName: "IAC_DAILY_LIST_ADDITIONAL_CASES",
        listTitle: "Immigration and Asylum Chamber Daily List - Additional Cases"
      })
    );
  });

  it("should resolve the provenance label for the data source", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: Buffer.from("PDF"), sizeBytes: 100 });
    mockSavePdfToStorage.mockResolvedValue({ success: true, pdfPath: "x.pdf", sizeBytes: 100, exceedsMaxSize: false });

    await generateIacDailyListPdf({
      artefactId: "x",
      contentDate: new Date("2026-01-15"),
      locale: "en",
      locationId: "240",
      jsonData: mockJsonData,
      listTypeName: "IAC_DAILY_LIST",
      provenance: "CFT_IDAM"
    });

    expect(mockNunjucksEnv.render).toHaveBeenCalledWith("pdf-template.njk", expect.objectContaining({ dataSource: "Court and tribunal hearings service" }));
  });

  it("should return an error when PDF generation fails", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: false, error: "Puppeteer crashed" });

    const result = await generateIacDailyListPdf({
      artefactId: "failed",
      contentDate: new Date("2026-01-15"),
      locale: "en",
      locationId: "240",
      jsonData: mockJsonData,
      listTypeName: "IAC_DAILY_LIST"
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Puppeteer crashed");
  });

  it("should handle renderer errors gracefully", async () => {
    vi.mocked(renderIacDailyList).mockImplementation(() => {
      throw new Error("Renderer failed");
    });

    const result = await generateIacDailyListPdf({
      artefactId: "renderer-error",
      contentDate: new Date("2026-01-15"),
      locale: "en",
      locationId: "240",
      jsonData: mockJsonData,
      listTypeName: "IAC_DAILY_LIST"
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to generate PDF: Renderer failed");
  });
});
