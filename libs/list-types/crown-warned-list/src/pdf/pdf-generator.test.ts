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
  renderCrownWarnedListData: vi.fn()
}));

vi.mock("@hmcts/publication", () => ({
  PROVENANCE_LABELS: {
    MANUAL_UPLOAD: "Manual Upload",
    SNL: "SNL"
  }
}));

import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { renderCrownWarnedListData } from "../rendering/renderer.js";
import { generateCrownWarnedListPdf } from "./pdf-generator.js";

const mockRenderedData = {
  header: {
    locationName: "Crown Court at Birmingham",
    addressLines: ["Newton Street", "B4 7NA"],
    dateRange: "10 November 2025 to 11 November 2025",
    lastUpdated: "12 November 2025",
    weekCommencing: "10 November 2025",
    version: "1.0"
  },
  openJustice: {
    venueName: "Crown Court at Birmingham",
    email: "",
    phone: "0121 681 3400"
  },
  groupedCategories: []
};

const mockJsonData = {
  WarnedList: {
    DocumentID: { UniqueID: "CWL-2025-001", DocumentType: "crown_warned_pdda_list" },
    ListHeader: { StartDate: "2025-11-10", EndDate: "2025-11-11", PublishedTime: "2025-11-12T09:00:00", Version: "1.0" },
    CrownCourt: { CourtHouseName: "Crown Court at Birmingham" },
    CourtLists: []
  }
};

describe("generateCrownWarnedListPdf", () => {
  const mockNunjucksEnv = {
    render: vi.fn().mockReturnValue("<html>PDF HTML</html>")
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(renderCrownWarnedListData).mockResolvedValue(mockRenderedData);
    mockConfigureNunjucks.mockReturnValue(mockNunjucksEnv);
    mockLoadTranslations.mockResolvedValue({ pageTitle: "Crown Warned List" });
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
      pdfPath: "/storage/temp/uploads/warned-artefact-123.pdf",
      sizeBytes: 1024,
      exceedsMaxSize: false
    });

    const result = await generateCrownWarnedListPdf({
      artefactId: "warned-artefact-123",
      contentDate: new Date("2025-11-10"),
      locale: "en",
      locationId: "102",
      jsonData: mockJsonData as any
    });

    expect(result.success).toBe(true);
    expect(result.pdfPath).toContain("warned-artefact-123.pdf");
    expect(mockSavePdfToStorage).toHaveBeenCalledWith("warned-artefact-123", pdfBuffer, 1024);
  });

  it("should pass groupedCategories to template", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    await generateCrownWarnedListPdf({
      artefactId: "test",
      contentDate: new Date("2025-11-10"),
      locale: "en",
      locationId: "102",
      jsonData: mockJsonData as any
    });

    expect(mockNunjucksEnv.render).toHaveBeenCalledWith("pdf-template.njk", expect.objectContaining({ groupedCategories: [] }));
  });

  it("should return error when PDF generation fails", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: false,
      error: "Puppeteer crashed"
    });

    const result = await generateCrownWarnedListPdf({
      artefactId: "failed-pdf",
      contentDate: new Date("2025-11-10"),
      locale: "en",
      locationId: "102",
      jsonData: mockJsonData as any
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Puppeteer crashed");
  });

  it("should return default error when PDF generation fails without error message", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: false });

    const result = await generateCrownWarnedListPdf({
      artefactId: "failed-pdf",
      contentDate: new Date("2025-11-10"),
      locale: "en",
      locationId: "102",
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

    const result = await generateCrownWarnedListPdf({
      artefactId: "no-buffer",
      contentDate: new Date("2025-11-10"),
      locale: "en",
      locationId: "102",
      jsonData: mockJsonData as any
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed");
  });

  it("should handle renderer errors gracefully", async () => {
    vi.mocked(renderCrownWarnedListData).mockRejectedValue(new Error("Renderer failed"));

    const result = await generateCrownWarnedListPdf({
      artefactId: "renderer-error",
      contentDate: new Date("2025-11-10"),
      locale: "en",
      locationId: "102",
      jsonData: mockJsonData as any
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to generate PDF: Renderer failed");
  });

  it("should handle non-Error exceptions", async () => {
    vi.mocked(renderCrownWarnedListData).mockRejectedValue("String error");

    const result = await generateCrownWarnedListPdf({
      artefactId: "string-error",
      contentDate: new Date("2025-11-10"),
      locale: "en",
      locationId: "102",
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

    const result = await generateCrownWarnedListPdf({
      artefactId: "fs-error",
      contentDate: new Date("2025-11-10"),
      locale: "en",
      locationId: "102",
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

    const contentDate = new Date("2025-11-10");

    await generateCrownWarnedListPdf({
      artefactId: "test-options",
      contentDate,
      locale: "cy",
      locationId: "999",
      jsonData: mockJsonData as any
    });

    expect(renderCrownWarnedListData).toHaveBeenCalledWith(mockJsonData, {
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

    await generateCrownWarnedListPdf({
      artefactId: "provenance-test",
      contentDate: new Date("2025-11-10"),
      locale: "en",
      locationId: "102",
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

    await generateCrownWarnedListPdf({
      artefactId: "unknown-provenance",
      contentDate: new Date("2025-11-10"),
      locale: "en",
      locationId: "102",
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

    const result = await generateCrownWarnedListPdf({
      artefactId: "no-provenance",
      contentDate: new Date("2025-11-10"),
      locale: "en",
      locationId: "102",
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

    const result = await generateCrownWarnedListPdf({
      artefactId: "welsh-pdf",
      contentDate: new Date("2025-11-10"),
      locale: "cy",
      locationId: "102",
      jsonData: mockJsonData as any
    });

    expect(result.success).toBe(true);
    expect(renderCrownWarnedListData).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ locale: "cy" }));
  });
});
