import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockMulter, mockMemoryStorage } = vi.hoisted(() => ({
  mockMulter: vi.fn(),
  mockMemoryStorage: vi.fn(() => ({ type: "memory" }))
}));

vi.mock("multer", () => {
  const multerFn = Object.assign(
    vi.fn((options: any) => mockMulter(options)),
    {
      memoryStorage: mockMemoryStorage
    }
  );
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
        limits: { fileSize: 2 * 1024 * 1024 }
      });
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
});
