import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as cookieHelpers from "../middleware/cookies/cookie-helpers.js";
import { GET, POST } from "./cookie-preferences.js";

vi.mock("../middleware/cookies/cookie-helpers.js", () => ({
  parseCookiePolicy: vi.fn(),
  setCookiePolicy: vi.fn(),
  setCookieBannerSeen: vi.fn()
}));

describe("cookie-preferences page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      cookies: {},
      query: {},
      body: {}
    };
    res = {
      render: vi.fn(),
      redirect: vi.fn(),
      locals: {
        cookieConfig: {
          categories: {
            analytics: ["_ga", "_gid"],
            preferences: ["language"]
          }
        }
      }
    };
  });

  describe("GET", () => {
    it("should render cookie-preferences template", async () => {
      vi.mocked(cookieHelpers.parseCookiePolicy).mockReturnValue({});

      await GET(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "cookie-preferences",
        expect.objectContaining({
          en: expect.objectContaining({
            title: "Cookie preferences"
          }),
          cy: expect.objectContaining({
            title: "Dewisiadau cwcis"
          })
        })
      );
    });

    it("should call parseCookiePolicy with cookie value", async () => {
      req.cookies = { cookie_policy: "test-cookie" };
      vi.mocked(cookieHelpers.parseCookiePolicy).mockReturnValue({});

      await GET(req as Request, res as Response);

      expect(cookieHelpers.parseCookiePolicy).toHaveBeenCalledWith("test-cookie");
    });

    it("should pass saved query parameter to template", async () => {
      req.query = { saved: "true" };
      vi.mocked(cookieHelpers.parseCookiePolicy).mockReturnValue({});

      await GET(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "cookie-preferences",
        expect.objectContaining({
          saved: true
        })
      );
    });

    it("should call render exactly once", async () => {
      vi.mocked(cookieHelpers.parseCookiePolicy).mockReturnValue({});

      await GET(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledTimes(1);
    });
  });

  describe("POST", () => {
    it("should save cookie preferences and redirect", async () => {
      req.body = {
        analytics: "on",
        preferences: "on"
      };

      await POST(req as Request, res as Response);

      expect(cookieHelpers.setCookiePolicy).toHaveBeenCalledWith(res, {
        analytics: true,
        preferences: true
      });
      expect(cookieHelpers.setCookieBannerSeen).toHaveBeenCalledWith(res);
      expect(res.redirect).toHaveBeenCalledWith("/cookie-preferences?saved=true");
    });

    it("should handle analytics disabled", async () => {
      req.body = {
        analytics: "off",
        preferences: "on"
      };

      await POST(req as Request, res as Response);

      expect(cookieHelpers.setCookiePolicy).toHaveBeenCalledWith(res, {
        analytics: false,
        preferences: true
      });
    });

    it("should handle all cookies disabled", async () => {
      req.body = {
        analytics: "off",
        preferences: "off"
      };

      await POST(req as Request, res as Response);

      expect(cookieHelpers.setCookiePolicy).toHaveBeenCalledWith(res, {
        analytics: false,
        preferences: false
      });
    });

    it("should handle boolean values in request body", async () => {
      req.body = {
        analytics: true,
        preferences: false
      };

      await POST(req as Request, res as Response);

      expect(cookieHelpers.setCookiePolicy).toHaveBeenCalledWith(res, {
        analytics: true,
        preferences: false
      });
    });

    it("should redirect exactly once", async () => {
      req.body = {
        analytics: "on"
      };

      await POST(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledTimes(1);
    });
  });
});
