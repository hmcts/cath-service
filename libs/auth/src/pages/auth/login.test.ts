import type { Request, Response } from "express";
import passport from "passport";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as ssoConfig from "../../sso-config.js";
import { GET } from "./login.js";

// Mock passport
vi.mock("passport", () => ({
  default: {
    authenticate: vi.fn()
  }
}));

// Mock sso-config
vi.mock("../../sso-config.js", () => ({
  isSsoConfigured: vi.fn()
}));

const mockPassport = vi.mocked(passport);
const mockIsSsoConfigured = vi.mocked(ssoConfig.isSsoConfigured);

describe("Auth login page handler", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: () => void;
  let consoleWarnSpy: any;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    };
    mockNext = vi.fn();
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it("should export GET middleware", () => {
    expect(GET).toBeDefined();
    expect(typeof GET).toBe("function");
  });

  describe("when SSO is not configured", () => {
    it("should return 503 error and not call passport.authenticate", () => {
      mockIsSsoConfigured.mockReturnValue(false);

      GET(mockReq as Request, mockRes as Response, mockNext);

      expect(mockIsSsoConfigured).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith("SSO authentication attempted but SSO is not configured");
      expect(mockRes.status).toHaveBeenCalledWith(503);
      expect(mockRes.send).toHaveBeenCalledWith("SSO authentication is not available. Please check configuration.");
      expect(mockPassport.authenticate).not.toHaveBeenCalled();
    });
  });

  describe("when SSO is configured", () => {
    it("should call passport.authenticate with correct options", () => {
      mockIsSsoConfigured.mockReturnValue(true);
      const mockAuthenticateMiddleware = vi.fn();
      mockPassport.authenticate.mockReturnValue(mockAuthenticateMiddleware);

      GET(mockReq as Request, mockRes as Response, mockNext);

      expect(mockIsSsoConfigured).toHaveBeenCalled();
      expect(mockPassport.authenticate).toHaveBeenCalledWith("azuread-openidconnect", {
        failureRedirect: "/",
        failureMessage: true
      });
      expect(mockAuthenticateMiddleware).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });
});
