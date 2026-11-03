import { buildCftIdamLogoutUrl, getB2cBaseUrl, getB2cConfig, getCftIdamConfig, getSsoConfig } from "@hmcts/auth";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

// Mock sso-config
vi.mock("../../config/sso-config.js", () => ({
  getSsoConfig: vi.fn(() => ({
    issuerUrl: "https://login.microsoftonline.com/12345678-1234-1234-1234-123456789abc/v2.0"
  }))
}));

// Mock b2c-config
vi.mock("../../config/b2c-config.js", () => ({
  getB2cConfig: vi.fn(() => ({
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    policyCath: "B2C_1A_CaTH_SignIn"
  })),
  getB2cBaseUrl: vi.fn(() => "https://sign-in.pip-frontend.staging.platform.hmcts.net/pip-frontend.staging.platform.hmcts.net")
}));

vi.mock("@hmcts/auth");

describe("Logout handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mocks
    vi.mocked(getSsoConfig).mockReturnValue({
      identityMetadata: "https://login.microsoftonline.com/12345678-1234-1234-1234-123456789abc/v2.0/.well-known/openid-configuration",
      issuerUrl: "https://login.microsoftonline.com/12345678-1234-1234-1234-123456789abc/v2.0"
    } as any);

    vi.mocked(getB2cConfig).mockReturnValue({
      clientId: "test-client-id",
      clientSecret: "test-client-secret",
      policyCath: "B2C_1A_CaTH_SignIn"
    } as any);

    vi.mocked(getB2cBaseUrl).mockReturnValue("https://sign-in.pip-frontend.staging.platform.hmcts.net/pip-frontend.staging.platform.hmcts.net");
  });

  it("should logout CFT IDAM user and redirect to CFT IDAM endSession", async () => {
    // Arrange
    const cftIdamConfig = { baseUrl: "https://localhost:8080" } as ReturnType<typeof getCftIdamConfig>;
    vi.mocked(getCftIdamConfig).mockReturnValue(cftIdamConfig);
    vi.mocked(buildCftIdamLogoutUrl).mockReturnValue("https://idam.example.com/o/endSession?post_logout_redirect_uri=x");
    const req = {
      user: {
        id: "user-123",
        email: "test@example.com",
        displayName: "Test User",
        role: "VERIFIED",
        provenance: "CFT_IDAM"
      },
      logout: vi.fn((cb) => cb(null)),
      session: {
        destroy: vi.fn((cb: any) => cb(null))
      },
      protocol: "https",
      get: vi.fn(() => "localhost:8080")
    } as unknown as Request;

    const res = {
      clearCookie: vi.fn(),
      redirect: vi.fn(),
      locals: { locale: "en" }
    } as unknown as Response;

    // Act
    await GET(req, res);

    // Assert
    expect(req.logout).toHaveBeenCalled();
    expect(req.session.destroy).toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalledWith("connect.sid");
    expect(buildCftIdamLogoutUrl).toHaveBeenCalledWith("/session-logged-out?lng=en", cftIdamConfig);
    expect(res.redirect).toHaveBeenCalledWith("https://idam.example.com/o/endSession?post_logout_redirect_uri=x");
  });

  it("should preserve Welsh language when logging out a CFT IDAM user", async () => {
    // Arrange
    const req = {
      user: { id: "user-123", provenance: "CFT_IDAM" },
      logout: vi.fn((cb) => cb(null)),
      session: {
        destroy: vi.fn((cb: any) => cb(null))
      }
    } as unknown as Request;

    const res = {
      clearCookie: vi.fn(),
      redirect: vi.fn(),
      locals: { locale: "cy" }
    } as unknown as Response;

    // Act
    await GET(req, res);

    // Assert
    expect(buildCftIdamLogoutUrl).toHaveBeenCalledWith("/session-logged-out?lng=cy", expect.anything());
  });

  it("should logout Crime IDAM user and redirect to session-logged-out page", async () => {
    const req = {
      user: {
        id: "user-456",
        email: "crime@example.com",
        displayName: "Crime User",
        role: "VERIFIED",
        provenance: "CRIME_IDAM"
      },
      logout: vi.fn((cb) => cb(null)),
      session: {
        destroy: vi.fn((cb: any) => cb(null))
      },
      protocol: "https",
      get: vi.fn(() => "localhost:8080")
    } as unknown as Request;

    const res = {
      clearCookie: vi.fn(),
      redirect: vi.fn(),
      locals: {}
    } as unknown as Response;

    await GET(req, res);

    expect(req.logout).toHaveBeenCalled();
    expect(req.session.destroy).toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalledWith("connect.sid");
    expect(res.redirect).toHaveBeenCalledWith("/session-logged-out");
  });

  it("should logout B2C user and redirect to B2C logout endpoint", async () => {
    const req = {
      user: {
        id: "user-789",
        email: "b2c@example.com",
        displayName: "B2C User",
        role: "VERIFIED",
        provenance: "PI_AAD"
      },
      logout: vi.fn((cb) => cb(null)),
      session: {
        destroy: vi.fn((cb: any) => cb(null))
      },
      protocol: "https",
      get: vi.fn(() => "localhost:8080")
    } as unknown as Request;

    const res = {
      clearCookie: vi.fn(),
      redirect: vi.fn(),
      locals: {}
    } as unknown as Response;

    await GET(req, res);

    expect(req.logout).toHaveBeenCalled();
    expect(req.session.destroy).toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalledWith("connect.sid");
    expect(res.redirect).toHaveBeenCalledWith(
      "https://sign-in.pip-frontend.staging.platform.hmcts.net/pip-frontend.staging.platform.hmcts.net/oauth2/v2.0/logout?p=B2C_1A_CaTH_SignIn&post_logout_redirect_uri=https%3A%2F%2Flocalhost%3A8080%2Fsession-logged-out"
    );
  });

  it("should logout SSO user and redirect to Azure AD logout with tenant ID", async () => {
    const req = {
      user: {
        id: "user-456",
        email: "sso@example.com",
        displayName: "SSO User",
        provenance: "SSO"
      },
      logout: vi.fn((cb) => cb(null)),
      session: {
        destroy: vi.fn((cb: any) => cb(null))
      },
      protocol: "https",
      get: vi.fn(() => "localhost:8080")
    } as unknown as Request;

    const res = {
      clearCookie: vi.fn(),
      redirect: vi.fn(),
      locals: {}
    } as unknown as Response;

    await GET(req, res);

    expect(req.logout).toHaveBeenCalled();
    expect(req.session.destroy).toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalledWith("connect.sid");
    expect(res.redirect).toHaveBeenCalledWith(
      "https://login.microsoftonline.com/12345678-1234-1234-1234-123456789abc/oauth2/v2.0/logout?post_logout_redirect_uri=https%3A%2F%2Flocalhost%3A8080%2Fsession-logged-out"
    );
  });

  it("should logout user without provenance and redirect to Azure AD logout with tenant ID", async () => {
    const req = {
      logout: vi.fn((cb) => cb(null)),
      session: {
        destroy: vi.fn((cb: any) => cb(null))
      },
      protocol: "https",
      get: vi.fn(() => "localhost:8080")
    } as unknown as Request;

    const res = {
      clearCookie: vi.fn(),
      redirect: vi.fn(),
      locals: {}
    } as unknown as Response;

    await GET(req, res);

    expect(req.logout).toHaveBeenCalled();
    expect(req.session.destroy).toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalledWith("connect.sid");
    expect(res.redirect).toHaveBeenCalledWith(
      "https://login.microsoftonline.com/12345678-1234-1234-1234-123456789abc/oauth2/v2.0/logout?post_logout_redirect_uri=https%3A%2F%2Flocalhost%3A8080%2Fsession-logged-out"
    );
  });

  it("should redirect to /session-logged-out when tenant ID cannot be extracted", async () => {
    vi.mocked(getSsoConfig).mockReturnValue({
      issuerUrl: "https://invalid-url.com"
    } as any);

    const req = {
      logout: vi.fn((cb) => cb(null)),
      session: {
        destroy: vi.fn((cb: any) => cb(null))
      },
      protocol: "https",
      get: vi.fn(() => "localhost:8080")
    } as unknown as Request;

    const res = {
      clearCookie: vi.fn(),
      redirect: vi.fn(),
      locals: {}
    } as unknown as Response;

    await GET(req, res);

    expect(res.redirect).toHaveBeenCalledWith("/session-logged-out");
  });

  it("should continue logout even if logout callback has error", async () => {
    vi.mocked(getSsoConfig).mockReturnValue({
      issuerUrl: "https://login.microsoftonline.com/abc-123/v2.0"
    } as any);

    const req = {
      logout: vi.fn((cb) => cb(new Error("Logout error"))),
      session: {
        destroy: vi.fn((cb: any) => cb(null))
      },
      protocol: "https",
      get: vi.fn(() => "localhost:8080")
    } as unknown as Request;

    const res = {
      clearCookie: vi.fn(),
      redirect: vi.fn(),
      locals: {}
    } as unknown as Response;

    await GET(req, res);

    expect(req.session.destroy).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalled();
  });

  it("should continue logout even if session destroy has error", async () => {
    vi.mocked(getSsoConfig).mockReturnValue({
      issuerUrl: "https://login.microsoftonline.com/def-456/v2.0"
    } as any);

    const req = {
      logout: vi.fn((cb) => cb(null)),
      session: {
        destroy: vi.fn((cb: any) => cb(new Error("Destroy error")))
      },
      protocol: "https",
      get: vi.fn(() => "localhost:8080")
    } as unknown as Request;

    const res = {
      clearCookie: vi.fn(),
      redirect: vi.fn(),
      locals: {}
    } as unknown as Response;

    await GET(req, res);

    expect(res.clearCookie).toHaveBeenCalledWith("connect.sid");
    expect(res.redirect).toHaveBeenCalled();
  });

  it("should use http protocol when request is http", async () => {
    vi.mocked(getSsoConfig).mockReturnValue({
      issuerUrl: "https://login.microsoftonline.com/abcdef12-3456-7890-abcd-ef1234567890/v2.0"
    } as any);

    const req = {
      logout: vi.fn((cb) => cb(null)),
      session: {
        destroy: vi.fn((cb: any) => cb(null))
      },
      protocol: "http",
      get: vi.fn(() => "localhost:3000")
    } as unknown as Request;

    const res = {
      clearCookie: vi.fn(),
      redirect: vi.fn(),
      locals: {}
    } as unknown as Response;

    await GET(req, res);

    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("post_logout_redirect_uri=http%3A%2F%2Flocalhost%3A3000%2F"));
  });
});
