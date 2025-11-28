import fs from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock fs/promises
vi.mock("node:fs/promises", () => ({
  default: {
    mkdir: vi.fn(),
    writeFile: vi.fn()
  }
}));

describe("file-storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("saveUploadedFile", () => {
    it("should save file with artefactId as filename", async () => {
      const { saveUploadedFile } = await import("./file-storage.js");

      const artefactId = "test-artefact-123";
      const originalFileName = "document.pdf";
      const fileBuffer = Buffer.from("test file content");

      await saveUploadedFile(artefactId, originalFileName, fileBuffer);

      expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining("storage/temp/uploads"), { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(expect.stringContaining("test-artefact-123.pdf"), fileBuffer);
    });

    it("should extract and preserve file extension", async () => {
      const { saveUploadedFile } = await import("./file-storage.js");

      const artefactId = "artefact-456";
      const originalFileName = "report.docx";
      const fileBuffer = Buffer.from("test content");

      await saveUploadedFile(artefactId, originalFileName, fileBuffer);

      expect(fs.writeFile).toHaveBeenCalledWith(expect.stringContaining("artefact-456.docx"), fileBuffer);
    });

    it("should handle files without extension", async () => {
      const { saveUploadedFile } = await import("./file-storage.js");

      const artefactId = "artefact-789";
      const originalFileName = "document";
      const fileBuffer = Buffer.from("test content");

      await saveUploadedFile(artefactId, originalFileName, fileBuffer);

      expect(fs.writeFile).toHaveBeenCalledWith(expect.stringContaining("artefact-789"), fileBuffer);
    });

    it("should create storage directory if it doesn't exist", async () => {
      const { saveUploadedFile } = await import("./file-storage.js");

      const artefactId = "new-artefact";
      const originalFileName = "file.txt";
      const fileBuffer = Buffer.from("content");

      await saveUploadedFile(artefactId, originalFileName, fileBuffer);

      expect(fs.mkdir).toHaveBeenCalledTimes(1);
      expect(fs.mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });

    it("should handle multiple file extensions correctly", async () => {
      const { saveUploadedFile } = await import("./file-storage.js");

      const artefactId = "multi-ext";
      const originalFileName = "archive.tar.gz";
      const fileBuffer = Buffer.from("compressed data");

      await saveUploadedFile(artefactId, originalFileName, fileBuffer);

      expect(fs.writeFile).toHaveBeenCalledWith(expect.stringContaining("multi-ext.gz"), fileBuffer);
    });

    it("should save file to correct path structure", async () => {
      const { saveUploadedFile } = await import("./file-storage.js");

      const artefactId = "path-test";
      const originalFileName = "test.json";
      const fileBuffer = Buffer.from("{}");

      await saveUploadedFile(artefactId, originalFileName, fileBuffer);

      const writeFileCall = vi.mocked(fs.writeFile).mock.calls[0][0] as string;
      expect(writeFileCall).toContain("storage");
      expect(writeFileCall).toContain("temp");
      expect(writeFileCall).toContain("uploads");
      expect(writeFileCall).toContain("path-test.json");
    });

    it("should propagate mkdir errors", async () => {
      const { saveUploadedFile } = await import("./file-storage.js");

      const mkdirError = new Error("Permission denied");
      vi.mocked(fs.mkdir).mockRejectedValue(mkdirError);

      await expect(saveUploadedFile("test", "file.txt", Buffer.from("data"))).rejects.toThrow("Permission denied");
    });

    it("should propagate writeFile errors", async () => {
      const { saveUploadedFile } = await import("./file-storage.js");

      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      const writeError = new Error("Disk full");
      vi.mocked(fs.writeFile).mockRejectedValue(writeError);

      await expect(saveUploadedFile("test", "file.txt", Buffer.from("data"))).rejects.toThrow("Disk full");
    });
  });
});
