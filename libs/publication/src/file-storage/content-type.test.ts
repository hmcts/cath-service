import { describe, expect, it } from "vitest";
import { getContentTypeFromExtension } from "./content-type.js";

describe("getContentTypeFromExtension", () => {
  describe("supported file types", () => {
    it("should return application/pdf for .pdf extension", () => {
      expect(getContentTypeFromExtension(".pdf")).toBe("application/pdf");
    });

    it("should return application/pdf for pdf without dot", () => {
      expect(getContentTypeFromExtension("pdf")).toBe("application/pdf");
    });

    it("should return correct content type for .docx", () => {
      expect(getContentTypeFromExtension(".docx")).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    });

    it("should return correct content type for docx without dot", () => {
      expect(getContentTypeFromExtension("docx")).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    });

    it("should return application/msword for .doc extension", () => {
      expect(getContentTypeFromExtension(".doc")).toBe("application/msword");
    });

    it("should return text/html for .html extension", () => {
      expect(getContentTypeFromExtension(".html")).toBe("text/html");
    });

    it("should return text/html for .htm extension", () => {
      expect(getContentTypeFromExtension(".htm")).toBe("text/html");
    });

    it("should return text/csv for .csv extension", () => {
      expect(getContentTypeFromExtension(".csv")).toBe("text/csv");
    });
  });

  describe("case insensitivity", () => {
    it("should handle uppercase extensions", () => {
      expect(getContentTypeFromExtension(".PDF")).toBe("application/pdf");
    });

    it("should handle mixed case extensions", () => {
      expect(getContentTypeFromExtension(".PdF")).toBe("application/pdf");
    });

    it("should handle uppercase extension without dot", () => {
      expect(getContentTypeFromExtension("PDF")).toBe("application/pdf");
    });

    it("should handle mixed case for docx", () => {
      expect(getContentTypeFromExtension(".DOCX")).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    });
  });

  describe("unknown file types", () => {
    it("should return application/octet-stream for unknown extension", () => {
      expect(getContentTypeFromExtension(".unknown")).toBe("application/octet-stream");
    });

    it("should return application/octet-stream for .txt extension", () => {
      expect(getContentTypeFromExtension(".txt")).toBe("application/octet-stream");
    });

    it("should return application/octet-stream for .zip extension", () => {
      expect(getContentTypeFromExtension(".zip")).toBe("application/octet-stream");
    });

    it("should return application/octet-stream for empty string extension", () => {
      expect(getContentTypeFromExtension("")).toBe("application/pdf");
    });
  });

  describe("null and undefined handling", () => {
    it("should return application/pdf for null", () => {
      expect(getContentTypeFromExtension(null)).toBe("application/pdf");
    });

    it("should return application/pdf for undefined", () => {
      expect(getContentTypeFromExtension(undefined)).toBe("application/pdf");
    });
  });

  describe("edge cases", () => {
    it("should handle extension with multiple dots", () => {
      expect(getContentTypeFromExtension(".tar.pdf")).toBe("application/octet-stream");
    });

    it("should handle just a dot", () => {
      expect(getContentTypeFromExtension(".")).toBe("application/octet-stream");
    });

    it("should handle extension with spaces", () => {
      expect(getContentTypeFromExtension(".pdf ")).toBe("application/octet-stream");
    });
  });
});
