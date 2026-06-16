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
  renderUtlcDailyHearingListData: vi.fn()
}));

import fs from "node:fs/promises";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { renderUtlcDailyHearingListData } from "../rendering/renderer.js";
import { generateUtlcDailyHearingListPdf } from "./pdf-generator.js";

const mockRenderedData = {
  header: {
    listTitle: "Upper Tribunal (Lands Chamber) Daily Hearing List",
    hearingDate: "15 January 2025",
    lastUpdatedDate: "15 January 2025",
    lastUpdatedTime: "9am"
  },
  hearings: []
};

const mockHearingList = [
  {
    time: "10:00am",
    caseReferenceNumber: "LC/2025/0001",
    caseName: "Smith v Jones",
    judges: "Judge Smith",
    members: "Member Jones",
    hearingType: "Substantive hearing",
    venue: "Royal Courts of Justice",
    modeOfHearing: "CVP",
    additionalInformation: ""
  }
];

describe("generateUtlcDailyHearingListPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(renderUtlcDailyHearingListData).mockReturnValue(mockRenderedData);
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
  });

  it("should generate PDF successfully", async () => {
    const pdfBuffer = Buffer.from("PDF content");
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer,
      sizeBytes: 1024
    });

    const result = await generateUtlcDailyHearingListPdf({
      artefactId: "test-artefact-123",
      contentDate: new Date("2025-01-15"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList
    });

    expect(result.success).toBe(true);
    expect(result.pdfPath).toContain("test-artefact-123.pdf");
    expect(result.sizeBytes).toBe(1024);
    expect(result.exceedsMaxSize).toBe(false);
  });

  it("should return exceedsMaxSize true when PDF is over 2MB", async () => {
    const largePdfBuffer = Buffer.alloc(3 * 1024 * 1024);
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: largePdfBuffer,
      sizeBytes: 3 * 1024 * 1024
    });

    const result = await generateUtlcDailyHearingListPdf({
      artefactId: "large-pdf-123",
      contentDate: new Date("2025-01-15"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList
    });

    expect(result.success).toBe(true);
    expect(result.exceedsMaxSize).toBe(true);
  });

  it("should return error when PDF generation fails", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: false,
      error: "Puppeteer crashed"
    });

    const result = await generateUtlcDailyHearingListPdf({
      artefactId: "failed-pdf",
      contentDate: new Date("2025-01-15"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Puppeteer crashed");
  });

  it("should return error when PDF generation reports success but returns no buffer", async () => {
    // Arrange
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: undefined,
      sizeBytes: undefined
    });

    // Act
    const result = await generateUtlcDailyHearingListPdf({
      artefactId: "no-buffer-pdf",
      contentDate: new Date("2025-01-15"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed");
  });

  it("should pass correct render options to renderer", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    const contentDate = new Date("2025-01-15");

    await generateUtlcDailyHearingListPdf({
      artefactId: "test-render-options",
      contentDate,
      locale: "cy",
      locationId: "999",
      jsonData: mockHearingList
    });

    expect(renderUtlcDailyHearingListData).toHaveBeenCalledWith(mockHearingList, {
      locale: "cy",
      courtName: "Upper Tribunal (Lands Chamber)",
      contentDate,
      lastReceivedDate: expect.any(String),
      listTitle: "Upper Tribunal (Lands Chamber) Daily Hearing List"
    });
  });
});
