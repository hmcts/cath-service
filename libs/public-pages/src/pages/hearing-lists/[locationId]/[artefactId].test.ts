import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./[artefactId].js";

vi.mock("../../../flat-file/flat-file-service.js");

describe("Hearing Lists Page Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let renderSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    renderSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ render: renderSpy });

    mockRequest = {
      params: {}
    };

    mockResponse = {
      locals: {},
      render: renderSpy,
      status: statusSpy
    };
  });

  describe("Parameter Validation", () => {
    it("should return 400 when locationId is missing", async () => {
      mockRequest.params = { artefactId: "test-id" };

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(renderSpy).toHaveBeenCalledWith("hearing-lists/[locationId]/[artefactId]", {
        en: expect.any(Object),
        cy: expect.any(Object),
        isError: true,
        error: expect.stringContaining("Invalid request"),
        title: expect.stringContaining("not available"),
        backMessage: expect.any(String),
        backButton: expect.any(String)
      });
    });

    it("should return 400 when artefactId is missing", async () => {
      mockRequest.params = { locationId: "9" };

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(renderSpy).toHaveBeenCalledWith("hearing-lists/[locationId]/[artefactId]", {
        en: expect.any(Object),
        cy: expect.any(Object),
        isError: true,
        error: expect.stringContaining("Invalid request"),
        title: expect.any(String),
        backMessage: expect.any(String),
        backButton: expect.any(String)
      });
    });

    it("should return 400 when both parameters are missing", async () => {
      mockRequest.params = {};

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(renderSpy).toHaveBeenCalled();
    });

    it("should use Welsh error messages when locale is cy", async () => {
      mockRequest.params = {};
      mockResponse.locals = { locale: "cy" };

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(renderSpy).toHaveBeenCalledWith("hearing-lists/[locationId]/[artefactId]", {
        en: expect.any(Object),
        cy: expect.any(Object),
        isError: true,
        error: expect.stringContaining("annilys"),
        title: expect.any(String),
        backMessage: expect.any(String),
        backButton: expect.any(String)
      });
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      mockRequest.params = { locationId: "9", artefactId: "test-artefact-id" };
    });

    it("should return 404 for NOT_FOUND error", async () => {
      const { getFlatFileForDisplay } = await import("../../../flat-file/flat-file-service.js");
      vi.mocked(getFlatFileForDisplay).mockResolvedValue({ error: "NOT_FOUND" });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(renderSpy).toHaveBeenCalledWith("hearing-lists/[locationId]/[artefactId]", {
        en: expect.any(Object),
        cy: expect.any(Object),
        isError: true,
        error: expect.stringContaining("not available or has expired"),
        title: expect.any(String),
        backMessage: expect.any(String),
        backButton: expect.any(String)
      });
    });

    it("should return 404 for LOCATION_MISMATCH error", async () => {
      const { getFlatFileForDisplay } = await import("../../../flat-file/flat-file-service.js");
      vi.mocked(getFlatFileForDisplay).mockResolvedValue({ error: "LOCATION_MISMATCH" });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(renderSpy).toHaveBeenCalledWith("hearing-lists/[locationId]/[artefactId]", {
        en: expect.any(Object),
        cy: expect.any(Object),
        isError: true,
        error: expect.stringContaining("not available or has expired"),
        title: expect.any(String),
        backMessage: expect.any(String),
        backButton: expect.any(String)
      });
    });

    it("should return 410 for EXPIRED error", async () => {
      const { getFlatFileForDisplay } = await import("../../../flat-file/flat-file-service.js");
      vi.mocked(getFlatFileForDisplay).mockResolvedValue({ error: "EXPIRED" });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(410);
      expect(renderSpy).toHaveBeenCalledWith("hearing-lists/[locationId]/[artefactId]", {
        en: expect.any(Object),
        cy: expect.any(Object),
        isError: true,
        error: expect.stringContaining("not available or has expired"),
        title: expect.any(String),
        backMessage: expect.any(String),
        backButton: expect.any(String)
      });
    });

    it("should return 404 for FILE_NOT_FOUND error", async () => {
      const { getFlatFileForDisplay } = await import("../../../flat-file/flat-file-service.js");
      vi.mocked(getFlatFileForDisplay).mockResolvedValue({ error: "FILE_NOT_FOUND" });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(renderSpy).toHaveBeenCalledWith("hearing-lists/[locationId]/[artefactId]", {
        en: expect.any(Object),
        cy: expect.any(Object),
        isError: true,
        error: expect.stringContaining("could not load the hearing list file"),
        title: expect.any(String),
        backMessage: expect.any(String),
        backButton: expect.any(String)
      });
    });

    it("should return 400 for NOT_FLAT_FILE error", async () => {
      const { getFlatFileForDisplay } = await import("../../../flat-file/flat-file-service.js");
      vi.mocked(getFlatFileForDisplay).mockResolvedValue({ error: "NOT_FLAT_FILE" });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(renderSpy).toHaveBeenCalledWith("hearing-lists/[locationId]/[artefactId]", {
        en: expect.any(Object),
        cy: expect.any(Object),
        isError: true,
        error: expect.stringContaining("not available as a file"),
        title: expect.any(String),
        backMessage: expect.any(String),
        backButton: expect.any(String)
      });
    });

    it("should use Welsh error messages for errors when locale is cy", async () => {
      mockResponse.locals = { locale: "cy" };
      const { getFlatFileForDisplay } = await import("../../../flat-file/flat-file-service.js");
      vi.mocked(getFlatFileForDisplay).mockResolvedValue({ error: "NOT_FOUND" });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(renderSpy).toHaveBeenCalledWith("hearing-lists/[locationId]/[artefactId]", {
        en: expect.any(Object),
        cy: expect.any(Object),
        isError: true,
        error: expect.stringContaining("ar gael"),
        title: expect.any(String),
        backMessage: expect.any(String),
        backButton: expect.any(String)
      });
    });
  });

  describe("Successful Display", () => {
    const mockSuccessResult = {
      success: true,
      artefactId: "test-artefact-id",
      courtName: "Test Court",
      listTypeName: "Crown Daily List",
      contentDate: new Date("2025-01-15"),
      language: "ENGLISH"
    };

    beforeEach(() => {
      mockRequest.params = { locationId: "9", artefactId: "test-artefact-id" };
    });

    it("should render PDF viewer for successful display with English locale", async () => {
      const { getFlatFileForDisplay } = await import("../../../flat-file/flat-file-service.js");
      vi.mocked(getFlatFileForDisplay).mockResolvedValue(mockSuccessResult);

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).not.toHaveBeenCalled();
      expect(renderSpy).toHaveBeenCalledWith("hearing-lists/[locationId]/[artefactId]", {
        en: expect.any(Object),
        cy: expect.any(Object),
        isError: false,
        pageTitle: "Crown Daily List - Test Court",
        courtName: "Test Court",
        listTypeName: "Crown Daily List",
        contentDate: mockSuccessResult.contentDate,
        downloadUrl: "/api/flat-file/test-artefact-id/download",
        artefactId: "test-artefact-id",
        pdfNotSupportedMessage: expect.any(String),
        downloadLinkText: expect.any(String)
      });
    });

    it("should render PDF viewer for successful display with Welsh locale", async () => {
      mockResponse.locals = { locale: "cy" };
      const { getFlatFileForDisplay } = await import("../../../flat-file/flat-file-service.js");
      vi.mocked(getFlatFileForDisplay).mockResolvedValue({
        ...mockSuccessResult,
        courtName: "Llys Prawf",
        listTypeName: "Rhestr Ddyddiol y Goron"
      });

      await GET(mockRequest as Request, mockResponse as Response);

      expect(statusSpy).not.toHaveBeenCalled();
      expect(renderSpy).toHaveBeenCalledWith("hearing-lists/[locationId]/[artefactId]", {
        en: expect.any(Object),
        cy: expect.any(Object),
        isError: false,
        pageTitle: "Rhestr Ddyddiol y Goron - Llys Prawf",
        courtName: "Llys Prawf",
        listTypeName: "Rhestr Ddyddiol y Goron",
        contentDate: mockSuccessResult.contentDate,
        downloadUrl: "/api/flat-file/test-artefact-id/download",
        artefactId: "test-artefact-id",
        pdfNotSupportedMessage: expect.stringContaining("eich porwr"),
        downloadLinkText: expect.stringContaining("Lawrlwytho")
      });
    });

    it("should default to English locale when locale is not set", async () => {
      mockResponse.locals = {};
      const { getFlatFileForDisplay } = await import("../../../flat-file/flat-file-service.js");
      vi.mocked(getFlatFileForDisplay).mockResolvedValue(mockSuccessResult);

      await GET(mockRequest as Request, mockResponse as Response);

      expect(renderSpy).toHaveBeenCalledWith("hearing-lists/[locationId]/[artefactId]", {
        en: expect.any(Object),
        cy: expect.any(Object),
        isError: false,
        pageTitle: expect.any(String),
        courtName: expect.any(String),
        listTypeName: expect.any(String),
        contentDate: expect.any(Date),
        downloadUrl: expect.stringContaining("/api/flat-file/"),
        artefactId: expect.any(String),
        pdfNotSupportedMessage: expect.stringContaining("browser"),
        downloadLinkText: expect.stringContaining("Download")
      });
    });

    it("should construct correct download URL", async () => {
      const { getFlatFileForDisplay } = await import("../../../flat-file/flat-file-service.js");
      vi.mocked(getFlatFileForDisplay).mockResolvedValue(mockSuccessResult);

      await GET(mockRequest as Request, mockResponse as Response);

      expect(renderSpy).toHaveBeenCalledWith(
        "hearing-lists/[locationId]/[artefactId]",
        expect.objectContaining({
          downloadUrl: "/api/flat-file/test-artefact-id/download"
        })
      );
    });

    it("should construct page title with list type and court name", async () => {
      const { getFlatFileForDisplay } = await import("../../../flat-file/flat-file-service.js");
      vi.mocked(getFlatFileForDisplay).mockResolvedValue(mockSuccessResult);

      await GET(mockRequest as Request, mockResponse as Response);

      expect(renderSpy).toHaveBeenCalledWith(
        "hearing-lists/[locationId]/[artefactId]",
        expect.objectContaining({
          pageTitle: "Crown Daily List - Test Court"
        })
      );
    });

    it("should pass through all result data to template", async () => {
      const { getFlatFileForDisplay } = await import("../../../flat-file/flat-file-service.js");
      vi.mocked(getFlatFileForDisplay).mockResolvedValue(mockSuccessResult);

      await GET(mockRequest as Request, mockResponse as Response);

      expect(renderSpy).toHaveBeenCalledWith(
        "hearing-lists/[locationId]/[artefactId]",
        expect.objectContaining({
          courtName: mockSuccessResult.courtName,
          listTypeName: mockSuccessResult.listTypeName,
          contentDate: mockSuccessResult.contentDate,
          artefactId: mockSuccessResult.artefactId
        })
      );
    });
  });
});
