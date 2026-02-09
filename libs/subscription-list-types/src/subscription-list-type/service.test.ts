import { beforeEach, describe, expect, it, vi } from "vitest";
import * as queries from "./queries.js";
import { createListTypeSubscriptions, deleteListTypeSubscription, getListTypeSubscriptionsByUserId, hasDuplicateSubscription } from "./service.js";

vi.mock("./queries.js", () => ({
  findListTypeSubscriptionsByUserId: vi.fn(),
  findListTypeSubscriptionById: vi.fn(),
  createListTypeSubscriptionRecord: vi.fn(),
  deleteListTypeSubscriptionRecord: vi.fn(),
  countListTypeSubscriptionsByUserId: vi.fn(),
  findDuplicateListTypeSubscription: vi.fn()
}));

describe("List Type Subscription Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createListTypeSubscriptions", () => {
    it("should create multiple subscriptions successfully", async () => {
      const mockSubscription = {
        listTypeSubscriptionId: "sub1",
        userId: "user1",
        listTypeId: 1,
        language: "ENGLISH",
        dateAdded: new Date()
      };

      vi.mocked(queries.countListTypeSubscriptionsByUserId).mockResolvedValue(0);
      vi.mocked(queries.findDuplicateListTypeSubscription).mockResolvedValue(null);
      vi.mocked(queries.createListTypeSubscriptionRecord).mockResolvedValue(mockSubscription);

      const result = await createListTypeSubscriptions("user1", [1, 2], "ENGLISH");

      expect(result).toHaveLength(2);
      expect(queries.countListTypeSubscriptionsByUserId).toHaveBeenCalledWith("user1");
      expect(queries.findDuplicateListTypeSubscription).toHaveBeenCalledTimes(2);
      expect(queries.createListTypeSubscriptionRecord).toHaveBeenCalledTimes(2);
    });

    it("should throw error when max subscriptions reached", async () => {
      vi.mocked(queries.countListTypeSubscriptionsByUserId).mockResolvedValue(50);

      await expect(createListTypeSubscriptions("user1", [1], "ENGLISH")).rejects.toThrow("Maximum 50 list type subscriptions allowed");

      expect(queries.createListTypeSubscriptionRecord).not.toHaveBeenCalled();
    });

    it("should throw error when duplicate subscription exists", async () => {
      const mockSubscription = {
        listTypeSubscriptionId: "sub1",
        userId: "user1",
        listTypeId: 1,
        language: "ENGLISH",
        dateAdded: new Date()
      };

      vi.mocked(queries.countListTypeSubscriptionsByUserId).mockResolvedValue(0);
      vi.mocked(queries.findDuplicateListTypeSubscription).mockResolvedValue(mockSubscription);

      await expect(createListTypeSubscriptions("user1", [1], "ENGLISH")).rejects.toThrow("Already subscribed to list type 1 with language ENGLISH");

      expect(queries.createListTypeSubscriptionRecord).not.toHaveBeenCalled();
    });
  });

  describe("getListTypeSubscriptionsByUserId", () => {
    it("should return subscriptions for user", async () => {
      const mockSubscriptions = [
        {
          listTypeSubscriptionId: "sub1",
          userId: "user1",
          listTypeId: 1,
          language: "ENGLISH",
          dateAdded: new Date()
        }
      ];

      vi.mocked(queries.findListTypeSubscriptionsByUserId).mockResolvedValue(mockSubscriptions);

      const result = await getListTypeSubscriptionsByUserId("user1");

      expect(result).toEqual(mockSubscriptions);
      expect(queries.findListTypeSubscriptionsByUserId).toHaveBeenCalledWith("user1");
    });
  });

  describe("deleteListTypeSubscription", () => {
    it("should delete subscription successfully", async () => {
      const mockSubscription = {
        listTypeSubscriptionId: "sub1",
        userId: "user1",
        listTypeId: 1,
        language: "ENGLISH",
        dateAdded: new Date()
      };

      vi.mocked(queries.findListTypeSubscriptionById).mockResolvedValue(mockSubscription);
      vi.mocked(queries.deleteListTypeSubscriptionRecord).mockResolvedValue(1);

      const result = await deleteListTypeSubscription("user1", "sub1");

      expect(result).toBe(1);
      expect(queries.findListTypeSubscriptionById).toHaveBeenCalledWith("sub1", "user1");
      expect(queries.deleteListTypeSubscriptionRecord).toHaveBeenCalledWith("sub1", "user1");
    });

    it("should throw error when subscription not found", async () => {
      vi.mocked(queries.findListTypeSubscriptionById).mockResolvedValue(null);

      await expect(deleteListTypeSubscription("user1", "nonexistent")).rejects.toThrow("Subscription not found");

      expect(queries.deleteListTypeSubscriptionRecord).not.toHaveBeenCalled();
    });

    it("should throw error when delete fails", async () => {
      const mockSubscription = {
        listTypeSubscriptionId: "sub1",
        userId: "user1",
        listTypeId: 1,
        language: "ENGLISH",
        dateAdded: new Date()
      };

      vi.mocked(queries.findListTypeSubscriptionById).mockResolvedValue(mockSubscription);
      vi.mocked(queries.deleteListTypeSubscriptionRecord).mockResolvedValue(0);

      await expect(deleteListTypeSubscription("user1", "sub1")).rejects.toThrow("Subscription not found");
    });
  });

  describe("hasDuplicateSubscription", () => {
    it("should return true when duplicate exists", async () => {
      const mockSubscription = {
        listTypeSubscriptionId: "sub1",
        userId: "user1",
        listTypeId: 1,
        language: "ENGLISH",
        dateAdded: new Date()
      };

      vi.mocked(queries.findDuplicateListTypeSubscription).mockResolvedValue(mockSubscription);

      const result = await hasDuplicateSubscription("user1", 1, "ENGLISH");

      expect(result).toBe(true);
      expect(queries.findDuplicateListTypeSubscription).toHaveBeenCalledWith("user1", 1, "ENGLISH");
    });

    it("should return false when no duplicate exists", async () => {
      vi.mocked(queries.findDuplicateListTypeSubscription).mockResolvedValue(null);

      const result = await hasDuplicateSubscription("user1", 1, "ENGLISH");

      expect(result).toBe(false);
    });
  });
});
