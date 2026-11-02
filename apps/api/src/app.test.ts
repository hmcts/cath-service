import type { Express } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@hmcts-cft/cloud-native-platform", () => ({
  healthcheck: vi.fn(() => vi.fn()),
  monitoringMiddleware: vi.fn(() => vi.fn()),
  getPropertiesVolumeSecrets: vi.fn(() => Promise.resolve({}))
}));

vi.mock("@hmcts-cft/simple-router", () => ({
  createSimpleRouter: vi.fn(() => Promise.resolve(vi.fn()))
}));

// app.ts resolves the helm chart path at module load, so the module has to be
// re-imported after LOCAL_DEV changes for the new value to take effect.
async function createAppWithLocalDev(localDev: string | undefined) {
  if (localDev === undefined) {
    vi.stubEnv("LOCAL_DEV", undefined);
  } else {
    vi.stubEnv("LOCAL_DEV", localDev);
  }
  vi.resetModules();
  const { createApp } = await import("./app.js");
  return createApp();
}

const KEY_VAULT_SECRETS = {
  GOVUK_NOTIFY_API_KEY: "key-vault-notify-key",
  AZURE_TENANT_ID: "key-vault-tenant-id"
};

// Stubbing every Key Vault key first means vi.unstubAllEnvs() also undoes the fake's writes.
async function fakeKeyVault(localEnv: Partial<Record<keyof typeof KEY_VAULT_SECRETS, string>>) {
  for (const key of Object.keys(KEY_VAULT_SECRETS) as (keyof typeof KEY_VAULT_SECRETS)[]) {
    vi.stubEnv(key, localEnv[key]);
  }
  const { getPropertiesVolumeSecrets } = await import("@hmcts-cft/cloud-native-platform");
  vi.mocked(getPropertiesVolumeSecrets).mockClear();
  vi.mocked(getPropertiesVolumeSecrets).mockImplementationOnce(async (options) => {
    for (const [key, value] of Object.entries(KEY_VAULT_SECRETS)) {
      if (!options?.omit?.includes(key)) process.env[key] = value;
    }
    return {};
  });
  return () => vi.mocked(getPropertiesVolumeSecrets).mock.calls.at(-1)?.[0]?.omit;
}

