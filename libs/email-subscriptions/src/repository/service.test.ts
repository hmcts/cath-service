import { prisma } from "@hmcts/postgres";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as validation from "../validation/validation.js";
import * as queries from "./queries.js";
import { createMultipleSubscriptions, createSubscription, getSubscriptionsByUserId, removeSubscription, replaceUserSubscriptions } from "./service.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}));

vi.mock("./queries.js");
vi.mock("../validation/validation.js");

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
      vi.mocked(queries.countSubscriptionsByUserId).mockResolvedValue(5);
      vi.mocked(queries.createSubscriptionRecord).mockResolvedValue({
        subscriptionId: "sub123",
        userId,
        locationId,
        dateAdded: new Date()
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
        dateAdded: new Date()
      });

      await expect(createSubscription(userId, locationId)).rejects.toThrow("You are already subscribed to this court");
    });

    it("should throw error if subscription limit reached", async () => {
      vi.mocked(validation.validateLocationId).mockResolvedValue(true);
      vi.mocked(queries.findSubscriptionByUserAndLocation).mockResolvedValue(null);
      vi.mocked(queries.countSubscriptionsByUserId).mockResolvedValue(50);

      await expect(createSubscription(userId, locationId)).rejects.toThrow("Maximum 50 subscriptions allowed");
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
          dateAdded: new Date()
        }
      ];

      vi.mocked(queries.findSubscriptionsByUserId).mockResolvedValue(subscriptions);

      const result = await getSubscriptionsByUserId(userId);

      expect(result).toEqual(subscriptions);
      expect(queries.findSubscriptionsByUserId).toHaveBeenCalledWith(userId);
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
        dateAdded: new Date()
      };

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(subscription);
      vi.mocked(queries.deleteSubscriptionRecord).mockResolvedValue(subscription);

      const result = await removeSubscription(subscriptionId, userId);

      expect(result).toBeDefined();
      expect(queries.deleteSubscriptionRecord).toHaveBeenCalledWith(subscriptionId);
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
        dateAdded: new Date()
      };

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(subscription);

      await expect(removeSubscription(subscriptionId, userId)).rejects.toThrow("Unauthorized");
    });
  });

  describe("createMultipleSubscriptions", () => {
    it("should create multiple subscriptions successfully", async () => {
      const userId = "user123";
      const locationIds = ["456", "789"];

      vi.mocked(validation.validateLocationId).mockResolvedValue(true);
      vi.mocked(queries.findSubscriptionByUserAndLocation).mockResolvedValue(null);
      vi.mocked(queries.countSubscriptionsByUserId).mockResolvedValue(5);
      vi.mocked(queries.createSubscriptionRecord).mockResolvedValue({
        subscriptionId: "sub123",
        userId,
        locationId: "456",
        dateAdded: new Date()
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
      vi.mocked(queries.countSubscriptionsByUserId).mockResolvedValue(5);
      vi.mocked(queries.createSubscriptionRecord).mockResolvedValue({
        subscriptionId: "sub123",
        userId,
        locationId: "456",
        dateAdded: new Date()
      });

      const result = await createMultipleSubscriptions(userId, locationIds);

      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe("Invalid location ID");
    });
  });

  describe("replaceUserSubscriptions", () => {
    const userId = "user123";

    it("should replace subscriptions by adding new and removing old", async () => {
      const existingSubscriptions = [
        { subscriptionId: "sub1", userId, locationId: "456", dateAdded: new Date() },
        { subscriptionId: "sub2", userId, locationId: "789", dateAdded: new Date() }
      ];
      const newLocationIds = ["789", "101"];

      vi.mocked(queries.findSubscriptionsByUserId).mockResolvedValue(existingSubscriptions);
      vi.mocked(validation.validateLocationId).mockResolvedValue(true);
      vi.mocked(queries.deleteSubscriptionRecord).mockResolvedValue(existingSubscriptions[0]);
      vi.mocked(queries.createSubscriptionRecord).mockResolvedValue({
        subscriptionId: "sub3",
        userId,
        locationId: "101",
        dateAdded: new Date()
      });

      const result = await replaceUserSubscriptions(userId, newLocationIds);

      expect(result.added).toBe(1);
      expect(result.removed).toBe(1);
      expect(queries.deleteSubscriptionRecord).toHaveBeenCalledWith("sub1");
      expect(queries.createSubscriptionRecord).toHaveBeenCalledWith(userId, "101");
    });

    it("should only add subscriptions when no existing ones", async () => {
      const newLocationIds = ["456", "789"];

      vi.mocked(queries.findSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(validation.validateLocationId).mockResolvedValue(true);
      vi.mocked(queries.createSubscriptionRecord).mockResolvedValue({
        subscriptionId: "sub1",
        userId,
        locationId: "456",
        dateAdded: new Date()
      });

      const result = await replaceUserSubscriptions(userId, newLocationIds);

      expect(result.added).toBe(2);
      expect(result.removed).toBe(0);
      expect(queries.deleteSubscriptionRecord).not.toHaveBeenCalled();
    });

    it("should only remove subscriptions when new list is empty", async () => {
      const existingSubscriptions = [
        { subscriptionId: "sub1", userId, locationId: "456", dateAdded: new Date() },
        { subscriptionId: "sub2", userId, locationId: "789", dateAdded: new Date() }
      ];

      vi.mocked(queries.findSubscriptionsByUserId).mockResolvedValue(existingSubscriptions);
      vi.mocked(queries.deleteSubscriptionRecord).mockResolvedValue(existingSubscriptions[0]);

      const result = await replaceUserSubscriptions(userId, []);

      expect(result.added).toBe(0);
      expect(result.removed).toBe(2);
      expect(queries.deleteSubscriptionRecord).toHaveBeenCalledTimes(2);
      expect(queries.createSubscriptionRecord).not.toHaveBeenCalled();
    });

    it("should throw error when exceeding max subscriptions", async () => {
      const existingSubscriptions = Array.from({ length: 48 }, (_, i) => ({
        subscriptionId: `sub${i}`,
        userId,
        locationId: `${i}`,
        dateAdded: new Date()
      }));
      // Keep all existing 48 and try to add 3 new ones = 51 total
      const newLocationIds = [...Array.from({ length: 48 }, (_, i) => `${i}`), "456", "789", "101"];

      vi.mocked(queries.findSubscriptionsByUserId).mockResolvedValue(existingSubscriptions);
      vi.mocked(validation.validateLocationId).mockResolvedValue(true);

      await expect(replaceUserSubscriptions(userId, newLocationIds)).rejects.toThrow("Maximum 50 subscriptions allowed");
    });

    it("should throw error for invalid location ID", async () => {
      const newLocationIds = ["456", "invalid"];

      vi.mocked(queries.findSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(validation.validateLocationId).mockReturnValue(false);

      await expect(replaceUserSubscriptions(userId, newLocationIds)).rejects.toThrow("Invalid location ID");
    });

    it("should keep same subscriptions when lists match", async () => {
      const existingSubscriptions = [
        { subscriptionId: "sub1", userId, locationId: "456", dateAdded: new Date() },
        { subscriptionId: "sub2", userId, locationId: "789", dateAdded: new Date() }
      ];
      const newLocationIds = ["456", "789"];

      vi.mocked(queries.findSubscriptionsByUserId).mockResolvedValue(existingSubscriptions);

      const result = await replaceUserSubscriptions(userId, newLocationIds);

      expect(result.added).toBe(0);
      expect(result.removed).toBe(0);
      expect(queries.deleteSubscriptionRecord).not.toHaveBeenCalled();
      expect(queries.createSubscriptionRecord).not.toHaveBeenCalled();
    });
  });
});
