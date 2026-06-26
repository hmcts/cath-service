import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/azure-blob", () => ({
  uploadBlob: vi.fn()
}));

describe("file-storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("saveUploadedFile", () => {
    it("should upload blob and return file extension for JSON", async () => {
      // Arrange
      const { uploadBlob } = await import("@hmcts/azure-blob");
      vi.mocked(uploadBlob).mockResolvedValue(undefined);
      const { saveUploadedFile } = await import("./file-storage.js");

      // Act
      const result = await saveUploadedFile("test-artefact-123", "upload.json", Buffer.from("{}"));

      // Assert
      expect(uploadBlob).toHaveBeenCalledWith("test-artefact-123.json", Buffer.from("{}"));
      expect(result).toBe(".json");
    });

    it("should upload blob and return file extension for PDF", async () => {
      // Arrange
      const { uploadBlob } = await import("@hmcts/azure-blob");
      vi.mocked(uploadBlob).mockResolvedValue(undefined);
      const { saveUploadedFile } = await import("./file-storage.js");

      // Act
      const result = await saveUploadedFile("artefact-456", "document.pdf", Buffer.from("pdf-content"));

      // Assert
      expect(uploadBlob).toHaveBeenCalledWith("artefact-456.pdf", Buffer.from("pdf-content"));
      expect(result).toBe(".pdf");
    });

    it("should extract last extension from filename with multiple dots", async () => {
      // Arrange
      const { uploadBlob } = await import("@hmcts/azure-blob");
      vi.mocked(uploadBlob).mockResolvedValue(undefined);
      const { saveUploadedFile } = await import("./file-storage.js");

      // Act
      const result = await saveUploadedFile("multi-ext", "archive.tar.gz", Buffer.from("data"));

      // Assert
      expect(uploadBlob).toHaveBeenCalledWith("multi-ext.gz", Buffer.from("data"));
      expect(result).toBe(".gz");
    });

    it("should return empty string for filename without extension", async () => {
      // Arrange
      const { uploadBlob } = await import("@hmcts/azure-blob");
      vi.mocked(uploadBlob).mockResolvedValue(undefined);
      const { saveUploadedFile } = await import("./file-storage.js");

      // Act
      const result = await saveUploadedFile("artefact-789", "document", Buffer.from("content"));

      // Assert
      expect(uploadBlob).toHaveBeenCalledWith("artefact-789", Buffer.from("content"));
      expect(result).toBe("");
    });

    it("should propagate uploadBlob errors", async () => {
      // Arrange
      const { uploadBlob } = await import("@hmcts/azure-blob");
      vi.mocked(uploadBlob).mockRejectedValue(new Error("Upload failed"));
      const { saveUploadedFile } = await import("./file-storage.js");

      // Act & Assert
      await expect(saveUploadedFile("test", "file.txt", Buffer.from("data"))).rejects.toThrow("Upload failed");
    });
  });
});
