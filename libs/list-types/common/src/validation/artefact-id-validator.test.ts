import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateArtefactId } from "./artefact-id-validator.js";

describe("validateArtefactId", () => {
  const baseDir = "/tmp/uploads";

  describe("valid artefact IDs", () => {
    it("should accept valid CUID format", () => {
      const result = validateArtefactId("c12345abcdef67890ghijklm", baseDir);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept CUID with all lowercase alphanumeric", () => {
      const result = validateArtefactId("cabcdefghijklmnopqrstuvwx", baseDir);
      expect(result.isValid).toBe(true);
    });

    it("should accept CUID with numbers", () => {
      const result = validateArtefactId("c123456789012345678901234", baseDir);
      expect(result.isValid).toBe(true);
    });
  });

  describe("invalid artefact IDs - format", () => {
    it("should reject empty string", () => {
      const result = validateArtefactId("", baseDir);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Artefact ID must be a non-empty string");
    });

    it("should reject null", () => {
      const result = validateArtefactId(null as any, baseDir);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Artefact ID must be a non-empty string");
    });

    it("should reject undefined", () => {
      const result = validateArtefactId(undefined as any, baseDir);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Artefact ID must be a non-empty string");
    });

    it("should reject ID not starting with 'c'", () => {
      const result = validateArtefactId("a12345abcdef67890ghijklm", baseDir);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Artefact ID must be a valid CUID format");
    });

    it("should reject ID with uppercase letters", () => {
      const result = validateArtefactId("c12345ABCDEF67890ghijklm", baseDir);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Artefact ID must be a valid CUID format");
    });

    it("should reject ID that is too short", () => {
      const result = validateArtefactId("c12345", baseDir);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Artefact ID must be a valid CUID format");
    });

    it("should reject ID that is too long", () => {
      const result = validateArtefactId("c12345abcdef67890ghijklmextra", baseDir);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Artefact ID must be a valid CUID format");
    });
  });

  describe("invalid artefact IDs - path traversal", () => {
    it("should reject path traversal with ../", () => {
      const result = validateArtefactId("../etc/passwd", baseDir);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Artefact ID contains invalid characters");
    });

    it("should reject path traversal with ..\\", () => {
      const result = validateArtefactId("..\\windows\\system32", baseDir);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Artefact ID contains invalid characters");
    });

    it("should reject forward slash", () => {
      const result = validateArtefactId("c12345abcdef/67890ghijklm", baseDir);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Artefact ID contains invalid characters");
    });

    it("should reject backslash", () => {
      const result = validateArtefactId("c12345abcdef\\67890ghijklm", baseDir);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Artefact ID contains invalid characters");
    });

    it("should reject multiple path traversal attempts", () => {
      const result = validateArtefactId("../../../../../../etc/passwd", baseDir);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Artefact ID contains invalid characters");
    });
  });

  describe("path resolution validation", () => {
    it("should verify resolved path stays within base directory", () => {
      const validId = "c12345abcdef67890ghijklm";
      const result = validateArtefactId(validId, baseDir);

      const resolvedPath = path.resolve(baseDir, `${validId}.json`);
      const resolvedBase = path.resolve(baseDir);

      expect(result.isValid).toBe(true);
      expect(resolvedPath.startsWith(resolvedBase)).toBe(true);
    });
  });
});
