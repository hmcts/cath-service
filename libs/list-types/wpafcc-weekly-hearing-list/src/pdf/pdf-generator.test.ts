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
  renderWpafccWeeklyHearingListData: vi.fn()
}));

import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { renderWpafccWeeklyHearingListData } from "../rendering/renderer.js";
import { generateWpafccWeeklyHearingListPdf } from "./pdf-generator.js";

const mockRenderedData = {
  header: {
    listTitle: "First-tier Tribunal (War Pensions and Armed Forces Compensation) Weekly Hearing List",
    weekCommencingDate: "01 January 2025",
    lastUpdatedDate: "12 November 2025",
    lastUpdatedTime: "9am"
  },
  hearings: []
};

const mockHearingList = [
  {
    date: "01/01/2025",
    hearingTime: "10:00am",
    caseReferenceNumber: "WPAFCC/2025/001",
    caseName: "Smith v MOD",
    panel: "Judge Smith",
    modeOfHearing: "Remote",
    venue: "WPAFCC Hearing Centre",
    additionalInformation: ""
  }
];

describe("generateWpafccWeeklyHearingListPdf", () => {
  const mockNunjucksEnv = {
    render: vi.fn().mockReturnValue("<html>PDF HTML</html>")
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(renderWpafccWeeklyHearingListData).mockReturnValue(mockRenderedData);
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
    const result = await generateWpafccWeeklyHearingListPdf({
      artefactId: "test-artefact-123",
      contentDate: new Date("2025-01-01"),
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
    const result = await generateWpafccWeeklyHearingListPdf({
      artefactId: "failed-pdf",
      contentDate: new Date("2025-01-01"),
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
    await generateWpafccWeeklyHearingListPdf({
      artefactId: "test-render-options",
      contentDate,
      locale: "cy",
      locationId: "999",
      jsonData: mockHearingList
    });

    // Assert
    expect(renderWpafccWeeklyHearingListData).toHaveBeenCalledWith(mockHearingList, {
      locale: "cy",
      courtName: "First-tier Tribunal (War Pensions and Armed Forces Compensation)",
      contentDate,
      lastReceivedDate: expect.any(String),
      listTitle: "First-tier Tribunal (War Pensions and Armed Forces Compensation) Weekly Hearing List"
    });
  });

  it("should return error when PDF buffer is missing", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: undefined, sizeBytes: 0 });

    // Act
    const result = await generateWpafccWeeklyHearingListPdf({
      artefactId: "no-buffer",
      contentDate: new Date("2025-01-01"),
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
    vi.mocked(renderWpafccWeeklyHearingListData).mockImplementation(() => {
      throw new Error("Renderer failed");
    });

    // Act
    const result = await generateWpafccWeeklyHearingListPdf({
      artefactId: "renderer-error",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to generate PDF: Renderer failed");
  });

  it("should use provenance label when provenance is provided", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });
    mockSavePdfToStorage.mockResolvedValue({
      success: true,
      pdfPath: "provenance-test.pdf",
      sizeBytes: 100
    });

    // Act
    const result = await generateWpafccWeeklyHearingListPdf({
      artefactId: "provenance-test",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList,
      provenance: "MANUAL_UPLOAD"
    });

    // Assert
    expect(result.success).toBe(true);
    expect(mockNunjucksEnv.render).toHaveBeenCalledWith("pdf-template.njk", expect.objectContaining({ dataSource: "Manual Upload" }));
  });

  it("should load English and Welsh translations from the package locale files when generating", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: Buffer.from("PDF"), sizeBytes: 3 });
    mockSavePdfToStorage.mockResolvedValue({ success: true, pdfPath: "locale-loaders.pdf", sizeBytes: 3 });
    const { en } = await import("../locales/en.js");
    const { cy } = await import("../locales/cy.js");

    // Act
    await generateWpafccWeeklyHearingListPdf({
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
