import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getB2cAuthorityUrl, getB2cConfig, isB2cConfigured } from "./b2c-config.js";

describe("B2C Configuration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getB2cConfig", () => {
    it("should return B2C configuration from environment variables", () => {
      process.env.BASE_URL = "https://localhost:8080";
      process.env.B2C_TENANT_NAME = "test-tenant";
      process.env.B2C_TENANT_ID = "test-tenant-id";
      process.env.B2C_CLIENT_ID = "test-client-id";
      process.env.B2C_CLIENT_SECRET = "test-secret";
      process.env.B2C_POLICY_HMCTS = "B2C_1A_HMCTS";
      process.env.B2C_POLICY_COMMON_PLATFORM = "B2C_1A_CP";
      process.env.B2C_POLICY_CATH = "B2C_1A_CaTH";

      const config = getB2cConfig();

      expect(config.tenantName).toBe("test-tenant");
      expect(config.tenantId).toBe("test-tenant-id");
      expect(config.clientId).toBe("test-client-id");
      expect(config.clientSecret).toBe("test-secret");
      expect(config.policyHmcts).toBe("B2C_1A_HMCTS");
      expect(config.policyCommonPlatform).toBe("B2C_1A_CP");
      expect(config.policyCath).toBe("B2C_1A_CaTH");
      expect(config.redirectUri).toBe("https://localhost:8080/login/return");
      expect(config.responseType).toBe("code");
      expect(config.responseMode).toBe("query");
      expect(config.scope).toEqual(["openid"]);
    });

    it("should use default policy names if not provided", () => {
      process.env.B2C_TENANT_NAME = "test-tenant";
      process.env.B2C_CLIENT_ID = "test-client-id";
      process.env.B2C_CLIENT_SECRET = "test-secret";

      const config = getB2cConfig();

      expect(config.policyHmcts).toBe("B2C_1_SignInUserFlow");
      expect(config.policyCommonPlatform).toBe("B2C_1_SignInUserFlow");
      expect(config.policyCath).toBe("B2C_1_SignInUserFlow");
    });
  });

  describe("isB2cConfigured", () => {
    it("should return true when B2C is fully configured", () => {
      process.env.B2C_TENANT_NAME = "test-tenant";
      process.env.B2C_CLIENT_ID = "test-client-id";
      process.env.B2C_CLIENT_SECRET = "test-secret";

      expect(isB2cConfigured()).toBe(true);
    });

    it("should return false when B2C is not configured", () => {
      delete process.env.B2C_TENANT_NAME;
      delete process.env.B2C_CLIENT_ID;
      delete process.env.B2C_CLIENT_SECRET;

      expect(isB2cConfigured()).toBe(false);
    });

    it("should return false in development mode without ENABLE_B2C", () => {
      process.env.NODE_ENV = "development";
      process.env.B2C_TENANT_NAME = "test-tenant";
      process.env.B2C_CLIENT_ID = "test-client-id";
      process.env.B2C_CLIENT_SECRET = "test-secret";
      delete process.env.ENABLE_B2C;

      expect(isB2cConfigured()).toBe(false);
    });

    it("should return true in development mode with ENABLE_B2C", () => {
      process.env.NODE_ENV = "development";
      process.env.ENABLE_B2C = "true";
      process.env.B2C_TENANT_NAME = "test-tenant";
      process.env.B2C_CLIENT_ID = "test-client-id";
      process.env.B2C_CLIENT_SECRET = "test-secret";

      expect(isB2cConfigured()).toBe(true);
    });
  });

  describe("getB2cAuthorityUrl", () => {
    beforeEach(() => {
      process.env.B2C_TENANT_NAME = "test-tenant";
      process.env.B2C_POLICY_HMCTS = "B2C_1A_HMCTS";
      process.env.B2C_POLICY_COMMON_PLATFORM = "B2C_1A_CP";
      process.env.B2C_POLICY_CATH = "B2C_1A_CaTH";
    });

    it("should return correct authority URL for HMCTS", () => {
      const url = getB2cAuthorityUrl("hmcts");
      expect(url).toBe("https://test-tenant.b2clogin.com/test-tenant.onmicrosoft.com/B2C_1A_HMCTS");
    });

    it("should return correct authority URL for Common Platform", () => {
      const url = getB2cAuthorityUrl("common-platform");
      expect(url).toBe("https://test-tenant.b2clogin.com/test-tenant.onmicrosoft.com/B2C_1A_CP");
    });

    it("should return correct authority URL for CaTH", () => {
      const url = getB2cAuthorityUrl("cath");
      expect(url).toBe("https://test-tenant.b2clogin.com/test-tenant.onmicrosoft.com/B2C_1A_CaTH");
    });
  });
});
