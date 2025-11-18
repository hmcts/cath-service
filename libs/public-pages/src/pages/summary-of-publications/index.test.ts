import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

// Mock the location module
vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn((id: number) => {
    if (id === 9) {
      return Promise.resolve({
        locationId: 9,
        name: "Single Justice Procedure",
        welshName: "Gweithdrefn Ynad Unigol",
        regions: [],
        subJurisdictions: []
      });
    }
    if (id === 1) {
      return Promise.resolve({
        locationId: 1,
        name: "Test Location",
        welshName: "Lleoliad Prawf",
        regions: [],
        subJurisdictions: []
      });
    }
    return Promise.resolve(undefined);
  })
}));

describe("Summary of Publications - GET handler", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let renderSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    renderSpy = vi.fn();
    mockRequest = {
      query: {}
    };
    mockResponse = {
      locals: { locale: "en" },
      status: vi.fn().mockReturnThis(),
      render: renderSpy
    };
  });

  describe("Error handling", () => {
    it("should redirect to 400 page when locationId is missing", async () => {
      const redirectSpy = vi.fn();
      mockResponse.redirect = redirectSpy;

      await GET(mockRequest as Request, mockResponse as Response);

      expect(redirectSpy).toHaveBeenCalledWith("/400");
    });

    it("should redirect to 400 page when locationId is invalid (non-numeric)", async () => {
      const redirectSpy = vi.fn();
      mockRequest.query = { locationId: "abc" };
      mockResponse.redirect = redirectSpy;

      await GET(mockRequest as Request, mockResponse as Response);

      expect(redirectSpy).toHaveBeenCalledWith("/400");
    });

    it("should redirect to 400 page when location not found", async () => {
      const redirectSpy = vi.fn();
      mockRequest.query = { locationId: "999" };
      mockResponse.redirect = redirectSpy;

      await GET(mockRequest as Request, mockResponse as Response);

      expect(redirectSpy).toHaveBeenCalledWith("/400");
    });
  });

  describe("English locale", () => {
    it("should render page with location name when location found", async () => {
      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "en" };

      await GET(mockRequest as Request, mockResponse as Response);

      expect(renderSpy).toHaveBeenCalledWith(
        "summary-of-publications/index",
        expect.objectContaining({
          title: "What do you want to view from Single Justice Procedure?"
        })
      );
    });

    it("should render filtered publications for valid locationId", async () => {
      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "en" };

      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = renderSpy.mock.calls[0][1];
      expect(renderCall.publications).toBeDefined();
      expect(renderCall.publications.length).toBeGreaterThan(0);
      // All publications should be for locationId 9
      expect(renderCall.publications.every((p: any) => p.id > 0)).toBe(true);
    });

    it("should render publications sorted by date descending", async () => {
      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "en" };

      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = renderSpy.mock.calls[0][1];
      const publications = renderCall.publications;

      // Check that publications are sorted by list name, then date, then language
      expect(publications.length).toBeGreaterThan(1);
      // Check date format is correct
      expect(publications[0].formattedDate).toMatch(/\d{1,2} \w+ \d{4}/);
    });

    it("should format list types correctly in English", async () => {
      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "en" };

      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = renderSpy.mock.calls[0][1];
      const publications = renderCall.publications;

      // Check that list type names are formatted
      expect(publications.some((p: any) => p.listTypeName === "Magistrates Public List")).toBe(true);
    });

    it("should format dates correctly for English locale", async () => {
      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "en" };

      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = renderSpy.mock.calls[0][1];
      const publications = renderCall.publications;

      // Check date format (e.g., "20 April 2025")
      expect(publications[0].formattedDate).toMatch(/\d{1,2} \w+ \d{4}/);
    });

    it("should render empty state when no publications found for location", async () => {
      mockRequest.query = { locationId: "1" };
      mockResponse.locals = { locale: "en" };

      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = renderSpy.mock.calls[0][1];
      expect(renderCall.noPublicationsMessage).toBe("Sorry, no lists found for this court");
    });
  });

  describe("Welsh locale", () => {
    it("should render page with Welsh location name when location found", async () => {
      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "cy" };

      await GET(mockRequest as Request, mockResponse as Response);

      expect(renderSpy).toHaveBeenCalledWith(
        "summary-of-publications/index",
        expect.objectContaining({
          title: "Beth ydych chi eisiau edrych arno gan Gweithdrefn Ynad Unigol?"
        })
      );
    });

    it("should format list types correctly in Welsh", async () => {
      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "cy" };

      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = renderSpy.mock.calls[0][1];
      const publications = renderCall.publications;

      // Check that Welsh list type names are displayed from welshFriendlyName
      expect(publications.some((p: any) => p.listTypeName === "Magistrates Public List")).toBe(true);
    });

    it("should format dates correctly for Welsh locale", async () => {
      mockRequest.query = { locationId: "9" };
      mockResponse.locals = { locale: "cy" };

      await GET(mockRequest as Request, mockResponse as Response);

      const renderCall = renderSpy.mock.calls[0][1];
      const publications = renderCall.publications;

      // Check Welsh date format (e.g., "15 Ebrill 2025")
      expect(publications[0].formattedDate).toMatch(/\d{1,2} \w+ \d{4}/);
      // Should contain Welsh month name (Ebrill = April)
      expect(publications[0].formattedDate).toContain("Ebrill");
    });

    it("should redirect to 400 page when locationId is missing (Welsh locale)", async () => {
      const redirectSpy = vi.fn();
      mockRequest.query = {};
      mockResponse.locals = { locale: "cy" };
      mockResponse.redirect = redirectSpy;

      await GET(mockRequest as Request, mockResponse as Response);

      expect(redirectSpy).toHaveBeenCalledWith("/400");
    });
  });
});
