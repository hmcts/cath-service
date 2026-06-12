import { createOrUpdateUser } from "@hmcts/account/repository/query";
import { exchangeCodeForToken, extractUserInfoFromToken, getCftIdamConfig, isRejectedCFTRole } from "@hmcts/auth";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("@hmcts/auth");
vi.mock("@hmcts/account/repository/query");

describe("CFT Login Return Handler", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockSession: any;

  beforeEach(() => {
    vi.resetAllMocks();

    mockSession = {
      regenerate: vi.fn((callback) => callback(null)),
      save: vi.fn((callback) => callback(null))
    };

    mockReq = {
      query: { code: "test-code" },
      session: mockSession,
      login: vi.fn((_user, callback) => callback(null))
    };

    mockRes = {
      redirect: vi.fn()
    };

    vi.mocked(getCftIdamConfig).mockReturnValue({
      cftIdamUrl: "https://idam.example.com",
      clientId: "app-pip-frontend",
      clientSecret: "secret",
      redirectUri: "https://localhost:8080/cft-login/return",
      authorizationEndpoint: "https://idam.example.com/o/authorize",
      tokenEndpoint: "https://idam.example.com/o/token",
      scope: "openid profile email roles"
    });

    vi.mocked(createOrUpdateUser).mockResolvedValue({
      userId: "user-123",
      email: "test@example.com",
      firstName: "Test",
      surname: "User",
      userProvenance: "CFT_IDAM",
      userProvenanceId: "cft-id-123",
      role: "VERIFIED",
      createdDate: new Date(),
      lastSignedInDate: null
    });
  });

  it("should successfully authenticate valid user and redirect to account-home", async () => {
    vi.mocked(exchangeCodeForToken).mockResolvedValue({
      access_token: "token",
      id_token: "id_token",
      token_type: "Bearer",
      expires_in: 3600
    });

    vi.mocked(extractUserInfoFromToken).mockReturnValue({
      id: "user-123",
      email: "test@example.com",
      displayName: "Test User",
      firstName: "Test",
      surname: "User",
      roles: ["caseworker"]
    });

    vi.mocked(isRejectedCFTRole).mockReturnValue(false);

    await GET(mockReq as Request, mockRes as Response);

    expect(exchangeCodeForToken).toHaveBeenCalledWith("test-code", expect.any(Object));
    expect(mockSession.regenerate).toHaveBeenCalled();
    expect(mockReq.login).toHaveBeenCalledWith(
      {
        id: "user-123",
        email: "test@example.com",
        displayName: "Test User",
        role: "VERIFIED",
        provenance: "CFT_IDAM"
      },
      expect.any(Function)
    );
    expect(mockSession.save).toHaveBeenCalled();
    expect(mockRes.redirect).toHaveBeenCalledWith("/account-home?lng=en");
  });

  it("should redirect to cft-rejected when user has rejected role", async () => {
    vi.mocked(exchangeCodeForToken).mockResolvedValue({
      access_token: "token",
      id_token: "id_token",
      token_type: "Bearer",
      expires_in: 3600
    });

    vi.mocked(extractUserInfoFromToken).mockReturnValue({
      id: "user-456",
      email: "citizen@example.com",
      displayName: "Citizen User",
      firstName: "Citizen",
      surname: "User",
      roles: ["citizen"]
    });

    vi.mocked(isRejectedCFTRole).mockReturnValue(true);

    await GET(mockReq as Request, mockRes as Response);

    expect(mockRes.redirect).toHaveBeenCalledWith("/cft-rejected?lng=en");
    expect(mockReq.login).not.toHaveBeenCalled();
  });

  it("should redirect to sign-in when no code is provided", async () => {
    mockReq.query = {};

    await GET(mockReq as Request, mockRes as Response);

    expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in?error=no_code&lng=en");
    expect(exchangeCodeForToken).not.toHaveBeenCalled();
  });

  it("should redirect to sign-in when token exchange fails", async () => {
    vi.mocked(exchangeCodeForToken).mockRejectedValue(new Error("Token exchange failed"));

    await GET(mockReq as Request, mockRes as Response);

    expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in?error=auth_failed&lng=en");
  });

  it("should redirect to sign-in when session regeneration fails", async () => {
    vi.mocked(exchangeCodeForToken).mockResolvedValue({
      access_token: "token",
      id_token: "id_token",
      token_type: "Bearer",
      expires_in: 3600
    });

    vi.mocked(extractUserInfoFromToken).mockReturnValue({
      id: "user-789",
      email: "test@example.com",
      displayName: "Test User",
      firstName: "Test",
      surname: "User",
      roles: ["caseworker"]
    });

    vi.mocked(isRejectedCFTRole).mockReturnValue(false);

    mockSession.regenerate = vi.fn((callback) => callback(new Error("Regeneration failed")));

    await GET(mockReq as Request, mockRes as Response);

    expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in?error=session_failed&lng=en");
  });

  it("should redirect to sign-in when login fails", async () => {
    vi.mocked(exchangeCodeForToken).mockResolvedValue({
      access_token: "token",
      id_token: "id_token",
      token_type: "Bearer",
      expires_in: 3600
    });

    vi.mocked(extractUserInfoFromToken).mockReturnValue({
      id: "user-999",
      email: "test@example.com",
      displayName: "Test User",
      firstName: "Test",
      surname: "User",
      roles: ["caseworker"]
    });

    vi.mocked(isRejectedCFTRole).mockReturnValue(false);

    mockReq.login = vi.fn((_user, callback: any) => callback(new Error("Login failed")));

    await GET(mockReq as Request, mockRes as Response);

    expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in?error=login_failed&lng=en");
  });

  it("should redirect to sign-in when session save fails", async () => {
    vi.mocked(exchangeCodeForToken).mockResolvedValue({
      access_token: "token",
      id_token: "id_token",
      token_type: "Bearer",
      expires_in: 3600
    });

    vi.mocked(extractUserInfoFromToken).mockReturnValue({
      id: "user-000",
      email: "test@example.com",
      displayName: "Test User",
      firstName: "Test",
      surname: "User",
      roles: ["caseworker"]
    });

    vi.mocked(isRejectedCFTRole).mockReturnValue(false);

    mockSession.save = vi.fn((callback) => callback(new Error("Save failed")));

    await GET(mockReq as Request, mockRes as Response);

    expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in?error=session_save_failed&lng=en");
  });

  it("should preserve Welsh language selection through authentication flow", async () => {
    mockSession.lng = "cy";

    vi.mocked(exchangeCodeForToken).mockResolvedValue({
      access_token: "token",
      id_token: "id_token",
      token_type: "Bearer",
      expires_in: 3600
    });

    vi.mocked(extractUserInfoFromToken).mockReturnValue({
      id: "user-123",
      email: "test@example.com",
      displayName: "Test User",
      firstName: "Test",
      surname: "User",
      roles: ["caseworker"]
    });

    vi.mocked(isRejectedCFTRole).mockReturnValue(false);

    await GET(mockReq as Request, mockRes as Response);

    expect(mockRes.redirect).toHaveBeenCalledWith("/account-home?lng=cy");
    expect(mockSession.lng).toBeUndefined(); // Should be cleaned up
  });

  it("should redirect to sign-in with db_error when createOrUpdateUser fails", async () => {
    vi.mocked(exchangeCodeForToken).mockResolvedValue({
      access_token: "token",
      id_token: "id_token",
      token_type: "Bearer",
      expires_in: 3600
    });

    vi.mocked(extractUserInfoFromToken).mockReturnValue({
      id: "user-123",
      email: "test@example.com",
      displayName: "Test User",
      firstName: "Test",
      surname: "User",
      roles: ["caseworker"]
    });

    vi.mocked(isRejectedCFTRole).mockReturnValue(false);
    vi.mocked(createOrUpdateUser).mockRejectedValue(new Error("DB connection failed"));

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await GET(mockReq as Request, mockRes as Response);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "CFT callback: failed to create/update user",
      expect.objectContaining({
        userEmail: "test@example.com",
        userId: "user-123"
      })
    );
    expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in?error=db_error&lng=en");
    expect(mockReq.login).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("should preserve Welsh language in error redirects", async () => {
    mockSession.lng = "cy";
    mockReq.query = {};

    await GET(mockReq as Request, mockRes as Response);

    expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in?error=no_code&lng=cy");
  });

  it("should preserve Welsh language when user has rejected role", async () => {
    mockSession.lng = "cy";

    vi.mocked(exchangeCodeForToken).mockResolvedValue({
      access_token: "token",
      id_token: "id_token",
      token_type: "Bearer",
      expires_in: 3600
    });

    vi.mocked(extractUserInfoFromToken).mockReturnValue({
      id: "user-456",
      email: "citizen@example.com",
      displayName: "Citizen User",
      firstName: "Citizen",
      surname: "User",
      roles: ["citizen"]
    });

    vi.mocked(isRejectedCFTRole).mockReturnValue(true);

    await GET(mockReq as Request, mockRes as Response);

    expect(mockRes.redirect).toHaveBeenCalledWith("/cft-rejected?lng=cy");
  });
});
