import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./download.js";

vi.mock("../../../../flat-file/flat-file-service.js");

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
      params: {},
      query: {}
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
      expect(setHeaderSpy).toHaveBeenCalledWith("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
    });

    it("should return 400 when artefactId is undefined", async () => {
      mockRequest.params = { artefactId: undefined };

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({ error: "Invalid request" });
      expect(setHeaderSpy).toHaveBeenCalledWith("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
    });

    it("should return 400 when artefactId is empty string", async () => {
      mockRequest.params = { artefactId: "" };

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({ error: "Invalid request" });
      expect(setHeaderSpy).toHaveBeenCalledWith("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
    });

    it("should return 400 when artefactId is not a valid UUID", async () => {
      mockRequest.params = { artefactId: "not-a-valid-uuid" };

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({ error: "Invalid request" });
      expect(setHeaderSpy).toHaveBeenCalledWith("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      mockRequest.params = { artefactId: "550e8400-e29b-41d4-a716-446655440000" };
    });

    it("should return 404 for NOT_FOUND error", async () => {
      const { getFileForDownload } = await import("../../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue({ error: "NOT_FOUND" });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({ error: "Artefact not found" });
      expect(sendSpy).not.toHaveBeenCalled();
      expect(setHeaderSpy).toHaveBeenCalledWith("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
    });

    it("should return 410 for EXPIRED error", async () => {
      const { getFileForDownload } = await import("../../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue({ error: "EXPIRED" });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(410);
      expect(jsonSpy).toHaveBeenCalledWith({ error: "File has expired" });
      expect(sendSpy).not.toHaveBeenCalled();
      expect(setHeaderSpy).toHaveBeenCalledWith("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
    });

    it("should return 400 for NOT_FLAT_FILE error", async () => {
      const { getFileForDownload } = await import("../../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue({ error: "NOT_FLAT_FILE" });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({ error: "Not a flat file" });
      expect(sendSpy).not.toHaveBeenCalled();
      expect(setHeaderSpy).toHaveBeenCalledWith("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
    });

    it("should return 404 for FILE_NOT_FOUND error", async () => {
      const { getFileForDownload } = await import("../../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue({ error: "FILE_NOT_FOUND" });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({ error: "File not found in storage" });
      expect(sendSpy).not.toHaveBeenCalled();
      expect(setHeaderSpy).toHaveBeenCalledWith("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
    });

    it("should handle unknown error with default 404 status", async () => {
      const { getFileForDownload } = await import("../../../../flat-file/flat-file-service.js");
      // @ts-expect-error Testing unknown error type
      vi.mocked(getFileForDownload).mockResolvedValue({ error: "UNKNOWN_ERROR" });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({ error: "File not found" });
      expect(setHeaderSpy).toHaveBeenCalledWith("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
    });

    it("should return 403 with Access denied message for ACCESS_DENIED error", async () => {
      // Arrange
      const { getFileForDownload } = await import("../../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue({ error: "ACCESS_DENIED" });

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({ error: "Access denied" });
      expect(sendSpy).not.toHaveBeenCalled();
      expect(setHeaderSpy).toHaveBeenCalledWith("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
    });
  });

  describe("Successful Download", () => {
    const mockFileBuffer = Buffer.from("test file content");
    const testUuid = "550e8400-e29b-41d4-a716-446655440000";
    const mockSuccessResult = {
      success: true,
      fileBuffer: mockFileBuffer,
      contentType: "application/pdf",
      fileName: `${testUuid}.pdf`
    };

    beforeEach(() => {
      mockRequest.params = { artefactId: testUuid };
    });

    it("should set correct Content-Type header", async () => {
      const { getFileForDownload } = await import("../../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue(mockSuccessResult);

      await GET(mockRequest as Request, mockResponse as Response);

      expect(setHeaderSpy).toHaveBeenCalledWith("Content-Type", "application/pdf");
    });

    it("should set Content-Disposition header with inline and filename", async () => {
      const { getFileForDownload } = await import("../../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue(mockSuccessResult);

      await GET(mockRequest as Request, mockResponse as Response);

      expect(setHeaderSpy).toHaveBeenCalledWith("Content-Disposition", `inline; filename="${testUuid}.pdf"`);
    });

    it("should set Cache-Control header with no-cache policy", async () => {
      const { getFileForDownload } = await import("../../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue(mockSuccessResult);

      await GET(mockRequest as Request, mockResponse as Response);

      expect(setHeaderSpy).toHaveBeenCalledWith("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
    });

    it("should set all three headers in correct order", async () => {
      const { getFileForDownload } = await import("../../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue(mockSuccessResult);

      await GET(mockRequest as Request, mockResponse as Response);

      expect(setHeaderSpy).toHaveBeenCalledTimes(3);
      expect(setHeaderSpy).toHaveBeenNthCalledWith(1, "Content-Type", "application/pdf");
      expect(setHeaderSpy).toHaveBeenNthCalledWith(2, "Content-Disposition", `inline; filename="${testUuid}.pdf"`);
      expect(setHeaderSpy).toHaveBeenNthCalledWith(3, "Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
    });

    it("should send file buffer in response", async () => {
      const { getFileForDownload } = await import("../../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue(mockSuccessResult);

      await GET(mockRequest as Request, mockResponse as Response);

      expect(sendSpy).toHaveBeenCalledWith(mockFileBuffer);
    });

    it("should not call status or json for successful response", async () => {
      const { getFileForDownload } = await import("../../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue(mockSuccessResult);

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).not.toHaveBeenCalled();
      expect(jsonSpy).not.toHaveBeenCalled();
    });

    it("should handle different file types with correct content type", async () => {
      const { getFileForDownload } = await import("../../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue({
        ...mockSuccessResult,
        contentType: "application/vnd.ms-excel",
        fileName: "test.xls"
      });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(setHeaderSpy).toHaveBeenCalledWith("Content-Type", "application/vnd.ms-excel");
      expect(setHeaderSpy).toHaveBeenCalledWith("Content-Disposition", 'inline; filename="test.xls"');
      expect(setHeaderSpy).toHaveBeenCalledWith("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
    });

    it("should handle filenames with special characters", async () => {
      const { getFileForDownload } = await import("../../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue({
        ...mockSuccessResult,
        fileName: "test file (2024).pdf"
      });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(setHeaderSpy).toHaveBeenCalledWith("Content-Disposition", 'inline; filename="test file (2024).pdf"');
      expect(setHeaderSpy).toHaveBeenCalledWith("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
    });

    it("should handle empty file buffers", async () => {
      const emptyBuffer = Buffer.alloc(0);
      const { getFileForDownload } = await import("../../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue({
        ...mockSuccessResult,
        fileBuffer: emptyBuffer
      });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(sendSpy).toHaveBeenCalledWith(emptyBuffer);
      expect(setHeaderSpy).toHaveBeenCalledWith("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
    });
  });

  describe("Integration with Service", () => {
    it("should pass artefactId and req.user to getFileForDownload service", async () => {
      const validUuid = "a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6";
      mockRequest.params = { artefactId: validUuid };
      const { getFileForDownload } = await import("../../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue({ error: "NOT_FOUND" });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(getFileForDownload).toHaveBeenCalledWith(validUuid, undefined);
    });

    it("should call getFileForDownload exactly once", async () => {
      const validUuid = "f1e2d3c4-b5a6-4798-8bc9-0d1e2f3a4b5c";
      mockRequest.params = { artefactId: validUuid };
      const { getFileForDownload } = await import("../../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue({ error: "NOT_FOUND" });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(getFileForDownload).toHaveBeenCalledTimes(1);
    });
  });

  describe("Excel download (format=excel)", () => {
    const testUuid = "550e8400-e29b-41d4-a716-446655440000";
    const mockExcelBuffer = Buffer.from("xlsx content");
    const mockExcelResult = {
      success: true,
      fileBuffer: mockExcelBuffer,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      fileName: `${testUuid}.xlsx`
    };

    beforeEach(() => {
      mockRequest.params = { artefactId: testUuid };
      mockRequest.query = { format: "excel" };
    });

    it("should call getExcelForDownload when format=excel", async () => {
      const { getExcelForDownload, getFileForDownload } = await import("../../../../flat-file/flat-file-service.js");
      vi.mocked(getExcelForDownload).mockResolvedValue(mockExcelResult);

      await GET(mockRequest as Request, mockResponse as Response);

      expect(getExcelForDownload).toHaveBeenCalledWith(testUuid, undefined);
      expect(getFileForDownload).not.toHaveBeenCalled();
    });

    it("should return 404 when excel file not found", async () => {
      const { getExcelForDownload } = await import("../../../../flat-file/flat-file-service.js");
      vi.mocked(getExcelForDownload).mockResolvedValue({ error: "FILE_NOT_FOUND" });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({ error: "File not found in storage" });
    });

    it("should return 404 when artefact not found for excel", async () => {
      const { getExcelForDownload } = await import("../../../../flat-file/flat-file-service.js");
      vi.mocked(getExcelForDownload).mockResolvedValue({ error: "NOT_FOUND" });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({ error: "Artefact not found" });
    });

    it("should return 410 when excel artefact has expired", async () => {
      const { getExcelForDownload } = await import("../../../../flat-file/flat-file-service.js");
      vi.mocked(getExcelForDownload).mockResolvedValue({ error: "EXPIRED" });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(410);
      expect(jsonSpy).toHaveBeenCalledWith({ error: "File has expired" });
    });

    it("should return 403 for ACCESS_DENIED error on excel download", async () => {
      // Arrange
      const { getExcelForDownload } = await import("../../../../flat-file/flat-file-service.js");
      vi.mocked(getExcelForDownload).mockResolvedValue({ error: "ACCESS_DENIED" });

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({ error: "Access denied" });
    });

    it("should send excel file with correct headers on success", async () => {
      const { getExcelForDownload } = await import("../../../../flat-file/flat-file-service.js");
      vi.mocked(getExcelForDownload).mockResolvedValue(mockExcelResult);

      await GET(mockRequest as Request, mockResponse as Response);

      expect(setHeaderSpy).toHaveBeenCalledWith("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      expect(setHeaderSpy).toHaveBeenCalledWith("Content-Disposition", `attachment; filename="${testUuid}.xlsx"`);
      expect(sendSpy).toHaveBeenCalledWith(mockExcelBuffer);
    });

    it("should default to pdf behaviour when format is an unknown value", async () => {
      mockRequest.query = { format: "unknown_format" };
      const { getFileForDownload, getExcelForDownload } = await import("../../../../flat-file/flat-file-service.js");
      vi.mocked(getFileForDownload).mockResolvedValue({ error: "NOT_FOUND" });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(getFileForDownload).toHaveBeenCalledWith(testUuid, undefined);
      expect(getExcelForDownload).not.toHaveBeenCalled();
    });
  });
});
