import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUploadBlob } = vi.hoisted(() => ({
  mockUploadBlob: vi.fn()
}));
vi.mock("@hmcts/azure-blob", () => ({
  uploadBlob: mockUploadBlob,
  CONTAINER: { ARTEFACT: "artefact", PUBLICATIONS: "publications" }
}));

vi.mock("@hmcts/pdf-generation", () => ({
  generatePdfFromHtml: vi.fn()
}));

vi.mock("../rendering/renderer.js", () => ({
  renderFttRptData: vi.fn()
}));

import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { renderFttRptData } from "../rendering/renderer.js";
import { generateFttRptWeeklyHearingListPdf } from "./pdf-generator.js";

const mockRenderedData = {
  header: {
    listTitle: "First-tier Tribunal (Residential Property Tribunal): Eastern region Weekly Hearing List",
    weekCommencingDate: "01 January 2025",
    lastUpdatedDate: "12 November 2025",
    lastUpdatedTime: "9am"
  },
  hearings: []
};

const mockHearingList = [
  {
    date: "01/01/2025",
    time: "10:00am",
    venue: "London",
    caseType: "Leasehold",
    caseReferenceNumber: "RPT/00001/2025",
    judges: "Judge Smith",
    members: "",
    hearingMethod: "In person",
    additionalInformation: ""
  }
];

describe("generateFttRptWeeklyHearingListPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(renderFttRptData).mockReturnValue(mockRenderedData);
    mockUploadBlob.mockResolvedValue(undefined);
  });

  it("should generate PDF successfully", async () => {
    // Arrange
    const pdfBuffer = Buffer.from("PDF content");
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer,
      sizeBytes: 1024
    });

    // Act
    const result = await generateFttRptWeeklyHearingListPdf({
      artefactId: "test-artefact-123",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList,
      courtName: "First-tier Tribunal (Residential Property Tribunal): Eastern region",
      listTitle: "First-tier Tribunal (Residential Property Tribunal): Eastern region Weekly Hearing List"
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

    // Act
    const result = await generateFttRptWeeklyHearingListPdf({
      artefactId: "large-pdf-123",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList,
      courtName: "First-tier Tribunal (Residential Property Tribunal): London region",
      listTitle: "First-tier Tribunal (Residential Property Tribunal): London region Weekly Hearing List"
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
    const result = await generateFttRptWeeklyHearingListPdf({
      artefactId: "failed-pdf",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList,
      courtName: "First-tier Tribunal (Residential Property Tribunal): Midlands region",
      listTitle: "First-tier Tribunal (Residential Property Tribunal): Midlands region Weekly Hearing List"
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("Puppeteer crashed");
  });

  it("should generate a PDF for the Market Rents list using its dedicated court name and list title", async () => {
    // Arrange
    vi.mocked(renderFttRptData).mockReturnValue({
      header: {
        listTitle: "First-tier Tribunal (Residential Property Tribunal): Market Rents Weekly Hearing List",
        weekCommencingDate: "01 January 2026",
        lastUpdatedDate: "12 November 2025",
        lastUpdatedTime: "9am"
      },
      hearings: []
    });
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF content"),
      sizeBytes: 2048
    });

    // Act
    const result = await generateFttRptWeeklyHearingListPdf({
      artefactId: "market-rents-123",
      contentDate: new Date("2026-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList,
      courtName: "First-tier Tribunal (Residential Property Tribunal)",
      listTitle: "First-tier Tribunal (Residential Property Tribunal): Market Rents Weekly Hearing List"
    });

    // Assert
    expect(result.success).toBe(true);
    expect(result.pdfPath).toContain("market-rents-123.pdf");
    expect(renderFttRptData).toHaveBeenCalledWith(
      mockHearingList,
      expect.objectContaining({
        courtName: "First-tier Tribunal (Residential Property Tribunal)",
        listTitle: "First-tier Tribunal (Residential Property Tribunal): Market Rents Weekly Hearing List"
      })
    );
  });

  it("should pass correct render options to renderer", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    const contentDate = new Date("2025-06-15");

    // Act
    await generateFttRptWeeklyHearingListPdf({
      artefactId: "test-render-options",
      contentDate,
      locale: "cy",
      locationId: "999",
      jsonData: mockHearingList,
      courtName: "First-tier Tribunal (Residential Property Tribunal): Northern region",
      listTitle: "First-tier Tribunal (Residential Property Tribunal): Northern region Weekly Hearing List"
    });

    // Assert
    expect(renderFttRptData).toHaveBeenCalledWith(mockHearingList, {
      locale: "cy",
      courtName: "First-tier Tribunal (Residential Property Tribunal): Northern region",
      contentDate,
      lastReceivedDate: expect.any(String),
      listTitle: "First-tier Tribunal (Residential Property Tribunal): Northern region Weekly Hearing List"
    });
  });

  it("should resolve the important information text with the regional email when listTypeName is provided", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    // Act
    await generateFttRptWeeklyHearingListPdf({
      artefactId: "eastern-important-info",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList,
      courtName: "First-tier Tribunal (Residential Property Tribunal): Eastern region",
      listTitle: "First-tier Tribunal (Residential Property Tribunal): Eastern region Weekly Hearing List",
      listTypeName: "FTT_RPT_EASTERN_WEEKLY_HEARING_LIST"
    });

    // Assert
    const html = vi.mocked(generatePdfFromHtml).mock.calls[0][0];
    expect(html).toContain("RPEastern@justice.gov.uk");
    expect(html).not.toContain("{email}");
  });

  it("should render an empty important information paragraph when listTypeName is not provided", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    // Act
    await generateFttRptWeeklyHearingListPdf({
      artefactId: "no-list-type-name",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList,
      courtName: "First-tier Tribunal (Residential Property Tribunal): Eastern region",
      listTitle: "First-tier Tribunal (Residential Property Tribunal): Eastern region Weekly Hearing List"
    });

    // Assert
    const html = vi.mocked(generatePdfFromHtml).mock.calls[0][0];
    expect(html).not.toContain("{email}");
    expect(html).not.toContain("justice.gov.uk");
  });

  it("should include the bold Market Rents extra information paragraph only for the Market Rents list type", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    // Act
    await generateFttRptWeeklyHearingListPdf({
      artefactId: "market-rents-extra-info",
      contentDate: new Date("2026-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList,
      courtName: "First-tier Tribunal (Residential Property Tribunal)",
      listTitle: "First-tier Tribunal (Residential Property Tribunal): Market Rents Weekly Hearing List",
      listTypeName: "FTT_RPT_MARKET_RENTS_WEEKLY_HEARING_LIST"
    });

    // Assert
    const html = vi.mocked(generatePdfFromHtml).mock.calls[0][0];
    expect(html).toContain("marketrents@justice.gov.uk");
    expect(html).toContain("For Market Rent applications received before 16 March 2026");
  });

  it("should not include the Market Rents extra information paragraph for other regions", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    // Act
    await generateFttRptWeeklyHearingListPdf({
      artefactId: "southern-no-extra-info",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList,
      courtName: "First-tier Tribunal (Residential Property Tribunal): Southern region",
      listTitle: "First-tier Tribunal (Residential Property Tribunal): Southern region Weekly Hearing List",
      listTypeName: "FTT_RPT_SOUTHERN_WEEKLY_HEARING_LIST"
    });

    // Assert
    const html = vi.mocked(generatePdfFromHtml).mock.calls[0][0];
    expect(html).toContain("RPSouthern@justice.gov.uk");
    expect(html).not.toContain("For Market Rent applications received before 16 March 2026");
  });
});
