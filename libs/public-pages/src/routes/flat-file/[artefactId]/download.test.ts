import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./download.js";

vi.mock("../../../flat-file/flat-file-service.js");

describe("Flat File Download Route", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let sendSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;
  let setHeaderSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    jsonSpy = vi.fn();
    sendSpy = vi.fn();
    setHeaderSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy, send: sendSpy });

    mockRequest = {
      params: {}
    };

    mockResponse = {
      json: jsonSpy,
      send: sendSpy,
      status: statusSpy,
      setHeader: setHeaderSpy
    };
  });

  describe("Parameter Validation", () => {
    it("should return 400 when artefactId is missing", async () => {
      mockRequest.params = {};

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({ error: "Invalid request" });
      expect(sendSpy).not.toHaveBeenCalled();
      expect(setHeaderSpy).not.toHaveBeenCalled();
    });

    it("should return 400 when artefactId is undefined", async () => {
      mockRequest.params = { artefactId: undefined };

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({ error: "Invalid request" });
    });

    it("should return 400 when artefactId is empty string", async () => {
      mockRequest.params = { artefactId: "" };

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({ error: "Invalid request" });
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      mockRequest.params = { artefactId: "test-artefact-id" };
    });

    it("should return 404 for NOT_FOUND error", async () => {
      const { getFileForDownload } = await import("../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue({ error: "NOT_FOUND" });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({ error: "Artefact not found" });
      expect(sendSpy).not.toHaveBeenCalled();
      expect(setHeaderSpy).not.toHaveBeenCalled();
    });

    it("should return 410 for EXPIRED error", async () => {
      const { getFileForDownload } = await import("../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue({ error: "EXPIRED" });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(410);
      expect(jsonSpy).toHaveBeenCalledWith({ error: "File has expired" });
      expect(sendSpy).not.toHaveBeenCalled();
      expect(setHeaderSpy).not.toHaveBeenCalled();
    });

    it("should return 400 for NOT_FLAT_FILE error", async () => {
      const { getFileForDownload } = await import("../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue({ error: "NOT_FLAT_FILE" });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({ error: "Not a flat file" });
      expect(sendSpy).not.toHaveBeenCalled();
      expect(setHeaderSpy).not.toHaveBeenCalled();
    });

    it("should return 404 for FILE_NOT_FOUND error", async () => {
      const { getFileForDownload } = await import("../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue({ error: "FILE_NOT_FOUND" });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({ error: "File not found in storage" });
      expect(sendSpy).not.toHaveBeenCalled();
      expect(setHeaderSpy).not.toHaveBeenCalled();
    });

    it("should handle unknown error with default 404 status", async () => {
      const { getFileForDownload } = await import("../../../flat-file/flat-file-service.js");
      // @ts-expect-error Testing unknown error type
      vi.mocked(getFileForDownload).mockResolvedValue({ error: "UNKNOWN_ERROR" });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({ error: "File not found" });
    });
  });

  describe("Successful Download", () => {
    const mockFileBuffer = Buffer.from("test file content");
    const mockSuccessResult = {
      success: true,
      fileBuffer: mockFileBuffer,
      contentType: "application/pdf",
      fileName: "test-artefact-id.pdf"
    };

    beforeEach(() => {
      mockRequest.params = { artefactId: "test-artefact-id" };
    });

    it("should set correct Content-Type header", async () => {
      const { getFileForDownload } = await import("../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue(mockSuccessResult);

      await GET(mockRequest as Request, mockResponse as Response);

      expect(setHeaderSpy).toHaveBeenCalledWith("Content-Type", "application/pdf");
    });

    it("should set Content-Disposition header with inline and filename", async () => {
      const { getFileForDownload } = await import("../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue(mockSuccessResult);

      await GET(mockRequest as Request, mockResponse as Response);

      expect(setHeaderSpy).toHaveBeenCalledWith("Content-Disposition", 'inline; filename="test-artefact-id.pdf"');
    });

    it("should set Cache-Control header for 1 hour", async () => {
      const { getFileForDownload } = await import("../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue(mockSuccessResult);

      await GET(mockRequest as Request, mockResponse as Response);

      expect(setHeaderSpy).toHaveBeenCalledWith("Cache-Control", "public, max-age=3600");
    });

    it("should set all three headers in correct order", async () => {
      const { getFileForDownload } = await import("../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue(mockSuccessResult);

      await GET(mockRequest as Request, mockResponse as Response);

      expect(setHeaderSpy).toHaveBeenCalledTimes(3);
      expect(setHeaderSpy).toHaveBeenNthCalledWith(1, "Content-Type", "application/pdf");
      expect(setHeaderSpy).toHaveBeenNthCalledWith(2, "Content-Disposition", 'inline; filename="test-artefact-id.pdf"');
      expect(setHeaderSpy).toHaveBeenNthCalledWith(3, "Cache-Control", "public, max-age=3600");
    });

    it("should send file buffer in response", async () => {
      const { getFileForDownload } = await import("../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue(mockSuccessResult);

      await GET(mockRequest as Request, mockResponse as Response);

      expect(sendSpy).toHaveBeenCalledWith(mockFileBuffer);
    });

    it("should not call status or json for successful response", async () => {
      const { getFileForDownload } = await import("../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue(mockSuccessResult);

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).not.toHaveBeenCalled();
      expect(jsonSpy).not.toHaveBeenCalled();
    });

    it("should handle different file types with correct content type", async () => {
      const { getFileForDownload } = await import("../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue({
        ...mockSuccessResult,
        contentType: "application/vnd.ms-excel",
        fileName: "test.xls"
      });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(setHeaderSpy).toHaveBeenCalledWith("Content-Type", "application/vnd.ms-excel");
      expect(setHeaderSpy).toHaveBeenCalledWith("Content-Disposition", 'inline; filename="test.xls"');
    });

    it("should handle filenames with special characters", async () => {
      const { getFileForDownload } = await import("../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue({
        ...mockSuccessResult,
        fileName: "test file (2024).pdf"
      });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(setHeaderSpy).toHaveBeenCalledWith("Content-Disposition", 'inline; filename="test file (2024).pdf"');
    });

    it("should handle empty file buffers", async () => {
      const emptyBuffer = Buffer.alloc(0);
      const { getFileForDownload } = await import("../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue({
        ...mockSuccessResult,
        fileBuffer: emptyBuffer
      });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(sendSpy).toHaveBeenCalledWith(emptyBuffer);
    });
  });

  describe("Integration with Service", () => {
    it("should pass artefactId to getFileForDownload service", async () => {
      mockRequest.params = { artefactId: "specific-artefact-123" };
      const { getFileForDownload } = await import("../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue({ error: "NOT_FOUND" });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(getFileForDownload).toHaveBeenCalledWith("specific-artefact-123");
    });

    it("should call getFileForDownload exactly once", async () => {
      mockRequest.params = { artefactId: "test-id" };
      const { getFileForDownload } = await import("../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue({ error: "NOT_FOUND" });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(getFileForDownload).toHaveBeenCalledTimes(1);
    });
  });
});
