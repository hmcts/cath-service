import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock modules before imports
vi.mock("redis", () => ({
  createClient: vi.fn()
}));

vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: vi.fn()
}));

vi.mock("@redis/entraid", () => ({
  EntraIdCredentialsProviderFactory: {
    createForDefaultAzureCredential: vi.fn(() => ({ provider: "entra-id" }))
  },
  REDIS_SCOPE_DEFAULT: "https://redis.azure.com/.default"
}));

vi.mock("config", () => ({
  default: {
    get: vi.fn()
  }
}));

// Import after mocks are set up
import config from "config";
import { createClient } from "redis";
import { closeRedisClient, getRedisClient } from "./index.js";

describe("Redis Client", () => {
  let mockRedisClient: {
    connect: ReturnType<typeof vi.fn>;
    quit: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    isOpen: boolean;
  };

  beforeEach(() => {
    // Create mock Redis client
    mockRedisClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      quit: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      isOpen: true
    };

    // Mock createClient to return our mock client
    vi.mocked(createClient).mockReturnValue(mockRedisClient as any);

    // Mock config.get
    vi.mocked(config.get).mockImplementation((key: string) => (key === "redis.managedIdentity" ? false : "redis://localhost:6379"));
  });

  afterEach(async () => {
    // Clean up after each test
    await closeRedisClient();
    vi.clearAllMocks();
  });

  describe("getRedisClient", () => {
    it("should create and connect a Redis client on first call", async () => {
      const client = await getRedisClient();

      expect(createClient).toHaveBeenCalledWith({
        url: "redis://localhost:6379",
        pingInterval: 300_000
      });
      expect(mockRedisClient.connect).toHaveBeenCalledOnce();
      expect(mockRedisClient.on).toHaveBeenCalledWith("error", expect.any(Function));
      expect(client).toBe(mockRedisClient);
    });

    it("should return the same client on subsequent calls (singleton pattern)", async () => {
      const client1 = await getRedisClient();
      const client2 = await getRedisClient();

      expect(client1).toBe(client2);
      expect(createClient).toHaveBeenCalledOnce();
      expect(mockRedisClient.connect).toHaveBeenCalledOnce();
    });

    it("should register error handler on client", async () => {
      await getRedisClient();

      expect(mockRedisClient.on).toHaveBeenCalledWith("error", expect.any(Function));
    });

    it("should read Redis URL from config", async () => {
      await getRedisClient();

      expect(config.get).toHaveBeenCalledWith("redis.url");
    });

    it("should use custom Redis URL from config", async () => {
      vi.mocked(config.get).mockImplementation((key: string) => (key === "redis.managedIdentity" ? false : "redis://custom-host:1234"));

      await getRedisClient();

      expect(createClient).toHaveBeenCalledWith({
        url: "redis://custom-host:1234",
        pingInterval: 300_000
      });
    });
  });

  describe("closeRedisClient", () => {
    it("should quit the client if it exists", async () => {
      await getRedisClient();
      await closeRedisClient();

      expect(mockRedisClient.quit).toHaveBeenCalledOnce();
    });

    it("should allow calling getRedisClient after close", async () => {
      const client1 = await getRedisClient();
      await closeRedisClient();

      // Should create a new client
      const client2 = await getRedisClient();

      expect(createClient).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.connect).toHaveBeenCalledTimes(2);
      expect(client1).toBe(mockRedisClient);
      expect(client2).toBe(mockRedisClient);
    });

    it("should reconnect when the existing client is closed", async () => {
      const client1 = await getRedisClient();

      // Simulate the connection being dropped
      mockRedisClient.isOpen = false;

      const client2 = await getRedisClient();

      expect(createClient).toHaveBeenCalledTimes(2);
      expect(mockRedisClient.connect).toHaveBeenCalledTimes(2);
      expect(client1).toBe(mockRedisClient);
      expect(client2).toBe(mockRedisClient);
    });

    it("should not throw if called when no client exists", async () => {
      await expect(closeRedisClient()).resolves.not.toThrow();
    });

    it("should not throw if called multiple times", async () => {
      await getRedisClient();
      await closeRedisClient();
      await expect(closeRedisClient()).resolves.not.toThrow();

      expect(mockRedisClient.quit).toHaveBeenCalledOnce();
    });
  });
});

