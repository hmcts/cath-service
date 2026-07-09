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
  renderMagistratesPublicAdultCourtListData: vi.fn()
}));

vi.mock("@hmcts/publication", () => ({
  PROVENANCE_LABELS: {
    CRIME_IDAM: "Crime IDAM"
  }
}));

import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { renderMagistratesPublicAdultCourtListData } from "../rendering/renderer.js";
import { generateMagistratesPublicAdultCourtListPdf } from "./pdf-generator.js";

const mockRenderedData = {
  header: {
    locationName: "Manchester Crown Court",
    contentDate: "13 September 2025",
    publishedDate: "13 September 2025",
    publishedTime: "9am"
  },
  listData: [
    {
      lja: "Greater Manchester",
      courtName: "Manchester Crown Court",
      courtRoom: 1,
      sessionStartTime: "09:00",
      cases: [{ blockStartTime: "09:00", defendantName: "SMITH, John", caseNumber: "1234567890" }]
    }
  ]
};

const mockJsonData = {
  document: {
    data: {
      job: {
        printdate: "13/09/2025",
        sessions: {
          session: [
            {
              lja: "Greater Manchester",
              court: "Manchester Crown Court",
              room: 1,
              sstart: "09:00",
              blocks: { block: [{ bstart: "09:00", cases: { case: [{ caseno: "1234567890", def_name: "SMITH, John" }] } }] }
            }
          ]
        }
      }
    }
  }
};

describe("generateMagistratesPublicAdultCourtListPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(renderMagistratesPublicAdultCourtListData).mockResolvedValue(mockRenderedData);
    mockUploadBlob.mockResolvedValue(undefined);
  });

  it("should generate PDF successfully", async () => {
    const pdfBuffer = Buffer.from("PDF content");
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer, sizeBytes: 1024 });

    const result = await generateMagistratesPublicAdultCourtListPdf({
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
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: largePdfBuffer, sizeBytes: 3 * 1024 * 1024 });

    const result = await generateMagistratesPublicAdultCourtListPdf({
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
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: false, error: "Puppeteer crashed" });

    const result = await generateMagistratesPublicAdultCourtListPdf({
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
    vi.mocked(generatePdfFromHtml).mockResolvedValue({ success: true, pdfBuffer: undefined as unknown as Buffer, sizeBytes: 0 });

    const result = await generateMagistratesPublicAdultCourtListPdf({
      artefactId: "no-buffer",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: mockJsonData
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed");
  });

  it("should handle exception thrown during generation", async () => {
    vi.mocked(renderMagistratesPublicAdultCourtListData).mockRejectedValue(new Error("Unexpected failure"));

    const result = await generateMagistratesPublicAdultCourtListPdf({
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
