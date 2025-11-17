import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCftIdamConfig, isCftIdamConfigured } from "./cft-idam-config.js";

vi.mock("config", () => ({
  default: {
    get: vi.fn()
  }
}));

describe("CFT IDAM Configuration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.CFT_IDAM_URL;
    delete process.env.CFT_IDAM_CLIENT_SECRET;
    delete process.env.BASE_URL;
    delete process.env.ENABLE_CFT_IDAM;
  });

  describe("getCftIdamConfig", () => {
    it("should return configuration from environment variables", () => {
      process.env.CFT_IDAM_URL = "https://idam-web-public.aat.platform.hmcts.net";
      process.env.CFT_IDAM_CLIENT_SECRET = "test-secret";
      process.env.BASE_URL = "https://example.com";

      const config = getCftIdamConfig();

      expect(config).toEqual({
        cftIdamUrl: "https://idam-web-public.aat.platform.hmcts.net",
        clientId: "app-pip-frontend",
        clientSecret: "test-secret",
        redirectUri: "https://example.com/cft-login/return",
        authorizationEndpoint: "https://idam-web-public.aat.platform.hmcts.net",
        tokenEndpoint: "https://idam-web-public.aat.platform.hmcts.net/o/token"
      });
    });

    it("should use default BASE_URL when not provided", () => {
      process.env.CFT_IDAM_URL = "https://idam-web-public.aat.platform.hmcts.net";

      const config = getCftIdamConfig();

      expect(config.redirectUri).toBe("https://localhost:8080/cft-login/return");
    });

    it("should construct correct endpoint URLs", () => {
      process.env.CFT_IDAM_URL = "https://idam.example.com";

      const config = getCftIdamConfig();

      expect(config.authorizationEndpoint).toBe("https://idam.example.com");
      expect(config.tokenEndpoint).toBe("https://idam.example.com/o/token");
    });
  });

  describe("isCftIdamConfigured", () => {
    it("should return false in development without ENABLE_CFT_IDAM flag", () => {
      process.env.NODE_ENV = "development";
      process.env.CFT_IDAM_URL = "https://idam.example.com";
      process.env.CFT_IDAM_CLIENT_SECRET = "secret";

      expect(isCftIdamConfigured()).toBe(false);
    });

    it("should return true in development with ENABLE_CFT_IDAM flag", () => {
      process.env.NODE_ENV = "development";
      process.env.ENABLE_CFT_IDAM = "true";
      process.env.CFT_IDAM_URL = "https://idam.example.com";
      process.env.CFT_IDAM_CLIENT_SECRET = "secret";

      expect(isCftIdamConfigured()).toBe(true);
    });

    it("should return true when all required config is present", () => {
      process.env.NODE_ENV = "production";
      process.env.CFT_IDAM_URL = "https://idam.example.com";
      process.env.CFT_IDAM_CLIENT_SECRET = "secret";

      expect(isCftIdamConfigured()).toBe(true);
    });

    it("should return false when CFT_IDAM_URL is missing", () => {
      process.env.NODE_ENV = "production";
      process.env.CFT_IDAM_CLIENT_SECRET = "secret";

      expect(isCftIdamConfigured()).toBe(false);
    });

    it("should return false when CFT_IDAM_CLIENT_SECRET is missing", () => {
      process.env.NODE_ENV = "production";
      process.env.CFT_IDAM_URL = "https://idam.example.com";

      expect(isCftIdamConfigured()).toBe(false);
    });
  });
});
