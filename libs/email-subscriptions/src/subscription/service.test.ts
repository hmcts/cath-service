import { prisma } from "@hmcts/postgres";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as queries from "./queries.js";
import { createMultipleSubscriptions, createSubscription, getSubscriptionsByUserId, removeSubscription } from "./service.js";
import * as validation from "./validation.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}));

vi.mock("./queries.js");
vi.mock("./validation.js");

describe("Subscription Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createSubscription", () => {
    const userId = "user123";
    const locationId = "456";

    it("should create a new subscription successfully", async () => {
      vi.mocked(validation.validateLocationId).mockResolvedValue(true);
      vi.mocked(queries.findSubscriptionByUserAndLocation).mockResolvedValue(null);
      vi.mocked(queries.countActiveSubscriptionsByUserId).mockResolvedValue(5);
      vi.mocked(queries.createSubscriptionRecord).mockResolvedValue({
        subscriptionId: "sub123",
        userId,
        locationId,
        subscribedAt: new Date(),
        unsubscribedAt: null,
        isActive: true
      });

      const result = await createSubscription(userId, locationId);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.locationId).toBe(locationId);
      expect(validation.validateLocationId).toHaveBeenCalledWith(locationId);
      expect(queries.createSubscriptionRecord).toHaveBeenCalledWith(userId, locationId);
    });

    it("should throw error if location is invalid", async () => {
      vi.mocked(validation.validateLocationId).mockResolvedValue(false);

      await expect(createSubscription(userId, locationId)).rejects.toThrow("Invalid location ID");
    });

    it("should throw error if already subscribed", async () => {
      vi.mocked(validation.validateLocationId).mockResolvedValue(true);
      vi.mocked(queries.findSubscriptionByUserAndLocation).mockResolvedValue({
        subscriptionId: "sub123",
        userId,
        locationId,
        subscribedAt: new Date(),
        unsubscribedAt: null,
        isActive: true
      });

      await expect(createSubscription(userId, locationId)).rejects.toThrow("You are already subscribed to this court");
    });

    it("should throw error if subscription limit reached", async () => {
      vi.mocked(validation.validateLocationId).mockResolvedValue(true);
      vi.mocked(queries.findSubscriptionByUserAndLocation).mockResolvedValue(null);
      vi.mocked(queries.countActiveSubscriptionsByUserId).mockResolvedValue(50);

      await expect(createSubscription(userId, locationId)).rejects.toThrow("Maximum 50 subscriptions allowed");
    });

    it("should reactivate inactive subscription", async () => {
      const inactiveSubscription = {
        subscriptionId: "sub123",
        userId,
        locationId,
        subscribedAt: new Date("2024-01-01"),
        unsubscribedAt: new Date("2024-02-01"),
        isActive: false
      };

      vi.mocked(validation.validateLocationId).mockResolvedValue(true);
      vi.mocked(queries.findSubscriptionByUserAndLocation).mockResolvedValue(inactiveSubscription);
      vi.mocked(queries.countActiveSubscriptionsByUserId).mockResolvedValue(5);
      vi.mocked(prisma.subscription.update).mockResolvedValue({
        ...inactiveSubscription,
        isActive: true,
        subscribedAt: new Date()
      });

      const result = await createSubscription(userId, locationId);

      expect(result.isActive).toBe(true);
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { subscriptionId: inactiveSubscription.subscriptionId },
        data: {
          isActive: true,
          subscribedAt: expect.any(Date)
        }
      });
    });
  });

  describe("getSubscriptionsByUserId", () => {
    it("should return user subscriptions", async () => {
      const userId = "user123";
      const subscriptions = [
        {
          subscriptionId: "sub1",
          userId,
          locationId: "456",
          subscribedAt: new Date(),
          unsubscribedAt: null,
          isActive: true
        }
      ];

      vi.mocked(queries.findActiveSubscriptionsByUserId).mockResolvedValue(subscriptions);

      const result = await getSubscriptionsByUserId(userId);

      expect(result).toEqual(subscriptions);
      expect(queries.findActiveSubscriptionsByUserId).toHaveBeenCalledWith(userId);
    });
  });

  describe("removeSubscription", () => {
    const subscriptionId = "sub123";
    const userId = "user123";

    it("should remove subscription successfully", async () => {
      const subscription = {
        subscriptionId,
        userId,
        locationId: "456",
        subscribedAt: new Date(),
        unsubscribedAt: null,
        isActive: true
      };

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(subscription);
      vi.mocked(queries.deactivateSubscriptionRecord).mockResolvedValue({
        ...subscription,
        isActive: false,
        unsubscribedAt: new Date()
      });

      const result = await removeSubscription(subscriptionId, userId);

      expect(result.isActive).toBe(false);
      expect(queries.deactivateSubscriptionRecord).toHaveBeenCalledWith(subscriptionId);
    });

    it("should throw error if subscription not found", async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null);

      await expect(removeSubscription(subscriptionId, userId)).rejects.toThrow("Subscription not found");
    });

    it("should throw error if user is not the owner", async () => {
      const subscription = {
        subscriptionId,
        userId: "differentUser",
        locationId: "456",
        subscribedAt: new Date(),
        unsubscribedAt: null,
        isActive: true
      };

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(subscription);

      await expect(removeSubscription(subscriptionId, userId)).rejects.toThrow("Unauthorized");
    });

    it("should throw error if subscription already removed", async () => {
      const subscription = {
        subscriptionId,
        userId,
        locationId: "456",
        subscribedAt: new Date(),
        unsubscribedAt: new Date(),
        isActive: false
      };

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(subscription);

      await expect(removeSubscription(subscriptionId, userId)).rejects.toThrow("Subscription already removed");
    });
  });

  describe("createMultipleSubscriptions", () => {
    it("should create multiple subscriptions successfully", async () => {
      const userId = "user123";
      const locationIds = ["456", "789"];

      vi.mocked(validation.validateLocationId).mockResolvedValue(true);
      vi.mocked(queries.findSubscriptionByUserAndLocation).mockResolvedValue(null);
      vi.mocked(queries.countActiveSubscriptionsByUserId).mockResolvedValue(5);
      vi.mocked(queries.createSubscriptionRecord).mockResolvedValue({
        subscriptionId: "sub123",
        userId,
        locationId: "456",
        subscribedAt: new Date(),
        unsubscribedAt: null,
        isActive: true
      });

      const result = await createMultipleSubscriptions(userId, locationIds);

      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle partial failures", async () => {
      const userId = "user123";
      const locationIds = ["456", "789"];

      vi.mocked(validation.validateLocationId).mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      vi.mocked(queries.findSubscriptionByUserAndLocation).mockResolvedValue(null);
      vi.mocked(queries.countActiveSubscriptionsByUserId).mockResolvedValue(5);
      vi.mocked(queries.createSubscriptionRecord).mockResolvedValue({
        subscriptionId: "sub123",
        userId,
        locationId: "456",
        subscribedAt: new Date(),
        unsubscribedAt: null,
        isActive: true
      });

      const result = await createMultipleSubscriptions(userId, locationIds);

      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe("Invalid location ID");
    });
  });
});
