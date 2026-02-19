import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("config", () => ({
  default: {
    get: vi.fn()
  }
}));

describe("getSsoConfig", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env.BASE_URL;
    delete process.env.SSO_ISSUER_URL;
    delete process.env.SSO_CLIENT_ID;
    delete process.env.SSO_CLIENT_SECRET;
    delete process.env.SSO_SYSTEM_ADMIN_GROUP_ID;
    delete process.env.SSO_INTERNAL_ADMIN_CTSC_GROUP_ID;
    delete process.env.SSO_INTERNAL_ADMIN_LOCAL_GROUP_ID;
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should load configuration from environment variables", async () => {
    process.env.BASE_URL = "https://example.com";
    process.env.SSO_ISSUER_URL = "https://login.microsoftonline.com/tenant/v2.0";
    process.env.SSO_CLIENT_ID = "client-123";
    process.env.SSO_CLIENT_SECRET = "secret-456";
    process.env.SSO_SYSTEM_ADMIN_GROUP_ID = "group-1";
    process.env.SSO_INTERNAL_ADMIN_CTSC_GROUP_ID = "group-2";
    process.env.SSO_INTERNAL_ADMIN_LOCAL_GROUP_ID = "group-3";

    const { getSsoConfig } = await import("./sso-config.js");
    const config = getSsoConfig();

    expect(config).toEqual({
      issuerUrl: "https://login.microsoftonline.com/tenant/v2.0",
      clientId: "client-123",
      clientSecret: "secret-456",
      redirectUri: "https://example.com/sso/return",
      scope: ["openid", "profile", "email"],
      systemAdminGroupId: "group-1",
      internalAdminCtscGroupId: "group-2",
      internalAdminLocalGroupId: "group-3"
    });
  });

  it("should fall back to config module when env vars not set", async () => {
    const config = await import("config");

    vi.mocked(config.default.get).mockImplementation((key: string) => {
      const values: Record<string, string> = {
        BASE_URL: "https://config.example.com",
        SSO_ISSUER_URL: "https://config-login.com/tenant/v2.0",
        SSO_CLIENT_ID: "config-client-123",
        SSO_CLIENT_SECRET: "config-secret-456",
        SSO_SYSTEM_ADMIN_GROUP_ID: "config-group-1",
        SSO_INTERNAL_ADMIN_CTSC_GROUP_ID: "config-group-2",
        SSO_INTERNAL_ADMIN_LOCAL_GROUP_ID: "config-group-3"
      };
      return values[key] || "";
    });

    const { getSsoConfig } = await import("./sso-config.js");
    const ssoConfig = getSsoConfig();

    expect(ssoConfig.issuerUrl).toBe("https://config-login.com/tenant/v2.0");
    expect(ssoConfig.clientId).toBe("config-client-123");
    expect(ssoConfig.clientSecret).toBe("config-secret-456");
    expect(ssoConfig.redirectUri).toBe("https://config.example.com/sso/return");
  });

  it("should use default BASE_URL when not provided", async () => {
    const config = await import("config");

    vi.mocked(config.default.get).mockImplementation(() => {
      throw new Error("Not found");
    });

    const { getSsoConfig } = await import("./sso-config.js");
    const ssoConfig = getSsoConfig();

    expect(ssoConfig.redirectUri).toBe("https://localhost:8080/sso/return");
  });

  it("should prioritize environment variables over config module", async () => {
    process.env.SSO_CLIENT_ID = "env-client-123";

    const config = await import("config");

    vi.mocked(config.default.get).mockImplementation(() => "config-client-456");

    const { getSsoConfig } = await import("./sso-config.js");
    const ssoConfig = getSsoConfig();

    expect(ssoConfig.clientId).toBe("env-client-123");
  });

  it("should return empty string for config that throws error", async () => {
    const config = await import("config");

    vi.mocked(config.default.get).mockImplementation(() => {
      throw new Error("Config not found");
    });

    const { getSsoConfig } = await import("./sso-config.js");
    const ssoConfig = getSsoConfig();

    expect(ssoConfig.issuerUrl).toBe("");
    expect(ssoConfig.clientId).toBe("");
    expect(ssoConfig.clientSecret).toBe("");
  });

  it("should always return expected static values", async () => {
    const { getSsoConfig } = await import("./sso-config.js");
    const ssoConfig = getSsoConfig();

    expect(ssoConfig.scope).toEqual(["openid", "profile", "email"]);
  });
});

describe("isSsoConfigured", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return false when NODE_ENV is development and ENABLE_SSO is not set", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.ENABLE_SSO;

    const { isSsoConfigured } = await import("./sso-config.js");
    expect(isSsoConfigured()).toBe(false);
  });

  it("should return false when issuerUrl is missing", async () => {
    process.env.NODE_ENV = "production";
    process.env.SSO_CLIENT_ID = "client-123";
    process.env.SSO_CLIENT_SECRET = "secret-456";

    const { isSsoConfigured } = await import("./sso-config.js");
    expect(isSsoConfigured()).toBe(false);
  });

  it("should return true when all required config is present", async () => {
    process.env.NODE_ENV = "production";
    process.env.SSO_ISSUER_URL = "https://login.microsoftonline.com/tenant/v2.0";
    process.env.SSO_CLIENT_ID = "client-123";
    process.env.SSO_CLIENT_SECRET = "secret-456";

    const { isSsoConfigured } = await import("./sso-config.js");
    expect(isSsoConfigured()).toBe(true);
  });
});
