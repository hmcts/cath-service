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
    const mockFetch = vi.mocked(global.fetch);

    it("should exchange code for token successfully", async () => {
      const mockResponse = {
        access_token: "mock-access-token",
        id_token: "mock-id-token",
        token_type: "Bearer",
        expires_in: 3600
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

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
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      } as Response);

      await exchangeCodeForToken("test-code", mockConfig);

      const callArgs = mockFetch.mock.calls[0];
      const bodyParams = new URLSearchParams(callArgs[1]?.body as string);

      expect(bodyParams.get("client_id")).toBe("app-pip-frontend");
      expect(bodyParams.get("client_secret")).toBe("test-secret");
      expect(bodyParams.get("grant_type")).toBe("authorization_code");
      expect(bodyParams.get("redirect_uri")).toBe("https://localhost:8080/cft-login/return");
      expect(bodyParams.get("code")).toBe("test-code");
    });

    it("should throw error when token exchange fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "Invalid code"
      } as Response);

      await expect(exchangeCodeForToken("invalid-code", mockConfig)).rejects.toThrow("Token exchange failed: 400 Invalid code");
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("should not retry when token exchange fails with a 4xx client error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "invalid_client"
      } as Response);

      await expect(exchangeCodeForToken("test-code", mockConfig)).rejects.toThrow("Token exchange failed: 401 invalid_client");
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("should retry once and succeed when IDAM returns a transient 5xx error", async () => {
      const mockResponse = {
        access_token: "mock-access-token",
        id_token: "mock-id-token",
        token_type: "Bearer",
        expires_in: 3600
      };
      const cancelBody = vi.fn();

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          text: async () => "Service unavailable",
          body: { cancel: cancelBody }
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse
        } as Response);

      const result = await exchangeCodeForToken("test-code", mockConfig);

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(cancelBody).toHaveBeenCalledTimes(1);
    });

    it("should throw after exhausting retries when IDAM keeps returning 5xx errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 502,
        text: async () => "Bad gateway"
      } as Response);

      await expect(exchangeCodeForToken("test-code", mockConfig)).rejects.toThrow("Token exchange failed: 502 Bad gateway");
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("should retry once and succeed after a transient network failure", async () => {
      const mockResponse = {
        access_token: "mock-access-token",
        id_token: "mock-id-token",
        token_type: "Bearer",
        expires_in: 3600
      };

      mockFetch.mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response);

      const result = await exchangeCodeForToken("test-code", mockConfig);

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("should throw after exhausting retries when the network keeps failing", async () => {
      mockFetch.mockRejectedValue(new TypeError("fetch failed"));

      await expect(exchangeCodeForToken("test-code", mockConfig)).rejects.toThrow("fetch failed");
      expect(fetch).toHaveBeenCalledTimes(2);
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
