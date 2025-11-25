import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { configureCsrf } from "./csrf-middleware.js";

// Mock csrf-sync module
vi.mock("csrf-sync", () => ({
  csrfSync: vi.fn((config) => ({
    csrfSynchronisedProtection: vi.fn((req: Request, res: Response, next: NextFunction) => next()),
    generateToken: vi.fn((req: Request) => "mock-csrf-token-123")
  }))
}));

describe("csrf-middleware", () => {
  describe("configureCsrf", () => {
    let req: Request;
    let res: Response;
    let next: NextFunction;

    beforeEach(() => {
      vi.clearAllMocks();
      req = {
        session: {
          csrfToken: undefined
        },
        body: {},
        query: {}
      } as unknown as Request;
      res = {
        locals: {}
      } as Response;
      next = vi.fn();
    });

    it("should return an array of three middleware functions", () => {
      const middleware = configureCsrf();

      expect(Array.isArray(middleware)).toBe(true);
      expect(middleware).toHaveLength(3);
      expect(typeof middleware[0]).toBe("function");
      expect(typeof middleware[1]).toBe("function");
      expect(typeof middleware[2]).toBe("function");
    });

    it("should throw error if session middleware is not configured (line 28-29)", () => {
      const middleware = configureCsrf();
      const sessionCheckMiddleware = middleware[0];

      // Request without session
      const reqWithoutSession = {} as Request;

      expect(() => {
        sessionCheckMiddleware(reqWithoutSession, res, next);
      }).toThrow("CSRF middleware requires session middleware to be configured first");
    });

    it("should call next() if session exists (line 31)", () => {
      const middleware = configureCsrf();
      const sessionCheckMiddleware = middleware[0];

      sessionCheckMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
    });

    it("should generate CSRF token and store in res.locals (line 35)", () => {
      const middleware = configureCsrf();
      const tokenGeneratorMiddleware = middleware[1];

      tokenGeneratorMiddleware(req, res, next);

      expect(res.locals.csrfToken).toBe("mock-csrf-token-123");
      expect(next).toHaveBeenCalled();
    });

    it("should call next() after generating token (line 36)", () => {
      const middleware = configureCsrf();
      const tokenGeneratorMiddleware = middleware[1];

      tokenGeneratorMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
    });

    it("should include csrfSynchronisedProtection as third middleware (line 38)", () => {
      const middleware = configureCsrf();
      const csrfProtectionMiddleware = middleware[2];

      expect(typeof csrfProtectionMiddleware).toBe("function");

      // Call the protection middleware
      csrfProtectionMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("should execute all three middleware functions in sequence", () => {
      const middleware = configureCsrf();
      const [sessionCheck, tokenGenerator, csrfProtection] = middleware;

      // Execute in order
      sessionCheck(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      tokenGenerator(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);
      expect(res.locals.csrfToken).toBe("mock-csrf-token-123");

      csrfProtection(req, res, next);
      expect(next).toHaveBeenCalledTimes(3);
    });
  });

  describe("csrfSync configuration", () => {
    it("should configure storeTokenInState to store token in session (lines 17-20)", async () => {
      // Re-import to get the actual configuration
      const { csrfSync } = await import("csrf-sync");
      const mockCsrfSync = vi.mocked(csrfSync);

      // Clear and re-import the module to capture the configuration
      vi.resetModules();
      await import("./csrf-middleware.js");

      // Get the configuration that was passed to csrfSync
      const csrfConfig = mockCsrfSync.mock.calls[0][0];

      expect(csrfConfig).toBeDefined();
      expect(csrfConfig.storeTokenInState).toBeDefined();

      // Test the storeTokenInState function
      const mockReq = {
        session: {
          csrfToken: undefined
        }
      } as unknown as Request;

      const testToken = "test-token-abc";
      csrfConfig.storeTokenInState(mockReq, testToken);

      expect(mockReq.session.csrfToken).toBe(testToken);
    });

    it("should not throw error when session is undefined in storeTokenInState (line 17)", async () => {
      const { csrfSync } = await import("csrf-sync");
      const mockCsrfSync = vi.mocked(csrfSync);

      vi.resetModules();
      await import("./csrf-middleware.js");

      const csrfConfig = mockCsrfSync.mock.calls[0][0];
      const mockReq = {} as Request; // No session

      expect(() => {
        csrfConfig.storeTokenInState(mockReq, "test-token");
      }).not.toThrow();
    });

    it("should only store token if session exists (line 17-18)", async () => {
      const { csrfSync } = await import("csrf-sync");
      const mockCsrfSync = vi.mocked(csrfSync);

      vi.resetModules();
      await import("./csrf-middleware.js");

      const csrfConfig = mockCsrfSync.mock.calls[0][0];

      // Request with session
      const reqWithSession = {
        session: {
          csrfToken: undefined
        }
      } as unknown as Request;

      csrfConfig.storeTokenInState(reqWithSession, "token-with-session");
      expect(reqWithSession.session.csrfToken).toBe("token-with-session");

      // Request without session
      const reqWithoutSession = {} as Request;
      csrfConfig.storeTokenInState(reqWithoutSession, "token-without-session");
      expect(reqWithoutSession.session).toBeUndefined();
    });

    it("should configure getTokenFromRequest to read from body or query", async () => {
      const { csrfSync } = await import("csrf-sync");
      const mockCsrfSync = vi.mocked(csrfSync);

      vi.resetModules();
      await import("./csrf-middleware.js");

      const csrfConfig = mockCsrfSync.mock.calls[0][0];

      expect(csrfConfig.getTokenFromRequest).toBeDefined();

      // Test reading from body
      const reqWithBody = {
        body: { _csrf: "body-token" }
      } as unknown as Request;
      expect(csrfConfig.getTokenFromRequest(reqWithBody)).toBe("body-token");

      // Test reading from query
      const reqWithQuery = {
        body: {},
        query: { _csrf: "query-token" }
      } as unknown as Request;
      expect(csrfConfig.getTokenFromRequest(reqWithQuery)).toBe("query-token");

      // Test body takes precedence over query
      const reqWithBoth = {
        body: { _csrf: "body-token" },
        query: { _csrf: "query-token" }
      } as unknown as Request;
      expect(csrfConfig.getTokenFromRequest(reqWithBoth)).toBe("body-token");
    });

    it("should configure getTokenFromState to read from session", async () => {
      const { csrfSync } = await import("csrf-sync");
      const mockCsrfSync = vi.mocked(csrfSync);

      vi.resetModules();
      await import("./csrf-middleware.js");

      const csrfConfig = mockCsrfSync.mock.calls[0][0];

      expect(csrfConfig.getTokenFromState).toBeDefined();

      const mockReq = {
        session: {
          csrfToken: "session-stored-token"
        }
      } as unknown as Request;

      expect(csrfConfig.getTokenFromState(mockReq)).toBe("session-stored-token");
    });

    it("should configure CSRF with size of 128", async () => {
      const { csrfSync } = await import("csrf-sync");
      const mockCsrfSync = vi.mocked(csrfSync);

      vi.resetModules();
      await import("./csrf-middleware.js");

      const csrfConfig = mockCsrfSync.mock.calls[0][0];

      expect(csrfConfig.size).toBe(128);
    });

    it("should configure ignoredMethods to include GET, HEAD, OPTIONS", async () => {
      const { csrfSync } = await import("csrf-sync");
      const mockCsrfSync = vi.mocked(csrfSync);

      vi.resetModules();
      await import("./csrf-middleware.js");

      const csrfConfig = mockCsrfSync.mock.calls[0][0];

      expect(csrfConfig.ignoredMethods).toEqual(["GET", "HEAD", "OPTIONS"]);
    });
  });
});
