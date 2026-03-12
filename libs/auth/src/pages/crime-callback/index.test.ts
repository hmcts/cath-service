import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("@hmcts/account/repository/query");
vi.mock("@hmcts/cloud-native-platform");
vi.mock("../../crime-idam/token-client.js");
vi.mock("../../config/crime-idam-config.js");
vi.mock("../../role-service/index.js");

describe("crime-callback", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockSession: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockSession = {
      lng: "en",
      crimeOauthState: "test-state-token",
      regenerate: vi.fn((callback) => callback(null)),
      save: vi.fn((callback) => callback(null)),
      cookie: {},
      passport: {}
    };

    mockRequest = {
      query: {},
      session: mockSession,
      sessionID: "test-session-id",
      login: vi.fn((user, callback) => callback(null)),
      user: undefined
    };

    mockResponse = {
      redirect: vi.fn(),
      locals: { locale: "en" }
    };
  });

  describe("GET", () => {
    it("should redirect to sign-in with error when no authorization code provided", async () => {
      // Arrange
      mockRequest.query = {};

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.redirect).toHaveBeenCalledWith("/sign-in?error=no_code&lng=en");
    });

    it("should redirect to sign-in with invalid_state when state does not match", async () => {
      // Arrange
      mockRequest.query = { code: "test-auth-code", state: "wrong-state" };

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.redirect).toHaveBeenCalledWith("/sign-in?error=invalid_state&lng=en");
    });

    it("should redirect to sign-in with invalid_state when state is absent", async () => {
      // Arrange
      mockRequest.query = { code: "test-auth-code" };

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.redirect).toHaveBeenCalledWith("/sign-in?error=invalid_state&lng=en");
    });

    it("should redirect to crime-rejected when user has rejected role", async () => {
      // Arrange
      const { exchangeCodeForToken, extractUserInfoFromToken } = await import("../../crime-idam/token-client.js");
      const { getCrimeIdamConfig } = await import("../../config/crime-idam-config.js");
      const { isRejectedCrimeRole } = await import("../../role-service/index.js");

      mockRequest.query = { code: "test-auth-code", state: "test-state-token" };

      vi.mocked(getCrimeIdamConfig).mockReturnValue({
        crimeIdamUrl: "https://idam.crime.hmcts.net",
        clientId: "test-client-id",
        clientSecret: "test-secret",
        redirectUri: "https://example.com/crime-login/return",
        scope: "openid profile roles",
        authorizationEndpoint: "https://idam.crime.hmcts.net/idp/oauth2/authorize",
        tokenEndpoint: "https://idam.crime.hmcts.net/idp/oauth2/access_token"
      });

      vi.mocked(exchangeCodeForToken).mockResolvedValue({
        access_token: "test-access-token",
        id_token: "test-id-token",
        token_type: "Bearer",
        expires_in: 3600
      });

      vi.mocked(extractUserInfoFromToken).mockReturnValue({
        id: "user-123",
        email: "test@example.com",
        displayName: "Test User",
        firstName: "Test",
        surname: "User",
        roles: ["citizen"]
      });

      vi.mocked(isRejectedCrimeRole).mockReturnValue(true);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.redirect).toHaveBeenCalledWith("/crime-rejected?lng=en");
    });

    it("should create user and redirect to account-home on successful authentication", async () => {
      // Arrange
      const { exchangeCodeForToken, extractUserInfoFromToken } = await import("../../crime-idam/token-client.js");
      const { getCrimeIdamConfig } = await import("../../config/crime-idam-config.js");
      const { isRejectedCrimeRole } = await import("../../role-service/index.js");
      const { createOrUpdateUser } = await import("@hmcts/account/repository/query");

      mockRequest.query = { code: "test-auth-code", state: "test-state-token" };
      mockSession.lng = "cy";

      vi.mocked(getCrimeIdamConfig).mockReturnValue({
        crimeIdamUrl: "https://idam.crime.hmcts.net",
        clientId: "test-client-id",
        clientSecret: "test-secret",
        redirectUri: "https://example.com/crime-login/return",
        scope: "openid profile roles",
        authorizationEndpoint: "https://idam.crime.hmcts.net/idp/oauth2/authorize",
        tokenEndpoint: "https://idam.crime.hmcts.net/idp/oauth2/access_token"
      });

      vi.mocked(exchangeCodeForToken).mockResolvedValue({
        access_token: "test-access-token",
        id_token: "test-id-token",
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

      vi.mocked(isRejectedCrimeRole).mockReturnValue(false);

      vi.mocked(createOrUpdateUser).mockResolvedValue({
        userId: "db-user-id",
        email: "test@example.com",
        firstName: "Test",
        surname: "User"
      } as any);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(createOrUpdateUser).toHaveBeenCalledWith({
        email: "test@example.com",
        firstName: "Test",
        surname: "User",
        userProvenance: "CRIME_IDAM",
        userProvenanceId: "CRIME_IDAM:user-123",
        role: "VERIFIED"
      });
      expect(mockSession.regenerate).toHaveBeenCalled();
      expect(mockRequest.login).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "db-user-id",
          email: "test@example.com",
          displayName: "Test User",
          role: "VERIFIED",
          provenance: "CRIME_IDAM"
        }),
        expect.any(Function)
      );
      expect(mockSession.save).toHaveBeenCalled();
      expect(mockResponse.redirect).toHaveBeenCalledWith("/account-home?lng=cy");
    });

    it("should redirect to sign-in with db_error when createOrUpdateUser fails", async () => {
      // Arrange
      const { exchangeCodeForToken, extractUserInfoFromToken } = await import("../../crime-idam/token-client.js");
      const { getCrimeIdamConfig } = await import("../../config/crime-idam-config.js");
      const { isRejectedCrimeRole } = await import("../../role-service/index.js");
      const { createOrUpdateUser } = await import("@hmcts/account/repository/query");
      const { trackException } = await import("@hmcts/cloud-native-platform");

      mockRequest.query = { code: "test-auth-code", state: "test-state-token" };

      vi.mocked(getCrimeIdamConfig).mockReturnValue({
        crimeIdamUrl: "https://idam.crime.hmcts.net",
        clientId: "test-client-id",
        clientSecret: "test-secret",
        redirectUri: "https://example.com/crime-login/return",
        scope: "openid profile roles",
        authorizationEndpoint: "https://idam.crime.hmcts.net/idp/oauth2/authorize",
        tokenEndpoint: "https://idam.crime.hmcts.net/idp/oauth2/access_token"
      });

      vi.mocked(exchangeCodeForToken).mockResolvedValue({
        access_token: "test-access-token",
        id_token: "test-id-token",
        token_type: "Bearer",
        expires_in: 3600
      });

      vi.mocked(extractUserInfoFromToken).mockReturnValue({
        id: "user-123",
        email: "test@example.com",
        displayName: "Test User",
        roles: ["caseworker"]
      });

      vi.mocked(isRejectedCrimeRole).mockReturnValue(false);

      const dbError = new Error("Database error");
      vi.mocked(createOrUpdateUser).mockRejectedValue(dbError);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(trackException).toHaveBeenCalledWith(dbError, { area: "Crime IDAM callback" });
      expect(mockResponse.redirect).toHaveBeenCalledWith("/sign-in?error=db_error&lng=en");
    });

    it("should redirect to sign-in with session_failed when session regeneration fails", async () => {
      // Arrange
      const { exchangeCodeForToken, extractUserInfoFromToken } = await import("../../crime-idam/token-client.js");
      const { getCrimeIdamConfig } = await import("../../config/crime-idam-config.js");
      const { isRejectedCrimeRole } = await import("../../role-service/index.js");
      const { createOrUpdateUser } = await import("@hmcts/account/repository/query");

      mockRequest.query = { code: "test-auth-code", state: "test-state-token" };
      mockSession.regenerate = vi.fn((callback) => callback(new Error("Regeneration failed")));

      vi.mocked(getCrimeIdamConfig).mockReturnValue({
        crimeIdamUrl: "https://idam.crime.hmcts.net",
        clientId: "test-client-id",
        clientSecret: "test-secret",
        redirectUri: "https://example.com/crime-login/return",
        scope: "openid profile roles",
        authorizationEndpoint: "https://idam.crime.hmcts.net/idp/oauth2/authorize",
        tokenEndpoint: "https://idam.crime.hmcts.net/idp/oauth2/access_token"
      });

      vi.mocked(exchangeCodeForToken).mockResolvedValue({
        access_token: "test-access-token",
        id_token: "test-id-token",
        token_type: "Bearer",
        expires_in: 3600
      });

      vi.mocked(extractUserInfoFromToken).mockReturnValue({
        id: "user-123",
        email: "test@example.com",
        displayName: "Test User",
        roles: ["caseworker"]
      });

      vi.mocked(isRejectedCrimeRole).mockReturnValue(false);
      vi.mocked(createOrUpdateUser).mockResolvedValue({ userId: "db-user-id" } as any);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.redirect).toHaveBeenCalledWith("/sign-in?error=session_failed&lng=en");
    });

    it("should redirect to sign-in with auth_failed when token exchange fails", async () => {
      // Arrange
      const { exchangeCodeForToken } = await import("../../crime-idam/token-client.js");
      const { getCrimeIdamConfig } = await import("../../config/crime-idam-config.js");

      mockRequest.query = { code: "invalid-code", state: "test-state-token" };

      vi.mocked(getCrimeIdamConfig).mockReturnValue({
        crimeIdamUrl: "https://idam.crime.hmcts.net",
        clientId: "test-client-id",
        clientSecret: "test-secret",
        redirectUri: "https://example.com/crime-login/return",
        scope: "openid profile roles",
        authorizationEndpoint: "https://idam.crime.hmcts.net/idp/oauth2/authorize",
        tokenEndpoint: "https://idam.crime.hmcts.net/idp/oauth2/access_token"
      });

      vi.mocked(exchangeCodeForToken).mockRejectedValue(new Error("Token exchange failed"));

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.redirect).toHaveBeenCalledWith("/sign-in?error=auth_failed&lng=en");
    });

    it("should preserve Welsh language through authentication flow", async () => {
      // Arrange
      const { exchangeCodeForToken, extractUserInfoFromToken } = await import("../../crime-idam/token-client.js");
      const { getCrimeIdamConfig } = await import("../../config/crime-idam-config.js");
      const { isRejectedCrimeRole } = await import("../../role-service/index.js");
      const { createOrUpdateUser } = await import("@hmcts/account/repository/query");

      mockRequest.query = { code: "test-auth-code", state: "test-state-token" };
      mockSession.lng = "cy";

      vi.mocked(getCrimeIdamConfig).mockReturnValue({
        crimeIdamUrl: "https://idam.crime.hmcts.net",
        clientId: "test-client-id",
        clientSecret: "test-secret",
        redirectUri: "https://example.com/crime-login/return",
        scope: "openid profile roles",
        authorizationEndpoint: "https://idam.crime.hmcts.net/idp/oauth2/authorize",
        tokenEndpoint: "https://idam.crime.hmcts.net/idp/oauth2/access_token"
      });

      vi.mocked(exchangeCodeForToken).mockResolvedValue({
        access_token: "test-access-token",
        id_token: "test-id-token",
        token_type: "Bearer",
        expires_in: 3600
      });

      vi.mocked(extractUserInfoFromToken).mockReturnValue({
        id: "user-123",
        email: "test@example.com",
        displayName: "Test User",
        roles: ["caseworker"]
      });

      vi.mocked(isRejectedCrimeRole).mockReturnValue(false);
      vi.mocked(createOrUpdateUser).mockResolvedValue({ userId: "db-user-id" } as any);

      // Act
      await GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.redirect).toHaveBeenCalledWith("/account-home?lng=cy");
      expect(mockSession.lng).toBeUndefined(); // Should be cleaned up
    });
  });
});
