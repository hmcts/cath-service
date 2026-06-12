import * as publication from "@hmcts/publication";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/publication", () => ({
  getLocationsWithPublicationCount: vi.fn()
}));

const { GET } = await import("./index.js");

describe("blob-explorer-locations page", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      query: {}
    };

    mockResponse = {
      render: vi.fn()
    };
  });

  describe("GET", () => {
    it("should render the blob-explorer-locations page with English content", async () => {
      const mockLocations = [
        { locationId: "1", locationName: "Location 1", publicationCount: 5 },
        { locationId: "2", locationName: "Location 2", publicationCount: 3 }
      ];

      vi.mocked(publication.getLocationsWithPublicationCount).mockResolvedValue(mockLocations);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(publication.getLocationsWithPublicationCount).toHaveBeenCalled();
      expect(mockResponse.render).toHaveBeenCalledWith(
        "blob-explorer-locations/index",
        expect.objectContaining({
          tableRows: expect.arrayContaining([
            expect.arrayContaining([expect.objectContaining({ html: expect.stringContaining("Location 1") }), expect.objectContaining({ text: "5" })])
          ]),
          locale: "en"
        })
      );
    });

    it("should render the blob-explorer-locations page with Welsh content when lng=cy", async () => {
      mockRequest.query = { lng: "cy" };

      const mockLocations = [{ locationId: "1", locationName: "Location 1", publicationCount: 5 }];

      vi.mocked(publication.getLocationsWithPublicationCount).mockResolvedValue(mockLocations);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "blob-explorer-locations/index",
        expect.objectContaining({
          locale: "cy"
        })
      );
    });

    it("should render error when service fails", async () => {
      vi.mocked(publication.getLocationsWithPublicationCount).mockRejectedValue(new Error("Database error"));

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "blob-explorer-locations/index",
        expect.objectContaining({
          error: expect.any(String),
          tableRows: []
        })
      );
    });

    it("should generate correct links to publications page", async () => {
      const mockLocations = [{ locationId: "123", locationName: "Test Location", publicationCount: 10 }];

      vi.mocked(publication.getLocationsWithPublicationCount).mockResolvedValue(mockLocations);

      const handler = GET[1];
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      expect(mockResponse.render).toHaveBeenCalledWith(
        "blob-explorer-locations/index",
        expect.objectContaining({
          tableRows: expect.arrayContaining([
            expect.arrayContaining([
              expect.objectContaining({
                html: expect.stringContaining("/blob-explorer-publications?locationId=123")
              })
            ])
          ])
        })
      );
    });
  });
});
