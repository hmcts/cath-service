import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CrimeIdamConfig } from "../config/crime-idam-config.js";
import { exchangeCodeForToken, extractUserInfoFromToken } from "./token-client.js";

describe("crime-idam/token-client", () => {
  let mockConfig: CrimeIdamConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig = {
      crimeIdamUrl: "https://idam.crime.hmcts.net",
      clientId: "test-client-id",
      clientSecret: "test-secret",
      redirectUri: "https://example.com/crime-login/return",
      scope: "openid profile roles",
      authorizationEndpoint: "https://idam.crime.hmcts.net/oauth2/authorise",
      tokenEndpoint: "https://idam.crime.hmcts.net/oauth2/token"
    };
  });

  describe("exchangeCodeForToken", () => {
    it("should successfully exchange authorization code for token", async () => {
      // Arrange
      const mockTokenResponse = {
        access_token: "test-access-token",
        id_token: "test-id-token",
        token_type: "Bearer",
        expires_in: 3600
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse
      });

      // Act
      const result = await exchangeCodeForToken("test-code", mockConfig);

      // Assert
      expect(result).toEqual(mockTokenResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        "https://idam.crime.hmcts.net/oauth2/token",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          }
        })
      );
    });

    it("should send correct parameters in request body", async () => {
      // Arrange
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "token",
          token_type: "Bearer",
          expires_in: 3600
        })
      });

      // Act
      await exchangeCodeForToken("auth-code-123", mockConfig);

      // Assert
      const fetchCall = (global.fetch as any).mock.calls[0];
      const requestBody = fetchCall[1].body;
      const params = new URLSearchParams(requestBody);

      expect(params.get("client_id")).toBe("test-client-id");
      expect(params.get("client_secret")).toBe("test-secret");
      expect(params.get("grant_type")).toBe("authorization_code");
      expect(params.get("redirect_uri")).toBe("https://example.com/crime-login/return");
      expect(params.get("code")).toBe("auth-code-123");
    });

    it("should throw error when token exchange fails", async () => {
      // Arrange
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => "Invalid authorization code"
      });

      // Act & Assert
      await expect(exchangeCodeForToken("invalid-code", mockConfig)).rejects.toThrow("Token exchange failed: 400 Invalid authorization code");
    });

    it("should throw error when network request fails", async () => {
      // Arrange
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      // Act & Assert
      await expect(exchangeCodeForToken("test-code", mockConfig)).rejects.toThrow("Network error");
    });
  });

  describe("extractUserInfoFromToken", () => {
    it("should extract user info from id_token", () => {
      // Arrange
      const claims = {
        uid: "user-123",
        sub: "test@example.com",
        email: "test@example.com",
        name: "Test User",
        given_name: "Test",
        family_name: "User",
        roles: ["caseworker", "admin"]
      };
      const idToken = createMockJwt(claims);
      const tokenResponse = {
        access_token: "access-token",
        id_token: idToken,
        token_type: "Bearer",
        expires_in: 3600
      };

      // Act
      const result = extractUserInfoFromToken(tokenResponse);

      // Assert
      expect(result).toEqual({
        id: "user-123",
        email: "test@example.com",
        displayName: "Test User",
        firstName: "Test",
        surname: "User",
        roles: ["caseworker", "admin"]
      });
    });

    it("should extract user info from access_token when id_token not present", () => {
      // Arrange
      const claims = {
        uid: "user-456",
        sub: "another@example.com",
        name: "Another User",
        roles: ["caseworker"]
      };
      const accessToken = createMockJwt(claims);
      const tokenResponse = {
        access_token: accessToken,
        token_type: "Bearer",
        expires_in: 3600
      };

      // Act
      const result = extractUserInfoFromToken(tokenResponse);

      // Assert
      expect(result).toEqual({
        id: "user-456",
        email: "another@example.com",
        displayName: "Another User",
        firstName: undefined,
        surname: undefined,
        roles: ["caseworker"]
      });
    });

    it("should use sub as id when uid is not present", () => {
      // Arrange
      const claims = {
        sub: "subject-id-789",
        email: "subject@example.com",
        name: "Subject User",
        roles: []
      };
      const idToken = createMockJwt(claims);
      const tokenResponse = {
        access_token: "access-token",
        id_token: idToken,
        token_type: "Bearer",
        expires_in: 3600
      };

      // Act
      const result = extractUserInfoFromToken(tokenResponse);

      // Assert
      expect(result.id).toBe("subject-id-789");
    });

    it("should use email as displayName when name not present", () => {
      // Arrange
      const claims = {
        uid: "user-999",
        sub: "user@example.com",
        email: "user@example.com",
        roles: []
      };
      const idToken = createMockJwt(claims);
      const tokenResponse = {
        access_token: "access-token",
        id_token: idToken,
        token_type: "Bearer",
        expires_in: 3600
      };

      // Act
      const result = extractUserInfoFromToken(tokenResponse);

      // Assert
      expect(result.displayName).toBe("user@example.com");
    });

    it("should use given_name as displayName when name and email not present", () => {
      // Arrange
      const claims = {
        uid: "user-888",
        sub: "sub-888",
        given_name: "John",
        roles: []
      };
      const idToken = createMockJwt(claims);
      const tokenResponse = {
        access_token: "access-token",
        id_token: idToken,
        token_type: "Bearer",
        expires_in: 3600
      };

      // Act
      const result = extractUserInfoFromToken(tokenResponse);

      // Assert
      expect(result.displayName).toBe("John");
    });

    it("should handle empty roles array", () => {
      // Arrange
      const claims = {
        uid: "user-no-roles",
        sub: "noroles@example.com",
        name: "No Roles User",
        roles: []
      };
      const idToken = createMockJwt(claims);
      const tokenResponse = {
        access_token: "access-token",
        id_token: idToken,
        token_type: "Bearer",
        expires_in: 3600
      };

      // Act
      const result = extractUserInfoFromToken(tokenResponse);

      // Assert
      expect(result.roles).toEqual([]);
    });

    it("should handle missing roles claim", () => {
      // Arrange
      const claims = {
        uid: "user-no-roles-claim",
        sub: "noroles@example.com",
        name: "No Roles Claim User"
      };
      const idToken = createMockJwt(claims);
      const tokenResponse = {
        access_token: "access-token",
        id_token: idToken,
        token_type: "Bearer",
        expires_in: 3600
      };

      // Act
      const result = extractUserInfoFromToken(tokenResponse);

      // Assert
      expect(result.roles).toEqual([]);
    });

    it("should throw error when neither id_token nor access_token present", () => {
      // Arrange
      const tokenResponse = {
        token_type: "Bearer",
        expires_in: 3600
      };

      // Act & Assert
      expect(() => extractUserInfoFromToken(tokenResponse as any)).toThrow("No id_token or access_token found in response");
    });

    it("should throw error when JWT is malformed", () => {
      // Arrange
      const tokenResponse = {
        access_token: "not-a-valid-jwt",
        token_type: "Bearer",
        expires_in: 3600
      };

      // Act & Assert
      expect(() => extractUserInfoFromToken(tokenResponse)).toThrow("Failed to parse JWT");
    });
  });
});

function createMockJwt(payload: any): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = "mock-signature";
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}
