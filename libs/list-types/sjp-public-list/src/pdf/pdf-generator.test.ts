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

vi.mock("@hmcts/publication", () => ({
  PROVENANCE_LABELS: { MANUAL_UPLOAD: "Manual Upload" }
}));

import fs from "node:fs/promises";
import { generatePdfFromHtml } from "@hmcts/pdf-generation";
import { generateSjpPublicListPdf } from "./pdf-generator.js";

describe("generateSjpPublicListPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
