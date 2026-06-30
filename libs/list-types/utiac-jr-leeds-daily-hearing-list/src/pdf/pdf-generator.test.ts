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
  }
}));

vi.mock("@hmcts/pdf-generation", () => ({
  generatePdfFromHtml: vi.fn()
}));

vi.mock("../rendering/renderer.js", () => ({
  renderUtiacJrLeedsDailyHearingListData: vi.fn()
}));

import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { renderUtiacJrLeedsDailyHearingListData } from "../rendering/renderer.js";
import { createUtiacJrDailyHearingListPdfGenerator, generateUtiacJrLeedsDailyHearingListPdf } from "./pdf-generator.js";

const mockRenderedData = {
  header: {
    listTitle: "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Leeds Daily Hearing List",
    listForDate: "15 January 2025",
    lastUpdatedDate: "14 January 2025",
    lastUpdatedTime: "9am"
  },
  hearings: []
};

const mockHearingList = [
  {
    venue: "Leeds Combined Court Centre",
    judges: "Judge Smith",
    hearingTime: "10:00am",
    caseReferenceNumber: "JR/2025/003",
    caseTitle: "Smith v Secretary of State",
    hearingType: "Permission",
    additionalInformation: ""
  }
];

describe("generateUtiacJrLeedsDailyHearingListPdf", () => {
  const mockNunjucksEnv = {
    render: vi.fn().mockReturnValue("<html>PDF HTML</html>")
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(renderUtiacJrLeedsDailyHearingListData).mockReturnValue(mockRenderedData);
    mockConfigureNunjucks.mockReturnValue(mockNunjucksEnv);
    mockLoadTranslations.mockResolvedValue({ pageTitle: "Test Title" });
    mockSavePdfToStorage.mockResolvedValue({
      success: true,
      pdfPath: "default.pdf",
      sizeBytes: 100,
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
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer,
      sizeBytes: 1024
    });
    mockSavePdfToStorage.mockResolvedValue({
      success: true,
      pdfPath: "test-artefact-123.pdf",
      sizeBytes: 1024,
      exceedsMaxSize: false
    });

    // Act
    const result = await generateUtiacJrLeedsDailyHearingListPdf({
      artefactId: "test-artefact-123",
      displayFrom: new Date("2025-01-15"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.pdfPath).toContain("test-artefact-123.pdf");
    expect(result.sizeBytes).toBe(1024);
    expect(result.exceedsMaxSize).toBe(false);
  });

  it("should return error when PDF generation fails", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: false,
      error: "Puppeteer crashed"
    });

    // Act
    const result = await generateUtiacJrLeedsDailyHearingListPdf({
      artefactId: "failed-pdf",
      displayFrom: new Date("2025-01-15"),
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

    const displayFrom = new Date("2025-06-15");

    // Act
    await generateUtiacJrLeedsDailyHearingListPdf({
      artefactId: "test-render-options",
      displayFrom,
      locale: "cy",
      locationId: "999",
      jsonData: mockHearingList
    });

    // Assert
    expect(renderUtiacJrLeedsDailyHearingListData).toHaveBeenCalledWith(mockHearingList, {
      locale: "cy",
      courtName: "Upper Tribunal (Immigration and Asylum) Chamber",
      displayFrom,
      lastReceivedDate: expect.any(String),
      listTitle: "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Leeds Daily Hearing List"
    });
  });

  it("should include provenance label in rendered output when provenance is provided", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    // Act
    const result = await generateUtiacJrLeedsDailyHearingListPdf({
      artefactId: "provenance-test",
      displayFrom: new Date("2025-01-15"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList,
      provenance: "MANUAL_UPLOAD"
    });

    // Assert
    expect(result.success).toBe(true);
  });

  it("should return error when PDF buffer is missing", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: undefined, sizeBytes: 0 });

    // Act
    const result = await generateUtiacJrLeedsDailyHearingListPdf({
      artefactId: "no-buffer",
      displayFrom: new Date("2025-01-15"),
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
    vi.mocked(renderUtiacJrLeedsDailyHearingListData).mockImplementation(() => {
      throw new Error("Renderer failed");
    });

    // Act
    const result = await generateUtiacJrLeedsDailyHearingListPdf({
      artefactId: "renderer-error",
      displayFrom: new Date("2025-01-15"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to generate PDF: Renderer failed");
  });
});

describe("createUtiacJrDailyHearingListPdfGenerator", () => {
  const mockNunjucksEnv = {
    render: vi.fn().mockReturnValue("<html>PDF HTML</html>")
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(renderUtiacJrLeedsDailyHearingListData).mockReturnValue(mockRenderedData);
    mockConfigureNunjucks.mockReturnValue(mockNunjucksEnv);
    mockLoadTranslations.mockResolvedValue({ pageTitle: "Test Title" });
    mockSavePdfToStorage.mockResolvedValue({
      success: true,
      pdfPath: "default.pdf",
      sizeBytes: 100,
      exceedsMaxSize: false
    });
    mockCreatePdfErrorResult.mockImplementation((error: unknown) => ({
      success: false,
      error: `Failed to generate PDF: ${error instanceof Error ? error.message : "Unknown error"}`
    }));
  });

  it("should generate PDF with the provided list title", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF content"),
      sizeBytes: 1024
    });
    mockSavePdfToStorage.mockResolvedValue({
      success: true,
      pdfPath: "custom-title.pdf",
      sizeBytes: 1024,
      exceedsMaxSize: false
    });

    const customTitle = "Custom UTIAC Hearing List";
    const generator = createUtiacJrDailyHearingListPdfGenerator(customTitle);

    // Act
    const result = await generator({
      artefactId: "custom-title-test",
      displayFrom: new Date("2025-01-15"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList
    });

    // Assert
    expect(result.success).toBe(true);
    expect(renderUtiacJrLeedsDailyHearingListData).toHaveBeenCalledWith(mockHearingList, expect.objectContaining({ listTitle: customTitle }));
  });
});
