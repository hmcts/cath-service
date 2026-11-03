import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOauthConfig } from "./oauth-config.js";

vi.mock("./key-vault-service.js", () => ({
  createKeyVaultSecretName: (userId: string, type: string) => `third-party-${userId}-${type}`,
  getSecret: vi.fn()
}));

import { getSecret } from "./key-vault-service.js";

const USER_ID = "user-1";

const SECRETS: Record<string, string> = {
  "destination-url": "https://destination.example.com",
  "token-url": "https://token.example.com",
  scope: "api://scope/.default",
  "client-id": "client-id-value",
  "client-secret": "client-secret-value"
};

function mockSecrets(overrides: Record<string, string | undefined> = {}) {
  const values = { ...SECRETS, ...overrides };
  vi.mocked(getSecret).mockImplementation(async (name: string) => values[name.replace(`third-party-${USER_ID}-`, "")]);
}

describe("getOauthConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the config when all five secrets are present", async () => {
    mockSecrets();

    const result = await getOauthConfig(USER_ID);

    expect(result).toEqual({
      destinationUrl: "https://destination.example.com",
      tokenUrl: "https://token.example.com",
      scope: "api://scope/.default",
      clientId: "client-id-value",
      clientSecret: "client-secret-value"
    });
    expect(getSecret).toHaveBeenCalledTimes(5);
  });

  it.each(Object.keys(SECRETS))("should return undefined when %s is missing", async (name) => {
    mockSecrets({ [name]: undefined });

    expect(await getOauthConfig(USER_ID)).toBeUndefined();
  });

  it.each(Object.keys(SECRETS))("should return undefined when %s is blank", async (name) => {
    mockSecrets({ [name]: "   " });

    expect(await getOauthConfig(USER_ID)).toBeUndefined();
  });

  it("should propagate a failure reading a secret", async () => {
    vi.mocked(getSecret).mockRejectedValue(new Error("db down"));

    await expect(getOauthConfig(USER_ID)).rejects.toThrow("db down");
  });
});
