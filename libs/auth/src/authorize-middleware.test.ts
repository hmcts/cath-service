import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { requireRole } from "./authorize-middleware.js";
import { USER_ROLES } from "./role-service.js";

describe("requireRole middleware", () => {
  it("should call next for authenticated user with required role", () => {
    const middleware = requireRole([USER_ROLES.SYSTEM_ADMIN]);

    const req = {
      isAuthenticated: () => true,
      user: { role: USER_ROLES.SYSTEM_ADMIN },
      originalUrl: "/system-admin-dashboard",
      session: {}
    } as unknown as Request;

    const res = {} as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("should redirect to /auth/login for unauthenticated user", () => {
    const middleware = requireRole([USER_ROLES.SYSTEM_ADMIN]);

    const req = {
      isAuthenticated: () => false,
      user: undefined,
      originalUrl: "/system-admin-dashboard",
      session: {}
    } as unknown as Request;

    const res = {
      redirect: vi.fn()
    } as unknown as Response;

    const next = vi.fn();

    middleware(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith("/auth/login");
    expect(req.session.returnTo).toBe("/system-admin-dashboard");
    expect(next).not.toHaveBeenCalled();
  });

  it("should redirect to /auth/login when user object is missing", () => {
    const middleware = requireRole([USER_ROLES.SYSTEM_ADMIN]);

    const req = {
      isAuthenticated: () => true,
      user: null,
      originalUrl: "/system-admin-dashboard",
      session: {}
    } as unknown as Request;

    const res = {
      redirect: vi.fn()
    } as unknown as Response;

    const next = vi.fn();

    middleware(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith("/auth/login");
    expect(req.session.returnTo).toBe("/system-admin-dashboard");
  });

  it("should redirect system admin to /system-admin-dashboard when lacking required role", () => {
    const middleware = requireRole([USER_ROLES.INTERNAL_ADMIN_CTSC]);

    const req = {
      isAuthenticated: () => true,
      user: { role: USER_ROLES.SYSTEM_ADMIN },
      originalUrl: "/admin-dashboard",
      session: {}
    } as unknown as Request;

    const res = {
      redirect: vi.fn()
    } as unknown as Response;

    const next = vi.fn();

    middleware(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith("/system-admin-dashboard");
    expect(next).not.toHaveBeenCalled();
  });

  it("should redirect internal admin CTSC to /admin-dashboard when lacking required role", () => {
    const middleware = requireRole([USER_ROLES.SYSTEM_ADMIN]);

    const req = {
      isAuthenticated: () => true,
      user: { role: USER_ROLES.INTERNAL_ADMIN_CTSC },
      originalUrl: "/system-admin-dashboard",
      session: {}
    } as unknown as Request;

    const res = {
      redirect: vi.fn()
    } as unknown as Response;

    const next = vi.fn();

    middleware(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith("/admin-dashboard");
    expect(next).not.toHaveBeenCalled();
  });

  it("should redirect internal admin LOCAL to /admin-dashboard when lacking required role", () => {
    const middleware = requireRole([USER_ROLES.SYSTEM_ADMIN]);

    const req = {
      isAuthenticated: () => true,
      user: { role: USER_ROLES.INTERNAL_ADMIN_LOCAL },
      originalUrl: "/system-admin-dashboard",
      session: {}
    } as unknown as Request;

    const res = {
      redirect: vi.fn()
    } as unknown as Response;

    const next = vi.fn();

    middleware(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith("/admin-dashboard");
    expect(next).not.toHaveBeenCalled();
  });

  it("should redirect to /auth/login when user has no role", () => {
    const middleware = requireRole([USER_ROLES.SYSTEM_ADMIN]);

    const req = {
      isAuthenticated: () => true,
      user: { role: undefined },
      originalUrl: "/system-admin-dashboard",
      session: {}
    } as unknown as Request;

    const res = {
      redirect: vi.fn()
    } as unknown as Response;

    const next = vi.fn();

    middleware(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith("/auth/login");
    expect(req.session.returnTo).toBe("/system-admin-dashboard");
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next when user has one of multiple allowed roles", () => {
    const middleware = requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.INTERNAL_ADMIN_CTSC, USER_ROLES.INTERNAL_ADMIN_LOCAL]);

    const req = {
      isAuthenticated: () => true,
      user: { role: USER_ROLES.INTERNAL_ADMIN_CTSC },
      originalUrl: "/admin-dashboard",
      session: {}
    } as unknown as Request;

    const res = {} as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
