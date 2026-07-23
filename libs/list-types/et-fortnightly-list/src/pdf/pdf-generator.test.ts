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

vi.mock("@hmcts/publication", () => ({
  PROVENANCE_LABELS: {
    MANUAL_UPLOAD: "Manual Upload",
    SNL: "SNL"
  }
}));

vi.mock("../rendering/renderer.js", () => ({
  renderEtFortnightlyList: vi.fn()
}));

import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { renderEtFortnightlyList } from "../rendering/renderer.js";
import { generateEtFortnightlyPressListPdf } from "./pdf-generator.js";

const mockRenderedData = {
  header: {
    regionName: "Midlands",
    addressLines: ["The Court House", "Leeds", "LS1 2ES"],
    contentDate: "01 January 2025",
    lastUpdated: "12 November 2025 at 9am"
  },
  openJustice: { venueName: "Leeds Employment Tribunal", email: "leedset@justice.gov.uk", phone: "0113 245 9741" },
  courts: []
};

const mockCauseListData = {
  document: { publicationDate: "2025-11-12T09:00:00.000Z" },
  venue: {
    venueName: "Leeds Employment Tribunal",
    venueContact: { venueTelephone: "0113 245 9741", venueEmail: "leedset@justice.gov.uk" }
  },
  courtLists: []
} as any;

describe("generateEtFortnightlyPressListPdf", () => {
  const mockNunjucksEnv = {
    render: vi.fn().mockReturnValue("<html>PDF HTML</html>")
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(renderEtFortnightlyList).mockResolvedValue(mockRenderedData as any);
    mockConfigureNunjucks.mockReturnValue(mockNunjucksEnv);
    mockLoadTranslations.mockResolvedValue({ title: "Employment Tribunals Fortnightly List" });
    mockSavePdfToStorage.mockResolvedValue({
      success: true,
      pdfPath: "et-fortnightly-123.pdf",
      sizeBytes: 1024,
      exceedsMaxSize: false
    });
    mockCreatePdfErrorResult.mockImplementation((error: unknown) => ({
      success: false,
      error: `Failed to generate PDF: ${error instanceof Error ? error.message : "Unknown error"}`
    }));
  });

  it("should render the fortnightly template with the region name and courts, and save the PDF", async () => {
    // Arrange
    const pdfBuffer = Buffer.from("PDF content");
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer, sizeBytes: 1024 });

    // Act
    const result = await generateEtFortnightlyPressListPdf({
      artefactId: "et-fortnightly-123",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockCauseListData
    });

    // Assert
    expect(result.success).toBe(true);
    expect(mockNunjucksEnv.render).toHaveBeenCalledWith(
      "pdf-template.njk",
      expect.objectContaining({ header: expect.objectContaining({ regionName: "Midlands" }), courts: [] })
    );
    expect(mockSavePdfToStorage).toHaveBeenCalledWith("et-fortnightly-123", pdfBuffer, 1024);
  });

  it("should map the provenance to its display label", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: Buffer.from("PDF"), sizeBytes: 100 });

    // Act
    await generateEtFortnightlyPressListPdf({
      artefactId: "provenance-test",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockCauseListData,
      provenance: "MANUAL_UPLOAD"
    });

    // Assert
    expect(mockNunjucksEnv.render).toHaveBeenCalledWith("pdf-template.njk", expect.objectContaining({ dataSource: "Manual Upload" }));
  });

  it("should pass an empty provenance label when provenance is absent", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: Buffer.from("PDF"), sizeBytes: 100 });

    // Act
    await generateEtFortnightlyPressListPdf({
      artefactId: "no-provenance",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockCauseListData
    });

    // Assert
    expect(mockNunjucksEnv.render).toHaveBeenCalledWith("pdf-template.njk", expect.objectContaining({ dataSource: "" }));
  });

  it("should forward the render options including locale and locationId", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: Buffer.from("PDF"), sizeBytes: 100 });
    const contentDate = new Date("2025-06-15");

    // Act
    await generateEtFortnightlyPressListPdf({
      artefactId: "render-options",
      contentDate,
      locale: "cy",
      locationId: "999",
      jsonData: mockCauseListData
    });

    // Assert
    expect(renderEtFortnightlyList).toHaveBeenCalledWith(mockCauseListData, { contentDate, locale: "cy", locationId: "999" });
  });

  it("should propagate a failure result from the PDF generator", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: false, error: "Puppeteer crashed" });

    // Act
    const result = await generateEtFortnightlyPressListPdf({
      artefactId: "failed-pdf",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockCauseListData
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("Puppeteer crashed");
  });

  it("should handle renderer errors gracefully", async () => {
    // Arrange
    vi.mocked(renderEtFortnightlyList).mockRejectedValue(new Error("Renderer failed"));

    // Act
    const result = await generateEtFortnightlyPressListPdf({
      artefactId: "renderer-error",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockCauseListData
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to generate PDF: Renderer failed");
  });
});
