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
  renderMagistratesListData: vi.fn()
}));

vi.mock("@hmcts/publication", () => ({
  PROVENANCE_LABELS: {
    MANUAL_UPLOAD: "Manual Upload",
    SNL: "SNL"
  }
}));

import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { renderMagistratesListData } from "../rendering/renderer.js";
import { generateMagistratesPublicListPdf } from "./pdf-generator.js";

const mockRenderedData = {
  header: {
    locationName: "Birmingham Magistrates Court",
    addressLines: ["Victoria Law Courts", "Birmingham", "B4 6QA"],
    contentDate: "01 January 2025",
    lastUpdated: "12 November 2025 at 9am"
  },
  openJustice: {
    venueName: "Birmingham Magistrates Court",
    email: "enquiries.birmingham.mc@justice.gov.uk",
    phone: "0121 681 3300"
  },
  listData: { courtLists: [] }
};

const mockMagistratesData = {
  document: { publicationDate: "2025-11-12T09:00:00.000Z" },
  venue: {
    venueName: "Birmingham Magistrates Court",
    venueAddress: { line: ["Victoria Law Courts"], town: "Birmingham", postCode: "B4 6QA" }
  },
  courtLists: []
};

describe("generateMagistratesPublicListPdf", () => {
  const mockNunjucksEnv = {
    render: vi.fn().mockReturnValue("<html>PDF HTML</html>")
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(renderMagistratesListData).mockResolvedValue(mockRenderedData);
    mockConfigureNunjucks.mockReturnValue(mockNunjucksEnv);
    mockLoadTranslations.mockResolvedValue({ title: "Magistrates Public List" });
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
    // Arrange
    const pdfBuffer = Buffer.from("PDF content");
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer, sizeBytes: 1024 });
    mockSavePdfToStorage.mockResolvedValue({
      success: true,
      pdfPath: "/storage/temp/uploads/test-123.pdf",
      sizeBytes: 1024,
      exceedsMaxSize: false
    });

    // Act
    const result = await generateMagistratesPublicListPdf({
      artefactId: "test-123",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "100",
      jsonData: mockMagistratesData as any
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.pdfPath).toContain("test-123.pdf");
    expect(result.sizeBytes).toBe(1024);
    expect(mockSavePdfToStorage).toHaveBeenCalledWith("test-123", pdfBuffer, 1024);
  });

  it("should generate PDF for Welsh locale", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: Buffer.from("PDF"), sizeBytes: 100 });

    // Act
    const result = await generateMagistratesPublicListPdf({
      artefactId: "welsh-pdf",
      contentDate: new Date("2025-01-01"),
      locale: "cy",
      locationId: "100",
      jsonData: mockMagistratesData as any
    });

    // Assert
    expect(result.success).toBe(true);
    expect(renderMagistratesListData).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ locale: "cy" }));
  });

  it("should return error when PDF generation fails", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: false, error: "Puppeteer crashed" });

    // Act
    const result = await generateMagistratesPublicListPdf({
      artefactId: "failed-pdf",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "100",
      jsonData: mockMagistratesData as any
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("Puppeteer crashed");
  });

  it("should return error when PDF buffer is missing", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: undefined, sizeBytes: 0 });

    // Act
    const result = await generateMagistratesPublicListPdf({
      artefactId: "no-buffer",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "100",
      jsonData: mockMagistratesData as any
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed");
  });

  it("should handle renderer errors gracefully", async () => {
    // Arrange
    vi.mocked(renderMagistratesListData).mockRejectedValue(new Error("Renderer failed"));

    // Act
    const result = await generateMagistratesPublicListPdf({
      artefactId: "renderer-error",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "100",
      jsonData: mockMagistratesData as any
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to generate PDF: Renderer failed");
  });

  it("should handle non-Error exceptions", async () => {
    // Arrange
    vi.mocked(renderMagistratesListData).mockRejectedValue("String error");

    // Act
    const result = await generateMagistratesPublicListPdf({
      artefactId: "string-error",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "100",
      jsonData: mockMagistratesData as any
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to generate PDF: Unknown error");
  });

  it("should handle file system errors", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: Buffer.from("PDF"), sizeBytes: 100 });
    mockSavePdfToStorage.mockRejectedValue(new Error("Disk full"));

    // Act
    const result = await generateMagistratesPublicListPdf({
      artefactId: "fs-error",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "100",
      jsonData: mockMagistratesData as any
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to generate PDF: Disk full");
  });

  it("should use MANUAL_UPLOAD provenance label", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: Buffer.from("PDF"), sizeBytes: 100 });

    // Act
    await generateMagistratesPublicListPdf({
      artefactId: "provenance-test",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "100",
      jsonData: mockMagistratesData as any,
      provenance: "MANUAL_UPLOAD"
    });

    // Assert
    expect(mockNunjucksEnv.render).toHaveBeenCalledWith("pdf-template.njk", expect.objectContaining({ dataSource: "Manual Upload" }));
  });

  it("should use raw provenance value when label not found", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: Buffer.from("PDF"), sizeBytes: 100 });

    // Act
    await generateMagistratesPublicListPdf({
      artefactId: "unknown-provenance",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "100",
      jsonData: mockMagistratesData as any,
      provenance: "UNKNOWN_SOURCE"
    });

    // Assert
    expect(mockNunjucksEnv.render).toHaveBeenCalledWith("pdf-template.njk", expect.objectContaining({ dataSource: "UNKNOWN_SOURCE" }));
  });

  it("should handle missing provenance", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: Buffer.from("PDF"), sizeBytes: 100 });

    // Act
    const result = await generateMagistratesPublicListPdf({
      artefactId: "no-provenance",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "100",
      jsonData: mockMagistratesData as any
    });

    // Assert
    expect(result.success).toBe(true);
  });

  it("should pass correct render options to renderer", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: Buffer.from("PDF"), sizeBytes: 100 });
    const contentDate = new Date("2025-06-15");

    // Act
    await generateMagistratesPublicListPdf({
      artefactId: "render-options-test",
      contentDate,
      locale: "cy",
      locationId: "999",
      jsonData: mockMagistratesData as any
    });

    // Assert
    expect(renderMagistratesListData).toHaveBeenCalledWith(mockMagistratesData, {
      contentDate,
      locale: "cy",
      locationId: "999"
    });
  });

  it("should call savePdfToStorage with correct parameters", async () => {
    // Arrange
    const pdfBuffer = Buffer.from("PDF");
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer, sizeBytes: 100 });

    // Act
    await generateMagistratesPublicListPdf({
      artefactId: "storage-test",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "100",
      jsonData: mockMagistratesData as any
    });

    // Assert
    expect(mockSavePdfToStorage).toHaveBeenCalledWith("storage-test", pdfBuffer, 100);
  });
});
