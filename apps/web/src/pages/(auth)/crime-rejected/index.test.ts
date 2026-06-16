import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

describe("crime-rejected", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      query: {}
    };
    mockResponse = {
      render: vi.fn(),
      locals: { locale: "en" }
    };
  });

  describe("GET", () => {
    it("should render the crime-rejected page with translations", async () => {
      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.render).toHaveBeenCalledWith(
        "crime-rejected/index",
        expect.objectContaining({
          en: expect.objectContaining({
            title: "You cannot access this service",
            message: "Your account type is not authorized to access this service.",
            whatYouCanDo: "What you can do",
            contactSupport: "If you think this is wrong, contact support for assistance.",
            returnToSignIn: "Return to sign in page"
          }),
          cy: expect.objectContaining({
            title: "Ni allwch gael mynediad at y gwasanaeth hwn"
          }),
          t: expect.any(Object)
        })
      );
    });

    it("should provide both English and Welsh translations", async () => {
      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      const renderCall = (mockResponse.render as any).mock.calls[0];
      const viewData = renderCall[1];

      expect(viewData.en).toBeDefined();
      expect(viewData.cy).toBeDefined();
      expect(viewData.t).toBeDefined();
      expect(viewData.en.title).toBe("You cannot access this service");
      expect(viewData.cy.title).toBe("Ni allwch gael mynediad at y gwasanaeth hwn");
    });

    it("should select English language by default", async () => {
      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      const renderCall = (mockResponse.render as any).mock.calls[0];
      const viewData = renderCall[1];

      expect(viewData.t.title).toBe("You cannot access this service");
    });

    it("should select Welsh language when lng=cy query parameter is present", async () => {
      // Arrange
      mockRequest.query = { lng: "cy" };

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      const renderCall = (mockResponse.render as any).mock.calls[0];
      const viewData = renderCall[1];

      expect(viewData.t.title).toBe("Ni allwch gael mynediad at y gwasanaeth hwn");
    });

    it("should select Welsh language from res.locals.locale", async () => {
      // Arrange
      mockResponse.locals = { locale: "cy" };

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      const renderCall = (mockResponse.render as any).mock.calls[0];
      const viewData = renderCall[1];

      expect(viewData.t.title).toBe("Ni allwch gael mynediad at y gwasanaeth hwn");
    });
  });
});
