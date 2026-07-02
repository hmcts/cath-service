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
    it("should upload blob and return file extension for CSV", async () => {
      // Arrange
      const { uploadBlob } = await import("@hmcts/azure-blob");
      vi.mocked(uploadBlob).mockResolvedValue(undefined);
      const { saveUploadedFile } = await import("./file-storage.js");

      // Act
      const result = await saveUploadedFile("test-artefact-123", "hearing-list.csv", Buffer.from("a,b,c"));

      // Assert
      expect(uploadBlob).toHaveBeenCalledWith("test-artefact-123.csv", Buffer.from("a,b,c"));
      expect(result).toBe(".csv");
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

    it("should upload blob and return file extension for Excel", async () => {
      // Arrange
      const { uploadBlob } = await import("@hmcts/azure-blob");
      vi.mocked(uploadBlob).mockResolvedValue(undefined);
      const { saveUploadedFile } = await import("./file-storage.js");

      // Act
      const result = await saveUploadedFile("artefact-789", "report.xlsx", Buffer.from("xlsx-content"));

      // Assert
      expect(uploadBlob).toHaveBeenCalledWith("artefact-789.xlsx", Buffer.from("xlsx-content"));
      expect(result).toBe(".xlsx");
    });

    it("should propagate uploadBlob errors", async () => {
      // Arrange
      const { uploadBlob } = await import("@hmcts/azure-blob");
      vi.mocked(uploadBlob).mockRejectedValue(new Error("Upload failed"));
      const { saveUploadedFile } = await import("./file-storage.js");

      // Act & Assert
      await expect(saveUploadedFile("test", "file.csv", Buffer.from("data"))).rejects.toThrow("Upload failed");
    });
  });
});
