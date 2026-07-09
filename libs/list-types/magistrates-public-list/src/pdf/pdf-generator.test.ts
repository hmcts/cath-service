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
  renderMagistratesPublicListData: vi.fn()
}));

vi.mock("@hmcts/publication", () => ({
  PROVENANCE_LABELS: {
    CRIME_IDAM: "Crime IDAM",
    COMMON_PLATFORM: "Common Platform"
  }
}));

import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { renderMagistratesPublicListData } from "../rendering/renderer.js";
import { generateMagistratesPublicListPdf } from "./pdf-generator.js";

const mockRenderedData = {
  header: {
    locationName: "Preston Magistrates Court",
    contentDate: "13 September 2025",
    publishedDate: "13 September 2025",
    publishedTime: "9am",
    venueAddress: ["THE LAW COURTS", "Main Road", "PR1 2LL"]
  },
  openJustice: null,
  listData: {
    document: { publicationDate: "2025-09-13T09:00:00Z" },
    courtLists: []
  }
};

const mockJsonData = {
  document: { publicationDate: "2025-09-13T09:00:00Z" },
  venue: {
    venueAddress: { line: ["THE LAW COURTS"], town: "Preston", postCode: "PR1 2LL" }
  },
  courtLists: []
};

describe("generateMagistratesPublicListPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(renderMagistratesPublicListData).mockResolvedValue(mockRenderedData);
    mockUploadBlob.mockResolvedValue(undefined);
  });

  it("should generate PDF successfully", async () => {
    const pdfBuffer = Buffer.from("PDF content");
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer,
      sizeBytes: 1024
    });

    const result = await generateMagistratesPublicListPdf({
      artefactId: "test-artefact-123",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockJsonData
    });

    expect(result.success).toBe(true);
    expect(result.pdfPath).toContain("test-artefact-123.pdf");
    expect(result.sizeBytes).toBe(1024);
    expect(result.exceedsMaxSize).toBe(false);
  });

  it("should return exceedsMaxSize true when PDF exceeds 2MB", async () => {
    const largePdfBuffer = Buffer.alloc(3 * 1024 * 1024);
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: largePdfBuffer,
      sizeBytes: 3 * 1024 * 1024
    });

    const result = await generateMagistratesPublicListPdf({
      artefactId: "large-pdf-123",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockJsonData
    });

    expect(result.success).toBe(true);
    expect(result.exceedsMaxSize).toBe(true);
  });

  it("should return error when PDF generation fails", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: false,
      error: "Puppeteer crashed"
    });

    const result = await generateMagistratesPublicListPdf({
      artefactId: "failed-pdf",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockJsonData
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Puppeteer crashed");
  });

  it("should return error when PDF buffer is missing", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: undefined as unknown as Buffer,
      sizeBytes: 0
    });

    const result = await generateMagistratesPublicListPdf({
      artefactId: "no-buffer",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockJsonData
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed");
  });

  it("should resolve provenance label from PROVENANCE_LABELS", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    await generateMagistratesPublicListPdf({
      artefactId: "provenance-test",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockJsonData,
      provenance: "CRIME_IDAM"
    });

    expect(generatePdfFromHtml).toHaveBeenCalled();
  });

  it("should use provenance string directly when not in registry", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    await generateMagistratesPublicListPdf({
      artefactId: "unknown-provenance",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockJsonData,
      provenance: "UNKNOWN_SOURCE"
    });

    expect(generatePdfFromHtml).toHaveBeenCalled();
  });

  it("should use empty provenance label when provenance is not provided", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    await generateMagistratesPublicListPdf({
      artefactId: "no-provenance",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockJsonData
    });

    expect(generatePdfFromHtml).toHaveBeenCalled();
  });

  it("should pass correct render options to renderer", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer: Buffer.from("PDF"),
      sizeBytes: 100
    });

    const contentDate = new Date("2025-06-15");

    await generateMagistratesPublicListPdf({
      artefactId: "render-options-test",
      contentDate,
      locale: "cy",
      locationId: "999",
      jsonData: mockJsonData
    });

    expect(renderMagistratesPublicListData).toHaveBeenCalledWith(mockJsonData, {
      contentDate,
      locale: "cy",
      locationId: "999"
    });
  });

  it("should handle exception thrown during generation", async () => {
    vi.mocked(renderMagistratesPublicListData).mockRejectedValue(new Error("Unexpected failure"));

    const result = await generateMagistratesPublicListPdf({
      artefactId: "exception-test",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockJsonData
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unexpected failure");
  });
});
