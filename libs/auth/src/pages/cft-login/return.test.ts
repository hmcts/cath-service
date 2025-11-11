import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as tokenClient from "../../cft-idam/token-client.js";
import * as cftIdamConfig from "../../config/cft-idam-config.js";
import * as roleValidator from "../../role-service/cft-idam-role-validator.js";
import { GET } from "./return.js";

vi.mock("../../cft-idam/token-client.js");
vi.mock("../../config/cft-idam-config.js");
vi.mock("../../role-service/cft-idam-role-validator.js");

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

    vi.mocked(cftIdamConfig.getCftIdamConfig).mockReturnValue({
      cftIdamUrl: "https://idam.example.com",
      clientId: "app-pip-frontend",
      clientSecret: "secret",
      redirectUri: "https://localhost:8080/cft-login/return",
      authorizationEndpoint: "https://idam.example.com/o/authorize",
      tokenEndpoint: "https://idam.example.com/o/token"
    });
  });

  it("should successfully authenticate valid user and redirect to account-home", async () => {
    vi.mocked(tokenClient.exchangeCodeForToken).mockResolvedValue({
      access_token: "token",
      id_token: "id_token",
      token_type: "Bearer",
      expires_in: 3600
    });

    vi.mocked(tokenClient.extractUserInfoFromToken).mockReturnValue({
      id: "user-123",
      email: "test@example.com",
      displayName: "Test User",
      roles: ["caseworker"]
    });

    vi.mocked(roleValidator.isRejectedRole).mockReturnValue(false);

    await GET(mockReq as Request, mockRes as Response);

    expect(tokenClient.exchangeCodeForToken).toHaveBeenCalledWith("test-code", expect.any(Object));
    expect(mockSession.regenerate).toHaveBeenCalled();
    expect(mockReq.login).toHaveBeenCalledWith(
      {
        id: "user-123",
        email: "test@example.com",
        displayName: "Test User",
        role: "VERIFIED",
        provenance: "CFT"
      },
      expect.any(Function)
    );
    expect(mockSession.save).toHaveBeenCalled();
    expect(mockRes.redirect).toHaveBeenCalledWith("/account-home");
  });

  it("should redirect to cft-rejected when user has rejected role", async () => {
    vi.mocked(tokenClient.exchangeCodeForToken).mockResolvedValue({
      access_token: "token",
      id_token: "id_token",
      token_type: "Bearer",
      expires_in: 3600
    });

    vi.mocked(tokenClient.extractUserInfoFromToken).mockReturnValue({
      id: "user-456",
      email: "citizen@example.com",
      displayName: "Citizen User",
      roles: ["citizen"]
    });

    vi.mocked(roleValidator.isRejectedRole).mockReturnValue(true);

    await GET(mockReq as Request, mockRes as Response);

    expect(mockRes.redirect).toHaveBeenCalledWith("/cft-rejected");
    expect(mockReq.login).not.toHaveBeenCalled();
  });

  it("should redirect to sign-in when no code is provided", async () => {
    mockReq.query = {};

    await GET(mockReq as Request, mockRes as Response);

    expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in?error=no_code");
    expect(tokenClient.exchangeCodeForToken).not.toHaveBeenCalled();
  });

  it("should redirect to sign-in when token exchange fails", async () => {
    vi.mocked(tokenClient.exchangeCodeForToken).mockRejectedValue(new Error("Token exchange failed"));

    await GET(mockReq as Request, mockRes as Response);

    expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in?error=auth_failed");
  });

  it("should redirect to sign-in when session regeneration fails", async () => {
    vi.mocked(tokenClient.exchangeCodeForToken).mockResolvedValue({
      access_token: "token",
      id_token: "id_token",
      token_type: "Bearer",
      expires_in: 3600
    });

    vi.mocked(tokenClient.extractUserInfoFromToken).mockReturnValue({
      id: "user-789",
      email: "test@example.com",
      displayName: "Test User",
      roles: ["caseworker"]
    });

    vi.mocked(roleValidator.isRejectedRole).mockReturnValue(false);

    mockSession.regenerate = vi.fn((callback) => callback(new Error("Regeneration failed")));

    await GET(mockReq as Request, mockRes as Response);

    expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in?error=session_failed");
  });

  it("should redirect to sign-in when login fails", async () => {
    vi.mocked(tokenClient.exchangeCodeForToken).mockResolvedValue({
      access_token: "token",
      id_token: "id_token",
      token_type: "Bearer",
      expires_in: 3600
    });

    vi.mocked(tokenClient.extractUserInfoFromToken).mockReturnValue({
      id: "user-999",
      email: "test@example.com",
      displayName: "Test User",
      roles: ["caseworker"]
    });

    vi.mocked(roleValidator.isRejectedRole).mockReturnValue(false);

    mockReq.login = vi.fn((_user, callback: any) => callback(new Error("Login failed")));

    await GET(mockReq as Request, mockRes as Response);

    expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in?error=login_failed");
  });

  it("should redirect to sign-in when session save fails", async () => {
    vi.mocked(tokenClient.exchangeCodeForToken).mockResolvedValue({
      access_token: "token",
      id_token: "id_token",
      token_type: "Bearer",
      expires_in: 3600
    });

    vi.mocked(tokenClient.extractUserInfoFromToken).mockReturnValue({
      id: "user-000",
      email: "test@example.com",
      displayName: "Test User",
      roles: ["caseworker"]
    });

    vi.mocked(roleValidator.isRejectedRole).mockReturnValue(false);

    mockSession.save = vi.fn((callback) => callback(new Error("Save failed")));

    await GET(mockReq as Request, mockRes as Response);

    expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in?error=session_save_failed");
  });
});
