import * as fs from "node:fs/promises";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getContentType, getFileBuffer, getFileName } from "./file-retrieval.js";

vi.mock("node:fs/promises");

describe("file-retrieval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getFileBuffer", () => {
    it("should return file buffer for valid artefactId", async () => {
      const mockBuffer = Buffer.from("test file content");
      vi.mocked(fs.readFile).mockResolvedValue(mockBuffer);

      const result = await getFileBuffer("c1baacc3-8280-43ae-8551-24080c0654f9");

      expect(result).toEqual(mockBuffer);
      expect(fs.readFile).toHaveBeenCalled();
    });

    it("should return null for non-existent file", async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error("File not found"));

      const result = await getFileBuffer("non-existent-id");

      expect(result).toBeNull();
    });

    it("should prevent path traversal attacks", async () => {
      const maliciousId = "../../../etc/passwd";
      const mockBuffer = Buffer.from("malicious content");
      vi.mocked(fs.readFile).mockResolvedValue(mockBuffer);

      const result = await getFileBuffer(maliciousId);

      expect(result).toBeNull();
    });

    it("should append .pdf extension to artefactId", async () => {
      const mockBuffer = Buffer.from("test pdf");
      vi.mocked(fs.readFile).mockResolvedValue(mockBuffer);

      await getFileBuffer("test-id");

      const callArg = vi.mocked(fs.readFile).mock.calls[0][0] as string;
      expect(callArg).toContain("test-id.pdf");
    });
  });

  describe("getContentType", () => {
    it("should always return application/pdf", () => {
      const result = getContentType();

      expect(result).toBe("application/pdf");
    });
  });

  describe("getFileName", () => {
    it("should return filename with .pdf extension", () => {
      const result = getFileName("test-artefact-id");

      expect(result).toBe("test-artefact-id.pdf");
    });

    it("should handle UUID format", () => {
      const uuid = "c1baacc3-8280-43ae-8551-24080c0654f9";
      const result = getFileName(uuid);

      expect(result).toBe(`${uuid}.pdf`);
    });
  });
});
