import { beforeEach, describe, expect, it } from "vitest";
import { validatePddaHtmlUpload } from "./file-validation.js";

const UNSUPPORTED_FORMAT_MESSAGE = "File format is not supported for LCSU.";

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

  describe("file presence validation", () => {
    it("should fail validation when file is missing", () => {
      // Act
      const result = validatePddaHtmlUpload(undefined);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Select an HTM or HTML file to upload");
    });
  });

  describe("file extension validation", () => {
    it.each([["test.html"], ["test.htm"], ["test.HTML"], ["test.HTM"]])("should pass validation for %s", (originalname) => {
      // Arrange
      mockFile.originalname = originalname;

      // Act
      const result = validatePddaHtmlUpload(mockFile);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it.each([["test.txt"], ["test.pdf"], ["test"]])("should fail validation for %s with the unsupported format message", (originalname) => {
      // Arrange
      mockFile.originalname = originalname;

      // Act
      const result = validatePddaHtmlUpload(mockFile);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toBe(UNSUPPORTED_FORMAT_MESSAGE);
    });
  });

  describe("file size validation", () => {
    it("should pass validation for file under size limit", () => {
      // Arrange
      mockFile.size = 1000;

      // Act
      const result = validatePddaHtmlUpload(mockFile);

      // Assert
      expect(result.valid).toBe(true);
    });

    it("should fail validation for empty file", () => {
      // Arrange
      mockFile.size = 0;

      // Act
      const result = validatePddaHtmlUpload(mockFile);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Select an HTM or HTML file to upload");
    });

    it("should fail validation for file over size limit", () => {
      // Arrange
      mockFile.size = 20_000_000;

      // Act
      const result = validatePddaHtmlUpload(mockFile);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toBe("The uploaded file is too large");
    });
  });

  describe("filename security validation", () => {
    it.each([["../evil.html"], ["..\\evil.html"]])("should fail validation for path traversal in %s", (originalname) => {
      // Arrange
      mockFile.originalname = originalname;

      // Act
      const result = validatePddaHtmlUpload(mockFile);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid filename");
    });

    it.each([["valid-filename.html"], ["file.name.with.dots.html"]])("should pass validation for %s", (originalname) => {
      // Arrange
      mockFile.originalname = originalname;

      // Act
      const result = validatePddaHtmlUpload(mockFile);

      // Assert
      expect(result.valid).toBe(true);
    });
  });
});
