import { readFileSync } from "node:fs";
import { load as yamlLoad } from "js-yaml";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addFromAzureVault } from "./azure-vault.js";

// Create the mock getSecret function that will be shared across tests
const mockGetSecret = vi.fn();

// Mock all external dependencies using class syntax for Vitest 4 constructor mocks
vi.mock("@azure/identity", () => ({
  AzureCliCredential: class MockAzureCliCredential {},
  DefaultAzureCredential: class MockDefaultAzureCredential {}
}));

vi.mock("@azure/keyvault-secrets", () => {
  return {
    SecretClient: class MockSecretClient {
      getSecret = mockGetSecret;
    }
  };
});

vi.mock("node:fs", () => ({
  readFileSync: vi.fn()
}));

vi.mock("js-yaml", () => ({
  load: vi.fn()
}));

const mockReadFileSync = vi.mocked(readFileSync);
const mockYamlLoad = vi.mocked(yamlLoad);

describe("addFromAzureVault", () => {
  let config: Record<string, any>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();

    config = { existing: "value" };
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it("should load secrets from Azure Key Vault", async () => {
    const helmChart = {
      keyVaults: {
        "test-vault": {
          secrets: ["secret1", { name: "secret2", alias: "custom-alias" }]
        }
      }
    };

    mockReadFileSync.mockReturnValue("helm-chart-content");
    mockYamlLoad.mockReturnValue(helmChart);
    mockGetSecret.mockResolvedValueOnce({ value: "secret-value-1" }).mockResolvedValueOnce({ value: "secret-value-2" });

    await addFromAzureVault(config, { pathToHelmChart: "/path/to/chart.yaml" });

    expect(mockReadFileSync).toHaveBeenCalledWith("/path/to/chart.yaml", "utf8");
    expect(mockYamlLoad).toHaveBeenCalledWith("helm-chart-content");
    expect(mockGetSecret).toHaveBeenCalledWith("secret1");
    expect(mockGetSecret).toHaveBeenCalledWith("secret2");

    expect(config).toEqual({
      existing: "value",
      secret1: "secret-value-1",
      "custom-alias": "secret-value-2"
    });
  });

  it("should handle multiple vaults", async () => {
    const helmChart = {
      keyVaults: {
        vault1: {
          secrets: ["secret1"]
        },
        vault2: {
          secrets: ["secret2"]
        }
      }
    };

    mockReadFileSync.mockReturnValue("helm-chart-content");
    mockYamlLoad.mockReturnValue(helmChart);
    mockGetSecret.mockResolvedValueOnce({ value: "value1" }).mockResolvedValueOnce({ value: "value2" });

    await addFromAzureVault(config, { pathToHelmChart: "/path/to/chart.yaml" });

    expect(config).toEqual({
      existing: "value",
      secret1: "value1",
      secret2: "value2"
    });
  });

  it("should warn when no keyVaults found in Helm chart", async () => {
    const helmChart = { other: "config" };

    mockReadFileSync.mockReturnValue("helm-chart-content");
    mockYamlLoad.mockReturnValue(helmChart);

    await addFromAzureVault(config, { pathToHelmChart: "/path/to/chart.yaml" });

    expect(consoleWarnSpy).toHaveBeenCalledWith("Azure Vault: No keyVaults found in Helm chart");
    expect(config).toEqual({ existing: "value" });
  });

  it("should warn for invalid vault configuration", async () => {
    const helmChart = {
      keyVaults: {
        "valid-vault": { secrets: ["secret1"] },
        "incomplete-vault": {} // Missing secrets
      }
    };

    mockReadFileSync.mockReturnValue("helm-chart-content");
    mockYamlLoad.mockReturnValue(helmChart);
    mockGetSecret.mockResolvedValue({ value: "value1" });

    await addFromAzureVault(config, { pathToHelmChart: "/path/to/chart.yaml" });

    expect(consoleWarnSpy).toHaveBeenCalledWith("Azure Vault: Invalid vault configuration, missing name or secrets");
    expect(config).toEqual({
      existing: "value",
      secret1: "value1"
    });
  });

  it("should warn when secret retrieval fails", async () => {
    const helmChart = {
      keyVaults: {
        "test-vault": {
          secrets: ["failing-secret"]
        }
      }
    };

    mockReadFileSync.mockReturnValue("helm-chart-content");
    mockYamlLoad.mockReturnValue(helmChart);
    mockGetSecret.mockRejectedValue(new Error("Access denied"));

    await addFromAzureVault(config, { pathToHelmChart: "/path/to/chart.yaml" });

    expect(consoleWarnSpy).toHaveBeenCalledWith("Warning: Azure Key Vault: Vault 'test-vault': Failed to retrieve secret failing-secret: Access denied");
    expect(config).toEqual({ existing: "value" });
  });

  it("should warn with cleaner message for permission errors", async () => {
    const helmChart = {
      keyVaults: {
        "test-vault": {
          secrets: ["redis-access-key"]
        }
      }
    };

    mockReadFileSync.mockReturnValue("helm-chart-content");
    mockYamlLoad.mockReturnValue(helmChart);
    const permissionError: any = new Error("The user does not have secrets get permission");
    permissionError.statusCode = 403;
    mockGetSecret.mockRejectedValue(permissionError);

    await addFromAzureVault(config, { pathToHelmChart: "/path/to/chart.yaml" });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Warning: Azure Key Vault: Vault 'test-vault': Could not load secret 'redis-access-key'. Check it exists and you have access to it."
    );
    expect(config).toEqual({ existing: "value" });
  });

  it("should warn when secret has no value", async () => {
    const helmChart = {
      keyVaults: {
        "test-vault": {
          secrets: ["empty-secret"]
        }
      }
    };

    mockReadFileSync.mockReturnValue("helm-chart-content");
    mockYamlLoad.mockReturnValue(helmChart);
    mockGetSecret.mockResolvedValue({ value: null });

    await addFromAzureVault(config, { pathToHelmChart: "/path/to/chart.yaml" });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Warning: Azure Key Vault: Vault 'test-vault': Failed to retrieve secret empty-secret: Secret empty-secret has no value"
    );
    expect(config).toEqual({ existing: "value" });
  });

  it("should normalize secret names when no alias provided", async () => {
    const helmChart = {
      keyVaults: {
        "test-vault": {
          secrets: ["secret-with-dashes", "secret.with.dots"]
        }
      }
    };

    mockReadFileSync.mockReturnValue("helm-chart-content");
    mockYamlLoad.mockReturnValue(helmChart);
    mockGetSecret.mockResolvedValueOnce({ value: "value1" }).mockResolvedValueOnce({ value: "value2" });

    await addFromAzureVault(config, { pathToHelmChart: "/path/to/chart.yaml" });

    expect(config).toEqual({
      existing: "value",
      secret_with_dashes: "value1",
      secret_with_dots: "value2"
    });
  });

  it("should handle deeply nested keyVaults in Helm chart", async () => {
    const helmChart = {
      global: {
        nested: {
          keyVaults: {
            "deep-vault": {
              secrets: ["deep-secret"]
            }
          }
        }
      },
      someOther: {
        keyVaults: {
          "other-vault": {
            secrets: ["other-secret"]
          }
        }
      }
    };

    mockReadFileSync.mockReturnValue("helm-chart-content");
    mockYamlLoad.mockReturnValue(helmChart);
    mockGetSecret.mockResolvedValueOnce({ value: "deep-value" }).mockResolvedValueOnce({ value: "other-value" });

    await addFromAzureVault(config, { pathToHelmChart: "/path/to/chart.yaml" });

    expect(config).toEqual({
      existing: "value",
      deep_secret: "deep-value",
      other_secret: "other-value"
    });
  });

  it("should handle keyVaults that are not objects", async () => {
    const helmChart = {
      keyVaults: "not-an-object"
    };

    mockReadFileSync.mockReturnValue("helm-chart-content");
    mockYamlLoad.mockReturnValue(helmChart);

    await addFromAzureVault(config, { pathToHelmChart: "/path/to/chart.yaml" });

    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(config).toEqual({ existing: "value" });
  });

  it("should throw error when YAML parsing fails", async () => {
    mockReadFileSync.mockReturnValue("invalid-yaml: {{{");
    mockYamlLoad.mockImplementation(() => {
      throw new Error("YAML parsing error");
    });

    await expect(addFromAzureVault(config, { pathToHelmChart: "/path/to/chart.yaml" })).rejects.toThrow("Azure Key Vault: YAML parsing error");
  });

  it("should throw error when file reading fails", async () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error("File not found");
    });

    await expect(addFromAzureVault(config, { pathToHelmChart: "/path/to/chart.yaml" })).rejects.toThrow("Azure Key Vault: File not found");
  });

  it("should handle vault config as simple string", async () => {
    const helmChart = {
      keyVaults: {
        "vault-name": "simple-string"
      }
    };

    mockReadFileSync.mockReturnValue("helm-chart-content");
    mockYamlLoad.mockReturnValue(helmChart);

    await addFromAzureVault(config, { pathToHelmChart: "/path/to/chart.yaml" });

    expect(consoleWarnSpy).toHaveBeenCalledWith("Azure Vault: Invalid vault configuration, missing name or secrets");
    expect(config).toEqual({ existing: "value" });
  });

  it("should merge secrets with deep nested config", async () => {
    config = {
      existing: "value",
      nested: {
        prop: "old"
      }
    };

    const helmChart = {
      keyVaults: {
        "test-vault": {
          secrets: ["nested"]
        }
      }
    };

    mockReadFileSync.mockReturnValue("helm-chart-content");
    mockYamlLoad.mockReturnValue(helmChart);
    mockGetSecret.mockResolvedValue({ value: "new-value" });

    await addFromAzureVault(config, { pathToHelmChart: "/path/to/chart.yaml" });

    expect(config).toEqual({
      existing: "value",
      nested: "new-value"
    });
  });

  it("should warn for errors with no message property", async () => {
    const helmChart = {
      keyVaults: {
        "test-vault": {
          secrets: ["secret1"]
        }
      }
    };

    mockReadFileSync.mockReturnValue("helm-chart-content");
    mockYamlLoad.mockReturnValue(helmChart);
    mockGetSecret.mockRejectedValue("String error");

    await addFromAzureVault(config, { pathToHelmChart: "/path/to/chart.yaml" });

    expect(consoleWarnSpy).toHaveBeenCalledWith("Warning: Azure Key Vault: Vault 'test-vault': Failed to retrieve secret secret1: String error");
    expect(config).toEqual({ existing: "value" });
  });

  it("should warn without duplicating vault name in message", async () => {
    const helmChart = {
      keyVaults: {
        "test-vault": {
          secrets: ["secret1"]
        }
      }
    };

    mockReadFileSync.mockReturnValue("helm-chart-content");
    mockYamlLoad.mockReturnValue(helmChart);
    const error = new Error("test-vault: Already contains vault name");
    mockGetSecret.mockRejectedValue(error);

    await addFromAzureVault(config, { pathToHelmChart: "/path/to/chart.yaml" });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Warning: Azure Key Vault: Vault 'test-vault': Failed to retrieve secret secret1: test-vault: Already contains vault name"
    );
    expect(config).toEqual({ existing: "value" });
  });

  it("should handle error without message property in addFromAzureVault", async () => {
    mockReadFileSync.mockImplementation(() => {
      throw "Plain string error without message property";
    });

    await expect(addFromAzureVault(config, { pathToHelmChart: "/path/to/chart.yaml" })).rejects.toThrow(
      "Azure Key Vault: Plain string error without message property"
    );
  });

  it("should warn for SecretNotFound error code", async () => {
    const helmChart = {
      keyVaults: {
        "test-vault": {
          secrets: ["missing-secret"]
        }
      }
    };

    mockReadFileSync.mockReturnValue("helm-chart-content");
    mockYamlLoad.mockReturnValue(helmChart);
    const notFoundError: any = new Error("Secret was not found");
    notFoundError.code = "SecretNotFound";
    mockGetSecret.mockRejectedValue(notFoundError);

    await addFromAzureVault(config, { pathToHelmChart: "/path/to/chart.yaml" });

    expect(consoleWarnSpy).toHaveBeenCalledWith("Warning: Azure Key Vault: Vault 'test-vault': Secret 'missing-secret' does not exist in the vault");
    expect(config).toEqual({ existing: "value" });
  });

  it("should warn for error message containing 'was not found'", async () => {
    const helmChart = {
      keyVaults: {
        "test-vault": {
          secrets: ["missing-secret"]
        }
      }
    };

    mockReadFileSync.mockReturnValue("helm-chart-content");
    mockYamlLoad.mockReturnValue(helmChart);
    mockGetSecret.mockRejectedValue(new Error("The secret was not found in the vault"));

    await addFromAzureVault(config, { pathToHelmChart: "/path/to/chart.yaml" });

    expect(consoleWarnSpy).toHaveBeenCalledWith("Warning: Azure Key Vault: Vault 'test-vault': Secret 'missing-secret' does not exist in the vault");
    expect(config).toEqual({ existing: "value" });
  });
});
