import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  configureNunjucks,
  createPdfErrorResult,
  generateFttSiacWeeklyHearingListPdf,
  loadTranslations,
  MAX_PDF_SIZE_BYTES,
  savePdfToStorage
} from "./pdf-utilities.js";

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

describe("configureNunjucks", () => {
  it("should return a nunjucks environment", () => {
    const env = configureNunjucks("/some/template/dir");

    expect(env).toBeDefined();
    expect(typeof env.render).toBe("function");
    expect(typeof env.renderString).toBe("function");
  });
});

describe("savePdfToStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadBlob.mockResolvedValue(undefined);
  });

  it("should upload PDF to blob storage and return success result", async () => {
    const artefactId = "test-artefact-123";
    const pdfBuffer = Buffer.from("test pdf content");
    const sizeBytes = 1024;

    const result = await savePdfToStorage(artefactId, pdfBuffer, sizeBytes);

    expect(result.success).toBe(true);
    expect(result.pdfPath).toBe(`${artefactId}.pdf`);
    expect(result.sizeBytes).toBe(sizeBytes);
    expect(result.exceedsMaxSize).toBe(false);
    expect(mockUploadBlob).toHaveBeenCalledWith(`${artefactId}.pdf`, pdfBuffer, "application/pdf", "publications");
  });

  it("should flag when PDF exceeds max size", async () => {
    const artefactId = "large-artefact";
    const pdfBuffer = Buffer.from("large pdf content");
    const sizeBytes = MAX_PDF_SIZE_BYTES + 1;

    const result = await savePdfToStorage(artefactId, pdfBuffer, sizeBytes);

    expect(result.success).toBe(true);
    expect(result.exceedsMaxSize).toBe(true);
    expect(result.sizeBytes).toBe(sizeBytes);
  });

  it("should not flag when PDF is exactly at max size", async () => {
    const artefactId = "exact-size-artefact";
    const pdfBuffer = Buffer.from("exact size pdf");
    const sizeBytes = MAX_PDF_SIZE_BYTES;

    const result = await savePdfToStorage(artefactId, pdfBuffer, sizeBytes);

    expect(result.success).toBe(true);
    expect(result.exceedsMaxSize).toBe(false);
  });

  it("should propagate upload errors", async () => {
    mockUploadBlob.mockRejectedValue(new Error("Blob upload failed"));
    const artefactId = "error-artefact";
    const pdfBuffer = Buffer.from("pdf data");

    await expect(savePdfToStorage(artefactId, pdfBuffer, 100)).rejects.toThrow("Blob upload failed");
  });
});

describe("createPdfErrorResult", () => {
  it("should create error result from Error instance", () => {
    const error = new Error("Something went wrong");

    const result = createPdfErrorResult(error);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to generate PDF: Something went wrong");
  });

  it("should create error result from non-Error value", () => {
    const error = "string error";

    const result = createPdfErrorResult(error);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to generate PDF: Unknown error");
  });

  it("should handle null error", () => {
    const result = createPdfErrorResult(null);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to generate PDF: Unknown error");
  });

  it("should handle undefined error", () => {
    const result = createPdfErrorResult(undefined);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to generate PDF: Unknown error");
  });
});

describe("loadTranslations", () => {
  const mockEnTranslations = { title: "English Title", description: "English Description" };
  const mockCyTranslations = { title: "Welsh Title", description: "Welsh Description" };

  const importEn = vi.fn().mockResolvedValue({ en: mockEnTranslations });
  const importCy = vi.fn().mockResolvedValue({ cy: mockCyTranslations });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should load English translations for 'en' locale", async () => {
    const result = await loadTranslations("en", importEn, importCy);

    expect(result).toEqual(mockEnTranslations);
    expect(importEn).toHaveBeenCalledTimes(1);
    expect(importCy).not.toHaveBeenCalled();
  });

  it("should load Welsh translations for 'cy' locale", async () => {
    const result = await loadTranslations("cy", importEn, importCy);

    expect(result).toEqual(mockCyTranslations);
    expect(importCy).toHaveBeenCalledTimes(1);
    expect(importEn).not.toHaveBeenCalled();
  });

  it("should default to English for unknown locale", async () => {
    const result = await loadTranslations("fr", importEn, importCy);

    expect(result).toEqual(mockEnTranslations);
    expect(importEn).toHaveBeenCalledTimes(1);
    expect(importCy).not.toHaveBeenCalled();
  });
});

