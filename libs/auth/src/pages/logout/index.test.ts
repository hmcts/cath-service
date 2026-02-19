import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("../../config/sso-config.js", () => ({
  getSsoConfig: vi.fn(() => ({
    issuerUrl: "https://login.microsoftonline.com/12345678-1234-1234-1234-123456789abc/v2.0"
  }))
}));

describe("Logout handler", () => {
  it("should logout CFT IDAM user and redirect to session-logged-out page", async () => {
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
      redirect: vi.fn()
    } as unknown as Response;

    await GET(req, res);

    expect(req.logout).toHaveBeenCalled();
    expect(req.session.destroy).toHaveBeenCalled();
    expect(res.clearCookie).toHaveBeenCalledWith("connect.sid");
    expect(res.redirect).toHaveBeenCalledWith("/session-logged-out");
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
      redirect: vi.fn()
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
      redirect: vi.fn()
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
    const { getSsoConfig } = await import("../../config/sso-config.js");

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
      redirect: vi.fn()
    } as unknown as Response;

    await GET(req, res);

    expect(res.redirect).toHaveBeenCalledWith("/session-logged-out");
  });

  it("should continue logout even if logout callback has error", async () => {
    const { getSsoConfig } = await import("../../config/sso-config.js");

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
      redirect: vi.fn()
    } as unknown as Response;

    await GET(req, res);

    expect(req.session.destroy).toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalled();
  });

  it("should continue logout even if session destroy has error", async () => {
    const { getSsoConfig } = await import("../../config/sso-config.js");

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
      redirect: vi.fn()
    } as unknown as Response;

    await GET(req, res);

    expect(res.clearCookie).toHaveBeenCalledWith("connect.sid");
    expect(res.redirect).toHaveBeenCalled();
  });

  it("should use http protocol when request is http", async () => {
    const { getSsoConfig } = await import("../../config/sso-config.js");

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
      redirect: vi.fn()
    } as unknown as Response;

    await GET(req, res);

    expect(res.redirect).toHaveBeenCalledWith(expect.stringContaining("post_logout_redirect_uri=http%3A%2F%2Flocalhost%3A3000%2F"));
  });
});
