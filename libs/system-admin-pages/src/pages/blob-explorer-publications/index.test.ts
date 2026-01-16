import * as publication from "@hmcts/publication";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/publication", () => ({
  getArtefactSummariesByLocation: vi.fn(),
  getArtefactType: vi.fn()
}));

const { GET } = await import("./index.js");

describe("blob-explorer-publications page", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      query: { locationId: "123" }
    };

    mockResponse = {
      render: vi.fn(),
      redirect: vi.fn()
    };
  });

  describe("GET", () => {
    it("should redirect to blob-explorer-locations when locationId is missing", async () => {
      mockRequest.query = {};

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.redirect).toHaveBeenCalledWith("/blob-explorer-locations");
    });

    it("should render the blob-explorer-publications page with English content", async () => {
      const mockPublications = [
        {
          artefactId: "abc-123",
          listType: "Civil Daily Cause List",
          displayFrom: "2024-01-01T00:00:00Z",
          displayTo: "2024-01-02T00:00:00Z"
        }
      ];

      vi.mocked(publication.getArtefactSummariesByLocation).mockResolvedValue(mockPublications);
      vi.mocked(publication.getArtefactType).mockResolvedValue("flat-file");

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(publication.getArtefactSummariesByLocation).toHaveBeenCalledWith("123");
      expect(mockResponse.render).toHaveBeenCalledWith(
        "blob-explorer-publications/index",
        expect.objectContaining({
          tableRows: expect.arrayContaining([
            expect.arrayContaining([
              expect.objectContaining({ html: expect.stringContaining("abc-123") }),
              expect.objectContaining({ text: "Civil Daily Cause List" })
            ])
          ]),
          locationId: "123",
          locale: "en"
        })
      );
    });

    it("should render the blob-explorer-publications page with Welsh content when lng=cy", async () => {
      mockRequest.query = { locationId: "123", lng: "cy" };

      vi.mocked(publication.getArtefactSummariesByLocation).mockResolvedValue([]);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "blob-explorer-publications/index",
        expect.objectContaining({
          locale: "cy"
        })
      );
    });

    it("should generate correct link for flat-file publications", async () => {
      const mockPublications = [
        {
          artefactId: "flat-123",
          listType: "Test List",
          displayFrom: "2024-01-01T00:00:00Z",
          displayTo: "2024-01-02T00:00:00Z"
        }
      ];

      vi.mocked(publication.getArtefactSummariesByLocation).mockResolvedValue(mockPublications);
      vi.mocked(publication.getArtefactType).mockResolvedValue("flat-file");

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "blob-explorer-publications/index",
        expect.objectContaining({
          tableRows: expect.arrayContaining([
            expect.arrayContaining([
              expect.objectContaining({
                html: expect.stringContaining("/blob-explorer-flat-file?artefactId=flat-123")
              })
            ])
          ])
        })
      );
    });

    it("should generate correct link for json-file publications", async () => {
      const mockPublications = [
        {
          artefactId: "json-123",
          listType: "Test List",
          displayFrom: "2024-01-01T00:00:00Z",
          displayTo: "2024-01-02T00:00:00Z"
        }
      ];

      vi.mocked(publication.getArtefactSummariesByLocation).mockResolvedValue(mockPublications);
      vi.mocked(publication.getArtefactType).mockResolvedValue("json");

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "blob-explorer-publications/index",
        expect.objectContaining({
          tableRows: expect.arrayContaining([
            expect.arrayContaining([
              expect.objectContaining({
                html: expect.stringContaining("/blob-explorer-json-file?artefactId=json-123")
              })
            ])
          ])
        })
      );
    });

    it("should render error when service fails", async () => {
      vi.mocked(publication.getArtefactSummariesByLocation).mockRejectedValue(new Error("Database error"));

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "blob-explorer-publications/index",
        expect.objectContaining({
          error: expect.any(String),
          tableRows: []
        })
      );
    });

    it("should format dates correctly", async () => {
      const mockPublications = [
        {
          artefactId: "abc-123",
          listType: "Test List",
          displayFrom: "2024-01-15T10:30:00Z",
          displayTo: "2024-01-16T15:45:00Z"
        }
      ];

      vi.mocked(publication.getArtefactSummariesByLocation).mockResolvedValue(mockPublications);
      vi.mocked(publication.getArtefactType).mockResolvedValue("flat-file");

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "blob-explorer-publications/index",
        expect.objectContaining({
          tableRows: expect.arrayContaining([
            expect.arrayContaining([
              expect.anything(),
              expect.anything(),
              expect.objectContaining({ text: expect.stringMatching(/\d{2}\/\d{2}\/\d{4}/) }),
              expect.objectContaining({ text: expect.stringMatching(/\d{2}\/\d{2}\/\d{4}/) })
            ])
          ])
        })
      );
    });

    it("should escape HTML in artefactId to prevent XSS", async () => {
      const mockPublications = [
        {
          artefactId: '<script>alert("XSS")</script>',
          listType: "Test List",
          displayFrom: "2024-01-01T00:00:00Z",
          displayTo: "2024-01-02T00:00:00Z"
        }
      ];

      vi.mocked(publication.getArtefactSummariesByLocation).mockResolvedValue(mockPublications);
      vi.mocked(publication.getArtefactType).mockResolvedValue("json");

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      const renderCall = vi.mocked(mockResponse.render).mock.calls[0];
      const tableRows = renderCall[1].tableRows;
      const htmlContent = tableRows[0][0].html;

      // Verify HTML entities are escaped
      expect(htmlContent).toContain("&lt;script&gt;");
      expect(htmlContent).toContain("&lt;/script&gt;");
      expect(htmlContent).not.toContain("<script>");
      expect(htmlContent).not.toContain("</script>");
    });

    it("should URL-encode artefactId in query parameters", async () => {
      const mockPublications = [
        {
          artefactId: "test id with spaces & special=chars",
          listType: "Test List",
          displayFrom: "2024-01-01T00:00:00Z",
          displayTo: "2024-01-02T00:00:00Z"
        }
      ];

      vi.mocked(publication.getArtefactSummariesByLocation).mockResolvedValue(mockPublications);
      vi.mocked(publication.getArtefactType).mockResolvedValue("json");

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      const renderCall = vi.mocked(mockResponse.render).mock.calls[0];
      const tableRows = renderCall[1].tableRows;
      const htmlContent = tableRows[0][0].html;

      // Verify URL encoding
      expect(htmlContent).toContain("artefactId=test%20id%20with%20spaces%20%26%20special%3Dchars");
      expect(htmlContent).not.toContain("artefactId=test id with spaces & special=chars");
    });
  });
});
