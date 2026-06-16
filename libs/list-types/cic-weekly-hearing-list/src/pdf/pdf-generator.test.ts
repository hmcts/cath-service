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

vi.mock("../rendering/renderer.js", () => ({
  renderCicWeeklyHearingListData: vi.fn()
}));

vi.mock("@hmcts/publication", () => ({
  PROVENANCE_LABELS: {
    MANUAL_UPLOAD: "Manual Upload",
    SNL: "SNL"
  }
}));

import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { renderCicWeeklyHearingListData } from "../rendering/renderer.js";
import { generateCicWeeklyHearingListPdf } from "./pdf-generator.js";

const mockRenderedData = {
  header: {
    listTitle: "Criminal Injuries Compensation Weekly Hearing List",
    weekCommencingDate: "15 June 2026",
    lastUpdatedDate: "15 June 2026",
    lastUpdatedTime: "10:00am"
  },
  hearings: []
};

const mockHearingList = [
  {
    date: "15/06/2026",
    hearingTime: "10:30am",
    caseReferenceNumber: "CIC/2026/001",
    caseName: "Smith v CICA",
    venuePlatform: "Video Hearing",
    judges: "Judge Williams",
    members: "Panel Member A, Panel Member B",
    additionalInformation: "Remote hearing via CVP"
  }
];

