import * as fs from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getContentType, getFileBuffer, getFileExtension, getFileName } from "./file-retrieval.js";

vi.mock("node:fs/promises");

describe("file-retrieval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getFileBuffer", () => {
    it("should return file buffer for valid artefactId", async () => {
      const mockBuffer = Buffer.from("test file content");
      vi.mocked(fs.readdir).mockResolvedValue(["test-id.docx"] as any);
      vi.mocked(fs.readFile).mockResolvedValue(mockBuffer);

      const result = await getFileBuffer("test-id");

      expect(result).toEqual(mockBuffer);
      expect(fs.readdir).toHaveBeenCalled();
      expect(fs.readFile).toHaveBeenCalled();
    });

    it("should find file with different extensions", async () => {
      const mockBuffer = Buffer.from("test pdf content");
      vi.mocked(fs.readdir).mockResolvedValue(["test-id.pdf", "other-file.txt"] as any);
      vi.mocked(fs.readFile).mockResolvedValue(mockBuffer);

      const result = await getFileBuffer("test-id");

      expect(result).toEqual(mockBuffer);
    });

    it("should return null for non-existent file", async () => {
      vi.mocked(fs.readdir).mockResolvedValue(["other-file.pdf"] as any);

      const result = await getFileBuffer("non-existent-id");

      expect(result).toBeNull();
    });

    it("should prevent path traversal attacks", async () => {
      const maliciousId = "../../../etc/passwd";
      vi.mocked(fs.readdir).mockResolvedValue(["../../../etc/passwd"] as any);
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from("malicious"));

      const result = await getFileBuffer(maliciousId);

      expect(result).toBeNull();
    });
  });

  describe("getFileExtension", () => {
    it("should return file extension from filesystem", async () => {
      vi.mocked(fs.readdir).mockResolvedValue(["test-id.docx"] as any);
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from("test"));

      const result = await getFileExtension("test-id");

      expect(result).toBe(".docx");
    });

    it("should default to .pdf when file not found", async () => {
      vi.mocked(fs.readdir).mockResolvedValue(["other-file.pdf"] as any);

      const result = await getFileExtension("non-existent-id");

      expect(result).toBe(".pdf");
    });
  });

  describe("getContentType", () => {
    it("should return application/pdf for .pdf extension", () => {
      const result = getContentType(".pdf");

      expect(result).toBe("application/pdf");
    });

    it("should return correct MIME type for .docx extension", () => {
      const result = getContentType(".docx");

      expect(result).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    });

    it("should return correct MIME type for .html extension", () => {
      const result = getContentType(".html");

      expect(result).toBe("text/html");
    });

    it("should return correct MIME type for .csv extension", () => {
      const result = getContentType(".csv");

      expect(result).toBe("text/csv");
    });

    it("should default to application/pdf when extension is null", () => {
      const result = getContentType(null);

      expect(result).toBe("application/pdf");
    });
  });

  describe("getFileName", () => {
    it("should return filename with .pdf extension when no extension provided", () => {
      const result = getFileName("test-artefact-id", null);

      expect(result).toBe("test-artefact-id.pdf");
    });

    it("should return filename with provided extension", () => {
      const result = getFileName("test-artefact-id", ".docx");

      expect(result).toBe("test-artefact-id.docx");
    });

    it("should handle UUID format with custom extension", () => {
      const uuid = "c1baacc3-8280-43ae-8551-24080c0654f9";
      const result = getFileName(uuid, ".csv");

      expect(result).toBe(`${uuid}.csv`);
    });
  });
});
