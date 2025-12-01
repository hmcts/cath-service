import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as cookieHelpers from "../../middleware/cookies/cookie-helpers.js";
import { GET, POST } from "./polisi-cwcis.js";

// Mock the cookie helpers
vi.mock("../../middleware/cookies/cookie-helpers.js", () => ({
  parseCookiePolicy: vi.fn(),
  setCookiePolicy: vi.fn(),
  setCookieBannerSeen: vi.fn()
}));

describe("Welsh Cookie Policy Page (polisi-cwcis)", () => {
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
    it("should render page with Welsh language set", async () => {
      vi.mocked(cookieHelpers.parseCookiePolicy).mockReturnValue({});

      await GET(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.render).toHaveBeenCalledWith("cookies-policy/index", {
        en: expect.any(Object),
        cy: expect.any(Object),
        cookiePreferences: {},
        categories: mockResponse.locals?.cookieConfig?.categories,
        saved: false,
        lng: "cy"
      });
    });

    it("should parse existing cookie preferences", async () => {
      const mockPreferences = { analytics: true, performance: false };
      mockRequest.cookies = { cookie_policy: '{"analytics":true,"performance":false}' };
      vi.mocked(cookieHelpers.parseCookiePolicy).mockReturnValue(mockPreferences);

      await GET(mockRequest as Request, mockResponse as Response);

      expect(cookieHelpers.parseCookiePolicy).toHaveBeenCalledWith('{"analytics":true,"performance":false}');
      expect(mockResponse.render).toHaveBeenCalledWith("cookies-policy/index", {
        en: expect.any(Object),
        cy: expect.any(Object),
        cookiePreferences: mockPreferences,
        categories: mockResponse.locals?.cookieConfig?.categories,
        saved: false,
        lng: "cy"
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
        saved: true,
        lng: "cy"
      });
    });
  });

  describe("POST", () => {
    it("should save cookie preferences and redirect to Welsh route", async () => {
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
      expect(mockResponse.redirect).toHaveBeenCalledWith("/polisi-cwcis?saved=true");
    });

    it("should save disabled preferences and redirect to Welsh route", async () => {
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
      expect(mockResponse.redirect).toHaveBeenCalledWith("/polisi-cwcis?saved=true");
    });
  });
});
