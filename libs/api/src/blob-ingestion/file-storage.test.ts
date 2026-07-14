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
    it("should upload blob with artefactId as name (no extension)", async () => {
      // Arrange
      const { uploadBlob } = await import("@hmcts/azure-blob");
      vi.mocked(uploadBlob).mockResolvedValue(undefined);
      const { saveUploadedFile } = await import("./file-storage.js");

      // Act
      await saveUploadedFile("test-artefact-123", "upload.json", Buffer.from("{}"));

      // Assert
      expect(uploadBlob).toHaveBeenCalledWith("test-artefact-123", Buffer.from("{}"));
    });

    it("should upload blob with artefactId as name regardless of original file extension", async () => {
      // Arrange
      const { uploadBlob } = await import("@hmcts/azure-blob");
      vi.mocked(uploadBlob).mockResolvedValue(undefined);
      const { saveUploadedFile } = await import("./file-storage.js");

      // Act
      await saveUploadedFile("artefact-456", "document.pdf", Buffer.from("pdf-content"));

      // Assert
      expect(uploadBlob).toHaveBeenCalledWith("artefact-456", Buffer.from("pdf-content"));
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
