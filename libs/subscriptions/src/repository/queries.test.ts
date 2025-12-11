import { prisma } from "@hmcts/postgres";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  countSubscriptionsByUserId,
  createSubscriptionRecord,
  deleteSubscriptionRecord,
  deleteSubscriptionsByIds,
  findSubscriptionById,
  findSubscriptionByUserAndLocation,
  findSubscriptionsByIds,
  findSubscriptionsByUserId,
  findSubscriptionsWithLocationByIds,
  findSubscriptionsWithLocationByUserId
} from "./queries.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    subscription: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn()
    },
    $transaction: vi.fn()
  }
}));

describe("Subscription Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("findSubscriptionsByUserId", () => {
    it("should find all subscriptions for a user", async () => {
      const userId = "user123";
      const mockSubscriptions = [
        {
          subscriptionId: "sub1",
          userId,
          locationId: 456,
          dateAdded: new Date()
        },
        {
          subscriptionId: "sub2",
          userId,
          locationId: 789,
          dateAdded: new Date()
        }
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions);

      const result = await findSubscriptionsByUserId(userId);

      expect(result).toEqual(mockSubscriptions);
      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: {
          userId
        },
        orderBy: {
          dateAdded: "desc"
        }
      });
    });

    it("should return empty array when no subscriptions found", async () => {
      const userId = "user123";

      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      const result = await findSubscriptionsByUserId(userId);

      expect(result).toEqual([]);
    });
  });

  describe("findSubscriptionByUserAndLocation", () => {
    it("should find subscription by user and location", async () => {
      const userId = "user123";
      const locationId = 456;
      const mockSubscription = {
        subscriptionId: "sub1",
        userId,
        locationId,
        dateAdded: new Date()
      };

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);

      const result = await findSubscriptionByUserAndLocation(userId, locationId);

      expect(result).toEqual(mockSubscription);
      expect(prisma.subscription.findUnique).toHaveBeenCalledWith({
        where: {
          unique_user_location: {
            userId,
            locationId
          }
        }
      });
    });

    it("should return null when subscription not found", async () => {
      const userId = "user123";
      const locationId = 456;

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);

      const result = await findSubscriptionByUserAndLocation(userId, locationId);

      expect(result).toBeNull();
    });
  });

  describe("findSubscriptionById", () => {
    it("should find subscription by ID", async () => {
      const subscriptionId = "sub123";
      const mockSubscription = {
        subscriptionId,
        userId: "user123",
        locationId: 456,
        dateAdded: new Date()
      };

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);

      const result = await findSubscriptionById(subscriptionId);

      expect(result).toEqual(mockSubscription);
      expect(prisma.subscription.findUnique).toHaveBeenCalledWith({
        where: { subscriptionId }
      });
    });

    it("should return null when subscription not found", async () => {
      const subscriptionId = "sub123";

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);

      const result = await findSubscriptionById(subscriptionId);

      expect(result).toBeNull();
    });
  });

  describe("countSubscriptionsByUserId", () => {
    it("should count subscriptions for a user", async () => {
      const userId = "user123";

      vi.mocked(prisma.subscription.count).mockResolvedValue(5);

      const result = await countSubscriptionsByUserId(userId);

      expect(result).toBe(5);
      expect(prisma.subscription.count).toHaveBeenCalledWith({
        where: {
          userId
        }
      });
    });

    it("should return 0 when no subscriptions found", async () => {
      const userId = "user123";

      vi.mocked(prisma.subscription.count).mockResolvedValue(0);

      const result = await countSubscriptionsByUserId(userId);

      expect(result).toBe(0);
    });
  });

  describe("createSubscriptionRecord", () => {
    it("should create a new subscription", async () => {
      const userId = "user123";
      const locationId = 456;
      const mockSubscription = {
        subscriptionId: "sub1",
        userId,
        locationId,
        dateAdded: new Date()
      };

      vi.mocked(prisma.subscription.create).mockResolvedValue(mockSubscription);

      const result = await createSubscriptionRecord(userId, locationId);

      expect(result).toEqual(mockSubscription);
      expect(prisma.subscription.create).toHaveBeenCalledWith({
        data: {
          userId,
          locationId
        }
      });
    });
  });

  describe("deleteSubscriptionRecord", () => {
    it("should delete a subscription", async () => {
      const subscriptionId = "sub1";
      const mockSubscription = {
        subscriptionId,
        userId: "user123",
        locationId: 456,
        dateAdded: new Date()
      };

      vi.mocked(prisma.subscription.delete).mockResolvedValue(mockSubscription);

      const result = await deleteSubscriptionRecord(subscriptionId);

      expect(result).toEqual(mockSubscription);
      expect(prisma.subscription.delete).toHaveBeenCalledWith({
        where: { subscriptionId }
      });
    });
  });

  describe("findSubscriptionsWithLocationByUserId", () => {
    it("should find subscriptions with location details", async () => {
      const userId = "user123";
      const mockSubscriptions = [
        {
          subscriptionId: "sub1",
          userId,
          locationId: 1,
          dateAdded: new Date("2024-01-01"),
          location: {
            locationId: 1,
            name: "Birmingham Crown Court",
            welshName: "Welsh Birmingham Crown Court"
          }
        },
        {
          subscriptionId: "sub2",
          userId,
          locationId: 2,
          dateAdded: new Date("2024-01-02"),
          location: {
            locationId: 2,
            name: "Manchester Crown Court",
            welshName: null
          }
        }
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions);

      const result = await findSubscriptionsWithLocationByUserId(userId);

      expect(result).toEqual(mockSubscriptions);
      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { dateAdded: "desc" },
        include: { location: true }
      });
    });

    it("should return empty array when no subscriptions found", async () => {
      const userId = "user123";

      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      const result = await findSubscriptionsWithLocationByUserId(userId);

      expect(result).toEqual([]);
    });
  });

  describe("findSubscriptionsByIds", () => {
    it("should find subscriptions by multiple IDs", async () => {
      const subscriptionIds = ["sub-1", "sub-2"];
      const mockSubscriptions = [
        { subscriptionId: "sub-1", userId: "user123" },
        { subscriptionId: "sub-2", userId: "user123" }
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions);

      const result = await findSubscriptionsByIds(subscriptionIds);

      expect(result).toEqual(mockSubscriptions);
      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: { subscriptionId: { in: subscriptionIds } },
        select: { subscriptionId: true, userId: true }
      });
    });

    it("should return empty array when no subscriptions found", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      const result = await findSubscriptionsByIds(["sub-1"]);

      expect(result).toEqual([]);
    });
  });

  describe("findSubscriptionsWithLocationByIds", () => {
    it("should find subscriptions with location details by IDs", async () => {
      const subscriptionIds = ["sub-1", "sub-2"];
      const mockSubscriptions = [
        {
          subscriptionId: "sub-1",
          userId: "user123",
          locationId: 1,
          dateAdded: new Date("2024-01-01"),
          location: {
            locationId: 1,
            name: "Birmingham Crown Court",
            welshName: "Welsh Birmingham Crown Court"
          }
        },
        {
          subscriptionId: "sub-2",
          userId: "user123",
          locationId: 2,
          dateAdded: new Date("2024-01-02"),
          location: {
            locationId: 2,
            name: "Manchester Crown Court",
            welshName: null
          }
        }
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions);

      const result = await findSubscriptionsWithLocationByIds(subscriptionIds);

      expect(result).toEqual(mockSubscriptions);
      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: { subscriptionId: { in: subscriptionIds } },
        orderBy: { dateAdded: "desc" },
        include: { location: true }
      });
    });

    it("should return empty array when no subscriptions found", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      const result = await findSubscriptionsWithLocationByIds(["sub-1"]);

      expect(result).toEqual([]);
    });
  });

  describe("deleteSubscriptionsByIds", () => {
    it("should delete multiple subscriptions in a transaction", async () => {
      const subscriptionIds = ["sub-1", "sub-2"];
      const userId = "user123";
      const mockDeleteResult = { count: 2 };

      const mockTransaction = vi.fn(async (callback) => {
        const tx = {
          subscription: {
            deleteMany: vi.fn().mockResolvedValue(mockDeleteResult)
          }
        };
        return callback(tx);
      });

      vi.mocked(prisma.$transaction).mockImplementation(mockTransaction);

      const result = await deleteSubscriptionsByIds(subscriptionIds, userId);

      expect(result).toBe(2);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it("should return 0 when no subscriptions match deletion criteria", async () => {
      const subscriptionIds = ["sub-1"];
      const userId = "user123";
      const mockDeleteResult = { count: 0 };

      const mockTransaction = vi.fn(async (callback) => {
        const tx = {
          subscription: {
            deleteMany: vi.fn().mockResolvedValue(mockDeleteResult)
          }
        };
        return callback(tx);
      });

      vi.mocked(prisma.$transaction).mockImplementation(mockTransaction);

      const result = await deleteSubscriptionsByIds(subscriptionIds, userId);

      expect(result).toBe(0);
    });

    it("should handle transaction errors", async () => {
      const subscriptionIds = ["sub-1"];
      const userId = "user123";

      const mockTransaction = vi.fn(async () => {
        throw new Error("Database error");
      });

      vi.mocked(prisma.$transaction).mockImplementation(mockTransaction);

      await expect(deleteSubscriptionsByIds(subscriptionIds, userId)).rejects.toThrow("Database error");
    });
  });
});
