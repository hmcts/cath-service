import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createKeyVaultSecretName, getSecret, setSecret } from "./key-vault-service.js";

const mockGetSecret = vi.fn();
const mockSetSecret = vi.fn();

vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: class {}
}));

vi.mock("@azure/keyvault-secrets", () => ({
  SecretClient: class {
    getSecret = mockGetSecret;
    setSecret = mockSetSecret;
  }
}));

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    thirdPartySecret: {
      findUnique: vi.fn(),
      upsert: vi.fn()
    }
  }
}));

import { prisma } from "@hmcts/postgres-prisma";

describe("key-vault-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.THIRD_PARTY_KEY_VAULT;
    delete process.env.MANAGED_IDENTITY_CLIENT_ID;
  });

  describe("createKeyVaultSecretName", () => {
    it("should create secret name for scope", () => {
      expect(createKeyVaultSecretName("user-123", "scope")).toBe("third-party-user-123-scope");
    });

    it("should create secret name for client-id", () => {
      expect(createKeyVaultSecretName("user-123", "client-id")).toBe("third-party-user-123-client-id");
    });

    it("should create secret name for client-secret", () => {
      expect(createKeyVaultSecretName("user-123", "client-secret")).toBe("third-party-user-123-client-secret");
    });

    it("should create secret name for destination-url", () => {
      expect(createKeyVaultSecretName("user-123", "destination-url")).toBe("third-party-user-123-destination-url");
    });

    it("should create secret name for token-url", () => {
      expect(createKeyVaultSecretName("user-123", "token-url")).toBe("third-party-user-123-token-url");
    });
  });

  describe("getSecret", () => {
    it("should return value from database when vault is not configured", async () => {
      // Arrange
      delete process.env.THIRD_PARTY_KEY_VAULT;
      vi.mocked(prisma.thirdPartySecret.findUnique).mockResolvedValue({ name: "some-secret", value: "db-value" });

      // Act
      const result = await getSecret("some-secret");

      // Assert
      expect(result).toBe("db-value");
      expect(prisma.thirdPartySecret.findUnique).toHaveBeenCalledWith({ where: { name: "some-secret" } });
      expect(mockGetSecret).not.toHaveBeenCalled();
    });

    it("should return undefined when vault is not configured and secret not in database", async () => {
      // Arrange
      delete process.env.THIRD_PARTY_KEY_VAULT;
      vi.mocked(prisma.thirdPartySecret.findUnique).mockResolvedValue(null);

      // Act
      const result = await getSecret("some-secret");

      // Assert
      expect(result).toBeUndefined();
    });

    it("should return secret value when vault is configured", async () => {
      // Arrange
      process.env.THIRD_PARTY_KEY_VAULT = "test-vault";
      mockGetSecret.mockResolvedValue({ value: "my-secret-value" });

      // Act
      const result = await getSecret("some-secret");

      // Assert
      expect(result).toBe("my-secret-value");
      expect(mockGetSecret).toHaveBeenCalledWith("some-secret");
      expect(prisma.thirdPartySecret.findUnique).not.toHaveBeenCalled();
    });

    it("should return undefined when secret retrieval throws", async () => {
      // Arrange
      process.env.THIRD_PARTY_KEY_VAULT = "test-vault";
      mockGetSecret.mockRejectedValue(new Error("Secret not found"));

      // Act
      const result = await getSecret("some-secret");

      // Assert
      expect(result).toBeUndefined();
    });

    it("should return undefined when secret has no value", async () => {
      // Arrange
      process.env.THIRD_PARTY_KEY_VAULT = "test-vault";
      mockGetSecret.mockResolvedValue({ value: undefined });

      // Act
      const result = await getSecret("some-secret");

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe("setSecret", () => {
    it("should upsert to database when vault is not configured", async () => {
      // Arrange
      delete process.env.THIRD_PARTY_KEY_VAULT;
      vi.mocked(prisma.thirdPartySecret.upsert).mockResolvedValue({ name: "some-secret", value: "some-value" });

      // Act
      await setSecret("some-secret", "some-value");

      // Assert
      expect(prisma.thirdPartySecret.upsert).toHaveBeenCalledWith({
        where: { name: "some-secret" },
        update: { value: "some-value" },
        create: { name: "some-secret", value: "some-value" }
      });
      expect(mockSetSecret).not.toHaveBeenCalled();
    });

    it("should set secret when vault is configured", async () => {
      // Arrange
      process.env.THIRD_PARTY_KEY_VAULT = "test-vault";
      mockSetSecret.mockResolvedValue(undefined);

      // Act
      await setSecret("some-secret", "some-value");

      // Assert
      expect(mockSetSecret).toHaveBeenCalledWith("some-secret", "some-value");
      expect(prisma.thirdPartySecret.upsert).not.toHaveBeenCalled();
    });
  });
});
