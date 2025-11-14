import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CftIdamConfig } from "../config/cft-idam-config.js";
import { exchangeCodeForToken, extractUserInfoFromToken } from "./token-client.js";

global.fetch = vi.fn();

describe("Token Client", () => {
  const mockConfig: CftIdamConfig = {
    cftIdamUrl: "https://idam.example.com",
    clientId: "app-pip-frontend",
    clientSecret: "test-secret",
    redirectUri: "https://localhost:8080/cft-login/return",
    authorizationEndpoint: "https://idam.example.com/o/authorize",
    tokenEndpoint: "https://idam.example.com/o/token"
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("exchangeCodeForToken", () => {
    it("should exchange code for token successfully", async () => {
      const mockResponse = {
        access_token: "mock-access-token",
        id_token: "mock-id-token",
        token_type: "Bearer",
        expires_in: 3600
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await exchangeCodeForToken("test-code", mockConfig);

      expect(fetch).toHaveBeenCalledWith("https://idam.example.com/o/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: expect.stringContaining("client_id=app-pip-frontend")
      });

      expect(result).toEqual(mockResponse);
    });

    it("should include all required parameters in request", async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      await exchangeCodeForToken("test-code", mockConfig);

      const callArgs = (fetch as any).mock.calls[0];
      const bodyParams = new URLSearchParams(callArgs[1].body);

      expect(bodyParams.get("client_id")).toBe("app-pip-frontend");
      expect(bodyParams.get("client_secret")).toBe("test-secret");
      expect(bodyParams.get("grant_type")).toBe("authorization_code");
      expect(bodyParams.get("redirect_uri")).toBe("https://localhost:8080/cft-login/return");
      expect(bodyParams.get("code")).toBe("test-code");
    });

    it("should throw error when token exchange fails", async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "Invalid code"
      });

      await expect(exchangeCodeForToken("invalid-code", mockConfig)).rejects.toThrow("Token exchange failed: 400 Invalid code");
    });
  });

  describe("extractUserInfoFromToken", () => {
    it("should extract user info from id_token", () => {
      const payload = {
        sub: "user-123",
        email: "test@example.com",
        name: "Test User",
        roles: ["caseworker", "admin"]
      };

      const idToken = `header.${btoa(JSON.stringify(payload))}.signature`;

      const tokenResponse = {
        access_token: "access-token",
        id_token: idToken,
        token_type: "Bearer",
        expires_in: 3600
      };

      const userInfo = extractUserInfoFromToken(tokenResponse);

      expect(userInfo).toEqual({
        id: "user-123",
        email: "test@example.com",
        displayName: "Test User",
        roles: ["caseworker", "admin"]
      });
    });

    it("should fall back to access_token if id_token not present", () => {
      const payload = {
        sub: "user-456",
        email: "another@example.com",
        name: "Another User",
        roles: ["viewer"]
      };

      const accessToken = `header.${btoa(JSON.stringify(payload))}.signature`;

      const tokenResponse = {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 3600
      };

      const userInfo = extractUserInfoFromToken(tokenResponse);

      expect(userInfo).toEqual({
        id: "user-456",
        email: "another@example.com",
        displayName: "Another User",
        roles: ["viewer"]
      });
    });

    it("should handle empty roles array", () => {
      const payload = {
        sub: "user-789",
        email: "noroles@example.com",
        name: "No Roles User",
        roles: []
      };

      const idToken = `header.${btoa(JSON.stringify(payload))}.signature`;

      const userInfo = extractUserInfoFromToken({
        access_token: "token",
        id_token: idToken,
        token_type: "Bearer",
        expires_in: 3600
      });

      expect(userInfo.roles).toEqual([]);
    });

    it("should handle missing roles claim", () => {
      const payload = {
        sub: "user-999",
        email: "missing@example.com",
        name: "Missing Roles"
      };

      const idToken = `header.${btoa(JSON.stringify(payload))}.signature`;

      const userInfo = extractUserInfoFromToken({
        access_token: "token",
        id_token: idToken,
        token_type: "Bearer",
        expires_in: 3600
      });

      expect(userInfo.roles).toEqual([]);
    });

    it("should use alternative claim names for id", () => {
      const payload = {
        uid: "uid-123",
        email: "uid@example.com",
        name: "UID User"
      };

      const idToken = `header.${btoa(JSON.stringify(payload))}.signature`;

      const userInfo = extractUserInfoFromToken({
        access_token: "token",
        id_token: idToken,
        token_type: "Bearer",
        expires_in: 3600
      });

      expect(userInfo.id).toBe("uid-123");
    });

    it("should throw error when no token is present", () => {
      expect(() =>
        extractUserInfoFromToken({
          token_type: "Bearer",
          expires_in: 3600
        } as any)
      ).toThrow("No id_token or access_token found in response");
    });
  });
});
