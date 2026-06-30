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

vi.mock("../rendering/renderer-london.js", () => ({
  renderUtiacJrLondonDailyHearingListData: vi.fn()
}));

import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { renderUtiacJrLondonDailyHearingListData } from "../rendering/renderer-london.js";
import { generateUtiacJrLondonDailyHearingListPdf } from "./pdf-generator-london.js";

const mockRenderedData = {
  header: {
    listTitle: "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: London Daily Hearing List",
    listForDate: "15 January 2025",
    lastUpdatedDate: "14 January 2025",
    lastUpdatedTime: "9am"
  },
  hearings: []
};

const mockHearingList = [
  {
    hearingTime: "10:00am",
    caseTitle: "Smith v Secretary of State",
    representative: "",
    caseReferenceNumber: "JR/2025/001",
    judges: "Judge Smith",
    hearingType: "Permission",
    location: "Field House",
    additionalInformation: ""
  }
];

describe("generateUtiacJrLondonDailyHearingListPdf", () => {
  const mockNunjucksEnv = {
    render: vi.fn().mockReturnValue("<html>PDF HTML</html>")
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(renderUtiacJrLondonDailyHearingListData).mockReturnValue(mockRenderedData);
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
    const result = await generateUtiacJrLondonDailyHearingListPdf({
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
    const result = await generateUtiacJrLondonDailyHearingListPdf({
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
    await generateUtiacJrLondonDailyHearingListPdf({
      artefactId: "test-render-options",
      displayFrom,
      locale: "cy",
      locationId: "999",
      jsonData: mockHearingList
    });

    // Assert
    expect(renderUtiacJrLondonDailyHearingListData).toHaveBeenCalledWith(mockHearingList, {
      locale: "cy",
      courtName: "Upper Tribunal (Immigration and Asylum) Chamber",
      displayFrom,
      lastReceivedDate: expect.any(String),
      listTitle: "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: London Daily Hearing List"
    });
  });

  it("should return error when PDF buffer is missing", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: undefined, sizeBytes: 0 });

    // Act
    const result = await generateUtiacJrLondonDailyHearingListPdf({
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
    vi.mocked(renderUtiacJrLondonDailyHearingListData).mockImplementation(() => {
      throw new Error("Renderer failed");
    });

    // Act
    const result = await generateUtiacJrLondonDailyHearingListPdf({
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
      sizeBytes: 100,
      exceedsMaxSize: false
    });

    // Act
    const result = await generateUtiacJrLondonDailyHearingListPdf({
      artefactId: "provenance-test",
      displayFrom: new Date("2025-01-15"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList,
      provenance: "MANUAL_UPLOAD"
    });

    // Assert
    expect(result.success).toBe(true);
    expect(mockNunjucksEnv.render).toHaveBeenCalledWith("pdf-template-london.njk", expect.objectContaining({ dataSource: "Manual Upload" }));
  });
});
