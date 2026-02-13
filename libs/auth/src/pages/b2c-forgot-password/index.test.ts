import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as b2cConfig from "../../config/b2c-config.js";
import { GET } from "./index.js";

vi.mock("../../config/b2c-config.js");

describe("B2C Forgot Password Page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };

    req = {
      query: {},
      session: {
        id: "test-session-id"
      } as any
    };

    res = {
      redirect: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
      locals: {
        locale: "en"
      }
    };

    vi.spyOn(b2cConfig, "isB2cConfigured").mockReturnValue(true);
    vi.spyOn(b2cConfig, "getB2cConfig").mockReturnValue({
      tenantName: "test-tenant",
      tenantId: "test-tenant-id",
      clientId: "test-client-id",
      clientSecret: "test-secret",
      policyHmcts: "B2C_1_SignInUserFlow",
      policyCommonPlatform: "B2C_1_SignInUserFlow",
      policyCath: "B2C_1_SignInUserFlow",
      policyPasswordReset: "B2C_1A_PASSWORD_RESET",
      redirectUri: "https://localhost:8080/login/return",
      responseType: "code",
      responseMode: "query",
      scope: ["openid"],
      customDomain: "sign-in.test.platform.hmcts.net",
      customDomainPath: "test.platform.hmcts.net"
    });
    vi.spyOn(b2cConfig, "getB2cBaseUrl").mockReturnValue("https://sign-in.test.platform.hmcts.net/test.platform.hmcts.net");
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it("should redirect to B2C password reset URL", () => {
    GET(req as Request, res as Response);

    expect(res.redirect).toHaveBeenCalled();
    const redirectUrl = (res.redirect as any).mock.calls[0][0];
    expect(redirectUrl).toContain("sign-in.test.platform.hmcts.net");
    expect(redirectUrl).toContain("B2C_1A_PASSWORD_RESET");
    expect(redirectUrl).toContain("ui_locales=en");
  });

  it("should use Welsh locale (cy-GB) when specified", () => {
    req.query = { lng: "cy" };

    GET(req as Request, res as Response);

    const redirectUrl = (res.redirect as any).mock.calls[0][0];
    expect(redirectUrl).toContain("ui_locales=cy-GB");
  });

  it("should store locale in session", () => {
    req.query = { lng: "cy" };

    GET(req as Request, res as Response);

    expect(req.session?.b2cLocale).toBe("cy");
  });

  it("should return 503 if B2C is not configured", () => {
    vi.spyOn(b2cConfig, "isB2cConfigured").mockReturnValue(false);

    GET(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.send).toHaveBeenCalledWith("B2C authentication is not available. Please check configuration.");
  });

  it("should include required OAuth parameters", () => {
    GET(req as Request, res as Response);

    const redirectUrl = (res.redirect as any).mock.calls[0][0];
    expect(redirectUrl).toContain("client_id=test-client-id");
    expect(redirectUrl).toContain("redirect_uri=");
    expect(redirectUrl).toContain("response_type=code");
    expect(redirectUrl).toContain("response_mode=query");
    expect(redirectUrl).toContain("scope=openid");
    expect(redirectUrl).toContain("state=");
    expect(redirectUrl).toContain("nonce=");
  });

  it("should use res.locals.locale when query param is not provided", () => {
    req.query = {};
    res.locals = { locale: "cy" };

    GET(req as Request, res as Response);

    const redirectUrl = (res.redirect as any).mock.calls[0][0];
    expect(redirectUrl).toContain("ui_locales=cy-GB");
    expect(req.session?.b2cLocale).toBe("cy");
  });

  it("should fallback to 'en' when no locale is available", () => {
    req.query = {};
    res.locals = {};

    GET(req as Request, res as Response);

    const redirectUrl = (res.redirect as any).mock.calls[0][0];
    expect(redirectUrl).toContain("ui_locales=en");
    expect(req.session?.b2cLocale).toBe("en");
  });

  it("should handle missing session id gracefully", () => {
    req.session = {} as any;

    GET(req as Request, res as Response);

    expect(res.redirect).toHaveBeenCalled();
    const redirectUrl = (res.redirect as any).mock.calls[0][0];
    expect(redirectUrl).toContain("state=");
  });
});
