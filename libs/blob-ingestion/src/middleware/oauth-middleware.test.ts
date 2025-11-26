import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authenticateApi } from "./oauth-middleware.js";

// Mock config module
vi.mock("config", () => ({
  default: {
    get: vi.fn()
  }
}));

// Mock jwks-rsa
vi.mock("jwks-rsa", () => ({
  default: vi.fn()
}));

describe("authenticateApi", () => {
  const mockRequest = (authHeader?: string) =>
    ({
      headers: {
        authorization: authHeader
      }
    }) as Request;

  const mockResponse = () => {
    const res = {} as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  const mockNext = vi.fn() as NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject request without Authorization header", async () => {
    const req = mockRequest();
    const res = mockResponse();
    const middleware = authenticateApi();

    await middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Missing or invalid Authorization header"
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should reject request with invalid Authorization header format", async () => {
    const req = mockRequest("InvalidFormat token123");
    const res = mockResponse();
    const middleware = authenticateApi();

    await middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Missing or invalid Authorization header"
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should reject request with invalid token when Azure config is missing", async () => {
    const config = await import("config");
    vi.mocked(config.default.get).mockReturnValue(undefined);

    const req = mockRequest("Bearer invalid-token");
    const res = mockResponse();
    const middleware = authenticateApi();

    await middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Invalid or expired token"
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  // Note: Full integration tests with actual Azure AD tokens would require:
  // - Valid Azure AD tenant ID and client ID
  // - Real JWT tokens from Azure AD
  // - These should be tested in E2E tests, not unit tests
});
