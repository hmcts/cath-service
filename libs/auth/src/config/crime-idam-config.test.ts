import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCrimeIdamConfig, isCrimeIdamConfigured } from "./crime-idam-config.js";

describe("crime-idam-config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getCrimeIdamConfig", () => {
    it("should return configuration from environment variables", () => {
      // Arrange
      process.env.CRIME_IDAM_BASE_URL = "https://idam.crime.hmcts.net";
      process.env.CRIME_IDAM_CLIENT_ID = "test-client-id";
      process.env.CRIME_IDAM_CLIENT_SECRET = "test-secret";
      process.env.BASE_URL = "https://example.com";
      process.env.CRIME_IDAM_SCOPE = "openid profile roles";

      // Act
      const config = getCrimeIdamConfig();

      // Assert
      expect(config).toEqual({
        crimeIdamUrl: "https://idam.crime.hmcts.net",
        clientId: "test-client-id",
        clientSecret: "test-secret",
        redirectUri: "https://example.com/crime-login/return",
        scope: "openid profile roles",
        authorizationEndpoint: "https://idam.crime.hmcts.net/oauth2/authorise",
        tokenEndpoint: "https://idam.crime.hmcts.net/oauth2/token"
      });
    });

    it("should use default scope when CRIME_IDAM_SCOPE not provided", () => {
      // Arrange
      process.env.CRIME_IDAM_BASE_URL = "https://idam.crime.hmcts.net";
      process.env.CRIME_IDAM_CLIENT_ID = "test-client-id";
      process.env.CRIME_IDAM_CLIENT_SECRET = "test-secret";
      delete process.env.CRIME_IDAM_SCOPE;

      // Act
      const config = getCrimeIdamConfig();

      // Assert
      expect(config.scope).toBe("openid profile roles");
    });

    it("should use default BASE_URL when not provided", () => {
      // Arrange
      process.env.CRIME_IDAM_BASE_URL = "https://idam.crime.hmcts.net";
      delete process.env.BASE_URL;

      // Act
      const config = getCrimeIdamConfig();

      // Assert
      expect(config.redirectUri).toBe("https://localhost:8080/crime-login/return");
    });

    it("should construct correct endpoint URLs", () => {
      // Arrange
      process.env.CRIME_IDAM_BASE_URL = "https://idam.crime.hmcts.net";

      // Act
      const config = getCrimeIdamConfig();

      // Assert
      expect(config.authorizationEndpoint).toBe("https://idam.crime.hmcts.net/oauth2/authorise");
      expect(config.tokenEndpoint).toBe("https://idam.crime.hmcts.net/oauth2/token");
    });
  });

  describe("isCrimeIdamConfigured", () => {
    it("should return false in development without ENABLE_CRIME_IDAM", () => {
      // Arrange
      process.env.NODE_ENV = "development";
      process.env.CRIME_IDAM_BASE_URL = "https://idam.crime.hmcts.net";
      process.env.CRIME_IDAM_CLIENT_ID = "test-client-id";
      process.env.CRIME_IDAM_CLIENT_SECRET = "test-secret";
      delete process.env.ENABLE_CRIME_IDAM;

      // Act
      const result = isCrimeIdamConfigured();

      // Assert
      expect(result).toBe(false);
    });

    it("should return true in development with ENABLE_CRIME_IDAM=true", () => {
      // Arrange
      process.env.NODE_ENV = "development";
      process.env.ENABLE_CRIME_IDAM = "true";
      process.env.CRIME_IDAM_BASE_URL = "https://idam.crime.hmcts.net";
      process.env.CRIME_IDAM_CLIENT_ID = "test-client-id";
      process.env.CRIME_IDAM_CLIENT_SECRET = "test-secret";

      // Act
      const result = isCrimeIdamConfigured();

      // Assert
      expect(result).toBe(true);
    });

    it("should return true in production with all required config", () => {
      // Arrange
      process.env.NODE_ENV = "production";
      process.env.CRIME_IDAM_BASE_URL = "https://idam.crime.hmcts.net";
      process.env.CRIME_IDAM_CLIENT_ID = "test-client-id";
      process.env.CRIME_IDAM_CLIENT_SECRET = "test-secret";

      // Act
      const result = isCrimeIdamConfigured();

      // Assert
      expect(result).toBe(true);
    });

    it("should return false when CRIME_IDAM_BASE_URL is missing", () => {
      // Arrange
      process.env.NODE_ENV = "production";
      delete process.env.CRIME_IDAM_BASE_URL;
      process.env.CRIME_IDAM_CLIENT_ID = "test-client-id";
      process.env.CRIME_IDAM_CLIENT_SECRET = "test-secret";

      // Act
      const result = isCrimeIdamConfigured();

      // Assert
      expect(result).toBe(false);
    });

    it("should return false when CRIME_IDAM_CLIENT_ID is missing", () => {
      // Arrange
      process.env.NODE_ENV = "production";
      process.env.CRIME_IDAM_BASE_URL = "https://idam.crime.hmcts.net";
      delete process.env.CRIME_IDAM_CLIENT_ID;
      process.env.CRIME_IDAM_CLIENT_SECRET = "test-secret";

      // Act
      const result = isCrimeIdamConfigured();

      // Assert
      expect(result).toBe(false);
    });

    it("should return false when CRIME_IDAM_CLIENT_SECRET is missing", () => {
      // Arrange
      process.env.NODE_ENV = "production";
      process.env.CRIME_IDAM_BASE_URL = "https://idam.crime.hmcts.net";
      process.env.CRIME_IDAM_CLIENT_ID = "test-client-id";
      delete process.env.CRIME_IDAM_CLIENT_SECRET;

      // Act
      const result = isCrimeIdamConfigured();

      // Assert
      expect(result).toBe(false);
    });
  });
});
