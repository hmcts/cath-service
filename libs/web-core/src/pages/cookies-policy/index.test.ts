import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as cookieHelpers from "../../middleware/cookies/cookie-helpers.js";
import { GET, POST } from "./index.js";

// Mock the cookie helpers
vi.mock("../../middleware/cookies/cookie-helpers.js", () => ({
  parseCookiePolicy: vi.fn(),
  setCookiePolicy: vi.fn(),
  setCookieBannerSeen: vi.fn()
}));

describe("Cookie Policy Page", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockRequest = {
      cookies: {},
      query: {},
      body: {}
    };

    mockResponse = {
      render: vi.fn(),
      redirect: vi.fn(),
      locals: {
        cookieConfig: {
          categories: {
            essential: ["connect.sid"],
            analytics: ["_ga", "_gid"],
            performance: ["dtCookie", "dtSa"],
            preferences: ["language"]
          }
        }
      }
    };

    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should render page with content", async () => {
      vi.mocked(cookieHelpers.parseCookiePolicy).mockReturnValue({});

      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith("cookies-policy/index", {
        en: expect.any(Object),
        cy: expect.any(Object),
        cookiePreferences: {},
        categories: mockResponse.locals?.cookieConfig?.categories,
        saved: false
      });
    });

    it("should parse existing cookie preferences", async () => {
      const mockPreferences = { analytics: true, performance: false };
      mockRequest.cookies = { cookie_policy: "mock_value" };
      vi.mocked(cookieHelpers.parseCookiePolicy).mockReturnValue(mockPreferences);

      await GET(mockRequest as Request, mockResponse as Response);

      expect(cookieHelpers.parseCookiePolicy).toHaveBeenCalledWith("mock_value");
      expect(mockResponse.render).toHaveBeenCalledWith("cookies-policy/index", {
        en: expect.any(Object),
        cy: expect.any(Object),
        cookiePreferences: mockPreferences,
        categories: mockResponse.locals?.cookieConfig?.categories,
        saved: false
      });
    });

    it("should display success banner when saved=true", async () => {
      mockRequest.query = { saved: "true" };
      vi.mocked(cookieHelpers.parseCookiePolicy).mockReturnValue({});

      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith("cookies-policy/index", {
        en: expect.any(Object),
        cy: expect.any(Object),
        cookiePreferences: {},
        categories: mockResponse.locals?.cookieConfig?.categories,
        saved: true
      });
    });

    it("should not display success banner when saved=false", async () => {
      mockRequest.query = { saved: "false" };
      vi.mocked(cookieHelpers.parseCookiePolicy).mockReturnValue({});

      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith("cookies-policy/index", {
        en: expect.any(Object),
        cy: expect.any(Object),
        cookiePreferences: {},
        categories: mockResponse.locals?.cookieConfig?.categories,
        saved: false
      });
    });
  });

  describe("POST", () => {
    it("should save cookie preferences when analytics and performance are enabled", async () => {
      mockRequest.body = {
        analytics: "on",
        performance: "on"
      };

      await POST(mockRequest as Request, mockResponse as Response);

      expect(cookieHelpers.setCookiePolicy).toHaveBeenCalledWith(mockResponse, {
        analytics: true,
        performance: true,
        preferences: false
      });
      expect(cookieHelpers.setCookieBannerSeen).toHaveBeenCalledWith(mockResponse);
      expect(mockResponse.redirect).toHaveBeenCalledWith("/cookies-policy?saved=true");
    });

    it("should save cookie preferences when analytics and performance are disabled", async () => {
      mockRequest.body = {
        analytics: "off",
        performance: "off"
      };

      await POST(mockRequest as Request, mockResponse as Response);

      expect(cookieHelpers.setCookiePolicy).toHaveBeenCalledWith(mockResponse, {
        analytics: false,
        performance: false,
        preferences: false
      });
      expect(cookieHelpers.setCookieBannerSeen).toHaveBeenCalledWith(mockResponse);
      expect(mockResponse.redirect).toHaveBeenCalledWith("/cookies-policy?saved=true");
    });

    it("should save cookie preferences with mixed settings", async () => {
      mockRequest.body = {
        analytics: "on",
        performance: "off",
        preferences: "on"
      };

      await POST(mockRequest as Request, mockResponse as Response);

      expect(cookieHelpers.setCookiePolicy).toHaveBeenCalledWith(mockResponse, {
        analytics: true,
        performance: false,
        preferences: true
      });
      expect(cookieHelpers.setCookieBannerSeen).toHaveBeenCalledWith(mockResponse);
      expect(mockResponse.redirect).toHaveBeenCalledWith("/cookies-policy?saved=true");
    });

    it("should not include essential cookies in preferences", async () => {
      mockRequest.body = {
        essential: "on",
        analytics: "on"
      };

      await POST(mockRequest as Request, mockResponse as Response);

      expect(cookieHelpers.setCookiePolicy).toHaveBeenCalledWith(mockResponse, {
        analytics: true,
        performance: false,
        preferences: false
      });
    });

    it("should handle boolean values in request body", async () => {
      mockRequest.body = {
        analytics: true,
        performance: false
      };

      await POST(mockRequest as Request, mockResponse as Response);

      expect(cookieHelpers.setCookiePolicy).toHaveBeenCalledWith(mockResponse, {
        analytics: true,
        performance: false,
        preferences: false
      });
    });

    it("should redirect to cookies-policy page with saved parameter", async () => {
      mockRequest.body = { analytics: "on" };

      await POST(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.redirect).toHaveBeenCalledWith("/cookies-policy?saved=true");
    });

    it("should handle missing cookie config", async () => {
      mockResponse.locals = {};
      mockRequest.body = { analytics: "on" };

      await POST(mockRequest as Request, mockResponse as Response);

      expect(cookieHelpers.setCookiePolicy).toHaveBeenCalledWith(mockResponse, {});
      expect(mockResponse.redirect).toHaveBeenCalledWith("/cookies-policy?saved=true");
    });
  });
});
