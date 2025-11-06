import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock modules before imports
vi.mock("redis", () => ({
  createClient: vi.fn()
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
  };

  beforeEach(() => {
    // Create mock Redis client
    mockRedisClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      quit: vi.fn().mockResolvedValue(undefined),
      on: vi.fn()
    };

    // Mock createClient to return our mock client
    vi.mocked(createClient).mockReturnValue(mockRedisClient as any);

    // Mock config.get
    vi.mocked(config.get).mockReturnValue("redis://localhost:6379");
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
        url: "redis://localhost:6379"
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
      vi.mocked(config.get).mockReturnValue("redis://custom-host:1234");

      await getRedisClient();

      expect(createClient).toHaveBeenCalledWith({
        url: "redis://custom-host:1234"
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
