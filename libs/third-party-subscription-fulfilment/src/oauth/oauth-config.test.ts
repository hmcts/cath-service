import { getSecret } from "@hmcts/third-party-user";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDestinationUrl, getTokenCredentials } from "./oauth-config.js";

vi.mock("@hmcts/third-party-user", () => ({
  createKeyVaultSecretName: (name: string, userId: string, type: string) => `${name}-${userId}-${type}`,
  getSecret: vi.fn()
}));

const SUBSCRIBER_NAME = "courtel";
const USER_ID = "user-1";
const SECRET_PREFIX = `${SUBSCRIBER_NAME}-${USER_ID}-`;
const CREDENTIAL_TYPES = ["token-url", "scope", "client-id", "client-secret"];

const SECRETS: Record<string, string> = {
  [`${SECRET_PREFIX}destination-url`]: "https://subscriber.example/publication",
  [`${SECRET_PREFIX}token-url`]: "https://idp.example/token",
  [`${SECRET_PREFIX}scope`]: "api://subscriber/.default",
  [`${SECRET_PREFIX}client-id`]: "client-id",
  [`${SECRET_PREFIX}client-secret`]: "client-secret"
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
    const result = await getDestinationUrl(SUBSCRIBER_NAME, USER_ID);

    // Assert
    expect(result).toBe("https://subscriber.example/publication");
    expect(getSecret).toHaveBeenCalledTimes(1);
    expect(getSecret).toHaveBeenCalledWith(`${SECRET_PREFIX}destination-url`);
  });

  it.each([
    ["missing", undefined],
    ["empty", ""]
  ])("should return null when the destination URL is %s", async (_label, value) => {
    // Arrange
    mockSecrets({ [`${SECRET_PREFIX}destination-url`]: value });

    // Act
    const result = await getDestinationUrl(SUBSCRIBER_NAME, USER_ID);

    // Assert
    expect(result).toBeNull();
  });

  it("should return null when getSecret rejects", async () => {
    // Arrange
    vi.mocked(getSecret).mockRejectedValue(new Error("Key Vault unavailable"));

    // Act
    const result = await getDestinationUrl(SUBSCRIBER_NAME, USER_ID);

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
    const result = await getTokenCredentials(SUBSCRIBER_NAME, USER_ID);

    // Assert
    expect(result).toEqual({
      tokenUrl: "https://idp.example/token",
      scope: "api://subscriber/.default",
      clientId: "client-id",
      clientSecret: "client-secret"
    });
    expect(getSecret).toHaveBeenCalledTimes(4);
    expect(getSecret).not.toHaveBeenCalledWith(`${SECRET_PREFIX}destination-url`);
  });

  it.each(CREDENTIAL_TYPES)("should return null when %s is missing", async (type) => {
    // Arrange
    mockSecrets({ [`${SECRET_PREFIX}${type}`]: undefined });

    // Act
    const result = await getTokenCredentials(SUBSCRIBER_NAME, USER_ID);

    // Assert
    expect(result).toBeNull();
  });

  it.each(CREDENTIAL_TYPES)("should return null when %s is empty", async (type) => {
    // Arrange
    mockSecrets({ [`${SECRET_PREFIX}${type}`]: "" });

    // Act
    const result = await getTokenCredentials(SUBSCRIBER_NAME, USER_ID);

    // Assert
    expect(result).toBeNull();
  });

  it("should return null when getSecret rejects", async () => {
    // Arrange
    vi.mocked(getSecret).mockRejectedValue(new Error("Key Vault unavailable"));

    // Act
    const result = await getTokenCredentials(SUBSCRIBER_NAME, USER_ID);

    // Assert
    expect(result).toBeNull();
  });
});
