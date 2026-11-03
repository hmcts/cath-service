import { buildSignOutRedirectUrl } from "@hmcts/auth";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  buildSignOutRedirectUrl: vi.fn()
}));

const SIGN_OUT_URL = "https://idp.example.net/logout?post_logout_redirect_uri=x";

describe("Logout handler", () => {
  let req: Request;
  let res: Response;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(buildSignOutRedirectUrl).mockReturnValue(SIGN_OUT_URL);

    req = {
      user: { id: "user-123", email: "test@example.com", displayName: "Test User", role: "VERIFIED", provenance: "CFT_IDAM" },
      logout: vi.fn((cb) => cb(null)),
      session: { destroy: vi.fn((cb) => cb(null)) },
      protocol: "https",
      get: vi.fn(() => "localhost:8080")
    } as unknown as Request;

    res = {
      clearCookie: vi.fn(),
      redirect: vi.fn(),
      locals: { locale: "en" }
    } as unknown as Response;
  });

  it("should log out, destroy the session, clear the cookie and redirect to the provider sign-out URL", async () => {
    // Act
    await GET(req, res);

    // Assert
    expect(req.logout).toHaveBeenCalled();
    expect(req.session.destroy).toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalledWith("connect.sid");
    expect(res.redirect).toHaveBeenCalledWith(SIGN_OUT_URL);
  });

  it.each(["CFT_IDAM", "CRIME_IDAM", "PI_AAD", "SSO"])("should build the sign-out URL for a %s user", async (provenance) => {
    // Arrange
    req.user = { ...req.user!, provenance };
    res.locals = { locale: "cy" };

    // Act
    await GET(req, res);

    // Assert
    expect(buildSignOutRedirectUrl).toHaveBeenCalledWith({ provenance, locale: "cy", origin: "https://localhost:8080" });
  });

  it("should build the sign-out URL when there is no signed-in user", async () => {
    // Arrange
    req.user = undefined;

    // Act
    await GET(req, res);

    // Assert
    expect(buildSignOutRedirectUrl).toHaveBeenCalledWith({ provenance: undefined, locale: "en", origin: "https://localhost:8080" });
    expect(res.redirect).toHaveBeenCalledWith(SIGN_OUT_URL);
  });

  it("should continue logout when the logout callback or session destroy errors", async () => {
    // Arrange
    req.logout = vi.fn((cb) => cb(new Error("Logout error"))) as unknown as Request["logout"];
    req.session.destroy = vi.fn((cb) => cb(new Error("Destroy error"))) as unknown as Request["session"]["destroy"];

    // Act
    await GET(req, res);

    // Assert
    expect(res.clearCookie).toHaveBeenCalledWith("connect.sid");
    expect(res.redirect).toHaveBeenCalledWith(SIGN_OUT_URL);
  });
});
