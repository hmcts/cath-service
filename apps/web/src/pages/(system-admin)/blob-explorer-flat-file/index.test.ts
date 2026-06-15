import * as publication from "@hmcts/publication";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/publication", () => ({
  getArtefactMetadata: vi.fn(),
  getFlatFileUrl: vi.fn()
}));

const { GET, POST } = await import("./index.js");

describe("blob-explorer-flat-file page", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      query: { artefactId: "abc-123" },
      session: {} as any
    };

    mockResponse = {
      render: vi.fn(),
      redirect: vi.fn()
    };
  });

  describe("GET", () => {
    it("should redirect to blob-explorer-locations when artefactId is missing", async () => {
      mockRequest.query = {};

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.redirect).toHaveBeenCalledWith("/blob-explorer-locations");
    });

    it("should render the blob-explorer-flat-file page with English content", async () => {
      const mockMetadata = {
        locationName: "Test Court",
        listType: "Civil Daily Cause List",
        displayFrom: "2024-01-01T00:00:00Z",
        displayTo: "2024-01-02T00:00:00Z"
      };
      const mockUrl = "https://example.com/flat-file.pdf";

      vi.mocked(publication.getArtefactMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(publication.getFlatFileUrl).mockResolvedValue(mockUrl);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(publication.getArtefactMetadata).toHaveBeenCalledWith("abc-123");
      expect(publication.getFlatFileUrl).toHaveBeenCalledWith("abc-123");
      expect(mockResponse.render).toHaveBeenCalledWith(
        "blob-explorer-flat-file/index",
        expect.objectContaining({
          metadata: mockMetadata,
          flatFileUrl: mockUrl,
          locale: "en"
        })
      );
    });

    it("should render the blob-explorer-flat-file page with Welsh content when lng=cy", async () => {
      mockRequest.query = { artefactId: "abc-123", lng: "cy" };

      const mockMetadata = {
        locationName: "Test Court",
        listType: "Civil Daily Cause List",
        displayFrom: "2024-01-01T00:00:00Z",
        displayTo: "2024-01-02T00:00:00Z"
      };

      vi.mocked(publication.getArtefactMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(publication.getFlatFileUrl).mockResolvedValue("https://example.com/file.pdf");

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "blob-explorer-flat-file/index",
        expect.objectContaining({
          locale: "cy"
        })
      );
    });

    it("should render error when metadata is null", async () => {
      vi.mocked(publication.getArtefactMetadata).mockResolvedValue(null);
      vi.mocked(publication.getFlatFileUrl).mockResolvedValue(null);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "blob-explorer-flat-file/index",
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });

    it("should render error when service fails", async () => {
      vi.mocked(publication.getArtefactMetadata).mockRejectedValue(new Error("Database error"));

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "blob-explorer-flat-file/index",
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });
  });

  describe("POST", () => {
    it("should redirect to blob-explorer-locations when artefactId is missing", async () => {
      mockRequest.query = {};

      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.redirect).toHaveBeenCalledWith("/blob-explorer-locations");
    });

    it("should store artefactId in session and redirect to confirmation page", async () => {
      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockRequest.session.resubmissionArtefactId).toBe("abc-123");
      expect(mockResponse.redirect).toHaveBeenCalledWith("/blob-explorer-confirm-resubmission?artefactId=abc-123");
    });
  });
});
