import * as publication from "@hmcts/publication";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/publication", () => ({
  getArtefactMetadata: vi.fn(),
  getFlatFileUrl: vi.fn(),
  RESEND_ACTIONS: ["resubmit", "courtel", "third-party", "email"]
}));

const { GET } = await import("./index.js");

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
