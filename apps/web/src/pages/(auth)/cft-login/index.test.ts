import { getCftIdamConfig, isCftIdamConfigured } from "@hmcts/auth";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  isCftIdamConfigured: vi.fn(),
  getCftIdamConfig: vi.fn()
}));

describe("CFT Login Handler", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    vi.resetAllMocks();

    mockReq = {
      query: {},
      session: {} as any
    };

    mockRes = {
      redirect: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
      locals: {}
    };
  });

  it("should redirect to CFT IDAM authorization URL with correct parameters", () => {
    vi.mocked(isCftIdamConfigured).mockReturnValue(true);
    vi.mocked(getCftIdamConfig).mockReturnValue({
      cftIdamUrl: "https://idam.example.com",
      clientId: "app-pip-frontend",
      clientSecret: "secret",
      redirectUri: "https://localhost:8080/cft-login/return",
      scope: "openid profile roles",
      authorizationEndpoint: "https://idam.example.com",
      tokenEndpoint: "https://idam.example.com/o/token"
    });

    mockReq.query = { lng: "en" };

    GET(mockReq as Request, mockRes as Response);

    expect(mockRes.redirect).toHaveBeenCalledWith(
      "https://idam.example.com?client_id=app-pip-frontend&response_type=code&redirect_uri=https%3A%2F%2Flocalhost%3A8080%2Fcft-login%2Freturn&scope=openid+profile+roles&ui_locales=en"
    );
  });

  it("should use Welsh locale when lng=cy", () => {
    vi.mocked(isCftIdamConfigured).mockReturnValue(true);
    vi.mocked(getCftIdamConfig).mockReturnValue({
      cftIdamUrl: "https://idam.example.com",
      clientId: "app-pip-frontend",
      clientSecret: "secret",
      redirectUri: "https://localhost:8080/cft-login/return",
      scope: "openid profile roles",
      authorizationEndpoint: "https://idam.example.com",
      tokenEndpoint: "https://idam.example.com/o/token"
    });

    mockReq.query = { lng: "cy" };

    GET(mockReq as Request, mockRes as Response);

    expect(mockRes.redirect).toHaveBeenCalledWith(expect.stringContaining("ui_locales=cy"));
  });

  it("should default to en locale when no lng parameter", () => {
    vi.mocked(isCftIdamConfigured).mockReturnValue(true);
    vi.mocked(getCftIdamConfig).mockReturnValue({
      cftIdamUrl: "https://idam.example.com",
      clientId: "app-pip-frontend",
      clientSecret: "secret",
      redirectUri: "https://localhost:8080/cft-login/return",
      scope: "openid profile roles",
      authorizationEndpoint: "https://idam.example.com",
      tokenEndpoint: "https://idam.example.com/o/token"
    });

    GET(mockReq as Request, mockRes as Response);

    expect(mockRes.redirect).toHaveBeenCalledWith(expect.stringContaining("ui_locales=en"));
  });

  it("should use res.locals.locale if no query parameter", () => {
    vi.mocked(isCftIdamConfigured).mockReturnValue(true);
    vi.mocked(getCftIdamConfig).mockReturnValue({
      cftIdamUrl: "https://idam.example.com",
      clientId: "app-pip-frontend",
      clientSecret: "secret",
      redirectUri: "https://localhost:8080/cft-login/return",
      scope: "openid profile roles",
      authorizationEndpoint: "https://idam.example.com",
      tokenEndpoint: "https://idam.example.com/o/token"
    });

    mockRes.locals = { locale: "cy" };

    GET(mockReq as Request, mockRes as Response);

    expect(mockRes.redirect).toHaveBeenCalledWith(expect.stringContaining("ui_locales=cy"));
  });

  it("should return 503 when CFT IDAM is not configured", () => {
    vi.mocked(isCftIdamConfigured).mockReturnValue(false);

    GET(mockReq as Request, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(503);
    expect(mockRes.send).toHaveBeenCalledWith("CFT IDAM authentication is not available. Please check configuration.");
    expect(mockRes.redirect).not.toHaveBeenCalled();
  });

  it("should store language in session before redirecting to CFT IDAM", () => {
    vi.mocked(isCftIdamConfigured).mockReturnValue(true);
    vi.mocked(getCftIdamConfig).mockReturnValue({
      cftIdamUrl: "https://idam.example.com",
      clientId: "app-pip-frontend",
      clientSecret: "secret",
      redirectUri: "https://localhost:8080/cft-login/return",
      scope: "openid profile roles",
      authorizationEndpoint: "https://idam.example.com",
      tokenEndpoint: "https://idam.example.com/o/token"
    });

    mockReq.query = { lng: "cy" };

    GET(mockReq as Request, mockRes as Response);

    expect(mockReq.session.lng).toBe("cy");
  });

  it("should store default language (en) in session when no lng parameter", () => {
    vi.mocked(isCftIdamConfigured).mockReturnValue(true);
    vi.mocked(getCftIdamConfig).mockReturnValue({
      cftIdamUrl: "https://idam.example.com",
      clientId: "app-pip-frontend",
      clientSecret: "secret",
      redirectUri: "https://localhost:8080/cft-login/return",
      scope: "openid profile roles",
      authorizationEndpoint: "https://idam.example.com",
      tokenEndpoint: "https://idam.example.com/o/token"
    });

    GET(mockReq as Request, mockRes as Response);

    expect(mockReq.session.lng).toBe("en");
  });
});
