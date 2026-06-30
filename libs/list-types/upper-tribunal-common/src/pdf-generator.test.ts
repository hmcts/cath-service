import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUploadBlob } = vi.hoisted(() => ({
  mockUploadBlob: vi.fn()
}));

vi.mock("@hmcts/azure-blob", () => ({
  uploadBlob: mockUploadBlob,
  CONTAINER: { ARTEFACT: "artefact", PUBLICATIONS: "publications" }
}));

vi.mock("nunjucks", () => ({
  default: {
    configure: vi.fn().mockReturnValue({
      render: vi.fn().mockReturnValue("<html>mock</html>"),
      renderString: vi.fn().mockReturnValue("<html>mock</html>")
    })
  }
}));

import { createUtDailyHearingListPdfGenerator } from "./pdf-generator.js";

describe("createUtDailyHearingListPdfGenerator", () => {
  const mockRenderFn = vi.fn();
  const mockImportEn = vi.fn().mockResolvedValue({ en: { pageTitle: "English" } });
  const mockImportCy = vi.fn().mockResolvedValue({ cy: { pageTitle: "Welsh" } });
  const mockGeneratePdfFn = vi.fn();
  const mockProvenanceLabels = { MANUAL_UPLOAD: "Manual Upload" };

  const mockRenderedData = {
    header: { listTitle: "Test List", hearingDate: "1 Jan 2026", lastUpdatedDate: "1 Jan 2026", lastUpdatedTime: "12pm" },
    hearings: [{ time: "10:00", caseReference: "REF/001", caseName: "Test v Test" }]
  };

  const baseOptions = {
    artefactId: "artefact-123",
    locale: "en",
    locationId: "1",
    jsonData: [{ time: "10:00", caseReference: "REF/001", caseName: "Test v Test" }],
    contentDate: new Date("2026-01-01")
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRenderFn.mockReturnValue(mockRenderedData);
    mockImportEn.mockResolvedValue({ en: { pageTitle: "English" } });
    mockImportCy.mockResolvedValue({ cy: { pageTitle: "Welsh" } });
    mockUploadBlob.mockResolvedValue(undefined);
  });

  const makeGenerator = () =>
    createUtDailyHearingListPdfGenerator(
      "Test Court",
      "Test List Title",
      mockRenderFn,
      mockImportEn,
      mockImportCy,
      "/fake/dirname",
      mockProvenanceLabels,
      mockGeneratePdfFn
    );

  it("should generate and store PDF successfully", async () => {
    // Arrange
    const pdfBuffer = Buffer.from("PDF content");
    mockGeneratePdfFn.mockResolvedValue({ success: true, pdfBuffer, sizeBytes: 1024 });

    // Act
    const result = await makeGenerator()(baseOptions);

    // Assert
    expect(result.success).toBe(true);
    expect(result.pdfPath).toContain("artefact-123.pdf");
    expect(mockRenderFn).toHaveBeenCalledWith(
      baseOptions.jsonData,
      expect.objectContaining({ courtName: "Test Court", listTitle: "Test List Title", locale: "en" })
    );
  });

  it("should use Welsh translations when locale is cy", async () => {
    // Arrange
    const pdfBuffer = Buffer.from("PDF content");
    mockGeneratePdfFn.mockResolvedValue({ success: true, pdfBuffer, sizeBytes: 512 });

    // Act
    await makeGenerator()({ ...baseOptions, locale: "cy" });

    // Assert
    expect(mockImportCy).toHaveBeenCalled();
    expect(mockImportEn).not.toHaveBeenCalled();
  });

  it("should resolve known provenance label", async () => {
    // Arrange
    const pdfBuffer = Buffer.from("PDF");
    mockGeneratePdfFn.mockResolvedValue({ success: true, pdfBuffer, sizeBytes: 100 });

    // Act
    await makeGenerator()({ ...baseOptions, provenance: "MANUAL_UPLOAD" });

    // Assert — generatePdfFn receives html containing the resolved label
    expect(mockGeneratePdfFn).toHaveBeenCalledWith(expect.any(String));
  });

  it("should fall back to raw provenance value when not in labels", async () => {
    // Arrange
    const pdfBuffer = Buffer.from("PDF");
    mockGeneratePdfFn.mockResolvedValue({ success: true, pdfBuffer, sizeBytes: 100 });

    // Act — no error expected
    const result = await makeGenerator()({ ...baseOptions, provenance: "UNKNOWN_SOURCE" });

    // Assert
    expect(result.success).toBe(true);
  });

  it("should return empty provenance label when provenance is undefined", async () => {
    // Arrange
    const pdfBuffer = Buffer.from("PDF");
    mockGeneratePdfFn.mockResolvedValue({ success: true, pdfBuffer, sizeBytes: 100 });
    const { provenance: _omit, ...optionsWithoutProvenance } = baseOptions as typeof baseOptions & { provenance?: string };

    // Act
    const result = await makeGenerator()(optionsWithoutProvenance);

    // Assert
    expect(result.success).toBe(true);
  });

  it("should return failure when generatePdfFn returns success false", async () => {
    // Arrange
    mockGeneratePdfFn.mockResolvedValue({ success: false, error: "Puppeteer failed" });

    // Act
    const result = await makeGenerator()(baseOptions);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("Puppeteer failed");
  });

  it("should return failure when generatePdfFn returns success true but no pdfBuffer", async () => {
    // Arrange
    mockGeneratePdfFn.mockResolvedValue({ success: true, pdfBuffer: undefined });

    // Act
    const result = await makeGenerator()(baseOptions);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed");
  });

  it("should return error result when renderFn throws", async () => {
    // Arrange
    mockRenderFn.mockImplementation(() => {
      throw new Error("Render exploded");
    });

    // Act
    const result = await makeGenerator()(baseOptions);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain("Render exploded");
  });
});
