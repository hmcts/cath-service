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
  renderStandardDailyCauseList: vi.fn()
}));

import fs from "node:fs/promises";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { renderStandardDailyCauseList } from "../rendering/renderer.js";
import { generateRcjStandardDailyCauseListPdf } from "./pdf-generator.js";

const mockRenderedData = {
  header: {
    listTitle: "RCJ Standard Daily Cause List",
    listDate: "01 January 2025",
    lastUpdatedDate: "12 November 2025",
    lastUpdatedTime: "9am"
  },
  hearings: []
};

const mockHearingList = [
  {
    venue: "Royal Courts of Justice",
    judge: "Judge Smith",
    time: "10:00",
    caseNumber: "T20257890",
    caseDetails: "Smith v Jones",
    hearingType: "Trial",
    additionalInformation: "Remote hearing"
  }
];

describe("generateRcjStandardDailyCauseListPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(renderStandardDailyCauseList).mockReturnValue(mockRenderedData);
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

    const result = await generateRcjStandardDailyCauseListPdf({
      artefactId: "test-artefact-123",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList
    });

    expect(result.success).toBe(true);
    expect(result.pdfPath).toContain("test-artefact-123.pdf");
    expect(result.sizeBytes).toBe(1024);
    expect(result.exceedsMaxSize).toBe(false);
    expect(fs.mkdir).toHaveBeenCalled();
    expect(fs.writeFile).toHaveBeenCalledWith(expect.stringContaining("test-artefact-123.pdf"), pdfBuffer);
  });

  it("should return exceedsMaxSize true when PDF is over 2MB", async () => {
    const largePdfBuffer = Buffer.alloc(3 * 1024 * 1024);
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: largePdfBuffer,
      sizeBytes: 3 * 1024 * 1024
    });

    const result = await generateRcjStandardDailyCauseListPdf({
      artefactId: "large-pdf-123",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList
    });

    expect(result.success).toBe(true);
    expect(result.exceedsMaxSize).toBe(true);
    expect(result.sizeBytes).toBe(3 * 1024 * 1024);
  });

  it("should return exceedsMaxSize false when PDF is exactly 2MB", async () => {
    const exactPdfBuffer = Buffer.alloc(2 * 1024 * 1024);
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: exactPdfBuffer,
      sizeBytes: 2 * 1024 * 1024
    });

    const result = await generateRcjStandardDailyCauseListPdf({
      artefactId: "exact-size-pdf",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList
    });

    expect(result.success).toBe(true);
    expect(result.exceedsMaxSize).toBe(false);
  });

  it("should return error when PDF generation fails", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: false,
      error: "Puppeteer crashed"
    });

    const result = await generateRcjStandardDailyCauseListPdf({
      artefactId: "failed-pdf",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Puppeteer crashed");
    expect(result.pdfPath).toBeUndefined();
  });

  it("should return default error message when PDF generation fails without error message", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: false
    });

    const result = await generateRcjStandardDailyCauseListPdf({
      artefactId: "failed-pdf",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed");
  });

  it("should return error when PDF buffer is missing", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: undefined,
      sizeBytes: 0
    });

    const result = await generateRcjStandardDailyCauseListPdf({
      artefactId: "no-buffer-pdf",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed");
  });

  it("should handle renderer errors gracefully", async () => {
    vi.mocked(renderStandardDailyCauseList).mockImplementation(() => {
      throw new Error("Renderer failed");
    });

    const result = await generateRcjStandardDailyCauseListPdf({
      artefactId: "renderer-error",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to generate PDF: Renderer failed");
  });

  it("should handle non-Error exceptions", async () => {
    vi.mocked(renderStandardDailyCauseList).mockImplementation(() => {
      throw "String error";
    });

    const result = await generateRcjStandardDailyCauseListPdf({
      artefactId: "string-error",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to generate PDF: Unknown error");
  });

  it("should handle file system errors", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });
    vi.mocked(fs.writeFile).mockRejectedValue(new Error("Disk full"));

    const result = await generateRcjStandardDailyCauseListPdf({
      artefactId: "fs-error",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to generate PDF: Disk full");
  });

  it("should pass correct render options to renderer", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    const contentDate = new Date("2025-06-15");

    await generateRcjStandardDailyCauseListPdf({
      artefactId: "test-render-options",
      contentDate,
      locale: "cy",
      locationId: "999",
      jsonData: mockHearingList
    });

    expect(renderStandardDailyCauseList).toHaveBeenCalledWith(mockHearingList, {
      locale: "cy",
      listTypeId: 9,
      listTitle: "RCJ Standard Daily Cause List",
      displayFrom: contentDate,
      displayTo: contentDate,
      lastReceivedDate: expect.any(String)
    });
  });

  it("should use MANUAL_UPLOAD provenance label", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    await generateRcjStandardDailyCauseListPdf({
      artefactId: "provenance-test",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList,
      provenance: "MANUAL_UPLOAD"
    });

    expect(generatePdfFromHtml).toHaveBeenCalledWith(expect.stringContaining("Manual Upload"));
  });

  it("should use SNL provenance label", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    await generateRcjStandardDailyCauseListPdf({
      artefactId: "provenance-snl",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList,
      provenance: "SNL"
    });

    expect(generatePdfFromHtml).toHaveBeenCalledWith(expect.stringContaining("SNL"));
  });

  it("should use raw provenance value when label not found", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    await generateRcjStandardDailyCauseListPdf({
      artefactId: "unknown-provenance",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList,
      provenance: "UNKNOWN_SOURCE"
    });

    expect(generatePdfFromHtml).toHaveBeenCalledWith(expect.stringContaining("UNKNOWN_SOURCE"));
  });

  it("should handle missing provenance", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    const result = await generateRcjStandardDailyCauseListPdf({
      artefactId: "no-provenance",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList
    });

    expect(result.success).toBe(true);
    expect(generatePdfFromHtml).toHaveBeenCalled();
  });

  it("should create storage directory with recursive option", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    await generateRcjStandardDailyCauseListPdf({
      artefactId: "test-mkdir",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockHearingList
    });

    expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining("storage"), { recursive: true });
  });

  it("should generate PDF for Welsh locale", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    const result = await generateRcjStandardDailyCauseListPdf({
      artefactId: "welsh-pdf",
      contentDate: new Date("2025-01-01"),
      locale: "cy",
      locationId: "240",
      jsonData: mockHearingList
    });

    expect(result.success).toBe(true);
    expect(renderStandardDailyCauseList).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ locale: "cy" }));
  });
});
