import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { USER_ROLES } from "../../authorisation/role-service.js";
import { GET } from "./return.js";

// Mock passport
vi.mock("passport", () => ({
  default: {
    authenticate: vi.fn(() => (_req: Request, _res: Response, next: () => void) => next())
  }
}));

describe("SSO Return handler", () => {
  const handler = GET[GET.length - 1] as (req: Request, res: Response) => Promise<void>;

  it("should redirect to /auth/login when no user data", async () => {
    const req = {
      user: undefined,
      isAuthenticated: () => false,
      session: {}
    } as unknown as Request;

    const res = {
      redirect: vi.fn()
    } as unknown as Response;

    await handler(req, res);

    expect(res.redirect).toHaveBeenCalledWith("/auth/login");
  });

  it("should redirect to /sso/rejected when user has no role", async () => {
    const req = {
      user: {
        id: "user-1",
        email: "user@example.com",
        displayName: "Test User",
        roles: [],
        groupIds: [],
        role: undefined
      },
      isAuthenticated: () => true,
      session: {}
    } as unknown as Request;

    const res = {
      redirect: vi.fn()
    } as unknown as Response;

    await handler(req, res);

    expect(res.redirect).toHaveBeenCalledWith("/sso/rejected");
  });

  it("should redirect system admin to /system-admin-dashboard by default", async () => {
    const user = {
      id: "user-1",
      email: "admin@example.com",
      displayName: "Admin User",
      roles: ["System Admin"],
      groupIds: ["group-1"],
      role: USER_ROLES.SYSTEM_ADMIN
    };

    const req = {
      user,
      isAuthenticated: () => true,
      session: { regenerate: vi.fn((cb) => cb(null)), returnTo: undefined },
      login: vi.fn((_u, cb) => cb(null))
    } as unknown as Request;

    const res = {
      redirect: vi.fn()
    } as unknown as Response;

    (req.session as any).save = vi.fn((cb: any) => cb(null));

    await handler(req, res);

    expect(res.redirect).toHaveBeenCalledWith("/system-admin-dashboard");
  });

  it("should redirect internal admin to /admin-dashboard by default", async () => {
    const user = {
      id: "user-2",
      email: "admin@example.com",
      displayName: "Admin User",
      roles: ["Internal Admin"],
      groupIds: ["group-2"],
      role: USER_ROLES.INTERNAL_ADMIN_CTSC
    };

    const req = {
      user,
      isAuthenticated: () => true,
      session: { regenerate: vi.fn((cb) => cb(null)), returnTo: undefined },
      login: vi.fn((_u, cb) => cb(null))
    } as unknown as Request;

    const res = {
      redirect: vi.fn()
    } as unknown as Response;

    (req.session as any).save = vi.fn((cb: any) => cb(null));

    await handler(req, res);

    expect(res.redirect).toHaveBeenCalledWith("/admin-dashboard");
  });

  it("should redirect local admin to /admin-dashboard by default", async () => {
    const user = {
      id: "user-3",
      email: "admin@example.com",
      displayName: "Admin User",
      roles: ["Local Admin"],
      groupIds: ["group-3"],
      role: USER_ROLES.INTERNAL_ADMIN_LOCAL
    };

    const req = {
      user,
      isAuthenticated: () => true,
      session: { regenerate: vi.fn((cb) => cb(null)), returnTo: undefined },
      login: vi.fn((_u, cb) => cb(null))
    } as unknown as Request;

    const res = {
      redirect: vi.fn()
    } as unknown as Response;

    (req.session as any).save = vi.fn((cb: any) => cb(null));

    await handler(req, res);

    expect(res.redirect).toHaveBeenCalledWith("/admin-dashboard");
  });

  it("should redirect to returnTo URL when present in session", async () => {
    const user = {
      id: "user-4",
      email: "admin@example.com",
      displayName: "Admin User",
      roles: ["System Admin"],
      groupIds: ["group-1"],
      role: USER_ROLES.SYSTEM_ADMIN
    };

    const req = {
      user,
      isAuthenticated: () => true,
      session: { regenerate: vi.fn((cb) => cb(null)), returnTo: "/some/page" },
      login: vi.fn((_u, cb) => cb(null))
    } as unknown as Request;

    const res = {
      redirect: vi.fn()
    } as unknown as Response;

    (req.session as any).save = vi.fn((cb: any) => cb(null));

    await handler(req, res);

    expect(res.redirect).toHaveBeenCalledWith("/some/page");
  });

  it("should redirect to /auth/login on session regeneration error", async () => {
    const user = {
      id: "user-5",
      email: "admin@example.com",
      displayName: "Admin User",
      roles: ["System Admin"],
      groupIds: ["group-1"],
      role: USER_ROLES.SYSTEM_ADMIN
    };

    const req = {
      user,
      isAuthenticated: () => true,
      session: {
        regenerate: vi.fn((cb) => cb(new Error("Regeneration failed"))),
        returnTo: undefined
      },
      login: vi.fn()
    } as unknown as Request;

    const res = {
      redirect: vi.fn()
    } as unknown as Response;

    await handler(req, res);

    expect(res.redirect).toHaveBeenCalledWith("/auth/login");
  });

  it("should redirect to /auth/login on login error", async () => {
    const user = {
      id: "user-6",
      email: "admin@example.com",
      displayName: "Admin User",
      roles: ["System Admin"],
      groupIds: ["group-1"],
      role: USER_ROLES.SYSTEM_ADMIN
    };

    const req = {
      user,
      isAuthenticated: () => true,
      session: {
        regenerate: vi.fn((cb) => cb(null)),
        returnTo: undefined
      },
      login: vi.fn((_u, cb) => cb(new Error("Login failed")))
    } as unknown as Request;

    const res = {
      redirect: vi.fn()
    } as unknown as Response;

    await handler(req, res);

    expect(res.redirect).toHaveBeenCalledWith("/auth/login");
  });

  it("should redirect to /auth/login on session save error", async () => {
    const user = {
      id: "user-7",
      email: "admin@example.com",
      displayName: "Admin User",
      roles: ["System Admin"],
      groupIds: ["group-1"],
      role: USER_ROLES.SYSTEM_ADMIN
    };

    const req = {
      user,
      isAuthenticated: () => true,
      session: {
        regenerate: vi.fn((cb) => cb(null)),
        returnTo: undefined
      },
      login: vi.fn((_u, cb) => cb(null))
    } as unknown as Request;

    const res = {
      redirect: vi.fn()
    } as unknown as Response;

    (req.session as any).save = vi.fn((cb: any) => cb(new Error("Save failed")));

    await handler(req, res);

    expect(res.redirect).toHaveBeenCalledWith("/auth/login");
  });

  it("should clear returnTo from session after redirect", async () => {
    const user = {
      id: "user-8",
      email: "admin@example.com",
      displayName: "Admin User",
      roles: ["System Admin"],
      groupIds: ["group-1"],
      role: USER_ROLES.SYSTEM_ADMIN
    };

    const session = {
      regenerate: vi.fn((cb) => cb(null)),
      returnTo: "/target/page",
      save: vi.fn((cb: any) => cb(null))
    };

    const req = {
      user,
      isAuthenticated: () => true,
      session,
      login: vi.fn((_u, cb) => cb(null))
    } as unknown as Request;

    const res = {
      redirect: vi.fn()
    } as unknown as Response;

    await handler(req, res);

    expect(session.returnTo).toBeUndefined();
  });
});