describe("generateCicWeeklyHearingListPdf", () => {
  const mockNunjucksEnv = {
    render: vi.fn().mockReturnValue("<html>PDF HTML</html>")
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(renderCicWeeklyHearingListData).mockReturnValue(mockRenderedData);
    mockConfigureNunjucks.mockReturnValue(mockNunjucksEnv);
    mockLoadTranslations.mockResolvedValue({ pageTitle: "Test Title" });
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

    // Act
    const result = await generateCicWeeklyHearingListPdf({
      artefactId: "test-artefact-123",
      contentDate: new Date("2026-06-15"),
      locale: "en",
      locationId: "9001",
      jsonData: mockHearingList,
      listTypeId: 18
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.pdfPath).toContain("test-artefact-123.pdf");
    expect(result.sizeBytes).toBe(1024);
    expect(result.exceedsMaxSize).toBe(false);
    expect(mockSavePdfToStorage).toHaveBeenCalledWith("test-artefact-123", pdfBuffer, 1024);
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
      pdfPath: "/storage/temp/uploads/large-pdf-123.pdf",
      sizeBytes: 3 * 1024 * 1024,
      exceedsMaxSize: true
    });

    // Act
    const result = await generateCicWeeklyHearingListPdf({
      artefactId: "large-pdf-123",
      contentDate: new Date("2026-06-15"),
      locale: "en",
      locationId: "9001",
      jsonData: mockHearingList,
      listTypeId: 18
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.exceedsMaxSize).toBe(true);
    expect(result.sizeBytes).toBe(3 * 1024 * 1024);
  });

  it("should return exceedsMaxSize false when PDF is exactly 2MB", async () => {
    // Arrange
    const exactPdfBuffer = Buffer.alloc(2 * 1024 * 1024);
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: exactPdfBuffer,
      sizeBytes: 2 * 1024 * 1024
    });
    mockSavePdfToStorage.mockResolvedValue({
      success: true,
      pdfPath: "/storage/temp/uploads/exact-size-pdf.pdf",
      sizeBytes: 2 * 1024 * 1024,
      exceedsMaxSize: false
    });

    // Act
    const result = await generateCicWeeklyHearingListPdf({
      artefactId: "exact-size-pdf",
      contentDate: new Date("2026-06-15"),
      locale: "en",
      locationId: "9001",
      jsonData: mockHearingList,
      listTypeId: 18
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.exceedsMaxSize).toBe(false);
  });

  it("should return error when PDF generation fails", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: false,
      error: "Puppeteer crashed"
    });

    // Act
    const result = await generateCicWeeklyHearingListPdf({
      artefactId: "failed-pdf",
      contentDate: new Date("2026-06-15"),
      locale: "en",
      locationId: "9001",
      jsonData: mockHearingList,
      listTypeId: 18
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("Puppeteer crashed");
    expect(result.pdfPath).toBeUndefined();
  });

  it("should return default error message when PDF generation fails without error message", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: false
    });

    // Act
    const result = await generateCicWeeklyHearingListPdf({
      artefactId: "failed-pdf",
      contentDate: new Date("2026-06-15"),
      locale: "en",
      locationId: "9001",
      jsonData: mockHearingList,
      listTypeId: 18
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed");
  });

  it("should return error when PDF buffer is missing", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: undefined,
      sizeBytes: 0
    });

    // Act
    const result = await generateCicWeeklyHearingListPdf({
      artefactId: "no-buffer-pdf",
      contentDate: new Date("2026-06-15"),
      locale: "en",
      locationId: "9001",
      jsonData: mockHearingList,
      listTypeId: 18
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed");
  });

  it("should handle renderer errors gracefully", async () => {
    // Arrange
    vi.mocked(renderCicWeeklyHearingListData).mockImplementation(() => {
      throw new Error("Renderer failed");
    });

    // Act
    const result = await generateCicWeeklyHearingListPdf({
      artefactId: "renderer-error",
      contentDate: new Date("2026-06-15"),
      locale: "en",
      locationId: "9001",
      jsonData: mockHearingList,
      listTypeId: 18
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to generate PDF: Renderer failed");
  });

  it("should handle non-Error exceptions", async () => {
    // Arrange
    vi.mocked(renderCicWeeklyHearingListData).mockImplementation(() => {
      throw "String error";
    });

    // Act
    const result = await generateCicWeeklyHearingListPdf({
      artefactId: "string-error",
      contentDate: new Date("2026-06-15"),
      locale: "en",
      locationId: "9001",
      jsonData: mockHearingList,
      listTypeId: 18
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to generate PDF: Unknown error");
  });

  it("should handle file system errors", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });
    mockSavePdfToStorage.mockRejectedValue(new Error("Disk full"));

    // Act
    const result = await generateCicWeeklyHearingListPdf({
      artefactId: "fs-error",
      contentDate: new Date("2026-06-15"),
      locale: "en",
      locationId: "9001",
      jsonData: mockHearingList,
      listTypeId: 18
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to generate PDF: Disk full");
  });

  it("should pass correct render options to renderer", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    const contentDate = new Date("2026-06-15");

    // Act
    await generateCicWeeklyHearingListPdf({
      artefactId: "test-render-options",
      contentDate,
      locale: "cy",
      locationId: "9001",
      jsonData: mockHearingList,
      listTypeId: 18
    });

    // Assert
    expect(renderCicWeeklyHearingListData).toHaveBeenCalledWith(mockHearingList, {
      locale: "cy",
      courtName: "Criminal Injuries Compensation Tribunal",
      contentDate: contentDate,
      lastReceivedDate: expect.any(String),
      listTitle: "Criminal Injuries Compensation Weekly Hearing List"
    });
  });

  it("should use MANUAL_UPLOAD provenance label", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    // Act
    await generateCicWeeklyHearingListPdf({
      artefactId: "provenance-test",
      contentDate: new Date("2026-06-15"),
      locale: "en",
      locationId: "9001",
      jsonData: mockHearingList,
      provenance: "MANUAL_UPLOAD",
      listTypeId: 18
    });

    // Assert
    expect(mockNunjucksEnv.render).toHaveBeenCalledWith("pdf-template.njk", expect.objectContaining({ dataSource: "Manual Upload" }));
  });

  it("should use SNL provenance label", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    // Act
    await generateCicWeeklyHearingListPdf({
      artefactId: "provenance-snl",
      contentDate: new Date("2026-06-15"),
      locale: "en",
      locationId: "9001",
      jsonData: mockHearingList,
      provenance: "SNL",
      listTypeId: 18
    });

    // Assert
    expect(mockNunjucksEnv.render).toHaveBeenCalledWith("pdf-template.njk", expect.objectContaining({ dataSource: "SNL" }));
  });

  it("should use raw provenance value when label not found", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    // Act
    await generateCicWeeklyHearingListPdf({
      artefactId: "unknown-provenance",
      contentDate: new Date("2026-06-15"),
      locale: "en",
      locationId: "9001",
      jsonData: mockHearingList,
      provenance: "UNKNOWN_SOURCE",
      listTypeId: 18
    });

    // Assert
    expect(mockNunjucksEnv.render).toHaveBeenCalledWith("pdf-template.njk", expect.objectContaining({ dataSource: "UNKNOWN_SOURCE" }));
  });

  it("should handle missing provenance", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    // Act
    const result = await generateCicWeeklyHearingListPdf({
      artefactId: "no-provenance",
      contentDate: new Date("2026-06-15"),
      locale: "en",
      locationId: "9001",
      jsonData: mockHearingList,
      listTypeId: 18
    });

    // Assert
    expect(result.success).toBe(true);
    expect(generatePdfFromHtml).toHaveBeenCalled();
  });

  it("should call savePdfToStorage with correct parameters", async () => {
    // Arrange
    const pdfBuffer = Buffer.from("PDF");
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer,
      sizeBytes: 100
    });

    // Act
    await generateCicWeeklyHearingListPdf({
      artefactId: "test-mkdir",
      contentDate: new Date("2026-06-15"),
      locale: "en",
      locationId: "9001",
      jsonData: mockHearingList,
      listTypeId: 18
    });

    // Assert
    expect(mockSavePdfToStorage).toHaveBeenCalledWith("test-mkdir", pdfBuffer, 100);
  });

  it("should generate PDF for Welsh locale", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    // Act
    const result = await generateCicWeeklyHearingListPdf({
      artefactId: "welsh-pdf",
      contentDate: new Date("2026-06-15"),
      locale: "cy",
      locationId: "9001",
      jsonData: mockHearingList,
      listTypeId: 18
    });

    // Assert
    expect(result.success).toBe(true);
    expect(renderCicWeeklyHearingListData).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ locale: "cy" }));
  });
});
