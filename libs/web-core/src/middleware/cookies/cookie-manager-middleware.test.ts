import type { NextFunction, Request, Response } from "express";
import express from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { configureCookieManager } from "./cookie-manager-middleware.js";

describe("configureCookieManager", () => {
  let app: express.Express;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    app = express();
    req = {
      cookies: {},
      body: {},
      headers: {},
      path: "/test",
      query: {}
    };
    res = {
      locals: {},
      cookie: vi.fn(),
      redirect: vi.fn(),
      render: vi.fn()
    };
    next = vi.fn();
  });

  describe("middleware behavior", () => {
    it("should set up middleware", async () => {
      const useSpy = vi.spyOn(app, "use");

      await configureCookieManager(app, {
        categories: { analytics: ["_ga"] }
      });

      // Should register middleware
      expect(useSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("middleware state management", () => {
    it("should set cookieManager state in res.locals", async () => {
      const useSpy = vi.spyOn(app, "use");

      await configureCookieManager(app, {
        categories: { analytics: ["_ga"] }
      });

      // Get the middleware function that was registered
      const middleware = useSpy.mock.calls[0][0] as any;

      // Call the middleware
      middleware(req, res, next);

      expect(res.locals?.cookieManager).toEqual({
        cookiesAccepted: false,
        cookiePreferences: {},
        showBanner: true
      });
      expect(res.locals?.cookieConfig).toEqual({
        categories: { analytics: ["_ga"] }
      });
      expect(next).toHaveBeenCalled();
    });

    it("should not show banner on /cookies page", async () => {
      const useSpy = vi.spyOn(app, "use");

      await configureCookieManager(app, {
        categories: { analytics: ["_ga"] }
      });

      const middleware = useSpy.mock.calls[0][0] as any;
      req = { ...req, path: "/cookies" };

      middleware(req, res, next);

      expect(res.locals?.cookieManager?.showBanner).toBe(false);
    });

    it("should not show banner when cookies have been accepted", async () => {
      const useSpy = vi.spyOn(app, "use");

      await configureCookieManager(app, {
        categories: { analytics: ["_ga"] }
      });

      const middleware = useSpy.mock.calls[0][0] as any;
      req.cookies = { cookie_policy: '{"analytics":true}' };

      middleware(req, res, next);

      expect(res.locals?.cookieManager?.showBanner).toBe(false);
      expect(res.locals?.cookieManager?.cookiesAccepted).toBe(true);
      expect(res.locals?.cookieManager?.cookiePreferences).toEqual({ analytics: true });
    });

    it("should not show banner when banner has been seen", async () => {
      const useSpy = vi.spyOn(app, "use");

      await configureCookieManager(app, {
        categories: { analytics: ["_ga"] }
      });

      const middleware = useSpy.mock.calls[0][0] as any;
      req.cookies = { cookies_preferences_set: "true" };

      middleware(req, res, next);

      expect(res.locals?.cookieManager?.showBanner).toBe(false);
    });

    it("should handle malformed cookie values", async () => {
      const useSpy = vi.spyOn(app, "use");

      await configureCookieManager(app, {
        categories: { analytics: ["_ga"] }
      });

      const middleware = useSpy.mock.calls[0][0] as any;
      req.cookies = { cookie_policy: "invalid%7Bjson" };

      middleware(req, res, next);

      expect(res.locals?.cookieManager?.cookiePreferences).toEqual({});
    });
  });

  describe("edge cases", () => {
    it("should work with minimal configuration", async () => {
      const useSpy = vi.spyOn(app, "use");

      await configureCookieManager(app, {});

      const middleware = useSpy.mock.calls[0][0] as any;

      middleware(req, res, next);

      expect(res.locals?.cookieManager).toEqual({
        cookiesAccepted: false,
        cookiePreferences: {},
        showBanner: true
      });
    });
  });
});
