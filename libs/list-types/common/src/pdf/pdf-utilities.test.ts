import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildPdfFromRenderedList,
  configureNunjucks,
  createPdfErrorResult,
  generateListPdf,
  loadTranslations,
  MAX_PDF_SIZE_BYTES,
  savePdfToStorage
} from "./pdf-utilities.js";

const { mockUploadBlob, mockGeneratePdfFromHtml, mockNunjucksEnv } = vi.hoisted(() => ({
  mockUploadBlob: vi.fn(),
  mockGeneratePdfFromHtml: vi.fn(),
  mockNunjucksEnv: {
    render: vi.fn(() => "<html>test</html>"),
    renderString: vi.fn()
  }
}));

vi.mock("@hmcts/azure-blob", () => ({
  uploadBlob: mockUploadBlob,
  CONTAINER: { ARTEFACT: "artefact", PUBLICATIONS: "publications" }
}));

vi.mock("@hmcts/pdf-generation", () => ({
  generatePdfFromHtml: mockGeneratePdfFromHtml
}));

vi.mock("nunjucks", () => ({
  default: {
    configure: vi.fn(() => mockNunjucksEnv)
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

describe("buildPdfFromRenderedList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadBlob.mockResolvedValue(undefined);
  });

  it("should return success result when PDF generation succeeds", async () => {
    mockGeneratePdfFromHtml.mockResolvedValue({ success: true, pdfBuffer: Buffer.from("pdf"), sizeBytes: 512 });

    const result = await buildPdfFromRenderedList({
      artefactId: "artefact-1",
      templateDir: "/templates",
      header: { court: "Test Court" },
      hearings: [{ case: "Test" }],
      provenanceLabel: "Manual Upload",
      translations: { title: "Test" }
    });

    expect(result.success).toBe(true);
    expect(result.pdfPath).toBe("artefact-1.pdf");
    expect(result.sizeBytes).toBe(512);
    expect(mockUploadBlob).toHaveBeenCalled();
  });

  it("should return failure when pdfResult.success is false", async () => {
    mockGeneratePdfFromHtml.mockResolvedValue({ success: false, error: "Render error" });

    const result = await buildPdfFromRenderedList({
      artefactId: "artefact-2",
      templateDir: "/templates",
      header: {},
      hearings: [],
      provenanceLabel: "",
      translations: {}
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Render error");
    expect(mockUploadBlob).not.toHaveBeenCalled();
  });

  it("should return failure with default message when success is true but pdfBuffer is undefined", async () => {
    mockGeneratePdfFromHtml.mockResolvedValue({ success: true, pdfBuffer: undefined });

    const result = await buildPdfFromRenderedList({
      artefactId: "artefact-3",
      templateDir: "/templates",
      header: {},
      hearings: [],
      provenanceLabel: "",
      translations: {}
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("PDF generation failed");
    expect(mockUploadBlob).not.toHaveBeenCalled();
  });
});

describe("generateListPdf", () => {
  const mockEnTranslations = { title: "English" };
  const importEn = vi.fn().mockResolvedValue({ en: mockEnTranslations });
  const importCy = vi.fn().mockResolvedValue({ cy: {} });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUploadBlob.mockResolvedValue(undefined);
    importEn.mockResolvedValue({ en: mockEnTranslations });
    importCy.mockResolvedValue({ cy: {} });
  });

  it("should return success result when renderData and PDF generation succeed", async () => {
    mockGeneratePdfFromHtml.mockResolvedValue({ success: true, pdfBuffer: Buffer.from("pdf"), sizeBytes: 1024 });

    const result = await generateListPdf({
      artefactId: "list-artefact",
      locale: "en",
      locationId: "1",
      contentDate: new Date("2025-01-01"),
      jsonData: { data: "test" },
      listTitle: "Test List",
      provenanceLabel: "Manual Upload",
      templateDir: "/templates",
      renderData: () => ({ header: { court: "Test" }, hearings: [] }),
      importEn,
      importCy
    });

    expect(result.success).toBe(true);
    expect(result.pdfPath).toBe("list-artefact.pdf");
  });

  it("should return error result when renderData throws", async () => {
    const result = await generateListPdf({
      artefactId: "list-artefact-error",
      locale: "en",
      locationId: "1",
      contentDate: new Date("2025-01-01"),
      jsonData: {},
      listTitle: "Test List",
      provenanceLabel: "",
      templateDir: "/templates",
      renderData: () => {
        throw new Error("Render failed");
      },
      importEn,
      importCy
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to generate PDF: Render failed");
  });
});
