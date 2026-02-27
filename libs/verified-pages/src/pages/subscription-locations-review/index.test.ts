import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn((id: number) => {
    const locations = [
      { locationId: 1, name: "Court A", welshName: "Llys A" },
      { locationId: 2, name: "Court B", welshName: "Llys B" },
      { locationId: 3, name: "Court C", welshName: "Llys C" }
    ];
    return Promise.resolve(locations.find((loc) => loc.locationId === id));
  })
}));

vi.mock("@hmcts/auth", () => ({
  requireAuth: () => vi.fn((_req, _res, next) => next()),
  blockUserAccess: () => vi.fn((_req, _res, next) => next()),
  buildVerifiedUserNavigation: vi.fn().mockReturnValue([])
}));

describe("subscription-locations-review", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = {
      query: {},
      session: {} as any
    };
    mockResponse = {
      render: vi.fn(),
      locals: { locale: "en", navigation: {} }
    };
  });

  describe("GET", () => {
    it("should render page with selected locations", async () => {
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
        "subscription-locations-review/index",
        expect.objectContaining({
          heading: expect.any(String),
          locationRows: expect.arrayContaining([
            expect.objectContaining({ locationId: 1, name: "Court A" }),
            expect.objectContaining({ locationId: 2, name: "Court B" }),
            expect.objectContaining({ locationId: 3, name: "Court C" })
          ]),
          hasLocations: true
        })
      );
    });

    it("should render page with Welsh location names", async () => {
      // Arrange
      const handler = GET[GET.length - 1];
      mockRequest.session = {
        listTypeSubscription: {
          selectedLocationIds: [1]
        }
      } as any;
      mockResponse.locals = { locale: "cy", navigation: {} };

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.render).toHaveBeenCalledWith(
        "subscription-locations-review/index",
        expect.objectContaining({
          locationRows: expect.arrayContaining([expect.objectContaining({ name: "Llys A" })])
        })
      );
    });

    it("should render empty state when no locations selected", async () => {
      // Arrange
      const handler = GET[GET.length - 1];
      mockRequest.session = {
        listTypeSubscription: {
          selectedLocationIds: []
        }
      } as any;

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockResponse.render).toHaveBeenCalledWith(
        "subscription-locations-review/index",
        expect.objectContaining({
          locationRows: [],
          hasLocations: false
        })
      );
    });

    it("should remove location when remove query parameter is provided", async () => {
      // Arrange
      const handler = GET[GET.length - 1];
      mockRequest.query = { remove: "2" };
      mockRequest.session = {
        listTypeSubscription: {
          selectedLocationIds: [1, 2, 3]
        },
        save: vi.fn((callback) => callback(null))
      } as any;
      mockResponse.redirect = vi.fn();

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      expect(mockRequest.session.listTypeSubscription?.selectedLocationIds).toEqual([1, 3]);
      expect(mockRequest.session.save).toHaveBeenCalled();
      expect(mockResponse.redirect).toHaveBeenCalledWith("/subscription-locations-review");
    });

    it("should sort locations alphabetically by name", async () => {
      // Arrange
      const handler = GET[GET.length - 1];
      mockRequest.session = {
        listTypeSubscription: {
          selectedLocationIds: [3, 1, 2]
        }
      } as any;

      // Act
      await handler(mockRequest as Request, mockResponse as Response, vi.fn());

      // Assert
      const renderCall = (mockResponse.render as any).mock.calls[0][1];
      const locationRows = renderCall.locationRows;
      expect(locationRows[0].name).toBe("Court A");
      expect(locationRows[1].name).toBe("Court B");
      expect(locationRows[2].name).toBe("Court C");
    });
  });
});
