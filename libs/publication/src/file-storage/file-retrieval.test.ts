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

  describe("getSourceArtefactId", () => {
    it("should return sourceArtefactId when artefact is found", async () => {
      // Arrange
      const { prisma } = await import("@hmcts/postgres-prisma");
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ sourceArtefactId: "civil-daily-cause-list.pdf" } as any);
      const { getSourceArtefactId } = await import("./file-retrieval.js");
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";

      // Act
      const result = await getSourceArtefactId(artefactId);

      // Assert
      expect(result).toBe("civil-daily-cause-list.pdf");
      expect(prisma.artefact.findUnique).toHaveBeenCalledWith({
        where: { artefactId },
        select: { sourceArtefactId: true }
      });
    });

    it("should return fallback <artefactId>.pdf when sourceArtefactId is null", async () => {
      // Arrange
      const { prisma } = await import("@hmcts/postgres-prisma");
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ sourceArtefactId: null } as any);
      const { getSourceArtefactId } = await import("./file-retrieval.js");

      // Act
      const result = await getSourceArtefactId(artefactId);

      // Assert
      expect(result).toBe(`${artefactId}.pdf`);
    });

    it("should return fallback <artefactId>.pdf when artefact is not found", async () => {
      // Arrange
      const { prisma } = await import("@hmcts/postgres-prisma");
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(null);
      const { getSourceArtefactId } = await import("./file-retrieval.js");

      // Act
      const result = await getSourceArtefactId(artefactId);

      // Assert
      expect(result).toBe(`${artefactId}.pdf`);
    });
  });

  describe("getFileExtension", () => {
    it("should return extension derived from sourceArtefactId", async () => {
      // Arrange
      const { prisma } = await import("@hmcts/postgres-prisma");
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ sourceArtefactId: "civil-daily-cause-list.pdf" } as any);
      const { getFileExtension } = await import("./file-retrieval.js");
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";

      // Act
      const result = await getFileExtension(artefactId);

      // Assert
      expect(result).toBe(".pdf");
    });

    it("should return correct extension for different file types", async () => {
      // Arrange
      const { prisma } = await import("@hmcts/postgres-prisma");
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ sourceArtefactId: "my-document.docx" } as any);
      const { getFileExtension } = await import("./file-retrieval.js");

      // Act
      const result = await getFileExtension("550e8400-e29b-41d4-a716-446655440001");

      // Assert
      expect(result).toBe(".docx");
    });

    it("should return .pdf as default when sourceArtefactId is null", async () => {
      // Arrange
      const { prisma } = await import("@hmcts/postgres-prisma");
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ sourceArtefactId: null } as any);
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
    it("should return buffer when new-style blob (no extension) is found", async () => {
      // Arrange
      const { prisma } = await import("@hmcts/postgres-prisma");
      const { downloadBlob } = await import("@hmcts/azure-blob");
      const mockBuffer = Buffer.from("test content");
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ sourceArtefactId: "civil-daily-cause-list.pdf" } as any);
      vi.mocked(downloadBlob).mockResolvedValue(mockBuffer);
      const { getFileBuffer } = await import("./file-retrieval.js");

      // Act
      const result = await getFileBuffer(artefactId);

      // Assert
      expect(result).toEqual(mockBuffer);
      expect(downloadBlob).toHaveBeenCalledWith(artefactId, "artefact");
    });

    it("should fall back to legacy blob with extension when new-style blob is missing", async () => {
      // Arrange: artefact was uploaded before the fix — blob name has .pdf extension
      const { prisma } = await import("@hmcts/postgres-prisma");
      const { downloadBlob } = await import("@hmcts/azure-blob");
      const legacyBuffer = Buffer.from("legacy content");
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ sourceArtefactId: "civil-daily-cause-list.pdf" } as any);
      vi.mocked(downloadBlob).mockImplementation((blobName: string) => {
        if (blobName === artefactId) return Promise.resolve(null);
        if (blobName === `${artefactId}.pdf`) return Promise.resolve(legacyBuffer);
        return Promise.resolve(null);
      });
      const { getFileBuffer } = await import("./file-retrieval.js");

      // Act
      const result = await getFileBuffer(artefactId);

      // Assert
      expect(result).toEqual(legacyBuffer);
      expect(downloadBlob).toHaveBeenCalledWith(artefactId, "artefact");
      expect(downloadBlob).toHaveBeenCalledWith(`${artefactId}.pdf`, "artefact");
    });

    it("should return null when no blob is found in any location", async () => {
      // Arrange
      const { prisma } = await import("@hmcts/postgres-prisma");
      const { downloadBlob } = await import("@hmcts/azure-blob");
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ sourceArtefactId: "civil-daily-cause-list.pdf" } as any);
      vi.mocked(downloadBlob).mockResolvedValue(null);
      const { getFileBuffer } = await import("./file-retrieval.js");

      // Act
      const result = await getFileBuffer(artefactId);

      // Assert
      expect(result).toBeNull();
    });

    it("should use .pdf fallback extension for legacy lookup when artefact has no sourceArtefactId", async () => {
      // Arrange
      const { prisma } = await import("@hmcts/postgres-prisma");
      const { downloadBlob } = await import("@hmcts/azure-blob");
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(null);
      vi.mocked(downloadBlob).mockImplementation((blobName: string) => {
        if (blobName === artefactId) return Promise.resolve(null);
        return Promise.resolve(Buffer.from("legacy"));
      });
      const { getFileBuffer } = await import("./file-retrieval.js");

      // Act
      await getFileBuffer(artefactId);

      // Assert
      expect(downloadBlob).toHaveBeenCalledWith(artefactId, "artefact");
      expect(downloadBlob).toHaveBeenCalledWith(`${artefactId}.pdf`, "artefact");
    });

    it("should fall back to .json blob when legacy extension blob is also missing (non-strategic Excel uploads)", async () => {
      // Arrange: non-strategic Excel upload — source_artefact_id stores original .xlsx name
      // but the blob in storage is the converted .json
      const { prisma } = await import("@hmcts/postgres-prisma");
      const { downloadBlob } = await import("@hmcts/azure-blob");
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";
      const jsonBuffer = Buffer.from('{"hearings":[]}');
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ sourceArtefactId: "hearing-list.xlsx" } as any);
      vi.mocked(downloadBlob).mockImplementation((blobName: string) => {
        if (blobName === artefactId) return Promise.resolve(null);
        if (blobName === `${artefactId}.xlsx`) return Promise.resolve(null);
        if (blobName === `${artefactId}.json`) return Promise.resolve(jsonBuffer);
        return Promise.resolve(null);
      });
      const { getFileBuffer } = await import("./file-retrieval.js");

      // Act
      const result = await getFileBuffer(artefactId);

      // Assert
      expect(result).toEqual(jsonBuffer);
      expect(downloadBlob).toHaveBeenCalledWith(artefactId, "artefact");
      expect(downloadBlob).toHaveBeenCalledWith(`${artefactId}.xlsx`, "artefact");
      expect(downloadBlob).toHaveBeenCalledWith(`${artefactId}.json`, "artefact");
    });

    it("should return null when all fallback lookups miss", async () => {
      // Arrange
      const { prisma } = await import("@hmcts/postgres-prisma");
      const { downloadBlob } = await import("@hmcts/azure-blob");
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ sourceArtefactId: "hearing-list.xlsx" } as any);
      vi.mocked(downloadBlob).mockResolvedValue(null);
      const { getFileBuffer } = await import("./file-retrieval.js");

      // Act
      const result = await getFileBuffer(artefactId);

      // Assert
      expect(result).toBeNull();
    });

    it("should not fall back to .json when legacy extension is already .json and all blobs are missing", async () => {
      // Arrange: .json extension — the .json fallback path should not add a second .json attempt
      const { prisma } = await import("@hmcts/postgres-prisma");
      const { downloadBlob } = await import("@hmcts/azure-blob");
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ sourceArtefactId: "upload.json" } as any);
      vi.mocked(downloadBlob).mockResolvedValue(null);
      const { getFileBuffer } = await import("./file-retrieval.js");

      // Act
      const result = await getFileBuffer(artefactId);

      // Assert
      expect(result).toBeNull();
      // artefactId (new), artefactId.json (legacy) — no third attempt
      expect(downloadBlob).toHaveBeenCalledTimes(2);
      expect(downloadBlob).toHaveBeenCalledWith(artefactId, "artefact");
      expect(downloadBlob).toHaveBeenCalledWith(`${artefactId}.json`, "artefact");
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
    it("should return the sourceArtefactId directly", async () => {
      // Arrange
      const { getFileName } = await import("./file-retrieval.js");

      // Act
      const result = getFileName("civil-daily-cause-list.pdf");

      // Assert
      expect(result).toBe("civil-daily-cause-list.pdf");
    });

    it("should return the original file name for docx files", async () => {
      // Arrange
      const { getFileName } = await import("./file-retrieval.js");

      // Act
      const result = getFileName("my-document.docx");

      // Assert
      expect(result).toBe("my-document.docx");
    });

    it("should return upload.json for API ingested files", async () => {
      // Arrange
      const { getFileName } = await import("./file-retrieval.js");

      // Act
      const result = getFileName("upload.json");

      // Assert
      expect(result).toBe("upload.json");
    });

    it("should return backfilled uuid-based name for legacy artefacts", async () => {
      // Arrange
      const { getFileName } = await import("./file-retrieval.js");
      const legacyName = "550e8400-e29b-41d4-a716-446655440000.pdf";

      // Act
      const result = getFileName(legacyName);

      // Assert
      expect(result).toBe(legacyName);
    });
  });

  describe("getPublicationJson", () => {
    it("should return parsed JSON when blob is found", async () => {
      // Arrange
      const { prisma } = await import("@hmcts/postgres-prisma");
      const { downloadBlob } = await import("@hmcts/azure-blob");
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";
      const data = { hearings: [{ id: 1 }] };
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ sourceArtefactId: "upload.json" } as any);
      vi.mocked(downloadBlob).mockResolvedValue(Buffer.from(JSON.stringify(data)));
      const { getPublicationJson } = await import("./file-retrieval.js");

      // Act
      const result = await getPublicationJson(artefactId);

      // Assert
      expect(result).toEqual(data);
      expect(downloadBlob).toHaveBeenCalledWith(artefactId, "artefact");
    });

    it("should return null when blob is not found", async () => {
      // Arrange
      const { prisma } = await import("@hmcts/postgres-prisma");
      const { downloadBlob } = await import("@hmcts/azure-blob");
      const artefactId = "550e8400-e29b-41d4-a716-446655440000";
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ sourceArtefactId: "upload.json" } as any);
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
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ sourceArtefactId: "upload.json" } as any);
      vi.mocked(downloadBlob).mockResolvedValue(Buffer.from("not valid json {{{"));
      const { getPublicationJson } = await import("./file-retrieval.js");

      // Act & Assert
      await expect(getPublicationJson(artefactId)).rejects.toThrow(SyntaxError);
    });
  });
});
