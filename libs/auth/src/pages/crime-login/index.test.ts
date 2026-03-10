import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as crimeIdamConfigModule from "../../config/crime-idam-config.js";
import { GET } from "./index.js";

vi.mock("../../config/crime-idam-config.js");

describe("crime-login", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockSession: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSession = { lng: undefined };
    mockRequest = {
      query: {},
      session: mockSession
    };
    mockResponse = {
      redirect: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
      locals: { locale: "en" }
    };
  });

  describe("GET", () => {
    it("should return 503 when Crime IDAM is not configured", () => {
      // Arrange
      vi.mocked(crimeIdamConfigModule.isCrimeIdamConfigured).mockReturnValue(false);

      // Act
      GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(503);
      expect(mockResponse.send).toHaveBeenCalledWith("Crime IDAM authentication is not available. Please check configuration.");
    });

    it("should redirect to Crime IDAM authorization endpoint", () => {
      // Arrange
      vi.mocked(crimeIdamConfigModule.isCrimeIdamConfigured).mockReturnValue(true);
      vi.mocked(crimeIdamConfigModule.getCrimeIdamConfig).mockReturnValue({
        crimeIdamUrl: "https://idam.crime.hmcts.net",
        clientId: "test-client-id",
        clientSecret: "test-secret",
        redirectUri: "https://example.com/crime-login/return",
        scope: "openid profile roles",
        authorizationEndpoint: "https://idam.crime.hmcts.net/oauth2/authorise",
        tokenEndpoint: "https://idam.crime.hmcts.net/oauth2/token"
      });

      // Act
      GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.redirect).toHaveBeenCalledWith(expect.stringContaining("https://idam.crime.hmcts.net/oauth2/authorise"));
    });

    it("should include correct query parameters in authorization URL", () => {
      // Arrange
      vi.mocked(crimeIdamConfigModule.isCrimeIdamConfigured).mockReturnValue(true);
      vi.mocked(crimeIdamConfigModule.getCrimeIdamConfig).mockReturnValue({
        crimeIdamUrl: "https://idam.crime.hmcts.net",
        clientId: "test-client-id",
        clientSecret: "test-secret",
        redirectUri: "https://example.com/crime-login/return",
        scope: "openid profile roles",
        authorizationEndpoint: "https://idam.crime.hmcts.net/oauth2/authorise",
        tokenEndpoint: "https://idam.crime.hmcts.net/oauth2/token"
      });

      // Act
      GET(mockRequest as Request, mockResponse as Response);

      // Assert
      const redirectUrl = (mockResponse.redirect as any).mock.calls[0][0];
      expect(redirectUrl).toContain("client_id=test-client-id");
      expect(redirectUrl).toContain("response_type=code");
      expect(redirectUrl).toContain("redirect_uri=https%3A%2F%2Fexample.com%2Fcrime-login%2Freturn");
      expect(redirectUrl).toContain("scope=openid+profile+roles");
      expect(redirectUrl).toContain("ui_locales=en");
    });

    it("should store language in session from query parameter", () => {
      // Arrange
      vi.mocked(crimeIdamConfigModule.isCrimeIdamConfigured).mockReturnValue(true);
      vi.mocked(crimeIdamConfigModule.getCrimeIdamConfig).mockReturnValue({
        crimeIdamUrl: "https://idam.crime.hmcts.net",
        clientId: "test-client-id",
        clientSecret: "test-secret",
        redirectUri: "https://example.com/crime-login/return",
        scope: "openid profile roles",
        authorizationEndpoint: "https://idam.crime.hmcts.net/oauth2/authorise",
        tokenEndpoint: "https://idam.crime.hmcts.net/oauth2/token"
      });
      mockRequest.query = { lng: "cy" };

      // Act
      GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockSession.lng).toBe("cy");
    });

    it("should use Welsh locale in authorization URL when lng=cy", () => {
      // Arrange
      vi.mocked(crimeIdamConfigModule.isCrimeIdamConfigured).mockReturnValue(true);
      vi.mocked(crimeIdamConfigModule.getCrimeIdamConfig).mockReturnValue({
        crimeIdamUrl: "https://idam.crime.hmcts.net",
        clientId: "test-client-id",
        clientSecret: "test-secret",
        redirectUri: "https://example.com/crime-login/return",
        scope: "openid profile roles",
        authorizationEndpoint: "https://idam.crime.hmcts.net/oauth2/authorise",
        tokenEndpoint: "https://idam.crime.hmcts.net/oauth2/token"
      });
      mockRequest.query = { lng: "cy" };

      // Act
      GET(mockRequest as Request, mockResponse as Response);

      // Assert
      const redirectUrl = (mockResponse.redirect as any).mock.calls[0][0];
      expect(redirectUrl).toContain("ui_locales=cy");
    });

    it("should use res.locals.locale when no query parameter provided", () => {
      // Arrange
      vi.mocked(crimeIdamConfigModule.isCrimeIdamConfigured).mockReturnValue(true);
      vi.mocked(crimeIdamConfigModule.getCrimeIdamConfig).mockReturnValue({
        crimeIdamUrl: "https://idam.crime.hmcts.net",
        clientId: "test-client-id",
        clientSecret: "test-secret",
        redirectUri: "https://example.com/crime-login/return",
        scope: "openid profile roles",
        authorizationEndpoint: "https://idam.crime.hmcts.net/oauth2/authorise",
        tokenEndpoint: "https://idam.crime.hmcts.net/oauth2/token"
      });
      mockResponse.locals = { locale: "cy" };

      // Act
      GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockSession.lng).toBe("cy");
      const redirectUrl = (mockResponse.redirect as any).mock.calls[0][0];
      expect(redirectUrl).toContain("ui_locales=cy");
    });

    it("should default to English when no locale information available", () => {
      // Arrange
      vi.mocked(crimeIdamConfigModule.isCrimeIdamConfigured).mockReturnValue(true);
      vi.mocked(crimeIdamConfigModule.getCrimeIdamConfig).mockReturnValue({
        crimeIdamUrl: "https://idam.crime.hmcts.net",
        clientId: "test-client-id",
        clientSecret: "test-secret",
        redirectUri: "https://example.com/crime-login/return",
        scope: "openid profile roles",
        authorizationEndpoint: "https://idam.crime.hmcts.net/oauth2/authorise",
        tokenEndpoint: "https://idam.crime.hmcts.net/oauth2/token"
      });
      mockResponse.locals = {};

      // Act
      GET(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockSession.lng).toBe("en");
    });
  });
});
