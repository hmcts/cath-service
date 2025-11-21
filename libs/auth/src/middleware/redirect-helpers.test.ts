import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirectUnauthenticated } from "./redirect-helpers.js";

vi.mock("../config/sso-config.js", () => ({
  isSsoConfigured: vi.fn()
}));

import { isSsoConfigured } from "../config/sso-config.js";

describe("redirectUnauthenticated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when SSO is configured", () => {
    beforeEach(() => {
      vi.mocked(isSsoConfigured).mockReturnValue(true);
    });

    it("should redirect to /login for /admin-dashboard", () => {
      const req = {
        originalUrl: "/admin-dashboard",
        session: {}
      } as unknown as Request;
      const res = {
        redirect: vi.fn()
      } as unknown as Response;

      redirectUnauthenticated(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/login");
      expect(req.session.returnTo).toBe("/admin-dashboard");
    });

    it("should redirect to /login for /system-admin-dashboard", () => {
      const req = {
        originalUrl: "/system-admin-dashboard",
        session: {}
      } as unknown as Request;
      const res = {
        redirect: vi.fn()
      } as unknown as Response;

      redirectUnauthenticated(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/login");
      expect(req.session.returnTo).toBe("/system-admin-dashboard");
    });

    it("should redirect to /login for /admin-dashboard with query params", () => {
      const req = {
        originalUrl: "/admin-dashboard?foo=bar",
        session: {}
      } as unknown as Request;
      const res = {
        redirect: vi.fn()
      } as unknown as Response;

      redirectUnauthenticated(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/login");
      expect(req.session.returnTo).toBe("/admin-dashboard?foo=bar");
    });

    it("should redirect to /sign-in for non-admin pages", () => {
      const req = {
        originalUrl: "/account-home",
        session: {}
      } as unknown as Request;
      const res = {
        redirect: vi.fn()
      } as unknown as Response;

      redirectUnauthenticated(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/sign-in");
      expect(req.session.returnTo).toBe("/account-home");
    });

    it("should redirect to /sign-in for public pages", () => {
      const req = {
        originalUrl: "/search",
        session: {}
      } as unknown as Request;
      const res = {
        redirect: vi.fn()
      } as unknown as Response;

      redirectUnauthenticated(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/sign-in");
      expect(req.session.returnTo).toBe("/search");
    });
  });

  describe("when SSO is not configured", () => {
    beforeEach(() => {
      vi.mocked(isSsoConfigured).mockReturnValue(false);
    });

    it("should redirect to /sign-in for /admin-dashboard", () => {
      const req = {
        originalUrl: "/admin-dashboard",
        session: {}
      } as unknown as Request;
      const res = {
        redirect: vi.fn()
      } as unknown as Response;

      redirectUnauthenticated(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/sign-in");
      expect(req.session.returnTo).toBe("/admin-dashboard");
    });

    it("should redirect to /sign-in for /system-admin-dashboard", () => {
      const req = {
        originalUrl: "/system-admin-dashboard",
        session: {}
      } as unknown as Request;
      const res = {
        redirect: vi.fn()
      } as unknown as Response;

      redirectUnauthenticated(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/sign-in");
      expect(req.session.returnTo).toBe("/system-admin-dashboard");
    });

    it("should redirect to /sign-in for non-admin pages", () => {
      const req = {
        originalUrl: "/account-home",
        session: {}
      } as unknown as Request;
      const res = {
        redirect: vi.fn()
      } as unknown as Response;

      redirectUnauthenticated(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/sign-in");
      expect(req.session.returnTo).toBe("/account-home");
    });
  });

  describe("edge cases", () => {
    it("should handle URLs with trailing slashes", () => {
      vi.mocked(isSsoConfigured).mockReturnValue(true);

      const req = {
        originalUrl: "/admin-dashboard/",
        session: {}
      } as unknown as Request;
      const res = {
        redirect: vi.fn()
      } as unknown as Response;

      redirectUnauthenticated(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/login");
      expect(req.session.returnTo).toBe("/admin-dashboard/");
    });

    it("should handle URLs with hash fragments", () => {
      vi.mocked(isSsoConfigured).mockReturnValue(true);

      const req = {
        originalUrl: "/admin-dashboard#section",
        session: {}
      } as unknown as Request;
      const res = {
        redirect: vi.fn()
      } as unknown as Response;

      redirectUnauthenticated(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/login");
      expect(req.session.returnTo).toBe("/admin-dashboard#section");
    });

    it("should not match URLs that contain admin-dashboard as substring", () => {
      vi.mocked(isSsoConfigured).mockReturnValue(true);

      const req = {
        originalUrl: "/not-admin-dashboard",
        session: {}
      } as unknown as Request;
      const res = {
        redirect: vi.fn()
      } as unknown as Response;

      redirectUnauthenticated(req, res);

      expect(res.redirect).toHaveBeenCalledWith("/sign-in");
      expect(req.session.returnTo).toBe("/not-admin-dashboard");
    });
  });
});
