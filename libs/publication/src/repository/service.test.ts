import fs from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as queries from "./queries.js";
import { getFlatFileUrl, getJsonContent, getRenderedTemplateUrl } from "./service.js";

vi.mock("./queries.js", () => ({
  getArtefactListTypeId: vi.fn()
}));

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    listType: {
      findUnique: vi.fn()
    }
  }
}));

vi.mock("node:fs/promises");

import { prisma } from "@hmcts/postgres";

describe("Publication Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getJsonContent", () => {
    it("should return parsed JSON content from file", async () => {
      const mockContent = {
        document: {
          publicationDate: "2024-06-01",
          locationName: "Test Court"
        }
      };

      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockContent));

      const result = await getJsonContent("test-artefact-id");

      expect(result).toEqual(mockContent);
      expect(fs.readFile).toHaveBeenCalledWith(expect.stringContaining("test-artefact-id.json"), "utf-8");
    });

    it("should return null when file does not exist", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT: no such file or directory"));

      const result = await getJsonContent("non-existent-id");

      expect(result).toBeNull();
    });

    it("should return null when JSON is invalid", async () => {
      vi.mocked(fs.readFile).mockResolvedValue("invalid json{");

      const result = await getJsonContent("invalid-json-id");

      expect(result).toBeNull();
    });

    it("should reject path traversal attempts with ../", async () => {
      const result = await getJsonContent("../../etc/passwd");

      expect(result).toBeNull();
      expect(fs.readFile).not.toHaveBeenCalled();
    });

    it("should reject artefactId with directory separators", async () => {
      const result = await getJsonContent("subdir/malicious");

      expect(result).toBeNull();
      expect(fs.readFile).not.toHaveBeenCalled();
    });

    it("should reject artefactId with backslashes", async () => {
      const result = await getJsonContent("..\\..\\windows\\system32");

      expect(result).toBeNull();
      expect(fs.readFile).not.toHaveBeenCalled();
    });

    it("should reject artefactId with null bytes", async () => {
      const result = await getJsonContent("test\x00malicious");

      expect(result).toBeNull();
      expect(fs.readFile).not.toHaveBeenCalled();
    });

    it("should accept valid UUID format artefactIds", async () => {
      const mockContent = { test: "data" };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockContent));

      const result = await getJsonContent("550e8400-e29b-41d4-a716-446655440000");

      expect(result).toEqual(mockContent);
      expect(fs.readFile).toHaveBeenCalled();
    });

    it("should accept artefactIds with underscores", async () => {
      const mockContent = { test: "data" };
      vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockContent));

      const result = await getJsonContent("test_artefact_123");

      expect(result).toEqual(mockContent);
      expect(fs.readFile).toHaveBeenCalled();
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
    it("should return file URL when flat file exists", async () => {
      vi.mocked(fs.readdir).mockResolvedValue(["test-artefact-id.pdf", "other-file.txt"] as string[]);

      const result = await getFlatFileUrl("test-artefact-id");

      expect(result).toBe("/files/test-artefact-id.pdf");
      expect(fs.readdir).toHaveBeenCalledWith(expect.stringContaining("storage/temp/uploads"));
    });

    it("should return null when no matching file found", async () => {
      vi.mocked(fs.readdir).mockResolvedValue(["other-file.pdf", "another-file.txt"] as string[]);

      const result = await getFlatFileUrl("test-artefact-id");

      expect(result).toBeNull();
    });

    it("should return null when directory read fails", async () => {
      vi.mocked(fs.readdir).mockRejectedValue(new Error("ENOENT: no such directory"));

      const result = await getFlatFileUrl("test-artefact-id");

      expect(result).toBeNull();
    });

    it("should match file with any extension", async () => {
      vi.mocked(fs.readdir).mockResolvedValue(["test-artefact-id.docx", "other-file.pdf"] as string[]);

      const result = await getFlatFileUrl("test-artefact-id");

      expect(result).toBe("/files/test-artefact-id.docx");
    });

    it("should return first matching file when multiple exist", async () => {
      vi.mocked(fs.readdir).mockResolvedValue(["test-artefact-id.pdf", "test-artefact-id.docx"] as string[]);

      const result = await getFlatFileUrl("test-artefact-id");

      expect(result).toBe("/files/test-artefact-id.pdf");
    });

    it("should reject path traversal attempts in artefactId", async () => {
      const result = await getFlatFileUrl("../../etc/passwd");

      expect(result).toBeNull();
      expect(fs.readdir).not.toHaveBeenCalled();
    });

    it("should reject artefactId with forward slashes", async () => {
      const result = await getFlatFileUrl("subdir/malicious");

      expect(result).toBeNull();
      expect(fs.readdir).not.toHaveBeenCalled();
    });

    it("should reject matched filenames with path traversal", async () => {
      vi.mocked(fs.readdir).mockResolvedValue(["../../../malicious.pdf", "test-artefact-id.pdf"] as string[]);

      // Use valid artefactId but readdir returns malicious filename
      const result = await getFlatFileUrl("../../../malicious");

      expect(result).toBeNull();
    });

    it("should reject matched filenames with directory separators", async () => {
      vi.mocked(fs.readdir).mockResolvedValue(["subdir/malicious.pdf"] as string[]);

      const result = await getFlatFileUrl("test-id");

      expect(result).toBeNull();
    });
  });
});
