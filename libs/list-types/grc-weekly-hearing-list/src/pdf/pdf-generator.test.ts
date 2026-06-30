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
  renderGrcWeeklyHearingListData: vi.fn()
}));

import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { renderGrcWeeklyHearingListData } from "../rendering/renderer.js";
import { generateGrcWeeklyHearingListPdf } from "./pdf-generator.js";

const mockRenderedData = {
  header: {
    listTitle: "General Regulatory Chamber Weekly Hearing List",
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
    caseReferenceNumber: "GRC/2025/001",
    caseName: "Smith v Regulator",
    judges: "Judge Smith",
    members: "",
    modeOfHearing: "Remote",
    venue: "GRC Hearing Centre",
    additionalInformation: ""
  }
];

describe("generateGrcWeeklyHearingListPdf", () => {
  const mockNunjucksEnv = {
    render: vi.fn().mockReturnValue("<html>PDF HTML</html>")
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(renderGrcWeeklyHearingListData).mockReturnValue(mockRenderedData);
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
      sizeBytes: 1024,
      exceedsMaxSize: false
    });

    // Act
    const result = await generateGrcWeeklyHearingListPdf({
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
    expect(result.exceedsMaxSize).toBe(false);
  });

  it("should return exceedsMaxSize true when PDF is over 2MB", async () => {
    // Arrange
    const largePdfBuffer = Buffer.alloc(3 * 1024 * 1024);
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: largePdfBuffer,
      sizeBytes: 3 * 1024 * 1024
    });
    mockSavePdfToStorage.mockResolvedValue({
      success: true,
      pdfPath: "large-pdf-123.pdf",
      sizeBytes: 3 * 1024 * 1024,
      exceedsMaxSize: true
    });

    // Act
    const result = await generateGrcWeeklyHearingListPdf({
      artefactId: "large-pdf-123",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.exceedsMaxSize).toBe(true);
  });

  it("should return error when PDF generation fails", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: false,
      error: "Puppeteer crashed"
    });

    // Act
    const result = await generateGrcWeeklyHearingListPdf({
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
      sizeBytes: 100,
      exceedsMaxSize: false
    });

    const contentDate = new Date("2025-06-15");

    // Act
    await generateGrcWeeklyHearingListPdf({
      artefactId: "test-render-options",
      contentDate,
      locale: "cy",
      locationId: "999",
      jsonData: mockHearingList
    });

    // Assert
    expect(renderGrcWeeklyHearingListData).toHaveBeenCalledWith(mockHearingList, {
      locale: "cy",
      courtName: "General Regulatory Chamber",
      contentDate,
      lastReceivedDate: expect.any(String),
      listTitle: "General Regulatory Chamber Weekly Hearing List"
    });
  });
});
