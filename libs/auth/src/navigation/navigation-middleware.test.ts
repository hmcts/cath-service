import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { USER_ROLES } from "../user/roles.js";
import { authNavigationMiddleware } from "./navigation-middleware.js";

describe("authNavigationMiddleware", () => {
  it("should set isAuthenticated to true for authenticated user", () => {
    const middleware = authNavigationMiddleware();

    const req = {
      isAuthenticated: () => true,
      user: { role: USER_ROLES.SYSTEM_ADMIN },
      path: "/system-admin-dashboard"
    } as Request;

    const res = {
      locals: {}
    } as Response;

    const next = vi.fn();

    middleware(req, res, next);

    expect(res.locals.isAuthenticated).toBe(true);
    expect(next).toHaveBeenCalled();
  });

  it("should set isAuthenticated to false for unauthenticated user", () => {
    const middleware = authNavigationMiddleware();

    const req = {
      isAuthenticated: () => false,
      path: "/"
    } as Request;

    const res = {
      locals: {}
    } as Response;

    const next = vi.fn();

    middleware(req, res, next);

    expect(res.locals.isAuthenticated).toBe(false);
    expect(res.locals.navigation).toBeDefined();
    expect(res.locals.navigation.verifiedItems).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it("should add navigation items for SYSTEM_ADMIN", () => {
    const middleware = authNavigationMiddleware();

    const req = {
      isAuthenticated: () => true,
      user: { role: USER_ROLES.SYSTEM_ADMIN },
      path: "/system-admin-dashboard"
    } as Request;

    const res = {
      locals: {}
    } as Response;

    const next = vi.fn();

    middleware(req, res, next);

    expect(res.locals.navigation).toBeDefined();
    expect(res.locals.navigation.verifiedItems).toHaveLength(2);
    expect(res.locals.navigation.verifiedItems[0]).toEqual({
      text: "Dashboard",
      href: "/system-admin-dashboard",
      current: true,
      attributes: { "data-test": "system-admin-dashboard-link" }
    });
    expect(res.locals.navigation.verifiedItems[1]).toEqual({
      text: "Admin Dashboard",
      href: "/admin-dashboard",
      current: false,
      attributes: { "data-test": "admin-dashboard-link" }
    });
  });

  it("should add navigation items for INTERNAL_ADMIN_CTSC", () => {
    const middleware = authNavigationMiddleware();

    const req = {
      isAuthenticated: () => true,
      user: { role: USER_ROLES.INTERNAL_ADMIN_CTSC },
      path: "/admin-dashboard"
    } as Request;

    const res = {
      locals: {}
    } as Response;

    const next = vi.fn();

    middleware(req, res, next);

    expect(res.locals.navigation).toBeDefined();
    expect(res.locals.navigation.verifiedItems).toHaveLength(1);
    expect(res.locals.navigation.verifiedItems[0]).toEqual({
      text: "Admin Dashboard",
      href: "/admin-dashboard",
      current: true,
      attributes: { "data-test": "admin-dashboard-link" }
    });
  });

  it("should add navigation items for INTERNAL_ADMIN_LOCAL", () => {
    const middleware = authNavigationMiddleware();

    const req = {
      isAuthenticated: () => true,
      user: { role: USER_ROLES.INTERNAL_ADMIN_LOCAL },
      path: "/admin-dashboard"
    } as Request;

    const res = {
      locals: {}
    } as Response;

    const next = vi.fn();

    middleware(req, res, next);

    expect(res.locals.navigation).toBeDefined();
    expect(res.locals.navigation.verifiedItems).toHaveLength(1);
    expect(res.locals.navigation.verifiedItems[0]).toEqual({
      text: "Admin Dashboard",
      href: "/admin-dashboard",
      current: true,
      attributes: { "data-test": "admin-dashboard-link" }
    });
  });

  it("should not add navigation items when user has no role", () => {
    const middleware = authNavigationMiddleware();

    const req = {
      isAuthenticated: () => true,
      user: {},
      path: "/admin-dashboard"
    } as Request;

    const res = {
      locals: {}
    } as Response;

    const next = vi.fn();

    middleware(req, res, next);

    expect(res.locals.isAuthenticated).toBe(true);
    expect(res.locals.navigation).toBeDefined();
    expect(res.locals.navigation.verifiedItems).toBeUndefined();
  });

  it("should set current based on current path", () => {
    const middleware = authNavigationMiddleware();

    const req = {
      isAuthenticated: () => true,
      user: { role: USER_ROLES.SYSTEM_ADMIN },
      path: "/admin-dashboard"
    } as Request;

    const res = {
      locals: {}
    } as Response;

    const next = vi.fn();

    middleware(req, res, next);

    expect(res.locals.navigation.verifiedItems[0].current).toBe(false);
    expect(res.locals.navigation.verifiedItems[1].current).toBe(true);
  });

  it("should preserve existing res.locals.navigation properties", () => {
    const middleware = authNavigationMiddleware();

    const req = {
      isAuthenticated: () => true,
      user: { role: USER_ROLES.SYSTEM_ADMIN },
      path: "/system-admin-dashboard"
    } as Request;

    const res = {
      locals: {
        navigation: {
          signOut: "Sign out"
        }
      }
    } as Response;

    const next = vi.fn();

    middleware(req, res, next);

    expect(res.locals.navigation.signOut).toBe("Sign out");
    expect(res.locals.navigation.verifiedItems).toHaveLength(2);
  });
});
