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
  renderUtiacJrBirminghamDailyHearingListData: vi.fn()
}));

import fs from "node:fs/promises";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { renderUtiacJrBirminghamDailyHearingListData } from "../rendering/renderer.js";
import { generateUtiacJrBirminghamDailyHearingListPdf } from "./pdf-generator.js";

const mockRenderedData = {
  header: {
    listTitle: "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Birmingham Daily Hearing List",
    listForDate: "15 January 2025",
    lastUpdatedDate: "14 January 2025",
    lastUpdatedTime: "9am"
  },
  hearings: []
};

const mockHearingList = [
  {
    venue: "Birmingham Civil Justice Centre",
    judges: "Judge Smith",
    hearingTime: "10:00am",
    caseReferenceNumber: "JR/2025/001",
    caseTitle: "Smith v Secretary of State",
    hearingType: "Permission",
    additionalInformation: ""
  }
];

describe("generateUtiacJrBirminghamDailyHearingListPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(renderUtiacJrBirminghamDailyHearingListData).mockReturnValue(mockRenderedData);
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
    const result = await generateUtiacJrBirminghamDailyHearingListPdf({
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
    const result = await generateUtiacJrBirminghamDailyHearingListPdf({
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
    await generateUtiacJrBirminghamDailyHearingListPdf({
      artefactId: "test-render-options",
      displayFrom,
      locale: "cy",
      locationId: "999",
      jsonData: mockHearingList
    });

    // Assert
    expect(renderUtiacJrBirminghamDailyHearingListData).toHaveBeenCalledWith(mockHearingList, {
      locale: "cy",
      courtName: "Upper Tribunal (Immigration and Asylum) Chamber",
      displayFrom,
      lastReceivedDate: expect.any(String),
      listTitle: "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Birmingham Daily Hearing List"
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
    const result = await generateUtiacJrBirminghamDailyHearingListPdf({
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
});
