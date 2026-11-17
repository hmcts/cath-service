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
  provenanceLabelsEn: {
    MANUAL_UPLOAD: "Manual Upload",
    SNL: "SNL"
  },
  provenanceLabelsCy: {
    MANUAL_UPLOAD: "Lanlwytho â llaw",
    SNL: "SNL"
  }
}));

vi.mock("@hmcts/pdf-generation", () => ({
  generatePdfFromHtml: vi.fn()
}));

vi.mock("../rendering/renderer.js", () => ({
  renderUtiacStatutoryAppealDailyHearingListData: vi.fn()
}));

import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { renderUtiacStatutoryAppealDailyHearingListData } from "../rendering/renderer.js";
import { generateUtiacStatutoryAppealDailyHearingListPdf } from "./pdf-generator.js";

const mockRenderedData = {
  header: {
    listTitle: "Upper Tribunal (Immigration and Asylum) Chamber Statutory Appeal Daily Hearing List",
    listForDate: "15 January 2025",
    lastUpdatedDate: "14 January 2025",
    lastUpdatedTime: "9am"
  },
  hearings: []
};

const mockHearingList = [
  {
    hearingTime: "10:00am",
    appellant: "John Smith",
    representative: "",
    appealReferenceNumber: "IA/2025/001",
    judges: "Judge Smith",
    hearingType: "Substantive",
    location: "Field House",
    additionalInformation: ""
  }
];

describe("generateUtiacStatutoryAppealDailyHearingListPdf", () => {
  const mockNunjucksEnv = {
    render: vi.fn().mockReturnValue("<html>PDF HTML</html>")
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(renderUtiacStatutoryAppealDailyHearingListData).mockReturnValue(mockRenderedData);
    mockConfigureNunjucks.mockReturnValue(mockNunjucksEnv);
    mockLoadTranslations.mockResolvedValue({ pageTitle: "Test Title" });
    mockCreatePdfErrorResult.mockImplementation((error: unknown) => ({
      success: false,
      error: `Failed to generate PDF: ${error instanceof Error ? error.message : "Unknown error"}`
    }));
  });

  it("should generate PDF successfully", async () => {
    // Arrange
    const pdfBuffer = Buffer.from("PDF content");
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer,
      sizeBytes: 1024
    });
    mockSavePdfToStorage.mockResolvedValue({
      success: true,
      pdfPath: "test-artefact-123.pdf",
      sizeBytes: 1024
    });

    // Act
    const result = await generateUtiacStatutoryAppealDailyHearingListPdf({
      artefactId: "test-artefact-123",
      contentDate: new Date("2025-01-15"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.pdfPath).toContain("test-artefact-123.pdf");
    expect(result.sizeBytes).toBe(1024);
  });

  it("should return error when PDF generation fails", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: false,
      error: "Puppeteer crashed"
    });

    // Act
    const result = await generateUtiacStatutoryAppealDailyHearingListPdf({
      artefactId: "failed-pdf",
      contentDate: new Date("2025-01-15"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("Puppeteer crashed");
  });

  it("should pass correct render options to renderer", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });
    mockSavePdfToStorage.mockResolvedValue({
      success: true,
      pdfPath: "test-render-options.pdf",
      sizeBytes: 100
    });

    const contentDate = new Date("2025-06-15");

    // Act
    await generateUtiacStatutoryAppealDailyHearingListPdf({
      artefactId: "test-render-options",
      contentDate,
      locale: "cy",
      locationId: "999",
      jsonData: mockHearingList
    });

    // Assert
    expect(renderUtiacStatutoryAppealDailyHearingListData).toHaveBeenCalledWith(mockHearingList, {
      locale: "cy",
      courtName: "Upper Tribunal (Immigration and Asylum) Chamber",
      contentDate,
      lastReceivedDate: expect.any(String),
      listTitle: "Upper Tribunal (Immigration and Asylum) Chamber Statutory Appeal Daily Hearing List"
    });
  });

  it("should return error when PDF buffer is missing", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: undefined, sizeBytes: 0 });

    // Act
    const result = await generateUtiacStatutoryAppealDailyHearingListPdf({
      artefactId: "no-buffer",
      contentDate: new Date("2025-01-15"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed");
  });

  it("should handle renderer errors gracefully", async () => {
    // Arrange
    vi.mocked(renderUtiacStatutoryAppealDailyHearingListData).mockImplementation(() => {
      throw new Error("Renderer failed");
    });

    // Act
    const result = await generateUtiacStatutoryAppealDailyHearingListPdf({
      artefactId: "renderer-error",
      contentDate: new Date("2025-01-15"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to generate PDF: Renderer failed");
  });

  it("should load English and Welsh translations from the package locale files when generating", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: Buffer.from("PDF"), sizeBytes: 3 });
    mockSavePdfToStorage.mockResolvedValue({ success: true, pdfPath: "locale-loaders.pdf", sizeBytes: 3 });
    const { en } = await import("../locales/en.js");
    const { cy } = await import("../locales/cy.js");

    // Act
    await generateUtiacStatutoryAppealDailyHearingListPdf({
      artefactId: "locale-loaders",
      contentDate: new Date("2025-01-01"),
      locale: "cy",
      locationId: "999",
      jsonData: mockHearingList
    });
    const [locale, importEn, importCy] = mockLoadTranslations.mock.calls[0];

    // Assert
    expect(locale).toBe("cy");
    await expect(importEn()).resolves.toEqual(expect.objectContaining({ en }));
    await expect(importCy()).resolves.toEqual(expect.objectContaining({ cy }));
  });
});
