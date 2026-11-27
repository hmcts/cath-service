import { getB2cBaseUrl, getB2cConfig, isB2cConfigured } from "@hmcts/auth";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("@hmcts/auth");

describe("media-verification", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    req = { query: {}, session: { id: "test-session-id", returnTo: "/somewhere-else" } as any };
    res = { redirect: vi.fn(), status: vi.fn().mockReturnThis(), send: vi.fn(), locals: { locale: "en" } };

    vi.mocked(isB2cConfigured).mockReturnValue(true);
    vi.mocked(getB2cConfig).mockReturnValue({
      tenantName: "test-tenant",
      tenantId: "test-tenant-id",
      clientId: "test-client-id",
      clientSecret: "test-secret",
      policyCath: "B2C_1_SignInUserFlow",
      policyResetCredentials: "B2C_1A_PASSWORD_RESET",
      policyMediaVerification: "B2C_1_SignInMediaVerification",
      redirectUri: "https://localhost:8080/login/return",
      responseType: "code",
      responseMode: "query",
      scope: ["openid"],
      customDomain: "sign-in.test.platform.hmcts.net",
      customDomainPath: "test.platform.hmcts.net"
    });
    vi.mocked(getB2cBaseUrl).mockReturnValue("https://sign-in.test.platform.hmcts.net/test.platform.hmcts.net");
  });

  it("should redirect to the B2C authorise endpoint with the media verification policy and the /login/return redirect URI", () => {
    // Act
    GET(req as Request, res as Response);

    // Assert
    const url = new URL(vi.mocked(res.redirect!).mock.calls[0][0] as unknown as string);
    expect(`${url.origin}${url.pathname}`).toBe("https://sign-in.test.platform.hmcts.net/test.platform.hmcts.net/oauth2/v2.0/authorize");
    expect(url.searchParams.get("p")).toBe("B2C_1_SignInMediaVerification");
    expect(url.searchParams.get("redirect_uri")).toBe("https://localhost:8080/login/return");
    expect(url.searchParams.get("client_id")).toBe("test-client-id");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("response_mode")).toBe("query");
    expect(url.searchParams.get("scope")).toBe("openid");
    expect(url.searchParams.get("ui_locales")).toBe("en");
    expect(Buffer.from(url.searchParams.get("state")!, "base64").toString("utf-8")).toMatch(/^test-session-id:\d+:[0-9a-f]{32}$/);
    expect(url.searchParams.get("nonce")).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("should store the media verification provider, the verified return URL and the locale in the session", () => {
    // Act
    GET(req as Request, res as Response);

    // Assert
    expect(req.session).toMatchObject({ b2cProvider: "media_verification", returnTo: "/account-home?verified=true", b2cLocale: "en" });
  });

  it("should use the Welsh B2C locale when lng=cy", () => {
    // Arrange
    req.query = { lng: "cy" };

    // Act
    GET(req as Request, res as Response);

    // Assert
    const url = new URL(vi.mocked(res.redirect!).mock.calls[0][0] as unknown as string);
    expect(url.searchParams.get("ui_locales")).toBe("cy-GB");
    expect(req.session?.b2cLocale).toBe("cy");
  });

  it("should fall back to the response locale and then English", () => {
    // Arrange
    res.locals = {};

    // Act
    GET(req as Request, res as Response);

    // Assert
    expect(req.session?.b2cLocale).toBe("en");
  });

  it("should use 'unknown' in the state when the session has no ID", () => {
    // Arrange
    req.session = {} as any;

    // Act
    GET(req as Request, res as Response);

    // Assert
    const url = new URL(vi.mocked(res.redirect!).mock.calls[0][0] as unknown as string);
    expect(Buffer.from(url.searchParams.get("state")!, "base64").toString("utf-8")).toMatch(/^unknown:/);
  });

  it("should return 503 when B2C is not configured", () => {
    // Arrange
    vi.mocked(isB2cConfigured).mockReturnValue(false);

    // Act
    GET(req as Request, res as Response);

    // Assert
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.send).toHaveBeenCalledWith("B2C authentication is not available. Please check configuration.");
    expect(res.redirect).not.toHaveBeenCalled();
  });
});
