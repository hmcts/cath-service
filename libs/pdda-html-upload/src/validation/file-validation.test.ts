import { beforeEach, describe, expect, it } from "vitest";
import { validatePddaHtmlUpload } from "./file-validation.js";

describe("validatePddaHtmlUpload", () => {
  let mockFile: Express.Multer.File;

  beforeEach(() => {
    mockFile = {
      fieldname: "file",
      originalname: "test.html",
      encoding: "7bit",
      mimetype: "text/html",
      buffer: Buffer.from("<html></html>"),
      size: 100,
      stream: null as any,
      destination: "",
      filename: "",
      path: ""
    };
  });

  describe("artefact type validation", () => {
    it("should pass validation when artefact_type is LCSU", () => {
      const result = validatePddaHtmlUpload("LCSU", mockFile);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should fail validation when artefact_type is not LCSU", () => {
      const result = validatePddaHtmlUpload("JSON", mockFile);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("ArtefactType must be LCSU for HTM/HTML uploads");
    });

    it("should fail validation when artefact_type is missing", () => {
      const result = validatePddaHtmlUpload(undefined, mockFile);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("ArtefactType must be LCSU for HTM/HTML uploads");
    });
  });

  describe("file presence validation", () => {
    it("should fail validation when file is missing", () => {
      const result = validatePddaHtmlUpload("LCSU", undefined);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Select an HTM or HTML file to upload");
    });
  });

  describe("file extension validation", () => {
    it("should pass validation for .html extension", () => {
      mockFile.originalname = "test.html";
      const result = validatePddaHtmlUpload("LCSU", mockFile);

      expect(result.valid).toBe(true);
    });

    it("should pass validation for .htm extension", () => {
      mockFile.originalname = "test.htm";
      const result = validatePddaHtmlUpload("LCSU", mockFile);

      expect(result.valid).toBe(true);
    });

    it("should pass validation for .HTML extension (case insensitive)", () => {
      mockFile.originalname = "test.HTML";
      const result = validatePddaHtmlUpload("LCSU", mockFile);

      expect(result.valid).toBe(true);
    });

    it("should pass validation for .HTM extension (case insensitive)", () => {
      mockFile.originalname = "test.HTM";
      const result = validatePddaHtmlUpload("LCSU", mockFile);

      expect(result.valid).toBe(true);
    });

    it("should fail validation for .txt extension", () => {
      mockFile.originalname = "test.txt";
      const result = validatePddaHtmlUpload("LCSU", mockFile);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("The uploaded file must be an HTM or HTML file");
    });

    it("should fail validation for .pdf extension", () => {
      mockFile.originalname = "test.pdf";
      const result = validatePddaHtmlUpload("LCSU", mockFile);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("The uploaded file must be an HTM or HTML file");
    });

    it("should fail validation for no extension", () => {
      mockFile.originalname = "test";
      const result = validatePddaHtmlUpload("LCSU", mockFile);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("The uploaded file must be an HTM or HTML file");
    });
  });

  describe("file size validation", () => {
    it("should pass validation for file under size limit", () => {
      mockFile.size = 1000;
      const result = validatePddaHtmlUpload("LCSU", mockFile);

      expect(result.valid).toBe(true);
    });

    it("should fail validation for empty file", () => {
      mockFile.size = 0;
      const result = validatePddaHtmlUpload("LCSU", mockFile);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Select an HTM or HTML file to upload");
    });

    it("should fail validation for file over size limit", () => {
      mockFile.size = 20_000_000;
      const result = validatePddaHtmlUpload("LCSU", mockFile);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("The uploaded file is too large");
    });
  });

  describe("filename security validation", () => {
    it("should fail validation for filename with path traversal (../)", () => {
      mockFile.originalname = "../evil.html";
      const result = validatePddaHtmlUpload("LCSU", mockFile);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid filename");
    });

    it("should fail validation for filename with path traversal (..\\)", () => {
      mockFile.originalname = "..\\evil.html";
      const result = validatePddaHtmlUpload("LCSU", mockFile);

      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid filename");
    });

    it("should pass validation for valid filename", () => {
      mockFile.originalname = "valid-filename.html";
      const result = validatePddaHtmlUpload("LCSU", mockFile);

      expect(result.valid).toBe(true);
    });

    it("should pass validation for filename with dots but no traversal", () => {
      mockFile.originalname = "file.name.with.dots.html";
      const result = validatePddaHtmlUpload("LCSU", mockFile);

      expect(result.valid).toBe(true);
    });
  });
});
