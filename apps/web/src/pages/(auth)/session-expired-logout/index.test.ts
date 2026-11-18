import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

describe("session-expired-logout", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  function signIn(provenance: string) {
    req.isAuthenticated = (() => true) as Request["isAuthenticated"];
    req.user = { id: "1", email: "user@example.com", displayName: "User", role: "VERIFIED", provenance };
  }

  beforeEach(() => {
    req = {
      query: {},
      protocol: "https",
      get: vi.fn(() => "localhost:8080") as unknown as Request["get"],
      isAuthenticated: (() => false) as Request["isAuthenticated"],
      logout: vi.fn((cb: (err?: unknown) => void) => cb()) as unknown as Request["logout"],
      session: { destroy: vi.fn((cb: (err?: unknown) => void) => cb()) } as unknown as Request["session"]
    };
    res = {
      locals: { locale: "en" },
      redirect: vi.fn(),
      clearCookie: vi.fn(),
      status: vi.fn().mockReturnThis(),
      render: vi.fn()
    };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("when signed in", () => {
    it("should log out, destroy the session, clear the cookie and redirect by provenance", async () => {
      // Arrange
      signIn("SSO");

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(req.logout).toHaveBeenCalled();
      expect(req.session?.destroy).toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalledWith("connect.sid");
      expect(res.redirect).toHaveBeenCalledWith("/session-expired?lng=en&reSignInUrl=SSO");
    });

    it("should ignore the redirectType query and use the session provenance", async () => {
      // Arrange
      signIn("CRIME_IDAM");
      req.query = { redirectType: "SSO" };
      res.locals = { locale: "cy" };

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/session-expired?lng=cy&reSignInUrl=CRIME");
    });

    it("should end the CFT IDAM session for a CFT_IDAM user", async () => {
      // Arrange
      vi.stubEnv("CFT_IDAM_URL", "https://idam.example.net");
      vi.stubEnv("BASE_URL", "https://localhost:8080");
      signIn("CFT_IDAM");

      // Act
      await GET(req as Request, res as Response);

      // Assert
      const redirectUrl = new URL(vi.mocked(res.redirect as (url: string) => void).mock.calls[0][0]);
      expect(`${redirectUrl.origin}${redirectUrl.pathname}`).toBe("https://idam.example.net/o/endSession");
      expect(redirectUrl.searchParams.get("post_logout_redirect_uri")).toBe("https://localhost:8080/session-expired?lng=en&reSignInUrl=CFT");
    });
  });

  describe("when not signed in", () => {
    it.each(["CFT", "CRIME", "AAD", "SSO"])("should redirect to /session-expired for redirectType %s", async (redirectType) => {
      // Arrange
      req.query = { redirectType };
      res.locals = { locale: "cy" };

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(res.redirect).toHaveBeenCalledWith(`/session-expired?lng=cy&reSignInUrl=${redirectType}`);
      expect(req.logout).not.toHaveBeenCalled();
    });

    it.each([
      ["missing", undefined],
      ["unknown", "EVIL"],
      ["an absolute URL", "https://evil.example"],
      ["an array", ["CFT", "SSO"]]
    ])("should render the 400 error page when redirectType is %s", async (_description, redirectType) => {
      // Arrange
      req.query = redirectType === undefined ? {} : ({ redirectType } as Request["query"]);

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.objectContaining({ t: expect.objectContaining({ defaultHeading: "Error" }) }));
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it("should render the Welsh 400 error page when the locale is cy", async () => {
      // Arrange
      res.locals = { locale: "cy" };

      // Act
      await GET(req as Request, res as Response);

      // Assert
      expect(res.render).toHaveBeenCalledWith("errors/common", expect.objectContaining({ t: expect.objectContaining({ defaultHeading: "Gwall" }) }));
    });
  });
});