describe("constants", () => {
  it("should have MAX_PDF_SIZE_BYTES set to 2MB", () => {
    expect(MAX_PDF_SIZE_BYTES).toBe(2 * 1024 * 1024);
  });
});

describe("generateFttSiacWeeklyHearingListPdf", () => {
  const mockGeneratePdf = vi.fn();
  const mockRenderData = vi.fn();
  const mockImportEn = vi.fn().mockResolvedValue({ en: { title: "English" } });
  const mockImportCy = vi.fn().mockResolvedValue({ cy: { title: "Welsh" } });

  const baseOptions = {
    artefactId: "test-artefact",
    locale: "en",
    locationId: "123",
    jsonData: [],
    courtName: "Test Court",
    listTitle: "Test List",
    moduleDir: "/fake/dir",
    provenanceLabel: "Test Source",
    importEn: mockImportEn,
    importCy: mockImportCy,
    generatePdf: mockGeneratePdf,
    renderData: mockRenderData
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadBlob.mockResolvedValue(undefined);
    mockRenderData.mockReturnValue({ header: { listTitle: "Test List" }, hearings: [] });
  });

  it("should generate PDF successfully and return success result", async () => {
    // Arrange
    const pdfBuffer = Buffer.from("PDF content");
    mockGeneratePdf.mockResolvedValue({ success: true, pdfBuffer, sizeBytes: 1024 });

    // Act
    const result = await generateFttSiacWeeklyHearingListPdf({ ...baseOptions, contentDate: new Date("2025-01-01") });

    // Assert
    expect(result.success).toBe(true);
    expect(result.pdfPath).toContain("test-artefact.pdf");
    expect(result.sizeBytes).toBe(1024);
    expect(result.exceedsMaxSize).toBe(false);
  });

  it("should return exceedsMaxSize true when PDF exceeds 2MB", async () => {
    // Arrange
    const largePdfBuffer = Buffer.alloc(3 * 1024 * 1024);
    mockGeneratePdf.mockResolvedValue({ success: true, pdfBuffer: largePdfBuffer, sizeBytes: 3 * 1024 * 1024 });

    // Act
    const result = await generateFttSiacWeeklyHearingListPdf({ ...baseOptions, contentDate: new Date("2025-01-01") });

    // Assert
    expect(result.success).toBe(true);
    expect(result.exceedsMaxSize).toBe(true);
  });

  it("should return error when PDF generation fails", async () => {
    // Arrange
    mockGeneratePdf.mockResolvedValue({ success: false, error: "Puppeteer crashed" });

    // Act
    const result = await generateFttSiacWeeklyHearingListPdf({ ...baseOptions, contentDate: new Date("2025-01-01") });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("Puppeteer crashed");
  });

  it("should pass correct render options including contentDate and lastReceivedDate", async () => {
    // Arrange
    const contentDate = new Date("2025-06-15");
    mockGeneratePdf.mockResolvedValue({ success: true, pdfBuffer: Buffer.from("PDF"), sizeBytes: 100 });

    // Act
    await generateFttSiacWeeklyHearingListPdf({ ...baseOptions, contentDate });

    // Assert
    expect(mockRenderData).toHaveBeenCalledWith([], {
      locale: "en",
      courtName: "Test Court",
      contentDate,
      lastReceivedDate: expect.any(String),
      listTitle: "Test List"
    });
  });

  it("should return error result when an exception is thrown", async () => {
    // Arrange
    mockRenderData.mockImplementation(() => {
      throw new Error("Render failed");
    });

    // Act
    const result = await generateFttSiacWeeklyHearingListPdf({ ...baseOptions, contentDate: new Date("2025-01-01") });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain("Render failed");
  });
});
