import * as publication from "@hmcts/publication";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as notificationService from "../../services/service.js";

vi.mock("@hmcts/publication", () => ({
  getArtefactMetadata: vi.fn()
}));

vi.mock("../../services/service.js", () => ({
  sendPublicationNotifications: vi.fn()
}));

const { GET, POST } = await import("./index.js");

describe("blob-explorer-confirm-resubmission page", () => {
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

    it("should render the blob-explorer-confirm-resubmission page with English content", async () => {
      const mockMetadata = {
        locationName: "Test Court",
        listType: "Civil Daily Cause List",
        displayFrom: "2024-01-01T00:00:00Z",
        displayTo: "2024-01-02T00:00:00Z"
      };

      vi.mocked(publication.getArtefactMetadata).mockResolvedValue(mockMetadata);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(publication.getArtefactMetadata).toHaveBeenCalledWith("abc-123");
      expect(mockResponse.render).toHaveBeenCalledWith(
        "blob-explorer-confirm-resubmission/index",
        expect.objectContaining({
          metadata: mockMetadata,
          artefactId: "abc-123",
          locale: "en"
        })
      );
    });

    it("should render the blob-explorer-confirm-resubmission page with Welsh content when lng=cy", async () => {
      mockRequest.query = { artefactId: "abc-123", lng: "cy" };

      const mockMetadata = {
        locationName: "Test Court",
        listType: "Civil Daily Cause List",
        displayFrom: "2024-01-01T00:00:00Z",
        displayTo: "2024-01-02T00:00:00Z"
      };

      vi.mocked(publication.getArtefactMetadata).mockResolvedValue(mockMetadata);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "blob-explorer-confirm-resubmission/index",
        expect.objectContaining({
          locale: "cy"
        })
      );
    });

    it("should render error when metadata is null", async () => {
      vi.mocked(publication.getArtefactMetadata).mockResolvedValue(null);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "blob-explorer-confirm-resubmission/index",
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
        "blob-explorer-confirm-resubmission/index",
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

    it("should send notifications, clear session and redirect to success page", async () => {
      mockRequest.session.resubmissionArtefactId = "abc-123";

      vi.mocked(notificationService.sendPublicationNotifications).mockResolvedValue(undefined);

      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(notificationService.sendPublicationNotifications).toHaveBeenCalledWith("abc-123");
      expect(mockRequest.session.resubmissionArtefactId).toBeUndefined();
      expect(mockResponse.redirect).toHaveBeenCalledWith("/blob-explorer-resubmission-success");
    });

    it("should render error when notification service fails", async () => {
      vi.mocked(notificationService.sendPublicationNotifications).mockRejectedValue(new Error("Notification error"));

      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "blob-explorer-confirm-resubmission/index",
        expect.objectContaining({
          error: expect.any(String),
          artefactId: "abc-123"
        })
      );
    });

    it("should render error in Welsh when notification fails with lng=cy", async () => {
      mockRequest.query = { artefactId: "abc-123", lng: "cy" };

      vi.mocked(notificationService.sendPublicationNotifications).mockRejectedValue(new Error("Notification error"));

      const handler = POST[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "blob-explorer-confirm-resubmission/index",
        expect.objectContaining({
          error: expect.any(String),
          locale: "cy"
        })
      );
    });
  });
});
