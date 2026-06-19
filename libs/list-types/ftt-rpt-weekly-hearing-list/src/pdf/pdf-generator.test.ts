import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", () => ({
  default: {
    mkdir: vi.fn(),
    writeFile: vi.fn()
  }
}));

vi.mock("@hmcts/pdf-generation", () => ({
  generatePdfFromHtml: vi.fn()
}));

vi.mock("../rendering/renderer.js", () => ({
  renderFttRptData: vi.fn()
}));

import fs from "node:fs/promises";
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
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
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
});
