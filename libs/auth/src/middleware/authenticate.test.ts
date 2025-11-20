import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAuth } from "./authenticate.js";

vi.mock("../config/sso-config.js", () => ({
  isSsoConfigured: vi.fn()
}));

import { isSsoConfigured } from "../config/sso-config.js";

describe("requireAuth middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call next() if user is authenticated", () => {
    const middleware = requireAuth();
    const req = {
      isAuthenticated: () => true,
      originalUrl: "/system-admin-dashboard"
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it("should redirect to /login for admin-dashboard when SSO is configured", () => {
    vi.mocked(isSsoConfigured).mockReturnValue(true);

    const middleware = requireAuth();
    const req = {
      isAuthenticated: () => false,
      originalUrl: "/admin-dashboard",
      session: {}
    } as unknown as Request;
    const res = {
      redirect: vi.fn()
    } as unknown as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith("/login");
    expect(next).not.toHaveBeenCalled();
    expect(req.session.returnTo).toBe("/admin-dashboard");
  });

  it("should redirect to /login for system-admin-dashboard when SSO is configured", () => {
    vi.mocked(isSsoConfigured).mockReturnValue(true);

    const middleware = requireAuth();
    const req = {
      isAuthenticated: () => false,
      originalUrl: "/system-admin-dashboard",
      session: {}
    } as unknown as Request;
    const res = {
      redirect: vi.fn()
    } as unknown as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith("/login");
    expect(next).not.toHaveBeenCalled();
    expect(req.session.returnTo).toBe("/system-admin-dashboard");
  });

  it("should redirect to /sign-in for admin pages when SSO is not configured", () => {
    vi.mocked(isSsoConfigured).mockReturnValue(false);

    const middleware = requireAuth();
    const req = {
      isAuthenticated: () => false,
      originalUrl: "/admin-dashboard",
      session: {}
    } as unknown as Request;
    const res = {
      redirect: vi.fn()
    } as unknown as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith("/sign-in");
    expect(next).not.toHaveBeenCalled();
    expect(req.session.returnTo).toBe("/admin-dashboard");
  });

  it("should redirect to /sign-in for non-admin pages when SSO is configured", () => {
    vi.mocked(isSsoConfigured).mockReturnValue(true);

    const middleware = requireAuth();
    const req = {
      isAuthenticated: () => false,
      originalUrl: "/account-home",
      session: {}
    } as unknown as Request;
    const res = {
      redirect: vi.fn()
    } as unknown as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith("/sign-in");
    expect(next).not.toHaveBeenCalled();
    expect(req.session.returnTo).toBe("/account-home");
  });

  it("should redirect to /sign-in for non-admin pages when SSO is not configured", () => {
    vi.mocked(isSsoConfigured).mockReturnValue(false);

    const middleware = requireAuth();
    const req = {
      isAuthenticated: () => false,
      originalUrl: "/account-home",
      session: {}
    } as unknown as Request;
    const res = {
      redirect: vi.fn()
    } as unknown as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith("/sign-in");
    expect(next).not.toHaveBeenCalled();
    expect(req.session.returnTo).toBe("/account-home");
  });
});