describe("getRedisClient managed identity flag", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReturnValue({ connect: vi.fn().mockResolvedValue(undefined), quit: vi.fn(), on: vi.fn(), isOpen: true } as any);
  });

  afterEach(async () => {
    await closeRedisClient();
    vi.clearAllMocks();
  });

  it.each([
    { managedIdentity: true, expectProvider: true },
    { managedIdentity: false, expectProvider: false }
  ])("should pass redis.managedIdentity=$managedIdentity through to the client", async ({ managedIdentity, expectProvider }) => {
    // Arrange
    vi.mocked(config.get).mockImplementation((key: string) => (key === "redis.managedIdentity" ? managedIdentity : "rediss://:key@host:10000"));

    // Act
    await getRedisClient();

    // Assert
    expect(config.get).toHaveBeenCalledWith("redis.managedIdentity");
    const options = vi.mocked(createClient).mock.calls[0][0] as { credentialsProvider?: unknown };
    expect(options.credentialsProvider !== undefined).toBe(expectProvider);
  });
});

describe("createRedisClient", () => {
  let redisModule: typeof import("./index.js");
  let factory: typeof import("@redis/entraid").EntraIdCredentialsProviderFactory;
  let DefaultAzureCredential: typeof import("@azure/identity").DefaultAzureCredential;

  beforeEach(async () => {
    // Fresh module instances so the process-wide Entra ID provider starts unset in every test.
    vi.resetModules();
    redisModule = await import("./index.js");
    factory = (await import("@redis/entraid")).EntraIdCredentialsProviderFactory;
    DefaultAzureCredential = (await import("@azure/identity")).DefaultAzureCredential;
    const { createClient: freshCreateClient } = await import("redis");
    vi.mocked(freshCreateClient).mockReturnValue({ on: vi.fn() } as any);
    vi.stubEnv("MANAGED_IDENTITY_CLIENT_ID", "mi-client-id");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe("when managedIdentity is false", () => {
    it.each(["rediss://:secret-key@cath-managed-redis-aat.uksouth.redis.azure.net:10000", "redis://localhost:6380"])(
      "should pass %s through unchanged with no credentials provider",
      async (url) => {
        // Arrange
        const { createClient: freshCreateClient } = await import("redis");

        // Act
        const client = redisModule.createRedisClient(url, false);

        // Assert
        expect(freshCreateClient).toHaveBeenCalledWith({ url, pingInterval: 300_000 });
        expect(client.on).toHaveBeenCalledWith("error", expect.any(Function));
        expect(factory.createForDefaultAzureCredential).not.toHaveBeenCalled();
      }
    );
  });

  describe("when managedIdentity is true", () => {
    it("should strip the key from the URL and attach an Entra ID provider for the managed identity", async () => {
      // Arrange
      const { createClient: freshCreateClient } = await import("redis");

      // Act
      const client = redisModule.createRedisClient("rediss://:secret-key@cath-managed-redis-aat.uksouth.redis.azure.net:10000", true);

      // Assert
      expect(freshCreateClient).toHaveBeenCalledWith({
        url: "rediss://cath-managed-redis-aat.uksouth.redis.azure.net:10000",
        pingInterval: 300_000,
        credentialsProvider: { provider: "entra-id" }
      });
      expect(DefaultAzureCredential).toHaveBeenCalledWith({ managedIdentityClientId: "mi-client-id" });
      expect(factory.createForDefaultAzureCredential).toHaveBeenCalledWith(
        expect.objectContaining({
          scopes: "https://redis.azure.com/.default",
          tokenManagerConfig: { expirationRefreshRatio: 0.8 },
          onReAuthenticationError: expect.any(Function)
        })
      );
      expect(client.on).toHaveBeenCalledWith("error", expect.any(Function));
    });

    it("should create the Entra ID provider only once across clients", () => {
      // Act
      redisModule.createRedisClient("rediss://host-a:10000", true);
      redisModule.createRedisClient("rediss://host-b:10000", true);

      // Assert
      expect(factory.createForDefaultAzureCredential).toHaveBeenCalledOnce();
      expect(DefaultAzureCredential).toHaveBeenCalledOnce();
    });

    it("should log re-authentication failures without the token", () => {
      // Arrange
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      redisModule.createRedisClient("rediss://host:10000", true);
      const { onReAuthenticationError } = vi.mocked(factory.createForDefaultAzureCredential).mock.calls[0][0];

      // Act
      onReAuthenticationError?.(Object.assign(new Error("token refresh failed"), { token: "secret-token" }) as any);

      // Assert
      expect(consoleError).toHaveBeenCalledWith("Redis Entra ID re-authentication failed", "token refresh failed");
      expect(JSON.stringify(consoleError.mock.calls)).not.toContain("secret-token");
      consoleError.mockRestore();
    });

    it("should fail fast naming REDIS_MI when the URL is not rediss:", async () => {
      // Arrange
      const { createClient: freshCreateClient } = await import("redis");

      // Act
      const act = () => redisModule.createRedisClient("redis://localhost:6380", true);

      // Assert
      expect(act).toThrow(/REDIS_MI.*redis:/);
      expect(freshCreateClient).not.toHaveBeenCalled();
      expect(factory.createForDefaultAzureCredential).not.toHaveBeenCalled();
    });
  });
});
