import { existsSync, readdirSync, readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addFromAzureVault } from "./azure-vault.js";
import { getPropertiesVolumeSecrets } from "./properties.js";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  statSync: vi.fn()
}));

vi.mock("./azure-vault.js", () => ({
  addFromAzureVault: vi.fn()
}));

const mockExistsSync = vi.mocked(existsSync);
const mockReaddirSync = vi.mocked(readdirSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockAddFromAzureVault = vi.mocked(addFromAzureVault);

describe("getPropertiesVolumeSecrets", () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
    process.env = originalEnv;
  });

  it("should read vault subdirectories with prefixed keys", async () => {
    // Arrange
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValueOnce([{ name: "pip-ss-kv", isDirectory: () => true, isSymbolicLink: () => false }] as any);
    mockReaddirSync.mockReturnValueOnce(["DATABASE_URL", "APP_SECRET"] as any);
    mockReadFileSync.mockReturnValueOnce("db-connection-string").mockReturnValueOnce("my-secret");

    // Act
    const secrets = await getPropertiesVolumeSecrets();

    // Assert
    expect(secrets["pip-ss-kv.DATABASE_URL"]).toBe("db-connection-string");
    expect(secrets["pip-ss-kv.APP_SECRET"]).toBe("my-secret");
    expect(secrets.DATABASE_URL).toBe("db-connection-string");
    expect(secrets.APP_SECRET).toBe("my-secret");
  });

  it("should inject env vars when injectEnvVars is true (default)", async () => {
    // Arrange
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValueOnce([{ name: "vault", isDirectory: () => true, isSymbolicLink: () => false }] as any);
    mockReaddirSync.mockReturnValueOnce(["MY_SECRET"] as any);
    mockReadFileSync.mockReturnValue("secret-value");

    // Act
    await getPropertiesVolumeSecrets();

    // Assert
    expect(process.env.MY_SECRET).toBe("secret-value");
  });

  it("should not inject env vars when injectEnvVars is false", async () => {
    // Arrange
    delete process.env.NO_INJECT_SECRET;
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValueOnce([{ name: "vault", isDirectory: () => true, isSymbolicLink: () => false }] as any);
    mockReaddirSync.mockReturnValueOnce(["NO_INJECT_SECRET"] as any);
    mockReadFileSync.mockReturnValue("secret-value");

    // Act
    await getPropertiesVolumeSecrets({ injectEnvVars: false });

    // Assert
    expect(process.env.NO_INJECT_SECRET).toBeUndefined();
  });

  it("should read direct files without subdirectories", async () => {
    // Arrange
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValueOnce([
      { name: "secret1", isDirectory: () => false, isSymbolicLink: () => false },
      { name: "secret2", isDirectory: () => false, isSymbolicLink: () => false }
    ] as any);
    mockReadFileSync.mockReturnValueOnce("value1").mockReturnValueOnce("value2");

    // Act
    const secrets = await getPropertiesVolumeSecrets();

    // Assert
    expect(secrets.secret1).toBe("value1");
    expect(secrets.secret2).toBe("value2");
  });

  it("should handle mixed vault dirs and direct files", async () => {
    // Arrange
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValueOnce([
      { name: "my-vault", isDirectory: () => true, isSymbolicLink: () => false },
      { name: "direct-file", isDirectory: () => false, isSymbolicLink: () => false }
    ] as any);
    mockReaddirSync.mockReturnValueOnce(["VAULT_SECRET"] as any);
    mockReadFileSync.mockReturnValueOnce("vault-value").mockReturnValueOnce("direct-value");

    // Act
    const secrets = await getPropertiesVolumeSecrets();

    // Assert
    expect(secrets["my-vault.VAULT_SECRET"]).toBe("vault-value");
    expect(secrets.VAULT_SECRET).toBe("vault-value");
    expect(secrets["direct-file"]).toBe("direct-value");
  });

  it("should skip entries starting with '..'", async () => {
    // Arrange
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValueOnce([
      { name: "..data", isDirectory: () => true, isSymbolicLink: () => false },
      { name: "valid-secret", isDirectory: () => false, isSymbolicLink: () => false }
    ] as any);
    mockReadFileSync.mockReturnValue("value");

    // Act
    const secrets = await getPropertiesVolumeSecrets();

    // Assert
    expect(secrets["..data"]).toBeUndefined();
    expect(secrets["valid-secret"]).toBe("value");
  });

  it("should skip entries starting with '..' inside vault directories", async () => {
    // Arrange
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValueOnce([{ name: "vault", isDirectory: () => true, isSymbolicLink: () => false }] as any);
    mockReaddirSync.mockReturnValueOnce(["..hidden", "VISIBLE_SECRET"] as any);
    mockReadFileSync.mockReturnValue("value");

    // Act
    const secrets = await getPropertiesVolumeSecrets();

    // Assert
    expect(secrets["vault...hidden"]).toBeUndefined();
    expect(secrets.VISIBLE_SECRET).toBe("value");
  });

  it("should throw error when mount point does not exist and failOnError is true", async () => {
    // Arrange
    mockExistsSync.mockReturnValue(false);

    // Act & Assert
    await expect(getPropertiesVolumeSecrets({ failOnError: true })).rejects.toThrow("Mount point /mnt/secrets does not exist");
  });

  it("should warn when mount point does not exist and failOnError is false", async () => {
    // Arrange
    mockExistsSync.mockReturnValue(false);

    // Act
    const secrets = await getPropertiesVolumeSecrets({ failOnError: false });

    // Assert
    expect(consoleWarnSpy).toHaveBeenCalledWith("Warning: Mount point /mnt/secrets does not exist");
    expect(secrets).toEqual({});
  });

  it("should handle file read errors when failOnError is false", async () => {
    // Arrange
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValueOnce([
      { name: "good", isDirectory: () => false, isSymbolicLink: () => false },
      { name: "bad", isDirectory: () => false, isSymbolicLink: () => false }
    ] as any);
    mockReadFileSync.mockReturnValueOnce("value").mockImplementationOnce(() => {
      throw new Error("Permission denied");
    });

    // Act
    const secrets = await getPropertiesVolumeSecrets({ failOnError: false });

    // Assert
    expect(secrets.good).toBe("value");
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("Failed to read secret file"));
  });

  it("should trim whitespace from file contents", async () => {
    // Arrange
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValueOnce([{ name: "secret", isDirectory: () => false, isSymbolicLink: () => false }] as any);
    mockReadFileSync.mockReturnValue("  value with spaces  \n");

    // Act
    const secrets = await getPropertiesVolumeSecrets();

    // Assert
    expect(secrets.secret).toBe("value with spaces");
  });

  it("should use custom mount point", async () => {
    // Arrange
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValueOnce([{ name: "custom-secret", isDirectory: () => false, isSymbolicLink: () => false }] as any);
    mockReadFileSync.mockReturnValue("custom-value");

    // Act
    const secrets = await getPropertiesVolumeSecrets({ mountPoint: "/custom/path" });

    // Assert
    expect(mockExistsSync).toHaveBeenCalledWith("/custom/path");
    expect(secrets["custom-secret"]).toBe("custom-value");
  });

  it("should handle symbolic links as directories", async () => {
    // Arrange
    mockExistsSync.mockReturnValue(true);
    mockReaddirSync.mockReturnValueOnce([{ name: "symlink-vault", isDirectory: () => false, isSymbolicLink: () => true }] as any);
    mockReaddirSync.mockReturnValueOnce(["SECRET_KEY"] as any);
    mockReadFileSync.mockReturnValue("symlink-value");

    // Act
    const secrets = await getPropertiesVolumeSecrets();

    // Assert
    expect(secrets["symlink-vault.SECRET_KEY"]).toBe("symlink-value");
    expect(secrets.SECRET_KEY).toBe("symlink-value");
  });

  describe("Azure Vault integration", () => {
    it("should load secrets from Azure vault when chartPath is provided in non-production", async () => {
      // Arrange
      process.env.NODE_ENV = "development";
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValueOnce([] as any);
      mockAddFromAzureVault.mockImplementation(async (config) => {
        config.AZURE_SECRET = "azure-value";
      });

      // Act
      const secrets = await getPropertiesVolumeSecrets({ chartPath: "/path/to/chart.yaml" });

      // Assert
      expect(mockAddFromAzureVault).toHaveBeenCalled();
      expect(secrets.AZURE_SECRET).toBe("azure-value");
    });

    it("should not load from Azure vault in production", async () => {
      // Arrange
      process.env.NODE_ENV = "production";
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValueOnce([] as any);

      // Act
      await getPropertiesVolumeSecrets({ chartPath: "/path/to/chart.yaml" });

      // Assert
      expect(mockAddFromAzureVault).not.toHaveBeenCalled();
    });

    it("should not load from Azure vault when chart file does not exist", async () => {
      // Arrange
      process.env.NODE_ENV = "development";
      // Mount point exists, chart path does not
      mockExistsSync.mockReturnValueOnce(true).mockReturnValueOnce(false);
      mockReaddirSync.mockReturnValueOnce([] as any);

      // Act
      await getPropertiesVolumeSecrets({ chartPath: "/nonexistent/chart.yaml" });

      // Assert
      expect(mockAddFromAzureVault).not.toHaveBeenCalled();
    });

    it("should apply omit filter to Azure vault secrets only", async () => {
      // Arrange
      process.env.NODE_ENV = "development";
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValueOnce([{ name: "vault", isDirectory: () => true, isSymbolicLink: () => false }] as any);
      mockReaddirSync.mockReturnValueOnce(["DATABASE_URL"] as any);
      mockReadFileSync.mockReturnValue("mounted-db-url");

      mockAddFromAzureVault.mockImplementation(async (config) => {
        config.DATABASE_URL = "azure-db-url";
        config.APP_SECRET = "azure-app-secret";
      });

      // Act
      const secrets = await getPropertiesVolumeSecrets({
        chartPath: "/path/to/chart.yaml",
        omit: ["DATABASE_URL"]
      });

      // Assert
      // DATABASE_URL from mounted volume should still be present
      expect(secrets.DATABASE_URL).toBe("mounted-db-url");
      // APP_SECRET from Azure vault should be loaded (not omitted)
      expect(secrets.APP_SECRET).toBe("azure-app-secret");
    });

    it("should not omit secrets from mounted volume", async () => {
      // Arrange
      process.env.NODE_ENV = "development";
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValueOnce([{ name: "vault", isDirectory: () => true, isSymbolicLink: () => false }] as any);
      mockReaddirSync.mockReturnValueOnce(["DATABASE_URL", "OTHER_SECRET"] as any);
      mockReadFileSync.mockReturnValueOnce("mounted-db-url").mockReturnValueOnce("other-value");

      // Act
      const secrets = await getPropertiesVolumeSecrets({ omit: ["DATABASE_URL"] });

      // Assert
      // Omit only applies to Azure vault, not mounted volume
      expect(secrets.DATABASE_URL).toBe("mounted-db-url");
      expect(secrets.OTHER_SECRET).toBe("other-value");
    });

    it("should inject Azure vault secrets into process.env", async () => {
      // Arrange
      process.env.NODE_ENV = "development";
      delete process.env.AZURE_INJECTED;
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValueOnce([] as any);
      mockAddFromAzureVault.mockImplementation(async (config) => {
        config.AZURE_INJECTED = "injected-value";
      });

      // Act
      await getPropertiesVolumeSecrets({ chartPath: "/path/to/chart.yaml" });

      // Assert
      expect(process.env.AZURE_INJECTED).toBe("injected-value");
    });
  });

  describe("Error handling", () => {
    it("should default failOnError to true in production", async () => {
      // Arrange
      process.env.NODE_ENV = "production";
      mockExistsSync.mockReturnValue(false);

      // Act & Assert
      await expect(getPropertiesVolumeSecrets()).rejects.toThrow("Mount point /mnt/secrets does not exist");
    });

    it("should handle top-level errors gracefully when failOnError is false", async () => {
      // Arrange
      mockExistsSync.mockImplementation(() => {
        throw new Error("Unexpected fs error");
      });

      // Act
      const secrets = await getPropertiesVolumeSecrets({ failOnError: false });

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith("Warning: Unexpected fs error");
      expect(secrets).toEqual({});
    });

    it("should throw top-level errors when failOnError is true", async () => {
      // Arrange
      mockExistsSync.mockImplementation(() => {
        throw new Error("Unexpected fs error");
      });

      // Act & Assert
      await expect(getPropertiesVolumeSecrets({ failOnError: true })).rejects.toThrow("Unexpected fs error");
    });
  });
});
