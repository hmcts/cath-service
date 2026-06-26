import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/azure-blob", () => ({
  downloadBlob: vi.fn(),
  CONTAINER: { ARTEFACT: "artefact", PUBLICATIONS: "publications" }
}));

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    artefact: {
      findUnique: vi.fn()
    }
  }
}));

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

  describe("getFileExtension", () => {
    it("should return stored extension from DB when artefact is found", async () => {
      // Arrange
      const { prisma } = await import("@hmcts/postgres-prisma");
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ fileExtension: ".pdf" } as any);
      const { getFileExtension } = await import("./file-retrieval.js");
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";

      // Act
      const result = await getFileExtension(artefactId);

      // Assert
      expect(result).toBe(".pdf");
      expect(prisma.artefact.findUnique).toHaveBeenCalledWith({
        where: { artefactId },
        select: { fileExtension: true }
      });
    });

    it("should return correct extension for different file types", async () => {
      // Arrange
      const { prisma } = await import("@hmcts/postgres-prisma");
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ fileExtension: ".docx" } as any);
      const { getFileExtension } = await import("./file-retrieval.js");

      // Act
      const result = await getFileExtension("550e8400-e29b-41d4-a716-446655440001");

      // Assert
      expect(result).toBe(".docx");
    });

    it("should return .pdf as default when artefact has null fileExtension", async () => {
      // Arrange
      const { prisma } = await import("@hmcts/postgres-prisma");
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ fileExtension: null } as any);
      const { getFileExtension } = await import("./file-retrieval.js");

      // Act
      const result = await getFileExtension("550e8400-e29b-41d4-a716-446655440000");

      // Assert
      expect(result).toBe(".pdf");
    });

    it("should return .pdf as default when artefact is not found", async () => {
      // Arrange
      const { prisma } = await import("@hmcts/postgres-prisma");
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(null);
      const { getFileExtension } = await import("./file-retrieval.js");

      // Act
      const result = await getFileExtension("550e8400-e29b-41d4-a716-446655440000");

      // Assert
      expect(result).toBe(".pdf");
    });
  });

  describe("getFileBuffer", () => {
    it("should return buffer when blob is found", async () => {
      // Arrange
      const { prisma } = await import("@hmcts/postgres-prisma");
      const { downloadBlob } = await import("@hmcts/azure-blob");
      const mockBuffer = Buffer.from("test content");
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ fileExtension: ".pdf" } as any);
      vi.mocked(downloadBlob).mockResolvedValue(mockBuffer);
      const { getFileBuffer } = await import("./file-retrieval.js");

      // Act
      const result = await getFileBuffer(artefactId);

      // Assert
      expect(result).toEqual(mockBuffer);
      expect(downloadBlob).toHaveBeenCalledWith(`${artefactId}.pdf`, "artefact");
    });

    it("should return null when blob is not found", async () => {
      // Arrange
      const { prisma } = await import("@hmcts/postgres-prisma");
      const { downloadBlob } = await import("@hmcts/azure-blob");
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ fileExtension: ".pdf" } as any);
      vi.mocked(downloadBlob).mockResolvedValue(null);
      const { getFileBuffer } = await import("./file-retrieval.js");

      // Act
      const result = await getFileBuffer(artefactId);

      // Assert
      expect(result).toBeNull();
    });

    it("should use .pdf fallback extension when artefact has no stored extension", async () => {
      // Arrange
      const { prisma } = await import("@hmcts/postgres-prisma");
      const { downloadBlob } = await import("@hmcts/azure-blob");
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(null);
      vi.mocked(downloadBlob).mockResolvedValue(Buffer.from("content"));
      const { getFileBuffer } = await import("./file-retrieval.js");

      // Act
      await getFileBuffer(artefactId);

      // Assert
      expect(downloadBlob).toHaveBeenCalledWith(`${artefactId}.pdf`, "artefact");
    });
  });

  describe("getContentType", () => {
    it("should return content type for .pdf extension", async () => {
      // Arrange
      const { getContentType } = await import("./file-retrieval.js");

      // Act
      const result = getContentType(".pdf");

      // Assert
      expect(result).toBe("application/pdf");
    });

    it("should return content type for .docx extension", async () => {
      // Arrange
      const { getContentType } = await import("./file-retrieval.js");

      // Act
      const result = getContentType(".docx");

      // Assert
      expect(result).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    });

    it("should return default content type for null", async () => {
      // Arrange
      const { getContentType } = await import("./file-retrieval.js");

      // Act
      const result = getContentType(null);

      // Assert
      expect(result).toBe("application/octet-stream");
    });

    it("should return default content type for undefined", async () => {
      // Arrange
      const { getContentType } = await import("./file-retrieval.js");

      // Act
      const result = getContentType(undefined);

      // Assert
      expect(result).toBe("application/octet-stream");
    });
  });

  describe("getFileName", () => {
    it("should return filename with extension", async () => {
      // Arrange
      const { getFileName } = await import("./file-retrieval.js");
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";

      // Act
      const result = getFileName(artefactId, ".pdf");

      // Assert
      expect(result).toBe(`${artefactId}.pdf`);
    });

    it("should return filename with .pdf when extension is null", async () => {
      // Arrange
      const { getFileName } = await import("./file-retrieval.js");
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";

      // Act
      const result = getFileName(artefactId, null);

      // Assert
      expect(result).toBe(`${artefactId}.pdf`);
    });

    it("should return filename with .pdf when extension is undefined", async () => {
      // Arrange
      const { getFileName } = await import("./file-retrieval.js");
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";

      // Act
      const result = getFileName(artefactId, undefined);

      // Assert
      expect(result).toBe(`${artefactId}.pdf`);
    });

    it("should handle different extensions", async () => {
      // Arrange
      const { getFileName } = await import("./file-retrieval.js");
      const artefactId = "550e8400-e29b-41d4-a716-446655440001";

      // Act
      const result = getFileName(artefactId, ".docx");

      // Assert
      expect(result).toBe(`${artefactId}.docx`);
    });

    it("should handle empty string extension", async () => {
      // Arrange
      const { getFileName } = await import("./file-retrieval.js");
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";

      // Act
      const result = getFileName(artefactId, "");

      // Assert
      expect(result).toBe(`${artefactId}.pdf`);
    });
  });

  describe("getPublicationJson", () => {
    it("should return parsed JSON when blob is found", async () => {
      // Arrange
      const { prisma } = await import("@hmcts/postgres-prisma");
      const { downloadBlob } = await import("@hmcts/azure-blob");
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";
      const data = { hearings: [{ id: 1 }] };
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ fileExtension: ".json" } as any);
      vi.mocked(downloadBlob).mockResolvedValue(Buffer.from(JSON.stringify(data)));
      const { getPublicationJson } = await import("./file-retrieval.js");

      // Act
      const result = await getPublicationJson(artefactId);

      // Assert
      expect(result).toEqual(data);
      expect(downloadBlob).toHaveBeenCalledWith(`${artefactId}.json`, "artefact");
    });

    it("should return null when blob is not found", async () => {
      // Arrange
      const { prisma } = await import("@hmcts/postgres-prisma");
      const { downloadBlob } = await import("@hmcts/azure-blob");
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ fileExtension: ".json" } as any);
      vi.mocked(downloadBlob).mockResolvedValue(null);
      const { getPublicationJson } = await import("./file-retrieval.js");

      // Act
      const result = await getPublicationJson(artefactId);

      // Assert
      expect(result).toBeNull();
    });

    it("should propagate JSON parse errors", async () => {
      // Arrange
      const { prisma } = await import("@hmcts/postgres-prisma");
      const { downloadBlob } = await import("@hmcts/azure-blob");
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ fileExtension: ".json" } as any);
      vi.mocked(downloadBlob).mockResolvedValue(Buffer.from("not valid json {{{"));
      const { getPublicationJson } = await import("./file-retrieval.js");

      // Act & Assert
      await expect(getPublicationJson(artefactId)).rejects.toThrow(SyntaxError);
    });
  });
});
