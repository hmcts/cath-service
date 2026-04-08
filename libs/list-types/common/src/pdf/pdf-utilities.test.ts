import { beforeEach, describe, expect, it, vi } from "vitest";
import { configureNunjucks, createPdfErrorResult, loadTranslations, MAX_PDF_SIZE_BYTES, savePdfToStorage, TEMP_STORAGE_BASE } from "./pdf-utilities.js";

vi.mock("node:fs/promises", () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined)
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
  });

  it("should save PDF and return success result", async () => {
    const artefactId = "test-artefact-123";
    const pdfBuffer = Buffer.from("test pdf content");
    const sizeBytes = 1024;

    const result = await savePdfToStorage(artefactId, pdfBuffer, sizeBytes);

    expect(result.success).toBe(true);
    expect(result.pdfPath).toContain(artefactId);
    expect(result.pdfPath).toContain(".pdf");
    expect(result.sizeBytes).toBe(sizeBytes);
    expect(result.exceedsMaxSize).toBe(false);
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

  it("should create directory and write file", async () => {
    const fs = await import("node:fs/promises");
    const artefactId = "write-test";
    const pdfBuffer = Buffer.from("pdf data");

    await savePdfToStorage(artefactId, pdfBuffer, 100);

    expect(fs.default.mkdir).toHaveBeenCalledWith(TEMP_STORAGE_BASE, { recursive: true });
    expect(fs.default.writeFile).toHaveBeenCalledWith(expect.stringContaining(`${artefactId}.pdf`), pdfBuffer);
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

  it("should have TEMP_STORAGE_BASE path containing expected directories", () => {
    expect(TEMP_STORAGE_BASE).toContain("storage");
    expect(TEMP_STORAGE_BASE).toContain("temp");
    expect(TEMP_STORAGE_BASE).toContain("uploads");
  });
});
