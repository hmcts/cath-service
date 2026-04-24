import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deletePendingCaseSubscriptions,
  deletePendingSubscriptions,
  getPendingCaseSubscriptions,
  getPendingSubscriptions,
  savePendingCaseSubscriptions,
  savePendingSubscriptions
} from "./pending-subscriptions-store.js";

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

  describe("savePendingCaseSubscriptions", () => {
    it("should store JSON-encoded case subscriptions under the user case key with TTL", async () => {
      mockRedisClient.set.mockResolvedValue("OK");
      const subscriptions = [{ caseName: "Smith v Jones", caseNumber: "AB-123", searchType: "CASE_NAME" as const, searchValue: "Smith v Jones" }];

      await savePendingCaseSubscriptions(mockRedisClient, "user-123", subscriptions);

      expect(mockRedisClient.set).toHaveBeenCalledWith("pend:case-subs:user-123", JSON.stringify(subscriptions), { EX: TTL_SECONDS });
    });
  });

  describe("getPendingCaseSubscriptions", () => {
    it("should return parsed case subscriptions when a value exists", async () => {
      const subscriptions = [{ caseName: "Smith v Jones", caseNumber: "AB-123", searchType: "CASE_NAME" as const, searchValue: "Smith v Jones" }];
      mockRedisClient.get.mockResolvedValue(JSON.stringify(subscriptions));

      const result = await getPendingCaseSubscriptions(mockRedisClient, "user-123");

      expect(result).toEqual(subscriptions);
      expect(mockRedisClient.get).toHaveBeenCalledWith("pend:case-subs:user-123");
    });

    it("should return null when no value is stored", async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await getPendingCaseSubscriptions(mockRedisClient, "user-123");

      expect(result).toBeNull();
    });

    it("should return null when stored value is not an array", async () => {
      mockRedisClient.get.mockResolvedValue('"not-an-array"');

      const result = await getPendingCaseSubscriptions(mockRedisClient, "user-123");

      expect(result).toBeNull();
    });
  });

  describe("deletePendingCaseSubscriptions", () => {
    it("should delete the case subscriptions key for the given user", async () => {
      mockRedisClient.del.mockResolvedValue(1);

      await deletePendingCaseSubscriptions(mockRedisClient, "user-123");

      expect(mockRedisClient.del).toHaveBeenCalledWith("pend:case-subs:user-123");
    });
  });
});
