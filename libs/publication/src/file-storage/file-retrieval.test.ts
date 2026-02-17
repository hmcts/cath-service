import fs from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { findFileByArtefactId, getContentType, getFileBuffer, getFileExtension, getFileName } from "./file-retrieval.js";

vi.mock("node:fs/promises");
vi.mock("./content-type.js", () => ({
  getContentTypeFromExtension: vi.fn((ext) => {
    if (ext === ".pdf") return "application/pdf";
    if (ext === ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    return "application/octet-stream";
  })
}));

describe("file-retrieval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findFileByArtefactId", () => {
    it("should return buffer and extension when file is found", async () => {
      const mockBuffer = Buffer.from("test content");
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";
      const fileName = `${artefactId}.pdf`;

      vi.mocked(fs.readdir).mockResolvedValue([fileName, "other-file.pdf"] as any);
      vi.mocked(fs.readFile).mockResolvedValue(mockBuffer);

      const result = await findFileByArtefactId(artefactId);

      expect(result).toEqual({
        buffer: mockBuffer,
        extension: ".pdf"
      });
      expect(fs.readdir).toHaveBeenCalledTimes(1);
      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });

    it("should return null when no matching file is found", async () => {
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";

      vi.mocked(fs.readdir).mockResolvedValue(["other-file.pdf", "another-file.docx"] as any);

      const result = await findFileByArtefactId(artefactId);

      expect(result).toBeNull();
      expect(fs.readdir).toHaveBeenCalledTimes(1);
      expect(fs.readFile).not.toHaveBeenCalled();
    });

    it("should return null when directory read fails", async () => {
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";

      vi.mocked(fs.readdir).mockRejectedValue(new Error("Directory not found"));

      const result = await findFileByArtefactId(artefactId);

      expect(result).toBeNull();
    });

    it("should return null when file read fails", async () => {
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";
      const fileName = `${artefactId}.pdf`;

      vi.mocked(fs.readdir).mockResolvedValue([fileName] as any);
      vi.mocked(fs.readFile).mockRejectedValue(new Error("File read error"));

      const result = await findFileByArtefactId(artefactId);

      expect(result).toBeNull();
    });

    it("should find file with different extensions", async () => {
      const mockBuffer = Buffer.from("docx content");
      const artefactId = "550e8400-e29b-41d4-a716-446655440001";
      const fileName = `${artefactId}.docx`;

      vi.mocked(fs.readdir).mockResolvedValue([fileName] as any);
      vi.mocked(fs.readFile).mockResolvedValue(mockBuffer);

      const result = await findFileByArtefactId(artefactId);

      expect(result).toEqual({
        buffer: mockBuffer,
        extension: ".docx"
      });
    });

    it("should match file that starts with artefactId", async () => {
      const mockBuffer = Buffer.from("test content");
      const artefactId = "550e8400";
      const fileName = `${artefactId}-extra-info.pdf`;

      vi.mocked(fs.readdir).mockResolvedValue([fileName] as any);
      vi.mocked(fs.readFile).mockResolvedValue(mockBuffer);

      const result = await findFileByArtefactId(artefactId);

      expect(result).toEqual({
        buffer: mockBuffer,
        extension: ".pdf"
      });
    });

    it("should find first matching file when multiple files start with artefactId", async () => {
      const mockBuffer = Buffer.from("test content");
      const artefactId = "550e8400";
      const files = [`${artefactId}.pdf`, `${artefactId}-v2.pdf`];

      vi.mocked(fs.readdir).mockResolvedValue(files as any);
      vi.mocked(fs.readFile).mockResolvedValue(mockBuffer);

      const result = await findFileByArtefactId(artefactId);

      expect(result).toEqual({
        buffer: mockBuffer,
        extension: ".pdf"
      });
    });

    it("should handle empty directory", async () => {
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";

      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const result = await findFileByArtefactId(artefactId);

      expect(result).toBeNull();
    });
  });

  describe("getFileBuffer", () => {
    it("should return buffer when file is found", async () => {
      const mockBuffer = Buffer.from("test content");
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";

      vi.mocked(fs.readdir).mockResolvedValue([`${artefactId}.pdf`] as any);
      vi.mocked(fs.readFile).mockResolvedValue(mockBuffer);

      const result = await getFileBuffer(artefactId);

      expect(result).toEqual(mockBuffer);
    });

    it("should return null when file is not found", async () => {
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";

      vi.mocked(fs.readdir).mockResolvedValue(["other-file.pdf"] as any);

      const result = await getFileBuffer(artefactId);

      expect(result).toBeNull();
    });

    it("should return null when findFileByArtefactId fails", async () => {
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";

      vi.mocked(fs.readdir).mockRejectedValue(new Error("Directory error"));

      const result = await getFileBuffer(artefactId);

      expect(result).toBeNull();
    });
  });

  describe("getFileExtension", () => {
    it("should return extension when file is found", async () => {
      const mockBuffer = Buffer.from("test content");
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";

      vi.mocked(fs.readdir).mockResolvedValue([`${artefactId}.pdf`] as any);
      vi.mocked(fs.readFile).mockResolvedValue(mockBuffer);

      const result = await getFileExtension(artefactId);

      expect(result).toBe(".pdf");
    });

    it("should return .pdf as default when file is not found", async () => {
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";

      vi.mocked(fs.readdir).mockResolvedValue(["other-file.pdf"] as any);

      const result = await getFileExtension(artefactId);

      expect(result).toBe(".pdf");
    });

    it("should return correct extension for different file types", async () => {
      const mockBuffer = Buffer.from("docx content");
      const artefactId = "550e8400-e29b-41d4-a716-446655440001";

      vi.mocked(fs.readdir).mockResolvedValue([`${artefactId}.docx`] as any);
      vi.mocked(fs.readFile).mockResolvedValue(mockBuffer);

      const result = await getFileExtension(artefactId);

      expect(result).toBe(".docx");
    });

    it("should return .pdf when findFileByArtefactId fails", async () => {
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";

      vi.mocked(fs.readdir).mockRejectedValue(new Error("Directory error"));

      const result = await getFileExtension(artefactId);

      expect(result).toBe(".pdf");
    });
  });

  describe("getContentType", () => {
    it("should return content type for .pdf extension", () => {
      const result = getContentType(".pdf");

      expect(result).toBe("application/pdf");
    });

    it("should return content type for .docx extension", () => {
      const result = getContentType(".docx");

      expect(result).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    });

    it("should return default content type for null", () => {
      const result = getContentType(null);

      expect(result).toBe("application/octet-stream");
    });

    it("should return default content type for undefined", () => {
      const result = getContentType(undefined);

      expect(result).toBe("application/octet-stream");
    });
  });

  describe("getFileName", () => {
    it("should return filename with extension", () => {
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";
      const extension = ".pdf";

      const result = getFileName(artefactId, extension);

      expect(result).toBe(`${artefactId}.pdf`);
    });

    it("should return filename with .pdf when extension is null", () => {
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";

      const result = getFileName(artefactId, null);

      expect(result).toBe(`${artefactId}.pdf`);
    });

    it("should return filename with .pdf when extension is undefined", () => {
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";

      const result = getFileName(artefactId, undefined);

      expect(result).toBe(`${artefactId}.pdf`);
    });

    it("should handle different extensions", () => {
      const artefactId = "550e8400-e29b-41d4-a716-446655440001";
      const extension = ".docx";

      const result = getFileName(artefactId, extension);

      expect(result).toBe(`${artefactId}.docx`);
    });

    it("should handle empty string extension", () => {
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";
      const extension = "";

      const result = getFileName(artefactId, extension);

      expect(result).toBe(`${artefactId}.pdf`);
    });
  });
});
