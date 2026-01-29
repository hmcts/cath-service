import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies before imports
vi.mock("node:fs/promises", () => ({
  default: {
    mkdir: vi.fn(),
    writeFile: vi.fn()
  }
}));

vi.mock("@hmcts/pdf-generation", () => ({
  generatePdfFromHtml: vi.fn()
}));

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn()
}));

vi.mock("../rendering/renderer.js", () => ({
  renderCauseListData: vi.fn()
}));

import fs from "node:fs/promises";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { renderCauseListData } from "../rendering/renderer.js";
import { generateCauseListPdf } from "./pdf-generator.js";

const mockRenderedData = {
  header: {
    locationName: "Oxford Combined Court Centre",
    addressLines: ["St Aldate's", "Oxford", "OX1 1TL"],
    contentDate: "01 January 2025",
    lastUpdated: "12 November 2025 at 9am"
  },
  openJustice: {
    venueName: "Oxford Combined Court Centre",
    email: "enquiries.oxford.countycourt@justice.gov.uk",
    phone: "01865 264 200"
  },
  listData: {
    courtLists: []
  }
};

const mockCauseListData = {
  document: {
    publicationDate: "2025-11-12T09:00:00.000Z"
  },
  venue: {
    venueName: "Oxford Combined Court Centre",
    venueAddress: {
      line: ["St Aldate's"],
      town: "Oxford",
      postCode: "OX1 1TL"
    },
    venueContact: {
      venueTelephone: "01865 264 200",
      venueEmail: "enquiries.oxford.countycourt@justice.gov.uk"
    }
  },
  courtLists: []
};

describe("generateCauseListPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(renderCauseListData).mockResolvedValue(mockRenderedData);
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

    const result = await generateCauseListPdf({
      artefactId: "test-artefact-123",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockCauseListData
    });

    expect(result.success).toBe(true);
    expect(result.pdfPath).toContain("test-artefact-123.pdf");
    expect(result.sizeBytes).toBe(1024);
    expect(result.exceedsMaxSize).toBe(false);
    expect(fs.mkdir).toHaveBeenCalled();
    expect(fs.writeFile).toHaveBeenCalledWith(expect.stringContaining("test-artefact-123.pdf"), pdfBuffer);
  });

  it("should return exceedsMaxSize true when PDF is over 2MB", async () => {
    const largePdfBuffer = Buffer.alloc(3 * 1024 * 1024); // 3MB
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: largePdfBuffer,
      sizeBytes: 3 * 1024 * 1024
    });

    const result = await generateCauseListPdf({
      artefactId: "large-pdf-123",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockCauseListData
    });

    expect(result.success).toBe(true);
    expect(result.exceedsMaxSize).toBe(true);
    expect(result.sizeBytes).toBe(3 * 1024 * 1024);
  });

  it("should return exceedsMaxSize false when PDF is exactly 2MB", async () => {
    const exactPdfBuffer = Buffer.alloc(2 * 1024 * 1024); // 2MB exactly
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: exactPdfBuffer,
      sizeBytes: 2 * 1024 * 1024
    });

    const result = await generateCauseListPdf({
      artefactId: "exact-size-pdf",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockCauseListData
    });

    expect(result.success).toBe(true);
    expect(result.exceedsMaxSize).toBe(false);
  });

  it("should return error when PDF generation fails", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: false,
      error: "Puppeteer crashed"
    });

    const result = await generateCauseListPdf({
      artefactId: "failed-pdf",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockCauseListData
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Puppeteer crashed");
    expect(result.pdfPath).toBeUndefined();
  });

  it("should return default error message when PDF generation fails without error message", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: false
    });

    const result = await generateCauseListPdf({
      artefactId: "failed-pdf",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockCauseListData
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

    const result = await generateCauseListPdf({
      artefactId: "no-buffer-pdf",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockCauseListData
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed");
  });

  it("should handle renderer errors gracefully", async () => {
    vi.mocked(renderCauseListData).mockRejectedValue(new Error("Renderer failed"));

    const result = await generateCauseListPdf({
      artefactId: "renderer-error",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockCauseListData
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to generate PDF: Renderer failed");
  });

  it("should handle non-Error exceptions", async () => {
    vi.mocked(renderCauseListData).mockRejectedValue("String error");

    const result = await generateCauseListPdf({
      artefactId: "string-error",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockCauseListData
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

    const result = await generateCauseListPdf({
      artefactId: "fs-error",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockCauseListData
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

    await generateCauseListPdf({
      artefactId: "test-render-options",
      contentDate,
      locale: "cy",
      locationId: "999",
      jsonData: mockCauseListData
    });

    expect(renderCauseListData).toHaveBeenCalledWith(mockCauseListData, {
      contentDate,
      locale: "cy",
      locationId: "999"
    });
  });

  it("should use MANUAL_UPLOAD provenance label", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    await generateCauseListPdf({
      artefactId: "provenance-test",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockCauseListData,
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

    await generateCauseListPdf({
      artefactId: "provenance-snl",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockCauseListData,
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

    await generateCauseListPdf({
      artefactId: "unknown-provenance",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockCauseListData,
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

    const result = await generateCauseListPdf({
      artefactId: "no-provenance",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockCauseListData
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

    await generateCauseListPdf({
      artefactId: "test-mkdir",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockCauseListData
    });

    expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining("storage"), { recursive: true });
  });

  it("should generate PDF for Welsh locale", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    const result = await generateCauseListPdf({
      artefactId: "welsh-pdf",
      contentDate: new Date("2025-01-01"),
      locale: "cy",
      locationId: "240",
      jsonData: mockCauseListData
    });

    expect(result.success).toBe(true);
    expect(renderCauseListData).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ locale: "cy" }));
  });
});