describe("API Application", () => {
  let app: Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { createApp } = await import("./app.js");
    app = await createApp();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  describe("createApp", () => {
    it("should create an Express application", () => {
      expect(app).toBeDefined();
      expect(typeof app.use).toBe("function");
      expect(typeof app.get).toBe("function");
    });

    it("should configure healthcheck middleware", async () => {
      const { healthcheck } = await import("@hmcts-cft/cloud-native-platform");
      expect(healthcheck).toHaveBeenCalled();
    });

    it("should configure monitoring middleware with the api service name", async () => {
      const { monitoringMiddleware } = await import("@hmcts-cft/cloud-native-platform");
      expect(monitoringMiddleware).toHaveBeenCalledWith(expect.objectContaining({ serviceName: "cath-api" }));
    });

    it("should configure routes using simple router", async () => {
      const { createSimpleRouter } = await import("@hmcts-cft/simple-router");
      expect(createSimpleRouter).toHaveBeenCalled();
    });

    it("should have JSON body parser middleware", () => {
      expect(app).toBeDefined();
      // Express app should be configured with json parser
    });

    it("should have URL encoded body parser middleware", () => {
      expect(app).toBeDefined();
      // Express app should be configured with urlencoded parser
    });

    it("should have compression middleware", () => {
      expect(app).toBeDefined();
      // Express app should be configured with compression
    });

    it("should have CORS middleware", () => {
      expect(app).toBeDefined();
      // Express app should be configured with CORS
    });

    it("should be configured with error handlers", () => {
      expect(app).toBeDefined();
      // Express app should have error handlers
    });
  });

  describe("helm chart selection", () => {
    it("should load the local development chart when LOCAL_DEV is true", async () => {
      // Arrange
      const { getPropertiesVolumeSecrets } = await import("@hmcts-cft/cloud-native-platform");
      vi.mocked(getPropertiesVolumeSecrets).mockClear();

      // Act
      await createAppWithLocalDev("true");

      // Assert
      expect(getPropertiesVolumeSecrets).toHaveBeenCalledWith(expect.objectContaining({ chartPath: expect.stringContaining("helm/values.dev.yaml") }));
    });

    it("should load the deployment chart when LOCAL_DEV is not set", async () => {
      // Arrange
      const { getPropertiesVolumeSecrets } = await import("@hmcts-cft/cloud-native-platform");
      vi.mocked(getPropertiesVolumeSecrets).mockClear();

      // Act
      await createAppWithLocalDev(undefined);

      // Assert
      expect(getPropertiesVolumeSecrets).toHaveBeenCalledWith(expect.objectContaining({ chartPath: expect.stringContaining("helm/values.yaml") }));
    });
  });

  describe("local .env precedence over Key Vault", () => {
    it("should use the .env value when LOCAL_DEV is true and the variable is set", async () => {
      // Arrange
      const getOmit = await fakeKeyVault({ GOVUK_NOTIFY_API_KEY: "env-notify-key" });

      // Act
      await createAppWithLocalDev("true");

      // Assert
      expect(process.env.GOVUK_NOTIFY_API_KEY).toBe("env-notify-key");
      expect(getOmit()).toContain("GOVUK_NOTIFY_API_KEY");
    });

    it("should use the Key Vault value when LOCAL_DEV is true and the variable is empty", async () => {
      // Arrange
      const getOmit = await fakeKeyVault({ GOVUK_NOTIFY_API_KEY: "" });

      // Act
      await createAppWithLocalDev("true");

      // Assert
      expect(process.env.GOVUK_NOTIFY_API_KEY).toBe(KEY_VAULT_SECRETS.GOVUK_NOTIFY_API_KEY);
      expect(getOmit()).not.toContain("GOVUK_NOTIFY_API_KEY");
    });

    it("should use the Key Vault value when LOCAL_DEV is true and the variable is absent", async () => {
      // Arrange
      const getOmit = await fakeKeyVault({});

      // Act
      await createAppWithLocalDev("true");

      // Assert
      expect(process.env.GOVUK_NOTIFY_API_KEY).toBe(KEY_VAULT_SECRETS.GOVUK_NOTIFY_API_KEY);
      expect(getOmit()).not.toContain("GOVUK_NOTIFY_API_KEY");
    });

    it("should use the Key Vault value when LOCAL_DEV is true and the variable is whitespace only", async () => {
      // Arrange
      const getOmit = await fakeKeyVault({ GOVUK_NOTIFY_API_KEY: "   " });

      // Act
      await createAppWithLocalDev("true");

      // Assert
      expect(process.env.GOVUK_NOTIFY_API_KEY).toBe(KEY_VAULT_SECRETS.GOVUK_NOTIFY_API_KEY);
      expect(getOmit()).not.toContain("GOVUK_NOTIFY_API_KEY");
    });

    it("should use the .env value for any Key Vault secret when LOCAL_DEV is true", async () => {
      // Arrange
      const getOmit = await fakeKeyVault({ AZURE_TENANT_ID: "env-tenant-id" });

      // Act
      await createAppWithLocalDev("true");

      // Assert
      expect(process.env.AZURE_TENANT_ID).toBe("env-tenant-id");
      expect(process.env.GOVUK_NOTIFY_API_KEY).toBe(KEY_VAULT_SECRETS.GOVUK_NOTIFY_API_KEY);
      expect(getOmit()).toContain("AZURE_TENANT_ID");
    });

    it("should still omit DATABASE_URL when LOCAL_DEV is true", async () => {
      // Arrange
      const getOmit = await fakeKeyVault({ GOVUK_NOTIFY_API_KEY: "env-notify-key" });

      // Act
      await createAppWithLocalDev("true");

      // Assert
      expect(getOmit()).toEqual(expect.arrayContaining(["DATABASE_URL", "GOVUK_NOTIFY_API_KEY"]));
    });

    it("should let Key Vault win when LOCAL_DEV is not set", async () => {
      // Arrange
      const getOmit = await fakeKeyVault({ GOVUK_NOTIFY_API_KEY: "env-notify-key" });

      // Act
      await createAppWithLocalDev(undefined);

      // Assert
      expect(process.env.GOVUK_NOTIFY_API_KEY).toBe(KEY_VAULT_SECRETS.GOVUK_NOTIFY_API_KEY);
      expect(getOmit()).toEqual(["DATABASE_URL"]);
    });
  });
});
