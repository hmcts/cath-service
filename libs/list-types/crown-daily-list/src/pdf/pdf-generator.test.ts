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
  renderCrownDailyListData: vi.fn()
}));

vi.mock("@hmcts/publication", () => ({
  PROVENANCE_LABELS: {
    MANUAL_UPLOAD: "Manual Upload",
    SNL: "SNL"
  }
}));

import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { renderCrownDailyListData } from "../rendering/renderer.js";
import { generateCrownDailyListPdf } from "./pdf-generator.js";

const mockRenderedData = {
  header: {
    locationName: "Crown Court at Manchester",
    addressLines: ["Crown Square", "M3 3FL"],
    contentDate: "12 November 2025",
    lastUpdated: "12 November 2025 at 9am",
    version: "1.0"
  },
  openJustice: {
    venueName: "Crown Court at Manchester",
    email: "",
    phone: "0161 954 1800"
  },
  listData: null,
  groupedListData: []
};

const mockJsonData = {
  DailyList: {
    DocumentID: { UniqueID: "CDL-2025-001", DocumentType: "crown_daily_pdda_list" },
    ListHeader: { StartDate: "2025-11-12", PublishedTime: "2025-11-12T09:00:00", Version: "1.0" },
    CrownCourt: { CourtHouseName: "Crown Court at Manchester" },
    CourtLists: []
  }
};

describe("generateCrownDailyListPdf", () => {
  const mockNunjucksEnv = {
    render: vi.fn().mockReturnValue("<html>PDF HTML</html>")
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(renderCrownDailyListData).mockResolvedValue(mockRenderedData);
    mockConfigureNunjucks.mockReturnValue(mockNunjucksEnv);
    mockLoadTranslations.mockResolvedValue({ pageTitle: "Crown Daily List" });
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
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer,
      sizeBytes: 1024
    });
    mockSavePdfToStorage.mockResolvedValue({
      success: true,
      pdfPath: "/storage/temp/uploads/test-artefact-123.pdf",
      sizeBytes: 1024,
      exceedsMaxSize: false
    });

    const result = await generateCrownDailyListPdf({
      artefactId: "test-artefact-123",
      contentDate: new Date("2025-11-12"),
      locale: "en",
      locationId: "101",
      jsonData: mockJsonData as any
    });

    expect(result.success).toBe(true);
    expect(result.pdfPath).toContain("test-artefact-123.pdf");
    expect(mockSavePdfToStorage).toHaveBeenCalledWith("test-artefact-123", pdfBuffer, 1024);
  });

  it("should return error when PDF generation fails", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: false,
      error: "Puppeteer crashed"
    });

    const result = await generateCrownDailyListPdf({
      artefactId: "failed-pdf",
      contentDate: new Date("2025-11-12"),
      locale: "en",
      locationId: "101",
      jsonData: mockJsonData as any
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Puppeteer crashed");
  });

  it("should return default error when PDF generation fails without error message", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: false
    });

    const result = await generateCrownDailyListPdf({
      artefactId: "failed-pdf",
      contentDate: new Date("2025-11-12"),
      locale: "en",
      locationId: "101",
      jsonData: mockJsonData as any
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed");
  });

  it("should return error when PDF buffer is missing", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: undefined,
      sizeBytes: 0
    });

    const result = await generateCrownDailyListPdf({
      artefactId: "no-buffer",
      contentDate: new Date("2025-11-12"),
      locale: "en",
      locationId: "101",
      jsonData: mockJsonData as any
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed");
  });

  it("should handle renderer errors gracefully", async () => {
    vi.mocked(renderCrownDailyListData).mockRejectedValue(new Error("Renderer failed"));

    const result = await generateCrownDailyListPdf({
      artefactId: "renderer-error",
      contentDate: new Date("2025-11-12"),
      locale: "en",
      locationId: "101",
      jsonData: mockJsonData as any
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to generate PDF: Renderer failed");
  });

  it("should handle non-Error exceptions", async () => {
    vi.mocked(renderCrownDailyListData).mockRejectedValue("String error");

    const result = await generateCrownDailyListPdf({
      artefactId: "string-error",
      contentDate: new Date("2025-11-12"),
      locale: "en",
      locationId: "101",
      jsonData: mockJsonData as any
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to generate PDF: Unknown error");
  });

  it("should handle file system errors", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });
    mockSavePdfToStorage.mockRejectedValue(new Error("Disk full"));

    const result = await generateCrownDailyListPdf({
      artefactId: "fs-error",
      contentDate: new Date("2025-11-12"),
      locale: "en",
      locationId: "101",
      jsonData: mockJsonData as any
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to generate PDF: Disk full");
  });

  it("should pass correct options to renderer", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    const contentDate = new Date("2025-11-12");

    await generateCrownDailyListPdf({
      artefactId: "test-options",
      contentDate,
      locale: "cy",
      locationId: "999",
      jsonData: mockJsonData as any
    });

    expect(renderCrownDailyListData).toHaveBeenCalledWith(mockJsonData, {
      contentDate,
      locale: "cy",
      locationId: "999"
    });
  });

  it("should use MANUAL_UPLOAD provenance label", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    await generateCrownDailyListPdf({
      artefactId: "provenance-test",
      contentDate: new Date("2025-11-12"),
      locale: "en",
      locationId: "101",
      jsonData: mockJsonData as any,
      provenance: "MANUAL_UPLOAD"
    });

    expect(mockNunjucksEnv.render).toHaveBeenCalledWith("pdf-template.njk", expect.objectContaining({ dataSource: "Manual Upload" }));
  });

  it("should use raw provenance value when label not found", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    await generateCrownDailyListPdf({
      artefactId: "unknown-provenance",
      contentDate: new Date("2025-11-12"),
      locale: "en",
      locationId: "101",
      jsonData: mockJsonData as any,
      provenance: "UNKNOWN_SOURCE"
    });

    expect(mockNunjucksEnv.render).toHaveBeenCalledWith("pdf-template.njk", expect.objectContaining({ dataSource: "UNKNOWN_SOURCE" }));
  });

  it("should handle missing provenance", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    const result = await generateCrownDailyListPdf({
      artefactId: "no-provenance",
      contentDate: new Date("2025-11-12"),
      locale: "en",
      locationId: "101",
      jsonData: mockJsonData as any
    });

    expect(result.success).toBe(true);
    expect(mockNunjucksEnv.render).toHaveBeenCalledWith("pdf-template.njk", expect.objectContaining({ dataSource: "" }));
  });

  it("should generate PDF for Welsh locale", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    const result = await generateCrownDailyListPdf({
      artefactId: "welsh-pdf",
      contentDate: new Date("2025-11-12"),
      locale: "cy",
      locationId: "101",
      jsonData: mockJsonData as any
    });

    expect(result.success).toBe(true);
    expect(renderCrownDailyListData).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ locale: "cy" }));
  });

  it("should return exceedsMaxSize true when PDF is over 2MB", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.alloc(3 * 1024 * 1024),
      sizeBytes: 3 * 1024 * 1024
    });
    mockSavePdfToStorage.mockResolvedValue({
      success: true,
      pdfPath: "/storage/temp/uploads/large.pdf",
      sizeBytes: 3 * 1024 * 1024,
      exceedsMaxSize: true
    });

    const result = await generateCrownDailyListPdf({
      artefactId: "large-pdf",
      contentDate: new Date("2025-11-12"),
      locale: "en",
      locationId: "101",
      jsonData: mockJsonData as any
    });

    expect(result.success).toBe(true);
    expect(result.exceedsMaxSize).toBe(true);
  });
});
