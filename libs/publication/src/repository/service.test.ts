import { beforeEach, describe, expect, it, vi } from "vitest";
import * as fileRetrieval from "../file-storage/file-retrieval.js";
import * as queries from "./queries.js";
import { getFlatFileUrl, getJsonContent, getRenderedTemplateUrl } from "./service.js";

vi.mock("./queries.js", () => ({
  getArtefactListTypeId: vi.fn()
}));

vi.mock("../file-storage/file-retrieval.js", () => ({
  getFileBuffer: vi.fn(),
  getFileExtension: vi.fn()
}));

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    listType: {
      findUnique: vi.fn()
    }
  }
}));

vi.mock("@hmcts/azure-blob", () => ({
  CONTAINER: { ARTEFACT: "artefact", FILES: "files", PUBLICATIONS: "publications" },
  getBlobProperties: vi.fn()
}));

import { getBlobProperties } from "@hmcts/azure-blob";
import { prisma } from "@hmcts/postgres-prisma";

describe("Publication Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getJsonContent", () => {
    it("should return parsed JSON content from blob storage", async () => {
      const mockContent = {
        document: {
          publicationDate: "2024-06-01",
          locationName: "Test Court"
        }
      };

      vi.mocked(fileRetrieval.getFileBuffer).mockResolvedValue(Buffer.from(JSON.stringify(mockContent)));

      const result = await getJsonContent("test-artefact-id");

      expect(result).toEqual(mockContent);
      expect(fileRetrieval.getFileBuffer).toHaveBeenCalledWith("test-artefact-id");
    });

    it("should return null when blob does not exist", async () => {
      vi.mocked(fileRetrieval.getFileBuffer).mockResolvedValue(null);

      const result = await getJsonContent("non-existent-id");

      expect(result).toBeNull();
    });

    it("should return null when JSON is invalid", async () => {
      vi.mocked(fileRetrieval.getFileBuffer).mockResolvedValue(Buffer.from("invalid json{"));

      const result = await getJsonContent("invalid-json-id");

      expect(result).toBeNull();
    });

    it("should reject path traversal attempts with ../", async () => {
      const result = await getJsonContent("../../etc/passwd");

      expect(result).toBeNull();
      expect(fileRetrieval.getFileBuffer).not.toHaveBeenCalled();
    });

    it("should reject artefactId with directory separators", async () => {
      const result = await getJsonContent("subdir/malicious");

      expect(result).toBeNull();
      expect(fileRetrieval.getFileBuffer).not.toHaveBeenCalled();
    });

    it("should reject artefactId with backslashes", async () => {
      const result = await getJsonContent("..\\..\\windows\\system32");

      expect(result).toBeNull();
      expect(fileRetrieval.getFileBuffer).not.toHaveBeenCalled();
    });

    it("should reject artefactId with null bytes", async () => {
      const result = await getJsonContent("test\x00malicious");

      expect(result).toBeNull();
      expect(fileRetrieval.getFileBuffer).not.toHaveBeenCalled();
    });

    it("should accept valid UUID format artefactIds", async () => {
      const mockContent = { test: "data" };
      vi.mocked(fileRetrieval.getFileBuffer).mockResolvedValue(Buffer.from(JSON.stringify(mockContent)));

      const result = await getJsonContent("550e8400-e29b-41d4-a716-446655440000");

      expect(result).toEqual(mockContent);
      expect(fileRetrieval.getFileBuffer).toHaveBeenCalled();
    });

    it("should accept artefactIds with underscores", async () => {
      const mockContent = { test: "data" };
      vi.mocked(fileRetrieval.getFileBuffer).mockResolvedValue(Buffer.from(JSON.stringify(mockContent)));

      const result = await getJsonContent("test_artefact_123");

      expect(result).toEqual(mockContent);
      expect(fileRetrieval.getFileBuffer).toHaveBeenCalled();
    });
  });

  describe("getRenderedTemplateUrl", () => {
    it("should return rendered template URL for valid artefact with urlPath", async () => {
      vi.mocked(queries.getArtefactListTypeId).mockResolvedValue(1);
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        id: 1,
        url: "civil-daily-cause-list"
      } as any);

      const result = await getRenderedTemplateUrl("test-artefact-id");

      expect(result).toBe("/civil-daily-cause-list?artefactId=test-artefact-id");
      expect(queries.getArtefactListTypeId).toHaveBeenCalledWith("test-artefact-id");
    });

    it("should return null when artefact not found", async () => {
      vi.mocked(queries.getArtefactListTypeId).mockResolvedValue(null);

      const result = await getRenderedTemplateUrl("non-existent-id");

      expect(result).toBeNull();
    });

    it("should return null when list type not found", async () => {
      vi.mocked(queries.getArtefactListTypeId).mockResolvedValue(999);
      vi.mocked(prisma.listType.findUnique).mockResolvedValue(null);

      const result = await getRenderedTemplateUrl("test-artefact-id");

      expect(result).toBeNull();
    });

    it("should return null when list type has no urlPath", async () => {
      vi.mocked(queries.getArtefactListTypeId).mockResolvedValue(3);
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        id: 3,
        url: null
      } as any);

      const result = await getRenderedTemplateUrl("test-artefact-id");

      expect(result).toBeNull();
    });

    it("should work with different list types", async () => {
      vi.mocked(queries.getArtefactListTypeId).mockResolvedValue(2);
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        id: 2,
        url: "family-daily-cause-list"
      } as any);

      const result = await getRenderedTemplateUrl("test-artefact-id-2");

      expect(result).toBe("/family-daily-cause-list?artefactId=test-artefact-id-2");
    });

    it("should URL-encode artefactId with special characters", async () => {
      vi.mocked(queries.getArtefactListTypeId).mockResolvedValue(1);
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        id: 1,
        url: "civil-daily-cause-list"
      } as any);

      const result = await getRenderedTemplateUrl("test&id=malicious");

      expect(result).toBe("/civil-daily-cause-list?artefactId=test%26id%3Dmalicious");
    });

    it("should URL-encode artefactId with question marks", async () => {
      vi.mocked(queries.getArtefactListTypeId).mockResolvedValue(1);
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        id: 1,
        url: "civil-daily-cause-list"
      } as any);

      const result = await getRenderedTemplateUrl("test?query=param");

      expect(result).toBe("/civil-daily-cause-list?artefactId=test%3Fquery%3Dparam");
    });

    it("should URL-encode artefactId with spaces", async () => {
      vi.mocked(queries.getArtefactListTypeId).mockResolvedValue(1);
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        id: 1,
        url: "civil-daily-cause-list"
      } as any);

      const result = await getRenderedTemplateUrl("test artefact id");

      expect(result).toBe("/civil-daily-cause-list?artefactId=test%20artefact%20id");
    });

    it("should URL-encode artefactId with ampersands", async () => {
      vi.mocked(queries.getArtefactListTypeId).mockResolvedValue(1);
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({
        id: 1,
        url: "civil-daily-cause-list"
      } as any);

      const result = await getRenderedTemplateUrl("test&param=value&other=data");

      expect(result).toBe("/civil-daily-cause-list?artefactId=test%26param%3Dvalue%26other%3Ddata");
    });
  });

  describe("getFlatFileUrl", () => {
    it("should return file URL when the new bare-name blob exists", async () => {
      vi.mocked(fileRetrieval.getFileExtension).mockResolvedValue(".pdf");
      vi.mocked(getBlobProperties).mockResolvedValueOnce({ size: 100 });

      const result = await getFlatFileUrl("test-artefact-id");

      expect(result).toBe("/files/test-artefact-id.pdf");
      expect(getBlobProperties).toHaveBeenCalledWith("test-artefact-id", "artefact");
      // Legacy lookup should be skipped once the bare blob is found
      expect(getBlobProperties).toHaveBeenCalledTimes(1);
    });

    it("should return file URL when only the legacy extensioned blob exists", async () => {
      vi.mocked(fileRetrieval.getFileExtension).mockResolvedValue(".docx");
      vi.mocked(getBlobProperties).mockResolvedValueOnce(null).mockResolvedValueOnce({ size: 200 });

      const result = await getFlatFileUrl("test-artefact-id");

      expect(result).toBe("/files/test-artefact-id.docx");
      expect(getBlobProperties).toHaveBeenNthCalledWith(1, "test-artefact-id", "artefact");
      expect(getBlobProperties).toHaveBeenNthCalledWith(2, "test-artefact-id.docx", "artefact");
    });

    it("should return null when no matching blob found", async () => {
      vi.mocked(fileRetrieval.getFileExtension).mockResolvedValue(".pdf");
      vi.mocked(getBlobProperties).mockResolvedValue(null);

      const result = await getFlatFileUrl("test-artefact-id");

      expect(result).toBeNull();
    });

    it("should return null when blob lookup throws", async () => {
      vi.mocked(fileRetrieval.getFileExtension).mockRejectedValue(new Error("boom"));

      const result = await getFlatFileUrl("test-artefact-id");

      expect(result).toBeNull();
    });

    it("should reject path traversal attempts in artefactId", async () => {
      const result = await getFlatFileUrl("../../etc/passwd");

      expect(result).toBeNull();
      expect(getBlobProperties).not.toHaveBeenCalled();
    });

    it("should reject artefactId with forward slashes", async () => {
      const result = await getFlatFileUrl("subdir/malicious");

      expect(result).toBeNull();
      expect(getBlobProperties).not.toHaveBeenCalled();
    });

    it("should URL-encode the resulting filename", async () => {
      vi.mocked(fileRetrieval.getFileExtension).mockResolvedValue(".pdf");
      vi.mocked(getBlobProperties).mockResolvedValueOnce({ size: 100 });

      const result = await getFlatFileUrl("test_artefact-123");

      expect(result).toBe("/files/test_artefact-123.pdf");
    });
  });
});
