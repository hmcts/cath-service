import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { requireAuth } from "./authenticate-middleware.js";

describe("requireAuth middleware", () => {
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

  it("should redirect to /auth/login if user is not authenticated", () => {
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

    expect(res.redirect).toHaveBeenCalledWith("/auth/login");
    expect(next).not.toHaveBeenCalled();
    expect(req.session.returnTo).toBe("/system-admin-dashboard");
  });
});
