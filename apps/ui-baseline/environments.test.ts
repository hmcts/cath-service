import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type AppConfig, filesStorage, loadEnvironment } from "./environments.js";

const { getSecret, secretClient } = vi.hoisted(() => ({ getSecret: vi.fn(), secretClient: vi.fn() }));

vi.mock("@azure/identity", () => ({ DefaultAzureCredential: vi.fn() }));
vi.mock("@azure/keyvault-secrets", () => ({
  SecretClient: vi.fn(function SecretClient(this: unknown, url: string) {
    secretClient(url);
    return { getSecret };
  })
}));

const STORAGE_OVERRIDES = ["CATH_STORAGE_CONNECTION_STRING", "PIP_STORAGE_CONNECTION_STRING", "FROM_ENV_CONNECTION", "SOME_SECRET", "UI_BASELINE_ENV"];

describe("environments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const name of STORAGE_OVERRIDES) vi.stubEnv(name, undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("loadEnvironment", () => {
    it("should load the named environment from environments.json", async () => {
      // Act
      const environment = await loadEnvironment("test");

      // Assert
      expect(environment.name).toBe("test");
      expect(environment.cath.baseUrl).toBe("https://cath.perftest.platform.hmcts.net");
      expect(environment.pip.keyVault).toBe("pip-ss-kv-test");
      expect(typeof environment.secret).toBe("function");
    });

    it("should use UI_BASELINE_ENV when no name is given", async () => {
      // Arrange
      vi.stubEnv("UI_BASELINE_ENV", "test");

      // Act
      const environment = await loadEnvironment();

      // Assert
      expect(environment.name).toBe("test");
    });

    it("should default to local when no name or UI_BASELINE_ENV is given", async () => {
      // Act
      const environment = await loadEnvironment();

      // Assert
      expect(environment.name).toBe("local");
    });

    it("should list the known environments, without $-keys, when the name is unknown", async () => {
      // Act and assert
      await expect(loadEnvironment("staging")).rejects.toThrow('no environment "staging" in environments.json (one of: local, test)');
    });

    it("should refuse a $-key as an environment name", async () => {
      // Act and assert
      await expect(loadEnvironment("$comment")).rejects.toThrow('no environment "$comment"');
    });
  });

  describe("filesStorage", () => {
    const config = (storage: AppConfig["storage"]): AppConfig => ({ storage });

    it("should prefer the override environment variable over everything else", () => {
      // Arrange
      vi.stubEnv("PIP_STORAGE_CONNECTION_STRING", "override");
      vi.stubEnv("FROM_ENV_CONNECTION", "from-env");

      // Act
      const storage = filesStorage("pip", config({ connectionString: "configured", connectionStringEnv: "FROM_ENV_CONNECTION", accountName: "account" }));

      // Assert
      expect(storage).toEqual({ connectionString: "override", accountName: "account", container: "publications" });
    });

    it("should use the configured connection string over the one named in connectionStringEnv", () => {
      // Arrange
      vi.stubEnv("FROM_ENV_CONNECTION", "from-env");

      // Act
      const storage = filesStorage("cath", config({ connectionString: "configured", connectionStringEnv: "FROM_ENV_CONNECTION" }), "ui-baseline");

      // Assert
      expect(storage).toEqual({ connectionString: "configured", accountName: undefined, container: "ui-baseline" });
    });

    it("should read the connection string from the variable connectionStringEnv names", () => {
      // Arrange
      vi.stubEnv("FROM_ENV_CONNECTION", "from-env");

      // Act
      const storage = filesStorage("cath", config({ connectionStringEnv: "FROM_ENV_CONNECTION" }));

      // Assert
      expect(storage.connectionString).toBe("from-env");
    });

    it("should fall back to the account name when there is no connection string", () => {
      // Act
      const storage = filesStorage("pip", config({ accountName: "pipsssatest" }));

      // Assert
      expect(storage).toEqual({ connectionString: undefined, accountName: "pipsssatest", container: "publications" });
    });

    it("should name the connectionStringEnv variable when there is no storage at all", () => {
      // Act and assert
      expect(() => filesStorage("cath", config({ connectionStringEnv: "FROM_ENV_CONNECTION" }))).toThrow("no storage for cath: set FROM_ENV_CONNECTION");
    });

    it("should name the override variable when there is no storage and no connectionStringEnv", () => {
      // Act and assert
      expect(() => filesStorage("pip", config({}))).toThrow("no storage for pip: set PIP_STORAGE_CONNECTION_STRING");
    });
  });

  describe("secret", () => {
    it("should take the secret from an environment variable in upper snake case before the vault", async () => {
      // Arrange
      vi.stubEnv("SOME_SECRET", "from-env");
      const environment = await loadEnvironment("test");

      // Act
      const value = await environment.secret(environment.cath, "some-secret");

      // Assert
      expect(value).toBe("from-env");
      expect(getSecret).not.toHaveBeenCalled();
    });

    it("should give null when the app has no vault and no environment variable is set", async () => {
      // Arrange
      const environment = await loadEnvironment("local");

      // Act
      const value = await environment.secret(environment.cath, "some-secret");

      // Assert
      expect(value).toBeNull();
    });

    it("should read the secret from the app's vault, reusing one client per vault", async () => {
      // Arrange
      getSecret.mockResolvedValue({ value: "from-vault" });
      const environment = await loadEnvironment("test");

      // Act
      const first = await environment.secret(environment.cath, "some-secret");
      const second = await environment.secret(environment.cath, "other-secret");

      // Assert
      expect(first).toBe("from-vault");
      expect(second).toBe("from-vault");
      expect(secretClient).toHaveBeenCalledTimes(1);
      expect(secretClient).toHaveBeenCalledWith("https://cath-perftest.vault.azure.net");
      expect(getSecret).toHaveBeenCalledWith("other-secret");
    });

    it("should give null when the vault's secret has no value", async () => {
      // Arrange
      getSecret.mockResolvedValue({});
      const environment = await loadEnvironment("test");

      // Act
      const value = await environment.secret(environment.pip, "some-secret");

      // Assert
      expect(value).toBeNull();
    });

    it("should give null when the vault does not have the secret", async () => {
      // Arrange
      getSecret.mockRejectedValue(Object.assign(new Error("not found"), { statusCode: 404 }));
      const environment = await loadEnvironment("test");

      // Act
      const value = await environment.secret(environment.cath, "some-secret");

      // Assert
      expect(value).toBeNull();
    });

    it("should rethrow any other vault error", async () => {
      // Arrange
      getSecret.mockRejectedValue(Object.assign(new Error("forbidden"), { statusCode: 403 }));
      const environment = await loadEnvironment("test");

      // Act and assert
      await expect(environment.secret(environment.cath, "some-secret")).rejects.toThrow("forbidden");
    });
  });
});
