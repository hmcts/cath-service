import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authenticateApi } from "./oauth-middleware.js";

// Mock config module
vi.mock("config", () => ({
  default: {
    get: vi.fn()
  }
}));

// Mock jsonwebtoken
vi.mock("jsonwebtoken", () => ({
  default: {
    decode: vi.fn(),
    verify: vi.fn()
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

  it("should authenticate successfully with valid token and required role", async () => {
    const config = await import("config");
    const jwt = await import("jsonwebtoken");
    const jwksClient = await import("jwks-rsa");

    // Mock config to return Azure AD settings
    vi.mocked(config.default.get).mockImplementation((key: string) => {
      if (key === "AZURE_TENANT_ID") return "test-tenant-id";
      if (key === "AZURE_API_CLIENT_ID") return "test-client-id";
      return undefined;
    });

    // Mock JWT decode
    vi.mocked(jwt.default.decode).mockReturnValue({
      header: { kid: "test-key-id" },
      payload: {
        appid: "test-app-id",
        roles: ["api.publisher.user"]
      }
    } as any);

    // Mock JWKS client
    const mockGetSigningKey = vi.fn((_kid: string, callback: (err: Error | null, key?: any) => void) => {
      callback(null, {
        getPublicKey: () => "test-public-key"
      });
    });

    vi.mocked(jwksClient.default).mockReturnValue({
      getSigningKey: mockGetSigningKey
    } as any);

    // Mock JWT verify
    vi.mocked(jwt.default.verify).mockImplementation((_token, _key, _options, callback: any) => {
      callback(null, {
        appid: "test-app-id",
        roles: ["api.publisher.user"]
      });
    });

    const req = mockRequest("Bearer valid-token-with-role");
    const res = mockResponse();
    const middleware = authenticateApi();

    await middleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect((req as any).apiUser).toEqual({
      appId: "test-app-id",
      roles: ["api.publisher.user"]
    });
  });

  it("should reject request when token is valid but missing required role", async () => {
    const config = await import("config");
    const jwt = await import("jsonwebtoken");
    const jwksClient = await import("jwks-rsa");

    // Mock config to return Azure AD settings
    vi.mocked(config.default.get).mockImplementation((key: string) => {
      if (key === "AZURE_TENANT_ID") return "test-tenant-id";
      if (key === "AZURE_API_CLIENT_ID") return "test-client-id";
      return undefined;
    });

    // Mock JWT decode
    vi.mocked(jwt.default.decode).mockReturnValue({
      header: { kid: "test-key-id" },
      payload: {
        appid: "test-app-id",
        roles: ["some.other.role"]
      }
    } as any);

    // Mock JWKS client
    const mockGetSigningKey = vi.fn((_kid: string, callback: (err: Error | null, key?: any) => void) => {
      callback(null, {
        getPublicKey: () => "test-public-key"
      });
    });

    vi.mocked(jwksClient.default).mockReturnValue({
      getSigningKey: mockGetSigningKey
    } as any);

    // Mock JWT verify
    vi.mocked(jwt.default.verify).mockImplementation((_token, _key, _options, callback: any) => {
      callback(null, {
        appid: "test-app-id",
        roles: ["some.other.role"]
      });
    });

    const req = mockRequest("Bearer valid-token-without-role");
    const res = mockResponse();
    const middleware = authenticateApi();

    await middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Insufficient permissions. Required role: api.publisher.user"
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should use environment variables when config throws error", async () => {
    const config = await import("config");
    const jwt = await import("jsonwebtoken");
    const jwksClient = await import("jwks-rsa");

    // Mock config.get to throw error
    vi.mocked(config.default.get).mockImplementation(() => {
      throw new Error("Config not found");
    });

    // Set environment variables
    process.env.AZURE_TENANT_ID = "env-tenant-id";
    process.env.AZURE_API_CLIENT_ID = "env-client-id";

    // Mock JWT decode
    vi.mocked(jwt.default.decode).mockReturnValue({
      header: { kid: "test-key-id" },
      payload: {
        azp: "test-app-id",
        roles: ["api.publisher.user"]
      }
    } as any);

    // Mock JWKS client
    const mockGetSigningKey = vi.fn((_kid: string, callback: (err: Error | null, key?: any) => void) => {
      callback(null, {
        getPublicKey: () => "test-public-key"
      });
    });

    vi.mocked(jwksClient.default).mockReturnValue({
      getSigningKey: mockGetSigningKey
    } as any);

    // Mock JWT verify
    vi.mocked(jwt.default.verify).mockImplementation((_token, _key, _options, callback: any) => {
      callback(null, {
        azp: "test-app-id",
        roles: ["api.publisher.user"]
      });
    });

    const req = mockRequest("Bearer valid-token");
    const res = mockResponse();
    const middleware = authenticateApi();

    await middleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect((req as any).apiUser).toEqual({
      appId: "test-app-id",
      roles: ["api.publisher.user"]
    });

    // Clean up environment variables
    delete process.env.AZURE_TENANT_ID;
    delete process.env.AZURE_API_CLIENT_ID;
  });

  it("should reject token with invalid format (not an object)", async () => {
    const config = await import("config");
    const jwt = await import("jsonwebtoken");
    const _jwksClient = await import("jwks-rsa");

    // Mock config
    vi.mocked(config.default.get).mockImplementation((key: string) => {
      if (key === "AZURE_TENANT_ID") return "test-tenant-id";
      if (key === "AZURE_API_CLIENT_ID") return "test-client-id";
      return undefined;
    });

    // Mock JWT decode to return string instead of object
    vi.mocked(jwt.default.decode).mockReturnValue("invalid-decoded-token" as any);

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

  it("should reject token missing kid in header", async () => {
    const config = await import("config");
    const jwt = await import("jsonwebtoken");

    // Mock config
    vi.mocked(config.default.get).mockImplementation((key: string) => {
      if (key === "AZURE_TENANT_ID") return "test-tenant-id";
      if (key === "AZURE_API_CLIENT_ID") return "test-client-id";
      return undefined;
    });

    // Mock JWT decode with missing kid
    vi.mocked(jwt.default.decode).mockReturnValue({
      header: {},
      payload: {}
    } as any);

    const req = mockRequest("Bearer token-without-kid");
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

  it("should reject when JWKS client fails to fetch signing key", async () => {
    const config = await import("config");
    const jwt = await import("jsonwebtoken");
    const jwksClient = await import("jwks-rsa");

    // Mock config
    vi.mocked(config.default.get).mockImplementation((key: string) => {
      if (key === "AZURE_TENANT_ID") return "test-tenant-id";
      if (key === "AZURE_API_CLIENT_ID") return "test-client-id";
      return undefined;
    });

    // Mock JWT decode
    vi.mocked(jwt.default.decode).mockReturnValue({
      header: { kid: "test-key-id" },
      payload: {}
    } as any);

    // Mock JWKS client to return error
    const mockGetSigningKey = vi.fn((_kid: string, callback: (err: Error | null, key?: any) => void) => {
      callback(new Error("Failed to fetch key from JWKS endpoint"));
    });

    vi.mocked(jwksClient.default).mockReturnValue({
      getSigningKey: mockGetSigningKey
    } as any);

    const req = mockRequest("Bearer token-with-fetch-error");
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

  it("should reject when JWT verification fails", async () => {
    const config = await import("config");
    const jwt = await import("jsonwebtoken");
    const jwksClient = await import("jwks-rsa");

    // Mock config
    vi.mocked(config.default.get).mockImplementation((key: string) => {
      if (key === "AZURE_TENANT_ID") return "test-tenant-id";
      if (key === "AZURE_API_CLIENT_ID") return "test-client-id";
      return undefined;
    });

    // Mock JWT decode
    vi.mocked(jwt.default.decode).mockReturnValue({
      header: { kid: "test-key-id" },
      payload: {}
    } as any);

    // Mock JWKS client
    const mockGetSigningKey = vi.fn((_kid: string, callback: (err: Error | null, key?: any) => void) => {
      callback(null, {
        getPublicKey: () => "test-public-key"
      });
    });

    vi.mocked(jwksClient.default).mockReturnValue({
      getSigningKey: mockGetSigningKey
    } as any);

    // Mock JWT verify to fail
    vi.mocked(jwt.default.verify).mockImplementation((_token, _key, _options, callback: any) => {
      callback(new Error("Token signature verification failed"));
    });

    const req = mockRequest("Bearer token-with-bad-signature");
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

  it("should handle roles as undefined and reject", async () => {
    const config = await import("config");
    const jwt = await import("jsonwebtoken");
    const jwksClient = await import("jwks-rsa");

    // Mock config
    vi.mocked(config.default.get).mockImplementation((key: string) => {
      if (key === "AZURE_TENANT_ID") return "test-tenant-id";
      if (key === "AZURE_API_CLIENT_ID") return "test-client-id";
      return undefined;
    });

    // Mock JWT decode
    vi.mocked(jwt.default.decode).mockReturnValue({
      header: { kid: "test-key-id" },
      payload: {
        appid: "test-app-id"
      }
    } as any);

    // Mock JWKS client
    const mockGetSigningKey = vi.fn((_kid: string, callback: (err: Error | null, key?: any) => void) => {
      callback(null, {
        getPublicKey: () => "test-public-key"
      });
    });

    vi.mocked(jwksClient.default).mockReturnValue({
      getSigningKey: mockGetSigningKey
    } as any);

    // Mock JWT verify with no roles
    vi.mocked(jwt.default.verify).mockImplementation((_token, _key, _options, callback: any) => {
      callback(null, {
        appid: "test-app-id"
      });
    });

    const req = mockRequest("Bearer token-without-roles");
    const res = mockResponse();
    const middleware = authenticateApi();

    await middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "Insufficient permissions. Required role: api.publisher.user"
    });
    expect(mockNext).not.toHaveBeenCalled();
  });
});
