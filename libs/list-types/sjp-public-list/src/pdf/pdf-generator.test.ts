import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/pdf-generation", () => ({
  generatePdfFromHtml: vi.fn()
}));

vi.mock("@hmcts/list-types-common", () => ({
  extractPublicCases: vi.fn().mockReturnValue([]),
  loadTranslations: vi.fn().mockResolvedValue({
    common: { at: "at" },
    SJP_PUBLIC_LIST: { pdfTitle: "SJP Public List" }
  }),
  configureNunjucks: vi.fn().mockReturnValue({
    render: vi.fn().mockReturnValue("<html>test</html>")
  }),
  formatLastUpdatedDateTime: vi.fn().mockReturnValue({ date: "01 January 2025", time: "12:00am" }),
  createPdfErrorResult: vi.fn((error) => ({
    success: false,
    error: `Failed to generate PDF: ${error instanceof Error ? error.message : "Unknown error"}`
  })),
  savePdfToStorage: vi.fn(),
  PDF_BASE_STYLES: ""
}));

import { savePdfToStorage } from "@hmcts/list-types-common";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { generateSjpPublicListPdf } from "./pdf-generator.js";

describe("generateSjpPublicListPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(savePdfToStorage).mockResolvedValue({
      success: true,
      pdfPath: "test-artefact-123.pdf",
      sizeBytes: 1024,
      exceedsMaxSize: false
    });
  });

  it("should generate PDF successfully", async () => {
    const pdfBuffer = Buffer.from("PDF content");
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer,
      sizeBytes: 1024
    });

    const result = await generateSjpPublicListPdf({
      artefactId: "test-artefact-123",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: { document: { publicationDate: "2025-01-01" }, courtLists: [] },
      listTypeName: "SJP_PUBLIC_LIST"
    });

    expect(result.success).toBe(true);
    expect(result.pdfPath).toContain("test-artefact-123.pdf");
    expect(generatePdfFromHtml).toHaveBeenCalled();
    expect(savePdfToStorage).toHaveBeenCalledWith("test-artefact-123", pdfBuffer, 1024);
  });

  it("should handle PDF generation failure", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: false,
      error: "Chromium not found"
    });

    const result = await generateSjpPublicListPdf({
      artefactId: "test-artefact-456",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: { document: { publicationDate: "2025-01-01" }, courtLists: [] },
      listTypeName: "SJP_PUBLIC_LIST"
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Chromium not found");
  });

  it("should handle unexpected errors", async () => {
    vi.mocked(generatePdfFromHtml).mockImplementation(() => {
      throw new Error("Unexpected failure");
    });

    const result = await generateSjpPublicListPdf({
      artefactId: "test-artefact-789",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: { document: { publicationDate: "2025-01-01" }, courtLists: [] },
      listTypeName: "SJP_PUBLIC_LIST"
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unexpected failure");
  });
});
