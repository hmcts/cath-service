import { beforeEach, describe, expect, it, vi } from "vitest";
import { deletePendingSubscriptions, getPendingSubscriptions, savePendingSubscriptions } from "./pending-subscriptions-store.js";

const TTL_SECONDS = 30 * 24 * 60 * 60;

describe("pending-subscriptions-store", () => {
  const mockRedisClient = {
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("savePendingSubscriptions", () => {
    it("should store JSON-encoded location IDs under the user key with TTL", async () => {
      mockRedisClient.set.mockResolvedValue("OK");

      await savePendingSubscriptions(mockRedisClient, "user-123", ["loc-1", "loc-2"]);

      expect(mockRedisClient.set).toHaveBeenCalledWith("pend:subs:user-123", '["loc-1","loc-2"]', { EX: TTL_SECONDS });
    });
  });

  describe("getPendingSubscriptions", () => {
    it("should return parsed location IDs when a value exists", async () => {
      mockRedisClient.get.mockResolvedValue('["loc-1","loc-2"]');

      const result = await getPendingSubscriptions(mockRedisClient, "user-123");

      expect(result).toEqual(["loc-1", "loc-2"]);
      expect(mockRedisClient.get).toHaveBeenCalledWith("pend:subs:user-123");
    });

    it("should return null when no value is stored", async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await getPendingSubscriptions(mockRedisClient, "user-123");

      expect(result).toBeNull();
    });
  });

  describe("deletePendingSubscriptions", () => {
    it("should delete the key for the given user", async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await deletePendingSubscriptions(mockRedisClient, "user-123");

      expect(mockRedisClient.del).toHaveBeenCalledWith("pend:subs:user-123");
    });
  });
});
