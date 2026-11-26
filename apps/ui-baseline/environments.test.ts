import { DefaultAzureCredential } from "@azure/identity";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type AppConfig, type Environment, filesStorage, loadEnvironment, runsStorage } from "./environments.js";

const { getSecret, secretClient } = vi.hoisted(() => ({ getSecret: vi.fn(), secretClient: vi.fn() }));

vi.mock("@azure/identity", () => ({ DefaultAzureCredential: vi.fn() }));
vi.mock("@azure/keyvault-secrets", () => ({
  SecretClient: vi.fn(function SecretClient(this: unknown, url: string) {
    secretClient(url);
    return { getSecret };
  })
}));

const STORAGE_OVERRIDES = [
  "CATH_STORAGE_CONNECTION_STRING",
  "PIP_STORAGE_CONNECTION_STRING",
  "FROM_ENV_CONNECTION",
  "SOME_SECRET",
  "UI_BASELINE_ENV",
  "UI_BASELINE_CATH_URL",
  "UI_BASELINE_CATH_API_URL"
];

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
      const environment = await loadEnvironment("aat");

      // Assert
      expect(environment.name).toBe("aat");
      expect(environment.cath.baseUrl).toBe("https://cath.aat.platform.hmcts.net");
      expect(environment.pip.keyVault).toBe("pip-ss-kv-test");
      expect(typeof environment.secret).toBe("function");
    });

    it("should use UI_BASELINE_ENV when no name is given", async () => {
      // Arrange
      vi.stubEnv("UI_BASELINE_ENV", "aat");

      // Act
      const environment = await loadEnvironment();

      // Assert
      expect(environment.name).toBe("aat");
    });

    it("should default to local when no name or UI_BASELINE_ENV is given", async () => {
      // Act
      const environment = await loadEnvironment();

      // Assert
      expect(environment.name).toBe("local");
    });

    it("should list the known environments, without $-keys, when the name is unknown", async () => {
      // Act and assert
      await expect(loadEnvironment("staging")).rejects.toThrow('no environment "staging" in environments.json (one of: local, aat, preview)');
    });

    it("should refuse a $-key as an environment name", async () => {
      // Act and assert
      await expect(loadEnvironment("$comment")).rejects.toThrow('no environment "$comment"');
    });

    it("should take preview from aat, but for where CaTH is and where runs are kept", async () => {
      // Arrange
      vi.stubEnv("UI_BASELINE_CATH_URL", "https://cath-service-pr-1250-web.preview.platform.hmcts.net");
      vi.stubEnv("UI_BASELINE_CATH_API_URL", "https://cath-service-pr-1250-api.preview.platform.hmcts.net");
      const aat = await loadEnvironment("aat");

      // Act
      const preview = await loadEnvironment("preview");

      // Assert
      expect(preview.cath).toEqual({
        ...aat.cath,
        baseUrl: "https://cath-service-pr-1250-web.preview.platform.hmcts.net",
        apiUrl: "https://cath-service-pr-1250-api.preview.platform.hmcts.net"
      });
      expect(preview.pip).toEqual(aat.pip);
      expect(preview.runs).toEqual({ accountNameEnv: "UI_BASELINE_RUNS_ACCOUNT_NAME", accountKeyEnv: "UI_BASELINE_RUNS_ACCOUNT_KEY" });
      expect(aat.runs).toBeUndefined();
    });

    it("should say which variable is missing when preview cannot tell where CaTH is", async () => {
      // Arrange
      vi.stubEnv("UI_BASELINE_CATH_URL", undefined);

      // Act and assert
      await expect(loadEnvironment("preview")).rejects.toThrow('environment "preview" reads where CaTH is from UI_BASELINE_CATH_URL, which is not set');
    });
  });

  describe("runsStorage", () => {
    const withRuns = (runs?: Environment["runs"]) => ({ runs }) as Environment;

    it("should be null when the environment keeps runs beside its baselines", () => {
      // Act and assert
      expect(runsStorage(withRuns(), "ui-baseline")).toBeNull();
    });

    it("should say which variables to set when the account's name or key is missing", () => {
      // Arrange
      vi.stubEnv("RUNS_NAME", "cathpr1250");
      vi.stubEnv("RUNS_KEY", undefined);

      // Act and assert
      expect(() => runsStorage(withRuns({ accountNameEnv: "RUNS_NAME", accountKeyEnv: "RUNS_KEY" }), "ui-baseline")).toThrow(
        "no storage for runs: set RUNS_NAME and RUNS_KEY"
      );
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
      const environment = await loadEnvironment("aat");

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
      const environment = await loadEnvironment("aat");

      // Act
      const first = await environment.secret(environment.cath, "some-secret");
      const second = await environment.secret(environment.cath, "other-secret");

      // Assert
      expect(first).toBe("from-vault");
      expect(second).toBe("from-vault");
      expect(secretClient).toHaveBeenCalledTimes(1);
      expect(secretClient).toHaveBeenCalledWith("https://cath-aat.vault.azure.net");
      expect(getSecret).toHaveBeenCalledWith("other-secret");
    });

    it("should read vaults as the pod's managed identity when MANAGED_IDENTITY_CLIENT_ID is set", async () => {
      // Arrange
      vi.stubEnv("MANAGED_IDENTITY_CLIENT_ID", "client-id-123");
      getSecret.mockResolvedValue({ value: "from-vault" });

      // Act
      const environment = await loadEnvironment("aat");
      await environment.secret(environment.cath, "some-secret");

      // Assert
      expect(DefaultAzureCredential).toHaveBeenCalledWith({ managedIdentityClientId: "client-id-123" });
      vi.unstubAllEnvs();
    });

    it("should give null when the vault's secret has no value", async () => {
      // Arrange
      getSecret.mockResolvedValue({});
      const environment = await loadEnvironment("aat");

      // Act
      const value = await environment.secret(environment.pip, "some-secret");

      // Assert
      expect(value).toBeNull();
    });

    it("should give null when the vault does not have the secret", async () => {
      // Arrange
      getSecret.mockRejectedValue(Object.assign(new Error("not found"), { statusCode: 404 }));
      const environment = await loadEnvironment("aat");

      // Act
      const value = await environment.secret(environment.cath, "some-secret");

      // Assert
      expect(value).toBeNull();
    });

    it("should rethrow any other vault error", async () => {
      // Arrange
      getSecret.mockRejectedValue(Object.assign(new Error("forbidden"), { statusCode: 403 }));
      const environment = await loadEnvironment("aat");

      // Act and assert
      await expect(environment.secret(environment.cath, "some-secret")).rejects.toThrow("forbidden");
    });
  });
});
