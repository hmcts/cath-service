import { USER_ROLES } from "@hmcts/account";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { blockUserAccess, requireRole } from "./authorise.js";

vi.mock("./redirect-helpers.js", () => ({
  redirectUnauthenticated: vi.fn()
}));

import { redirectUnauthenticated } from "./redirect-helpers.js";

describe("requireRole middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
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

  it("should call redirectUnauthenticated for unauthenticated user", () => {
    const middleware = requireRole([USER_ROLES.SYSTEM_ADMIN]);

    const req = {
      isAuthenticated: () => false,
      user: undefined,
      originalUrl: "/system-admin-dashboard"
    } as unknown as Request;

    const res = {} as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(redirectUnauthenticated).toHaveBeenCalledWith(req, res);
    expect(next).not.toHaveBeenCalled();
  });

  it("should call redirectUnauthenticated when user object is missing", () => {
    const middleware = requireRole([USER_ROLES.SYSTEM_ADMIN]);

    const req = {
      isAuthenticated: () => true,
      user: null,
      originalUrl: "/system-admin-dashboard"
    } as unknown as Request;

    const res = {} as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(redirectUnauthenticated).toHaveBeenCalledWith(req, res);
    expect(next).not.toHaveBeenCalled();
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

  it("should redirect to /sign-in when user has no role", () => {
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

    expect(res.redirect).toHaveBeenCalledWith("/sign-in");
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

describe("blockUserAccess middleware", () => {
  it("should redirect SSO System Admin to /admin-dashboard", () => {
    const middleware = blockUserAccess();

    const req = {
      isAuthenticated: () => true,
      user: {
        role: USER_ROLES.SYSTEM_ADMIN,
        provenance: "SSO"
      }
    } as unknown as Request;

    const res = {
      redirect: vi.fn()
    } as unknown as Response;

    const next = vi.fn();

    middleware(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith("/admin-dashboard");
    expect(next).not.toHaveBeenCalled();
  });

  it("should redirect SSO Local Admin to /admin-dashboard", () => {
    const middleware = blockUserAccess();

    const req = {
      isAuthenticated: () => true,
      user: {
        role: USER_ROLES.INTERNAL_ADMIN_LOCAL,
        provenance: "SSO"
      }
    } as unknown as Request;

    const res = {
      redirect: vi.fn()
    } as unknown as Response;

    const next = vi.fn();

    middleware(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith("/admin-dashboard");
    expect(next).not.toHaveBeenCalled();
  });

  it("should redirect SSO CTSC Admin to /admin-dashboard", () => {
    const middleware = blockUserAccess();

    const req = {
      isAuthenticated: () => true,
      user: {
        role: USER_ROLES.INTERNAL_ADMIN_CTSC,
        provenance: "SSO"
      }
    } as unknown as Request;

    const res = {
      redirect: vi.fn()
    } as unknown as Response;

    const next = vi.fn();

    middleware(req, res, next);

    expect(res.redirect).toHaveBeenCalledWith("/admin-dashboard");
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next for CFT IDAM user", () => {
    const middleware = blockUserAccess();

    const req = {
      isAuthenticated: () => true,
      user: {
        id: "user-123",
        email: "user@example.com",
        displayName: "Test User",
        role: "VERIFIED",
        provenance: "CFT_IDAM"
      }
    } as unknown as Request;

    const res = {
      redirect: vi.fn()
    } as unknown as Response;

    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it("should call next for unauthenticated user", () => {
    const middleware = blockUserAccess();

    const req = {
      isAuthenticated: () => false,
      user: undefined
    } as unknown as Request;

    const res = {
      redirect: vi.fn()
    } as unknown as Response;

    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it("should call next for user without provenance", () => {
    const middleware = blockUserAccess();

    const req = {
      isAuthenticated: () => true,
      user: {
        id: "user-123",
        email: "user@example.com",
        displayName: "Test User",
        role: "VERIFIED",
        provenance: undefined
      }
    } as unknown as Request;

    const res = {
      redirect: vi.fn()
    } as unknown as Response;

    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it("should call next for SSO user without admin role", () => {
    const middleware = blockUserAccess();

    const req = {
      isAuthenticated: () => true,
      user: {
        id: "user-123",
        email: "user@example.com",
        displayName: "Test User",
        role: "SOME_OTHER_ROLE",
        provenance: "SSO"
      }
    } as unknown as Request;

    const res = {
      redirect: vi.fn()
    } as unknown as Response;

    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });
});
