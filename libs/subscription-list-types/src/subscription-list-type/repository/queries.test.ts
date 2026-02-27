import { prisma } from "@hmcts/postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  countListTypeSubscriptionsByUserId,
  createListTypeSubscriptionRecord,
  deleteListTypeSubscriptionRecord,
  findActiveSubscriptionsByListType,
  findExistingListTypeSubscription,
  findListTypeSubscriptionById,
  findListTypeSubscriptionsByUserId,
  updateListTypeSubscriptionLanguage
} from "./queries.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    subscriptionListType: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
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
      const mockSubscriptions = [{ listTypeSubscriptionId: "sub1", userId: "user1", listTypeId: 1, language: ["ENGLISH"], dateAdded: new Date() }];
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
        language: ["ENGLISH"],
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
        language: ["ENGLISH", "WELSH"],
        dateAdded: new Date()
      };
      vi.mocked(prisma.subscriptionListType.create).mockResolvedValue(mockSubscription);

      const result = await createListTypeSubscriptionRecord("user1", 1, ["ENGLISH", "WELSH"]);

      expect(result).toEqual(mockSubscription);
      expect(prisma.subscriptionListType.create).toHaveBeenCalledWith({
        data: {
          userId: "user1",
          listTypeId: 1,
          language: ["ENGLISH", "WELSH"]
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

  describe("findExistingListTypeSubscription", () => {
    it("should return subscription when it exists", async () => {
      const mockSubscription = {
        listTypeSubscriptionId: "sub1",
        userId: "user1",
        listTypeId: 1,
        language: ["ENGLISH"],
        dateAdded: new Date()
      };
      vi.mocked(prisma.subscriptionListType.findFirst).mockResolvedValue(mockSubscription);

      const result = await findExistingListTypeSubscription("user1", 1);

      expect(result).toEqual(mockSubscription);
      expect(prisma.subscriptionListType.findFirst).toHaveBeenCalledWith({
        where: {
          userId: "user1",
          listTypeId: 1
        }
      });
    });

    it("should return null when subscription does not exist", async () => {
      vi.mocked(prisma.subscriptionListType.findFirst).mockResolvedValue(null);

      const result = await findExistingListTypeSubscription("user1", 1);

      expect(result).toBeNull();
    });
  });

  describe("updateListTypeSubscriptionLanguage", () => {
    it("should update language for existing subscription", async () => {
      vi.mocked(prisma.subscriptionListType.updateMany).mockResolvedValue({ count: 1 });

      await updateListTypeSubscriptionLanguage("user1", 1, ["ENGLISH", "WELSH"]);

      expect(prisma.subscriptionListType.updateMany).toHaveBeenCalledWith({
        where: {
          userId: "user1",
          listTypeId: 1
        },
        data: {
          language: ["ENGLISH", "WELSH"]
        }
      });
    });
  });

  describe("findActiveSubscriptionsByListType", () => {
    it("should return active subscriptions for list type and language", async () => {
      const mockSubscriptions = [
        {
          listTypeSubscriptionId: "sub1",
          userId: "user1",
          listTypeId: 1,
          language: ["ENGLISH"],
          dateAdded: new Date(),
          user: {
            userId: "user1",
            email: "user1@example.com",
            firstName: "John",
            surname: "Doe"
          }
        }
      ];
      vi.mocked(prisma.subscriptionListType.findMany).mockResolvedValue(mockSubscriptions);

      const result = await findActiveSubscriptionsByListType(1, "ENGLISH");

      expect(result).toEqual(mockSubscriptions);
      expect(prisma.subscriptionListType.findMany).toHaveBeenCalledWith({
        where: {
          listTypeId: 1,
          language: {
            has: "ENGLISH"
          }
        },
        include: {
          user: {
            select: {
              userId: true,
              email: true,
              firstName: true,
              surname: true
            }
          }
        }
      });
    });

    it("should return subscriptions for users who want both languages", async () => {
      const mockSubscriptions = [
        {
          listTypeSubscriptionId: "sub2",
          userId: "user2",
          listTypeId: 1,
          language: ["ENGLISH", "WELSH"],
          dateAdded: new Date(),
          user: {
            userId: "user2",
            email: "user2@example.com",
            firstName: "Jane",
            surname: "Smith"
          }
        }
      ];
      vi.mocked(prisma.subscriptionListType.findMany).mockResolvedValue(mockSubscriptions);

      const result = await findActiveSubscriptionsByListType(1, "WELSH");

      expect(result).toEqual(mockSubscriptions);
      expect(prisma.subscriptionListType.findMany).toHaveBeenCalledWith({
        where: {
          listTypeId: 1,
          language: {
            has: "WELSH"
          }
        },
        include: {
          user: {
            select: {
              userId: true,
              email: true,
              firstName: true,
              surname: true
            }
          }
        }
      });
    });

    it("should return empty array when no active subscriptions", async () => {
      vi.mocked(prisma.subscriptionListType.findMany).mockResolvedValue([]);

      const result = await findActiveSubscriptionsByListType(1, "ENGLISH");

      expect(result).toEqual([]);
    });
  });
});
