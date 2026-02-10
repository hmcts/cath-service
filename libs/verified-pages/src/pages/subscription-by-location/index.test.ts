import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/location", () => ({
  getAllJurisdictions: vi.fn().mockResolvedValue([]),
  getAllRegions: vi.fn().mockResolvedValue([]),
  getAllSubJurisdictions: vi.fn().mockResolvedValue([]),
  getLocationsGroupedByLetter: vi.fn().mockResolvedValue({}),
  getSubJurisdictionsForJurisdiction: vi.fn().mockResolvedValue([]),
  buildJurisdictionItems: vi.fn().mockResolvedValue([]),
  buildRegionItems: vi.fn().mockResolvedValue([]),
  buildSubJurisdictionItemsByJurisdiction: vi.fn().mockResolvedValue({})
}));

vi.mock("@hmcts/auth", () => ({
  requireAuth: () => vi.fn((_req, _res, next) => next()),
  blockUserAccess: () => vi.fn((_req, _res, next) => next()),
  buildVerifiedUserNavigation: vi.fn().mockReturnValue([])
}));

describe("subscription-by-location", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {
      query: {},
      body: {},
      session: {} as any
    };
    mockResponse = {
      render: vi.fn(),
      redirect: vi.fn(),
      locals: { locale: "en", navigation: {} }
    };
  });

  describe("GET", () => {
    it("should render the page with locations", async () => {
      // Arrange
      const handler = GET[GET.length - 1];

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.render).toHaveBeenCalledWith(
        "subscription-by-location/index",
        expect.objectContaining({
          heading: expect.any(String),
          tableRows: expect.any(Array)
        })
      );
    });

    it("should restore previously selected locations from session", async () => {
      // Arrange
      const handler = GET[GET.length - 1];
      mockRequest.session = {
        listTypeSubscription: {
          selectedLocationIds: [1, 2, 3]
        }
      } as any;

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.render).toHaveBeenCalledWith(
        "subscription-by-location/index",
        expect.objectContaining({
          previouslySelectedIds: [1, 2, 3]
        })
      );
    });
  });

  describe("POST", () => {
    it("should save selected locations to session and redirect", async () => {
      // Arrange
      const handler = POST[POST.length - 1];
      mockRequest.body = { locationIds: ["1", "2", "3"] };
      mockRequest.session = {
        save: vi.fn((callback) => callback(null))
      } as any;

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockRequest.session.listTypeSubscription).toEqual({
        selectedLocationIds: [1, 2, 3]
      });
      expect(mockResponse.redirect).toHaveBeenCalledWith("/subscription-locations-review");
    });

    it("should allow zero selections and redirect", async () => {
      // Arrange
      const handler = POST[POST.length - 1];
      mockRequest.body = {};
      mockRequest.session = {
        save: vi.fn((callback) => callback(null))
      } as any;

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockRequest.session.listTypeSubscription).toEqual({
        selectedLocationIds: []
      });
      expect(mockResponse.redirect).toHaveBeenCalledWith("/subscription-locations-review");
    });

    it("should handle session save error", async () => {
      // Arrange
      const handler = POST[POST.length - 1];
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockRequest.body = { locationIds: "1" };
      mockRequest.session = {
        save: vi.fn((callback) => callback(new Error("Session error")))
      } as any;

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockResponse.redirect).toHaveBeenCalledWith("/subscription-by-location");

      consoleErrorSpy.mockRestore();
    });
  });
});
