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
        uid: "user-123",
        sub: "test@example.com",
        name: "Test User",
        given_name: "Test",
        family_name: "User",
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
        firstName: "Test",
        surname: "User",
        roles: ["caseworker", "admin"]
      });
    });

    it("should fall back to access_token if id_token not present", () => {
      const payload = {
        uid: "user-456",
        sub: "another@example.com",
        name: "Another User",
        given_name: "Another",
        family_name: "User",
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
        firstName: "Another",
        surname: "User",
        roles: ["viewer"]
      });
    });

    it("should handle empty roles array", () => {
      const payload = {
        uid: "user-789",
        sub: "noroles@example.com",
        name: "No Roles User",
        given_name: "No Roles",
        family_name: "User",
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
        uid: "user-999",
        sub: "missing@example.com",
        name: "Missing Roles",
        given_name: "Missing",
        family_name: "Roles"
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

    it("should use uid for id and sub for email", () => {
      const payload = {
        uid: "uid-123",
        sub: "uid@example.com",
        name: "UID User",
        given_name: "UID",
        family_name: "User"
      };

      const idToken = `header.${btoa(JSON.stringify(payload))}.signature`;

      const userInfo = extractUserInfoFromToken({
        access_token: "token",
        id_token: idToken,
        token_type: "Bearer",
        expires_in: 3600
      });

      expect(userInfo.id).toBe("uid-123");
      expect(userInfo.email).toBe("uid@example.com");
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
