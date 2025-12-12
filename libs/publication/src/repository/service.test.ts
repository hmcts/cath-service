import fs from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as queries from "./queries.js";
import { getFlatFileUrl, getJsonContent, getRenderedTemplateUrl } from "./service.js";

vi.mock("./queries.js", () => ({
  getArtefactListTypeId: vi.fn()
}));

vi.mock("@hmcts/list-types-common", () => ({
  mockListTypes: [
    {
      id: 1,
      name: "CIVIL_DAILY_CAUSE_LIST",
      englishFriendlyName: "Civil Daily Cause List",
      welshFriendlyName: "Rhestr Achosion Dyddiol Sifil",
      provenance: "CFT_IDAM",
      urlPath: "civil-daily-cause-list"
    },
    {
      id: 2,
      name: "FAMILY_DAILY_CAUSE_LIST",
      englishFriendlyName: "Family Daily Cause List",
      welshFriendlyName: "Rhestr Achosion Dyddiol Teulu",
      provenance: "CFT_IDAM",
      urlPath: "family-daily-cause-list"
    },
    {
      id: 3,
      name: "NO_URL_LIST",
      englishFriendlyName: "No URL List",
      welshFriendlyName: "Dim Rhestr URL",
      provenance: "CFT_IDAM"
    }
  ]
}));

vi.mock("node:fs/promises");

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
  });

  describe("getRenderedTemplateUrl", () => {
    it("should return rendered template URL for valid artefact with urlPath", async () => {
      vi.mocked(queries.getArtefactListTypeId).mockResolvedValue(1);

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

      const result = await getRenderedTemplateUrl("test-artefact-id");

      expect(result).toBeNull();
    });

    it("should return null when list type has no urlPath", async () => {
      vi.mocked(queries.getArtefactListTypeId).mockResolvedValue(3);

      const result = await getRenderedTemplateUrl("test-artefact-id");

      expect(result).toBeNull();
    });

    it("should work with different list types", async () => {
      vi.mocked(queries.getArtefactListTypeId).mockResolvedValue(2);

      const result = await getRenderedTemplateUrl("test-artefact-id-2");

      expect(result).toBe("/family-daily-cause-list?artefactId=test-artefact-id-2");
    });
  });

  describe("getFlatFileUrl", () => {
    it("should return file URL when flat file exists", async () => {
      vi.mocked(fs.readdir).mockResolvedValue(["test-artefact-id.pdf", "other-file.txt"] as any);

      const result = await getFlatFileUrl("test-artefact-id");

      expect(result).toBe("/files/test-artefact-id.pdf");
      expect(fs.readdir).toHaveBeenCalledWith(expect.stringContaining("storage/temp/uploads"));
    });

    it("should return null when no matching file found", async () => {
      vi.mocked(fs.readdir).mockResolvedValue(["other-file.pdf", "another-file.txt"] as any);

      const result = await getFlatFileUrl("test-artefact-id");

      expect(result).toBeNull();
    });

    it("should return null when directory read fails", async () => {
      vi.mocked(fs.readdir).mockRejectedValue(new Error("ENOENT: no such directory"));

      const result = await getFlatFileUrl("test-artefact-id");

      expect(result).toBeNull();
    });

    it("should match file with any extension", async () => {
      vi.mocked(fs.readdir).mockResolvedValue(["test-artefact-id.docx", "other-file.pdf"] as any);

      const result = await getFlatFileUrl("test-artefact-id");

      expect(result).toBe("/files/test-artefact-id.docx");
    });

    it("should return first matching file when multiple exist", async () => {
      vi.mocked(fs.readdir).mockResolvedValue(["test-artefact-id.pdf", "test-artefact-id.docx"] as any);

      const result = await getFlatFileUrl("test-artefact-id");

      expect(result).toBe("/files/test-artefact-id.pdf");
    });
  });
});
