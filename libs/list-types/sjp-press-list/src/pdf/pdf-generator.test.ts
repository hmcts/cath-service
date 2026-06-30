import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/pdf-generation", () => ({
  generatePdfFromHtml: vi.fn()
}));

vi.mock("@hmcts/list-types-common", () => ({
  extractPressCases: vi.fn().mockReturnValue([]),
  loadTranslations: vi.fn().mockResolvedValue({
    common: { at: "at" },
    SJP_PRESS_LIST: { title: "SJP Press List" },
    SJP_DELTA_PRESS_LIST: { title: "SJP Delta Press List" }
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
import { generateSjpPressListPdf } from "./pdf-generator.js";

describe("generateSjpPressListPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(savePdfToStorage).mockResolvedValue({
      success: true,
      pdfPath: "test-press-artefact-123.pdf",
      sizeBytes: 2048,
      exceedsMaxSize: false
    });
  });

  it("should generate PDF successfully", async () => {
    const pdfBuffer = Buffer.from("PDF content");
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: true,
      pdfBuffer,
      sizeBytes: 2048
    });

    const result = await generateSjpPressListPdf({
      artefactId: "test-press-artefact-123",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: { document: { publicationDate: "2025-01-01" }, courtLists: [] },
      listTypeName: "SJP_PRESS_LIST"
    });

    expect(result.success).toBe(true);
    expect(result.pdfPath).toContain("test-press-artefact-123.pdf");
    expect(generatePdfFromHtml).toHaveBeenCalled();
    expect(savePdfToStorage).toHaveBeenCalledWith("test-press-artefact-123", pdfBuffer, 2048);
  });

  it("should handle PDF generation failure", async () => {
    vi.mocked(generatePdfFromHtml).mockResolvedValue({
      success: false,
      error: "Chromium not found"
    });

    const result = await generateSjpPressListPdf({
      artefactId: "test-press-artefact-456",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: { document: { publicationDate: "2025-01-01" }, courtLists: [] },
      listTypeName: "SJP_PRESS_LIST"
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Chromium not found");
  });

  it("should handle unexpected errors", async () => {
    vi.mocked(generatePdfFromHtml).mockImplementation(() => {
      throw new Error("Unexpected failure");
    });

    const result = await generateSjpPressListPdf({
      artefactId: "test-press-artefact-789",
      contentDate: new Date("2025-01-01"),
      locale: "en",
      locationId: "240",
      jsonData: { document: { publicationDate: "2025-01-01" }, courtLists: [] },
      listTypeName: "SJP_PRESS_LIST"
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unexpected failure");
  });
});
