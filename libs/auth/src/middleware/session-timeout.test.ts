import type { NextFunction, Request, Response } from "express";
import type { Session } from "express-session";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sessionTimeoutMiddleware } from "./session-timeout.js";

vi.mock("../config/cft-idam-config.js", () => ({
  getCftIdamConfig: vi.fn(() => ({
    baseUrl: "https://localhost:8080",
    endSessionEndpoint: "https://hmcts-access.aat.platform.hmcts.net/o/endSession"
  }))
}));

vi.mock("../config/b2c-config.js", () => ({
  getB2cConfig: vi.fn(() => ({ policyCath: "B2C_1_SignInUserFlow" })),
  getB2cBaseUrl: vi.fn(() => "https://b2c.example.net/tenant")
}));

const MINUTE = 60 * 1000;
const NOW = new Date("2026-11-02T12:00:00Z").getTime();

describe("Session Timeout Middleware", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  function idleFor(minutes: number) {
    (req.session as Session).lastActivity = NOW - minutes * MINUTE;
  }

  function signInAs(role: string, provenance: string) {
    req.user = { id: "user-1", email: "user@example.com", displayName: "User", role, provenance };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    req = {
      path: "/account-home",
      protocol: "https",
      get: vi.fn(() => "localhost:8080") as unknown as Request["get"],
      isAuthenticated: (() => true) as Request["isAuthenticated"],
      session: {
        lastActivity: NOW,
        destroy: vi.fn((cb) => cb(null))
      } as unknown as Session
    };
    signInAs("VERIFIED", "CFT_IDAM");

    res = {
      redirect: vi.fn(),
      locals: { locale: "en" }
    };

    next = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("skipped requests", () => {
    it.each(["/", "/sign-in", "/session-expired", "/logout", "/health"])("should skip the public route %s", (path) => {
      // Arrange
      req.path = path;
      idleFor(500);

      // Act
      sessionTimeoutMiddleware(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(req.session?.destroy).not.toHaveBeenCalled();
      expect(res.locals?.sessionIdleMs).toBeUndefined();
    });

    it("should skip anonymous requests", () => {
      // Arrange
      req.isAuthenticated = (() => false) as Request["isAuthenticated"];

      // Act
      sessionTimeoutMiddleware(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.locals?.sessionIdleMs).toBeUndefined();
    });
  });

  describe("role-based timeout", () => {
    it("should not expire a verified user at 59 minutes", () => {
      // Arrange
      idleFor(59);

      // Act
      sessionTimeoutMiddleware(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it("should expire a verified user at 60 minutes", () => {
      // Arrange
      idleFor(60);

      // Act
      sessionTimeoutMiddleware(req as Request, res as Response, next);

      // Assert
      expect(req.session?.destroy).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it.each(["SYSTEM_ADMIN", "INTERNAL_ADMIN_CTSC", "INTERNAL_ADMIN_LOCAL"])("should not expire %s at 239 minutes", (role) => {
      // Arrange
      signInAs(role, "SSO");
      idleFor(239);

      // Act
      sessionTimeoutMiddleware(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it.each(["SYSTEM_ADMIN", "INTERNAL_ADMIN_CTSC", "INTERNAL_ADMIN_LOCAL"])("should expire %s at 240 minutes", (role) => {
      // Arrange
      signInAs(role, "SSO");
      idleFor(240);

      // Act
      sessionTimeoutMiddleware(req as Request, res as Response, next);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/session-expired?lng=en&reSignInUrl=SSO");
      expect(next).not.toHaveBeenCalled();
    });

    it.each(["CFT_IDAM", "CRIME_IDAM", "PI_AAD"])("should give a verified %s user the same 60 minute timeout", (provenance) => {
      // Arrange
      signInAs("VERIFIED", provenance);
      idleFor(59);

      // Act
      sessionTimeoutMiddleware(req as Request, res as Response, next);
      idleFor(60);
      sessionTimeoutMiddleware(req as Request, res as Response, next);

      // Assert
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.redirect).toHaveBeenCalledTimes(1);
    });
  });

  describe("expiry redirect", () => {
    it("should end the CFT IDAM session and land on /session-expired with reSignInUrl=CFT", () => {
      // Arrange
      idleFor(60);
      res.locals = { locale: "cy" };

      // Act
      sessionTimeoutMiddleware(req as Request, res as Response, next);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith(
        "https://hmcts-access.aat.platform.hmcts.net/o/endSession?post_logout_redirect_uri=https%3A%2F%2Flocalhost%3A8080%2Fsession-expired%3Flng%3Dcy%26reSignInUrl%3DCFT"
      );
    });

    it("should sign a Crime IDAM user out locally with reSignInUrl=CRIME", () => {
      // Arrange
      signInAs("VERIFIED", "CRIME_IDAM");
      idleFor(60);

      // Act
      sessionTimeoutMiddleware(req as Request, res as Response, next);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/session-expired?lng=en&reSignInUrl=CRIME");
    });

    it("should end the B2C session for a PI_AAD user with an absolute post logout redirect", () => {
      // Arrange
      signInAs("VERIFIED", "PI_AAD");
      idleFor(60);
      res.locals = { locale: "cy" };

      // Act
      sessionTimeoutMiddleware(req as Request, res as Response, next);

      // Assert
      const redirectUrl = new URL(vi.mocked(res.redirect as (url: string) => void).mock.calls[0][0]);
      expect(`${redirectUrl.origin}${redirectUrl.pathname}`).toBe("https://b2c.example.net/tenant/oauth2/v2.0/logout");
      expect(redirectUrl.searchParams.get("post_logout_redirect_uri")).toBe("https://localhost:8080/session-expired?lng=cy&reSignInUrl=AAD");
    });

    it("should sign an SSO admin out locally in Welsh with reSignInUrl=SSO", () => {
      // Arrange
      signInAs("SYSTEM_ADMIN", "SSO");
      idleFor(240);
      res.locals = { locale: "cy" };

      // Act
      sessionTimeoutMiddleware(req as Request, res as Response, next);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/session-expired?lng=cy&reSignInUrl=SSO");
    });

    it("should still redirect when destroying the session fails", () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      idleFor(60);
      req.session = {
        lastActivity: NOW - 60 * MINUTE,
        destroy: vi.fn((cb) => cb(new Error("redis down")))
      } as unknown as Session;
      signInAs("VERIFIED", "CRIME_IDAM");

      // Act
      sessionTimeoutMiddleware(req as Request, res as Response, next);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith("Session destruction error:", expect.any(Error));
      expect(res.redirect).toHaveBeenCalledWith("/session-expired?lng=en&reSignInUrl=CRIME");
    });
  });

  describe("active sessions", () => {
    it("should refresh lastActivity", () => {
      // Arrange
      idleFor(30);

      // Act
      sessionTimeoutMiddleware(req as Request, res as Response, next);

      // Assert
      expect(req.session?.lastActivity).toBe(NOW);
      expect(next).toHaveBeenCalled();
    });

    it("should set sessionIdleMs to the verified timeout minus the 20 minute warning lead", () => {
      // Arrange
      idleFor(30);

      // Act
      sessionTimeoutMiddleware(req as Request, res as Response, next);

      // Assert
      expect(res.locals?.sessionIdleMs).toBe(40 * MINUTE);
      expect(res.locals?.sessionTimeoutMs).toBeUndefined();
    });

    it("should set sessionIdleMs to the admin timeout minus the 20 minute warning lead", () => {
      // Arrange
      signInAs("INTERNAL_ADMIN_CTSC", "SSO");

      // Act
      sessionTimeoutMiddleware(req as Request, res as Response, next);

      // Assert
      expect(res.locals?.sessionIdleMs).toBe(220 * MINUTE);
    });

    it("should start tracking a session that has no lastActivity yet", () => {
      // Arrange
      delete (req.session as Session).lastActivity;

      // Act
      sessionTimeoutMiddleware(req as Request, res as Response, next);

      // Assert
      expect(req.session?.lastActivity).toBe(NOW);
      expect(res.locals?.sessionIdleMs).toBe(40 * MINUTE);
    });

    it("should track and renew /session-expiring", () => {
      // Arrange
      req.path = "/session-expiring";
      idleFor(45);

      // Act
      sessionTimeoutMiddleware(req as Request, res as Response, next);

      // Assert
      expect(req.session?.lastActivity).toBe(NOW);
      expect(next).toHaveBeenCalled();
    });

    it("should track /session-expired-logout so a late request is still expired by provenance", () => {
      // Arrange
      req.path = "/session-expired-logout";
      signInAs("VERIFIED", "CRIME_IDAM");
      idleFor(61);

      // Act
      sessionTimeoutMiddleware(req as Request, res as Response, next);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/session-expired?lng=en&reSignInUrl=CRIME");
    });
  });
});
