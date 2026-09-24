import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/azure-blob", () => ({
  uploadBlob: vi.fn(),
  getBlobUrl: vi.fn()
}));

describe("file-storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("saveUploadedFile", () => {
    it("should upload blob with artefactId as name (no extension)", async () => {
      // Arrange
      const { getBlobUrl, uploadBlob } = await import("@hmcts/azure-blob");
      vi.mocked(uploadBlob).mockResolvedValue(undefined);
      vi.mocked(getBlobUrl).mockReturnValue("https://account.blob.core.windows.net/artefact/test-artefact-123");
      const { saveUploadedFile } = await import("./file-storage.js");

      // Act
      await saveUploadedFile("test-artefact-123", "upload.json", Buffer.from("{}"));

      // Assert
      expect(uploadBlob).toHaveBeenCalledWith("test-artefact-123", Buffer.from("{}"));
    });

    it("should upload blob with artefactId as name regardless of original file extension", async () => {
      // Arrange
      const { getBlobUrl, uploadBlob } = await import("@hmcts/azure-blob");
      vi.mocked(uploadBlob).mockResolvedValue(undefined);
      vi.mocked(getBlobUrl).mockReturnValue("https://account.blob.core.windows.net/artefact/artefact-456");
      const { saveUploadedFile } = await import("./file-storage.js");

      // Act
      await saveUploadedFile("artefact-456", "document.pdf", Buffer.from("pdf-content"));

      // Assert
      expect(uploadBlob).toHaveBeenCalledWith("artefact-456", Buffer.from("pdf-content"));
    });

    it("should return the blob url so the Artefact response can carry it as payload", async () => {
      // Arrange
      const { getBlobUrl, uploadBlob } = await import("@hmcts/azure-blob");
      vi.mocked(uploadBlob).mockResolvedValue(undefined);
      vi.mocked(getBlobUrl).mockReturnValue("https://account.blob.core.windows.net/artefact/artefact-789");
      const { saveUploadedFile } = await import("./file-storage.js");

      // Act
      const result = await saveUploadedFile("artefact-789", "upload.json", Buffer.from("{}"));

      // Assert
      expect(result).toBe("https://account.blob.core.windows.net/artefact/artefact-789");
      expect(getBlobUrl).toHaveBeenCalledWith("artefact-789");
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
