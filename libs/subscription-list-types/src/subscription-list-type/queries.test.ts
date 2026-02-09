import { prisma } from "@hmcts/postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  countListTypeSubscriptionsByUserId,
  createListTypeSubscriptionRecord,
  deleteListTypeSubscriptionRecord,
  findDuplicateListTypeSubscription,
  findListTypeSubscriptionById,
  findListTypeSubscriptionsByUserId
} from "./queries.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    subscriptionListType: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn()
    }
  }
}));

describe("List Type Subscription Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findListTypeSubscriptionsByUserId", () => {
    it("should return list of subscriptions for user", async () => {
      const mockSubscriptions = [{ listTypeSubscriptionId: "sub1", userId: "user1", listTypeId: 1, language: "ENGLISH", dateAdded: new Date() }];
      vi.mocked(prisma.subscriptionListType.findMany).mockResolvedValue(mockSubscriptions);

      const result = await findListTypeSubscriptionsByUserId("user1");

      expect(result).toEqual(mockSubscriptions);
      expect(prisma.subscriptionListType.findMany).toHaveBeenCalledWith({
        where: { userId: "user1" },
        orderBy: { dateAdded: "desc" }
      });
    });
  });

  describe("findListTypeSubscriptionById", () => {
    it("should return subscription when found", async () => {
      const mockSubscription = {
        listTypeSubscriptionId: "sub1",
        userId: "user1",
        listTypeId: 1,
        language: "ENGLISH",
        dateAdded: new Date()
      };
      vi.mocked(prisma.subscriptionListType.findFirst).mockResolvedValue(mockSubscription);

      const result = await findListTypeSubscriptionById("sub1", "user1");

      expect(result).toEqual(mockSubscription);
      expect(prisma.subscriptionListType.findFirst).toHaveBeenCalledWith({
        where: {
          listTypeSubscriptionId: "sub1",
          userId: "user1"
        }
      });
    });

    it("should return null when not found", async () => {
      vi.mocked(prisma.subscriptionListType.findFirst).mockResolvedValue(null);

      const result = await findListTypeSubscriptionById("nonexistent", "user1");

      expect(result).toBeNull();
    });
  });

  describe("createListTypeSubscriptionRecord", () => {
    it("should create and return subscription", async () => {
      const mockSubscription = {
        listTypeSubscriptionId: "sub1",
        userId: "user1",
        listTypeId: 1,
        language: "ENGLISH",
        dateAdded: new Date()
      };
      vi.mocked(prisma.subscriptionListType.create).mockResolvedValue(mockSubscription);

      const result = await createListTypeSubscriptionRecord("user1", 1, "ENGLISH");

      expect(result).toEqual(mockSubscription);
      expect(prisma.subscriptionListType.create).toHaveBeenCalledWith({
        data: {
          userId: "user1",
          listTypeId: 1,
          language: "ENGLISH"
        }
      });
    });
  });

  describe("deleteListTypeSubscriptionRecord", () => {
    it("should delete subscription and return count", async () => {
      vi.mocked(prisma.subscriptionListType.deleteMany).mockResolvedValue({ count: 1 });

      const result = await deleteListTypeSubscriptionRecord("sub1", "user1");

      expect(result).toBe(1);
      expect(prisma.subscriptionListType.deleteMany).toHaveBeenCalledWith({
        where: {
          listTypeSubscriptionId: "sub1",
          userId: "user1"
        }
      });
    });

    it("should return 0 when subscription not found", async () => {
      vi.mocked(prisma.subscriptionListType.deleteMany).mockResolvedValue({ count: 0 });

      const result = await deleteListTypeSubscriptionRecord("nonexistent", "user1");

      expect(result).toBe(0);
    });
  });

  describe("countListTypeSubscriptionsByUserId", () => {
    it("should return count of subscriptions", async () => {
      vi.mocked(prisma.subscriptionListType.count).mockResolvedValue(5);

      const result = await countListTypeSubscriptionsByUserId("user1");

      expect(result).toBe(5);
      expect(prisma.subscriptionListType.count).toHaveBeenCalledWith({
        where: { userId: "user1" }
      });
    });
  });

  describe("findDuplicateListTypeSubscription", () => {
    it("should return subscription when duplicate exists", async () => {
      const mockSubscription = {
        listTypeSubscriptionId: "sub1",
        userId: "user1",
        listTypeId: 1,
        language: "ENGLISH",
        dateAdded: new Date()
      };
      vi.mocked(prisma.subscriptionListType.findFirst).mockResolvedValue(mockSubscription);

      const result = await findDuplicateListTypeSubscription("user1", 1, "ENGLISH");

      expect(result).toEqual(mockSubscription);
      expect(prisma.subscriptionListType.findFirst).toHaveBeenCalledWith({
        where: {
          userId: "user1",
          listTypeId: 1,
          language: "ENGLISH"
        }
      });
    });

    it("should return null when no duplicate exists", async () => {
      vi.mocked(prisma.subscriptionListType.findFirst).mockResolvedValue(null);

      const result = await findDuplicateListTypeSubscription("user1", 1, "ENGLISH");

      expect(result).toBeNull();
    });
  });
});
