import type { NextFunction, Request, Response } from "express";
import type { Session } from "express-session";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sessionTimeoutMiddleware } from "./session-timeout.js";

describe("Session Timeout Middleware", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      path: "/admin",
      isAuthenticated: () => true,
      cookies: {},
      session: {
        lastActivity: Date.now(),
        destroy: vi.fn((cb) => cb(null))
      } as unknown as Session
    };

    res = {
      redirect: vi.fn(),
      locals: {}
    };

    next = vi.fn();
  });

  it("should skip timeout for public routes", () => {
    req.path = "/";

    sessionTimeoutMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.locals.sessionTimeoutMs).toBeUndefined();
  });

  it("should skip timeout for unauthenticated users", () => {
    req.isAuthenticated = () => false;

    sessionTimeoutMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
  });

  it("should update last activity for authenticated users", () => {
    const beforeUpdate = Date.now();

    sessionTimeoutMiddleware(req as Request, res as Response, next);

    expect(req.session?.lastActivity).toBeGreaterThanOrEqual(beforeUpdate);
    expect(next).toHaveBeenCalled();
  });

  it("should inject timeout data into response locals", () => {
    sessionTimeoutMiddleware(req as Request, res as Response, next);

    expect(res.locals.sessionTimeoutMs).toBeDefined();
    expect(typeof res.locals.sessionTimeoutMs).toBe("number");
  });

  it("should redirect to session-expired if session has expired", () => {
    // Set last activity to 31 minutes ago
    if (req.session) {
      req.session.lastActivity = Date.now() - 1860000;
    }

    sessionTimeoutMiddleware(req as Request, res as Response, next);

    expect(req.session?.destroy).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith("/session-expired");
    expect(next).not.toHaveBeenCalled();
  });

  it("should preserve Welsh locale when redirecting to session-expired", () => {
    // Set last activity to 31 minutes ago
    if (req.session) {
      req.session.lastActivity = Date.now() - 1860000;
    }
    req.cookies = { locale: "cy" };

    sessionTimeoutMiddleware(req as Request, res as Response, next);

    expect(req.session?.destroy).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith("/session-expired?lng=cy");
    expect(next).not.toHaveBeenCalled();
  });

  it("should allow request if session is active", () => {
    // Set last activity to 10 minutes ago
    if (req.session) {
      req.session.lastActivity = Date.now() - 600000;
    }

    sessionTimeoutMiddleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });
});
