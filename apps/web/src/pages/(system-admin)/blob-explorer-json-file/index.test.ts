import * as publication from "@hmcts/publication";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/publication", () => ({
  getArtefactMetadata: vi.fn(),
  getJsonContent: vi.fn(),
  getRenderedTemplateUrl: vi.fn(),
  RESEND_ACTIONS: ["resubmit", "courtel", "third-party", "email"]
}));

const { GET } = await import("./index.js");

describe("blob-explorer-json-file page", () => {
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

    it("should render the blob-explorer-json-file page with English content", async () => {
      const mockMetadata = {
        locationName: "Test Court",
        listType: "Civil Daily Cause List",
        displayFrom: "2024-01-01T00:00:00Z",
        displayTo: "2024-01-02T00:00:00Z"
      };
      const mockJsonContent = { cases: [{ id: "1", name: "Test Case" }] };
      const mockRenderedUrl = "https://example.com/rendered.html";

      vi.mocked(publication.getArtefactMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(publication.getJsonContent).mockResolvedValue(mockJsonContent);
      vi.mocked(publication.getRenderedTemplateUrl).mockResolvedValue(mockRenderedUrl);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(publication.getArtefactMetadata).toHaveBeenCalledWith("abc-123");
      expect(publication.getJsonContent).toHaveBeenCalledWith("abc-123");
      expect(publication.getRenderedTemplateUrl).toHaveBeenCalledWith("abc-123");
      const renderCall = vi.mocked(mockResponse.render).mock.calls[0];
      expect(renderCall[0]).toBe("blob-explorer-json-file/index");
      expect(renderCall[1]).toMatchObject({
        metadata: mockMetadata,
        renderedTemplateUrl: mockRenderedUrl,
        locale: "en"
      });
      // jsonContent should be present and escaped
      expect(renderCall[1].jsonContent).toBeTruthy();
    });

    it("should render the blob-explorer-json-file page with Welsh content when lng=cy", async () => {
      mockRequest.query = { artefactId: "abc-123", lng: "cy" };

      const mockMetadata = {
        locationName: "Test Court",
        listType: "Civil Daily Cause List",
        displayFrom: "2024-01-01T00:00:00Z",
        displayTo: "2024-01-02T00:00:00Z"
      };

      vi.mocked(publication.getArtefactMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(publication.getJsonContent).mockResolvedValue({ test: "data" });
      vi.mocked(publication.getRenderedTemplateUrl).mockResolvedValue("https://example.com/rendered.html");

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "blob-explorer-json-file/index",
        expect.objectContaining({
          locale: "cy"
        })
      );
    });

    it("should handle null jsonContent", async () => {
      const mockMetadata = {
        locationName: "Test Court",
        listType: "Civil Daily Cause List",
        displayFrom: "2024-01-01T00:00:00Z",
        displayTo: "2024-01-02T00:00:00Z"
      };

      vi.mocked(publication.getArtefactMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(publication.getJsonContent).mockResolvedValue(null);
      vi.mocked(publication.getRenderedTemplateUrl).mockResolvedValue("https://example.com/rendered.html");

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "blob-explorer-json-file/index",
        expect.objectContaining({
          jsonContent: null
        })
      );
    });

    it("should render error when metadata is null", async () => {
      vi.mocked(publication.getArtefactMetadata).mockResolvedValue(null);
      vi.mocked(publication.getJsonContent).mockResolvedValue(null);
      vi.mocked(publication.getRenderedTemplateUrl).mockResolvedValue(null);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "blob-explorer-json-file/index",
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
        "blob-explorer-json-file/index",
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });

    it("should escape HTML in jsonContent to prevent XSS", async () => {
      const mockMetadata = {
        locationName: "Test Court",
        listType: "Civil Daily Cause List",
        displayFrom: "2024-01-01T00:00:00Z",
        displayTo: "2024-01-02T00:00:00Z"
      };
      const mockJsonContent = {
        malicious: "<script>alert('XSS')</script>",
        normal: "safe content"
      };

      vi.mocked(publication.getArtefactMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(publication.getJsonContent).mockResolvedValue(mockJsonContent);
      vi.mocked(publication.getRenderedTemplateUrl).mockResolvedValue(null);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      const renderCall = vi.mocked(mockResponse.render).mock.calls[0];
      const jsonContent = renderCall[1].jsonContent;

      // Verify HTML entities are escaped
      expect(jsonContent).toContain("&lt;script&gt;");
      expect(jsonContent).toContain("&lt;/script&gt;");
      expect(jsonContent).not.toContain("<script>");
      expect(jsonContent).not.toContain("</script>");
    });

    it("should escape ampersands in jsonContent", async () => {
      const mockMetadata = {
        locationName: "Test Court",
        listType: "Civil Daily Cause List",
        displayFrom: "2024-01-01T00:00:00Z",
        displayTo: "2024-01-02T00:00:00Z"
      };
      const mockJsonContent = {
        text: "Text 1",
        url: "http://example.com?foo=bar&baz=qux"
      };

      vi.mocked(publication.getArtefactMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(publication.getJsonContent).mockResolvedValue(mockJsonContent);
      vi.mocked(publication.getRenderedTemplateUrl).mockResolvedValue(null);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      const renderCall = vi.mocked(mockResponse.render).mock.calls[0];
      const jsonContent = renderCall[1].jsonContent;

      // Verify ampersands are escaped
      expect(jsonContent).toContain("&amp;");
    });

    it("should escape quotes in jsonContent", async () => {
      const mockMetadata = {
        locationName: "Test Court",
        listType: "Civil Daily Cause List",
        displayFrom: "2024-01-01T00:00:00Z",
        displayTo: "2024-01-02T00:00:00Z"
      };
      const mockJsonContent = {
        text: "Text 2",
        attribute: "onclick='malicious()'"
      };

      vi.mocked(publication.getArtefactMetadata).mockResolvedValue(mockMetadata);
      vi.mocked(publication.getJsonContent).mockResolvedValue(mockJsonContent);
      vi.mocked(publication.getRenderedTemplateUrl).mockResolvedValue(null);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      const renderCall = vi.mocked(mockResponse.render).mock.calls[0];
      const jsonContent = renderCall[1].jsonContent;

      // Verify quotes are escaped
      expect(jsonContent).toContain("&quot;");
      expect(jsonContent).toContain("&#39;");
    });
  });

  describe("POST", () => {
    it("should not export a POST handler", async () => {
      const module = await import("./index.js");

      expect("POST" in module).toBe(false);
    });
  });

  describe("resend buttons", () => {
    it("should pass the four action buttons in order to the template", async () => {
      // Arrange
      vi.mocked(publication.getArtefactMetadata).mockResolvedValue({ locationName: "Test Court" } as any);

      // Act
      await GET[1](mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      const renderCall = vi.mocked(mockResponse.render).mock.calls[0];
      expect(renderCall[1].resendButtons).toEqual([
        { text: "Re-submit subscription", href: "/blob-explorer-confirm-resubmission?artefactId=abc-123&action=resubmit", classes: "govuk-button" },
        {
          text: "Send to Courtel",
          href: "/blob-explorer-confirm-resubmission?artefactId=abc-123&action=courtel",
          classes: "govuk-button govuk-button--secondary"
        },
        {
          text: "Send to third party subscribers",
          href: "/blob-explorer-confirm-resubmission?artefactId=abc-123&action=third-party",
          classes: "govuk-button govuk-button--secondary"
        },
        {
          text: "Send subscription email",
          href: "/blob-explorer-confirm-resubmission?artefactId=abc-123&action=email",
          classes: "govuk-button govuk-button--secondary"
        }
      ]);
    });

    it("should keep lng=cy on the button hrefs when Welsh is selected", async () => {
      // Arrange
      mockRequest.query = { artefactId: "abc-123", lng: "cy" };
      vi.mocked(publication.getArtefactMetadata).mockResolvedValue({ locationName: "Test Court" } as any);

      // Act
      await GET[1](mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      const renderCall = vi.mocked(mockResponse.render).mock.calls[0];
      expect(renderCall[1].resendButtons.map((button: { href: string }) => button.href)).toEqual([
        "/blob-explorer-confirm-resubmission?artefactId=abc-123&action=resubmit&lng=cy",
        "/blob-explorer-confirm-resubmission?artefactId=abc-123&action=courtel&lng=cy",
        "/blob-explorer-confirm-resubmission?artefactId=abc-123&action=third-party&lng=cy",
        "/blob-explorer-confirm-resubmission?artefactId=abc-123&action=email&lng=cy"
      ]);
    });
  });
});
