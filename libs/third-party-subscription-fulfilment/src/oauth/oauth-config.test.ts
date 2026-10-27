import { getSecret } from "@hmcts/third-party-user";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDestinationUrl, getTokenCredentials } from "./oauth-config.js";

vi.mock("@hmcts/third-party-user", () => ({
  createKeyVaultSecretName: (userId: string, type: string) => `third-party-${userId}-${type}`,
  getSecret: vi.fn()
}));

const USER_ID = "user-1";
const CREDENTIAL_TYPES = ["token-url", "scope", "client-id", "client-secret"];

const SECRETS: Record<string, string> = {
  [`third-party-${USER_ID}-destination-url`]: "https://subscriber.example/publication",
  [`third-party-${USER_ID}-token-url`]: "https://idp.example/token",
  [`third-party-${USER_ID}-scope`]: "api://subscriber/.default",
  [`third-party-${USER_ID}-client-id`]: "client-id",
  [`third-party-${USER_ID}-client-secret`]: "client-secret"
};

function mockSecrets(overrides: Record<string, string | undefined> = {}) {
  const secrets = { ...SECRETS, ...overrides };
  vi.mocked(getSecret).mockImplementation(async (name: string) => secrets[name]);
}

describe("getDestinationUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should read only the destination URL secret", async () => {
    // Arrange
    mockSecrets();

    // Act
    const result = await getDestinationUrl(USER_ID);

    // Assert
    expect(result).toBe("https://subscriber.example/publication");
    expect(getSecret).toHaveBeenCalledTimes(1);
    expect(getSecret).toHaveBeenCalledWith(`third-party-${USER_ID}-destination-url`);
  });

  it.each([
    ["missing", undefined],
    ["empty", ""]
  ])("should return null when the destination URL is %s", async (_label, value) => {
    // Arrange
    mockSecrets({ [`third-party-${USER_ID}-destination-url`]: value });

    // Act
    const result = await getDestinationUrl(USER_ID);

    // Assert
    expect(result).toBeNull();
  });

  it("should return null when getSecret rejects", async () => {
    // Arrange
    vi.mocked(getSecret).mockRejectedValue(new Error("Key Vault unavailable"));

    // Act
    const result = await getDestinationUrl(USER_ID);

    // Assert
    expect(result).toBeNull();
  });
});

describe("getTokenCredentials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the credentials when all four secrets are present, without reading the destination URL", async () => {
    // Arrange
    mockSecrets();

    // Act
    const result = await getTokenCredentials(USER_ID);

    // Assert
    expect(result).toEqual({
      tokenUrl: "https://idp.example/token",
      scope: "api://subscriber/.default",
      clientId: "client-id",
      clientSecret: "client-secret"
    });
    expect(getSecret).toHaveBeenCalledTimes(4);
    expect(getSecret).not.toHaveBeenCalledWith(`third-party-${USER_ID}-destination-url`);
  });

  it.each(CREDENTIAL_TYPES)("should return null when %s is missing", async (type) => {
    // Arrange
    mockSecrets({ [`third-party-${USER_ID}-${type}`]: undefined });

    // Act
    const result = await getTokenCredentials(USER_ID);

    // Assert
    expect(result).toBeNull();
  });

  it.each(CREDENTIAL_TYPES)("should return null when %s is empty", async (type) => {
    // Arrange
    mockSecrets({ [`third-party-${USER_ID}-${type}`]: "" });

    // Act
    const result = await getTokenCredentials(USER_ID);

    // Assert
    expect(result).toBeNull();
  });

  it("should return null when getSecret rejects", async () => {
    // Arrange
    vi.mocked(getSecret).mockRejectedValue(new Error("Key Vault unavailable"));

    // Act
    const result = await getTokenCredentials(USER_ID);

    // Assert
    expect(result).toBeNull();
  });
});
