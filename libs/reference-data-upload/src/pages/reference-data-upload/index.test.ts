import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/auth", () => ({
  requireRole: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  USER_ROLES: {
    SYSTEM_ADMIN: "SYSTEM_ADMIN"
  }
}));

describe("reference-data-upload page", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockSession: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSession = {
      save: vi.fn((callback: any) => callback()),
      uploadErrors: undefined,
      uploadData: undefined
    };

    mockRequest = {
      query: {},
      body: {},
      session: mockSession,
      file: undefined
    };

    mockResponse = {
      render: vi.fn(),
      redirect: vi.fn()
    };
  });

  describe("GET", () => {
    it("should render the upload page with English content", async () => {
      const { GET } = await import("./index.js");
      const handler = GET[1];

      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "reference-data-upload/index",
        expect.objectContaining({
          pageTitle: "Manually upload a csv file",
          locale: "en"
        })
      );
    });

    it("should clear errors from session after rendering", async () => {
      mockRequest.session!.uploadErrors = [{ text: "Test error", href: "#file" }];

      const { GET } = await import("./index.js");
      const handler = GET[1];

      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockRequest.session!.uploadErrors).toBeUndefined();
      expect(mockRequest.session!.uploadData).toBeUndefined();
    });

    it("should pass errors to template if they exist in session", async () => {
      const errors = [{ text: "Test error", href: "#file" }];
      mockRequest.session!.uploadErrors = errors;

      const { GET } = await import("./index.js");
      const handler = GET[1];

      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "reference-data-upload/index",
        expect.objectContaining({
          errors
        })
      );
    });
  });

  describe("POST", () => {
    it("should validate and accept valid CSV file", async () => {
      mockRequest.file = {
        buffer: Buffer.from("test"),
        originalname: "test.csv",
        mimetype: "text/csv"
      } as any;

      const { POST } = await import("./index.js");
      const handler = POST[1];

      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockRequest.session!.uploadData).toEqual({
        fileBuffer: expect.any(Buffer),
        fileName: "test.csv",
        mimeType: "text/csv"
      });
      expect(mockResponse.redirect).toHaveBeenCalledWith("/reference-data-upload-summary");
    });

    it("should return error when no file is uploaded", async () => {
      mockRequest.file = undefined;

      const { POST } = await import("./index.js");
      const handler = POST[1];

      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockRequest.session!.uploadErrors).toEqual([{ text: "Select a CSV file to upload", href: "#file" }]);
      expect(mockResponse.redirect).toHaveBeenCalledWith("/reference-data-upload");
    });

    it("should return error for invalid file type", async () => {
      mockRequest.file = {
        buffer: Buffer.from("test"),
        originalname: "test.txt",
        mimetype: "text/plain"
      } as any;

      const { POST } = await import("./index.js");
      const handler = POST[1];

      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockRequest.session!.uploadErrors).toEqual([{ text: "Unsupported file type. Please upload a .csv file", href: "#file" }]);
      expect(mockResponse.redirect).toHaveBeenCalledWith("/reference-data-upload");
    });

    it("should handle file size error from multer", async () => {
      (mockRequest as any).fileUploadError = { code: "LIMIT_FILE_SIZE" };

      const { POST } = await import("./index.js");
      const handler = POST[1];

      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockRequest.session!.uploadErrors).toEqual([{ text: "File exceeds the maximum size limit (2MB)", href: "#file" }]);
      expect(mockResponse.redirect).toHaveBeenCalledWith("/reference-data-upload");
    });

    it("should accept CSV file with uppercase extension", async () => {
      mockRequest.file = {
        buffer: Buffer.from("test"),
        originalname: "test.CSV",
        mimetype: "text/csv"
      } as any;

      const { POST } = await import("./index.js");
      const handler = POST[1];

      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockRequest.session!.uploadData).toBeDefined();
      expect(mockResponse.redirect).toHaveBeenCalledWith("/reference-data-upload-summary");
    });
  });
});
