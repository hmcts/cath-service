import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createKeyVaultSecretName, deleteSecrets, getSecret, setSecret } from "./key-vault-service.js";

const mockGetSecret = vi.fn();
const mockSetSecret = vi.fn();
const mockBeginDeleteSecret = vi.fn();

vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: class {}
}));

vi.mock("@azure/keyvault-secrets", () => ({
  SecretClient: class {
    getSecret = mockGetSecret;
    setSecret = mockSetSecret;
    beginDeleteSecret = mockBeginDeleteSecret;
  }
}));

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    thirdPartySecret: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn()
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
    it.each(["scope", "client-id", "client-secret", "destination-url", "token-url"] as const)(
      "should prefix the %s secret with the subscriber name and user ID",
      (type) => {
        expect(createKeyVaultSecretName("Courtel", "user-123", type)).toBe(`courtel-user-123-${type}`);
      }
    );

    // Same cases as legacy ThirdPartyHelperTest, so secrets created by either service resolve to the same name
    it.each([
      { name: "abc", userId: "123", expected: "abc-123-scope" },
      { name: "ab@c.com", userId: "12   3", expected: "ab-c-com-12-3-scope" },
      { name: "a---bC", userId: "123---", expected: "a-bc-123-scope" },
      { name: "ABC@abc.com", userId: "1-2-3-4", expected: "abc-abc-com-1-2-3-4-scope" }
    ])("should sanitise name $name and user ID $userId to match the legacy key prefix", ({ name, userId, expected }) => {
      expect(createKeyVaultSecretName(name, userId, "scope")).toBe(expected);
    });

    it("should strip leading hyphens left by a name starting with an invalid character", () => {
      expect(createKeyVaultSecretName("@Courtel", "user-123", "scope")).toBe("courtel-user-123-scope");
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

  describe("deleteSecrets", () => {
    const EXPECTED_SECRET_NAMES = [
      "courtel-user-123-destination-url",
      "courtel-user-123-token-url",
      "courtel-user-123-scope",
      "courtel-user-123-client-id",
      "courtel-user-123-client-secret"
    ];

    it("should delete every secret named after the subscriber from Key Vault when the vault is configured", async () => {
      // Arrange
      process.env.THIRD_PARTY_KEY_VAULT = "test-vault";
      mockBeginDeleteSecret.mockResolvedValue(undefined);

      // Act
      await deleteSecrets("Courtel", "user-123");

      // Assert
      expect(mockBeginDeleteSecret.mock.calls.map(([name]) => name)).toEqual(EXPECTED_SECRET_NAMES);
      expect(prisma.thirdPartySecret.deleteMany).not.toHaveBeenCalled();
    });

    it("should ignore a secret that does not exist in Key Vault", async () => {
      // Arrange
      process.env.THIRD_PARTY_KEY_VAULT = "test-vault";
      mockBeginDeleteSecret.mockRejectedValue(new Error("SecretNotFound"));

      // Act & Assert
      await expect(deleteSecrets("Courtel", "user-123")).resolves.toBeUndefined();
    });

    it("should delete every secret named after the subscriber from the database when the vault is not configured", async () => {
      // Arrange
      delete process.env.THIRD_PARTY_KEY_VAULT;

      // Act
      await deleteSecrets("Courtel", "user-123");

      // Assert
      expect(vi.mocked(prisma.thirdPartySecret.deleteMany).mock.calls.map(([args]) => args?.where?.name)).toEqual(EXPECTED_SECRET_NAMES);
      expect(mockBeginDeleteSecret).not.toHaveBeenCalled();
    });
  });
});
