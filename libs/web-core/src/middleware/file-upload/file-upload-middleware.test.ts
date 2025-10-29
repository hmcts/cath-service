import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockMulter, mockMemoryStorage } = vi.hoisted(() => ({
  mockMulter: vi.fn(),
  mockMemoryStorage: vi.fn(() => ({ type: "memory" }))
}));

vi.mock("multer", () => {
  const multerFn = vi.fn((options) => mockMulter(options));
  multerFn.memoryStorage = mockMemoryStorage;
  return {
    default: multerFn
  };
});

import { createFileUpload } from "./file-upload-middleware.js";

describe("createFileUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("default configuration", () => {
    it("should create file upload with default options", () => {
      createFileUpload();

      expect(mockMulter).toHaveBeenCalledWith({
        storage: { type: "memory" },
        fileFilter: expect.any(Function),
        limits: { fileSize: 2 * 1024 * 1024 }
      });
    });

    it("should accept valid file extensions by default", () => {
      createFileUpload();

      const call = mockMulter.mock.calls[0][0];
      const fileFilter = call.fileFilter;
      const mockCallback = vi.fn();

      const validFiles = [
        { originalname: "document.pdf" },
        { originalname: "spreadsheet.csv" },
        { originalname: "report.doc" },
        { originalname: "report.docx" },
        { originalname: "page.html" },
        { originalname: "page.htm" },
        { originalname: "data.json" }
      ];

      for (const file of validFiles) {
        mockCallback.mockClear();
        fileFilter(null, file, mockCallback);
        expect(mockCallback).toHaveBeenCalledWith(null, true);
      }
    });

    it("should reject invalid file extensions by default", () => {
      createFileUpload();

      const call = mockMulter.mock.calls[0][0];
      const fileFilter = call.fileFilter;
      const mockCallback = vi.fn();

      const invalidFiles = [
        { originalname: "image.jpg" },
        { originalname: "photo.png" },
        { originalname: "script.js" },
        { originalname: "executable.exe" },
        { originalname: "video.mp4" }
      ];

      for (const file of invalidFiles) {
        mockCallback.mockClear();
        fileFilter(null, file, mockCallback);
        expect(mockCallback).toHaveBeenCalledWith(new Error("Invalid file type"));
      }
    });

    it("should be case insensitive for file extensions", () => {
      createFileUpload();

      const call = mockMulter.mock.calls[0][0];
      const fileFilter = call.fileFilter;
      const mockCallback = vi.fn();

      const files = [{ originalname: "document.PDF" }, { originalname: "document.Pdf" }, { originalname: "document.CSV" }];

      for (const file of files) {
        mockCallback.mockClear();
        fileFilter(null, file, mockCallback);
        expect(mockCallback).toHaveBeenCalledWith(null, true);
      }
    });
  });

  describe("custom allowed extensions", () => {
    it("should accept only specified file extensions", () => {
      createFileUpload({
        allowedExtensions: /\.(jpg|jpeg|png)$/i
      });

      const call = mockMulter.mock.calls[0][0];
      const fileFilter = call.fileFilter;
      const mockCallback = vi.fn();

      const validFiles = [{ originalname: "photo.jpg" }, { originalname: "photo.jpeg" }, { originalname: "image.png" }];

      for (const file of validFiles) {
        mockCallback.mockClear();
        fileFilter(null, file, mockCallback);
        expect(mockCallback).toHaveBeenCalledWith(null, true);
      }
    });

    it("should reject files that do not match custom extensions", () => {
      createFileUpload({
        allowedExtensions: /\.(jpg|jpeg|png)$/i
      });

      const call = mockMulter.mock.calls[0][0];
      const fileFilter = call.fileFilter;
      const mockCallback = vi.fn();

      const invalidFiles = [{ originalname: "document.pdf" }, { originalname: "spreadsheet.csv" }, { originalname: "video.mp4" }];

      for (const file of invalidFiles) {
        mockCallback.mockClear();
        fileFilter(null, file, mockCallback);
        expect(mockCallback).toHaveBeenCalledWith(new Error("Invalid file type"));
      }
    });
  });

  describe("custom max file size", () => {
    it("should use custom max file size when provided", () => {
      const customMaxSize = 5 * 1024 * 1024; // 5MB
      createFileUpload({
        maxFileSize: customMaxSize
      });

      expect(mockMulter).toHaveBeenCalledWith({
        storage: mockMemoryStorage(),
        fileFilter: expect.any(Function),
        limits: { fileSize: customMaxSize }
      });
    });

    it("should accept custom max file size with custom extensions", () => {
      const customMaxSize = 10 * 1024 * 1024; // 10MB
      createFileUpload({
        allowedExtensions: /\.(xlsx|xls|csv)$/i,
        maxFileSize: customMaxSize
      });

      expect(mockMulter).toHaveBeenCalledWith({
        storage: mockMemoryStorage(),
        fileFilter: expect.any(Function),
        limits: { fileSize: customMaxSize }
      });
    });
  });

  describe("memory storage", () => {
    it("should use memory storage", () => {
      createFileUpload();

      expect(mockMemoryStorage).toHaveBeenCalled();
      const call = mockMulter.mock.calls[0][0];
      expect(call.storage).toEqual({ type: "memory" });
    });
  });

  describe("edge cases", () => {
    it("should reject files without extensions", () => {
      createFileUpload();

      const call = mockMulter.mock.calls[0][0];
      const fileFilter = call.fileFilter;
      const mockCallback = vi.fn();

      fileFilter(null, { originalname: "noextension" }, mockCallback);
      expect(mockCallback).toHaveBeenCalledWith(new Error("Invalid file type"));
    });

    it("should reject empty filenames", () => {
      createFileUpload();

      const call = mockMulter.mock.calls[0][0];
      const fileFilter = call.fileFilter;
      const mockCallback = vi.fn();

      fileFilter(null, { originalname: "" }, mockCallback);
      expect(mockCallback).toHaveBeenCalledWith(new Error("Invalid file type"));
    });

    it("should handle filenames with multiple dots", () => {
      createFileUpload();

      const call = mockMulter.mock.calls[0][0];
      const fileFilter = call.fileFilter;
      const mockCallback = vi.fn();

      fileFilter(null, { originalname: "my.document.with.dots.pdf" }, mockCallback);
      expect(mockCallback).toHaveBeenCalledWith(null, true);
    });

    it("should handle filenames with spaces", () => {
      createFileUpload();

      const call = mockMulter.mock.calls[0][0];
      const fileFilter = call.fileFilter;
      const mockCallback = vi.fn();

      fileFilter(null, { originalname: "my document file.pdf" }, mockCallback);
      expect(mockCallback).toHaveBeenCalledWith(null, true);
    });
  });
});
