import { prisma } from "@hmcts/postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as queries from "./queries.js";
import { createListTypeSubscriptions, deleteListTypeSubscription, getListTypeSubscriptionsByUserId, hasExistingSubscription } from "./service.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    $transaction: vi.fn()
  }
}));

vi.mock("./queries.js", () => ({
  findListTypeSubscriptionsByUserId: vi.fn(),
  findListTypeSubscriptionById: vi.fn(),
  createListTypeSubscriptionRecord: vi.fn(),
  deleteListTypeSubscriptionRecord: vi.fn(),
  countListTypeSubscriptionsByUserId: vi.fn(),
  findExistingListTypeSubscription: vi.fn(),
  updateListTypeSubscriptionLanguage: vi.fn()
}));

describe("List Type Subscription Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock transaction to execute the callback immediately
    vi.mocked(prisma.$transaction).mockImplementation((callback: any) => callback(prisma));
  });

  describe("createListTypeSubscriptions", () => {
    it("should create multiple subscriptions successfully", async () => {
      const mockSubscription1 = {
        listTypeSubscriptionId: "sub1",
        userId: "user1",
        listTypeId: 1,
        language: ["ENGLISH"],
        dateAdded: new Date()
      };
      const mockSubscription2 = {
        listTypeSubscriptionId: "sub2",
        userId: "user1",
        listTypeId: 2,
        language: ["ENGLISH"],
        dateAdded: new Date()
      };

      vi.mocked(queries.findExistingListTypeSubscription).mockResolvedValue(null);
      vi.mocked(queries.countListTypeSubscriptionsByUserId).mockResolvedValue(0);
      vi.mocked(queries.createListTypeSubscriptionRecord).mockResolvedValue(mockSubscription1);
      vi.mocked(queries.findListTypeSubscriptionsByUserId).mockResolvedValue([mockSubscription1, mockSubscription2]);

      const result = await createListTypeSubscriptions("user1", [1, 2], ["ENGLISH"]);

      expect(result).toHaveLength(2);
      expect(queries.findExistingListTypeSubscription).toHaveBeenCalledTimes(2);
      expect(queries.createListTypeSubscriptionRecord).toHaveBeenCalledTimes(2);
      expect(queries.updateListTypeSubscriptionLanguage).not.toHaveBeenCalled();
    });


    it("should update language when subscription already exists", async () => {
      const existingSubscription = {
        listTypeSubscriptionId: "sub1",
        userId: "user1",
        listTypeId: 1,
        language: ["ENGLISH"],
        dateAdded: new Date()
      };
      const updatedSubscription = {
        ...existingSubscription,
        language: ["ENGLISH", "WELSH"]
      };

      vi.mocked(queries.findExistingListTypeSubscription).mockResolvedValue(existingSubscription);
      vi.mocked(queries.countListTypeSubscriptionsByUserId).mockResolvedValue(1);
      vi.mocked(queries.updateListTypeSubscriptionLanguage).mockResolvedValue({ count: 1 });
      vi.mocked(queries.findListTypeSubscriptionsByUserId).mockResolvedValue([updatedSubscription]);

      const result = await createListTypeSubscriptions("user1", [1], ["ENGLISH", "WELSH"]);

      expect(result).toHaveLength(1);
      expect(queries.updateListTypeSubscriptionLanguage).toHaveBeenCalledWith("user1", 1, ["ENGLISH", "WELSH"], expect.any(Object));
      expect(queries.createListTypeSubscriptionRecord).not.toHaveBeenCalled();
    });

    it("should de-duplicate input list type IDs", async () => {
      const mockSubscriptions = [
        {
          listTypeSubscriptionId: "sub1",
          userId: "user1",
          listTypeId: 1,
          language: ["ENGLISH", "WELSH"],
          dateAdded: new Date()
        },
        {
          listTypeSubscriptionId: "sub2",
          userId: "user1",
          listTypeId: 2,
          language: ["ENGLISH", "WELSH"],
          dateAdded: new Date()
        },
        {
          listTypeSubscriptionId: "sub3",
          userId: "user1",
          listTypeId: 3,
          language: ["ENGLISH", "WELSH"],
          dateAdded: new Date()
        }
      ];

      vi.mocked(queries.findExistingListTypeSubscription).mockResolvedValue(null);
      vi.mocked(queries.countListTypeSubscriptionsByUserId).mockResolvedValue(0);
      vi.mocked(queries.createListTypeSubscriptionRecord).mockResolvedValue(mockSubscriptions[0]);
      vi.mocked(queries.findListTypeSubscriptionsByUserId).mockResolvedValue(mockSubscriptions);

      const result = await createListTypeSubscriptions("user1", [1, 2, 1, 3, 2], ["ENGLISH", "WELSH"]);

      expect(result).toHaveLength(3);
      expect(queries.createListTypeSubscriptionRecord).toHaveBeenCalledTimes(3);
      expect(queries.findExistingListTypeSubscription).toHaveBeenCalledTimes(3);
    });

    it("should update existing and create new subscriptions in same call", async () => {
      const existingSubscription = {
        listTypeSubscriptionId: "sub1",
        userId: "user1",
        listTypeId: 1,
        language: ["ENGLISH"],
        dateAdded: new Date()
      };
      const newSubscription = {
        listTypeSubscriptionId: "sub2",
        userId: "user1",
        listTypeId: 2,
        language: ["WELSH"],
        dateAdded: new Date()
      };

      vi.mocked(queries.findExistingListTypeSubscription)
        .mockResolvedValueOnce(existingSubscription)
        .mockResolvedValueOnce(null);
      vi.mocked(queries.countListTypeSubscriptionsByUserId).mockResolvedValue(1);
      vi.mocked(queries.updateListTypeSubscriptionLanguage).mockResolvedValue({ count: 1 });
      vi.mocked(queries.createListTypeSubscriptionRecord).mockResolvedValue(newSubscription);
      vi.mocked(queries.findListTypeSubscriptionsByUserId).mockResolvedValue([
        { ...existingSubscription, language: ["WELSH"] },
        newSubscription
      ]);

      const result = await createListTypeSubscriptions("user1", [1, 2], ["WELSH"]);

      expect(result).toHaveLength(2);
      expect(queries.updateListTypeSubscriptionLanguage).toHaveBeenCalledWith("user1", 1, ["WELSH"], expect.any(Object));
      expect(queries.createListTypeSubscriptionRecord).toHaveBeenCalledWith("user1", 2, ["WELSH"], expect.any(Object));
    });
  });

  describe("getListTypeSubscriptionsByUserId", () => {
    it("should return subscriptions for user", async () => {
      const mockSubscriptions = [
        {
          listTypeSubscriptionId: "sub1",
          userId: "user1",
          listTypeId: 1,
          language: ["ENGLISH"],
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
        language: ["ENGLISH"],
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
        language: ["ENGLISH"],
        dateAdded: new Date()
      };

      vi.mocked(queries.findListTypeSubscriptionById).mockResolvedValue(mockSubscription);
      vi.mocked(queries.deleteListTypeSubscriptionRecord).mockResolvedValue(0);

      await expect(deleteListTypeSubscription("user1", "sub1")).rejects.toThrow("Subscription not found");
    });
  });

  describe("hasExistingSubscription", () => {
    it("should return true when subscription exists", async () => {
      const mockSubscription = {
        listTypeSubscriptionId: "sub1",
        userId: "user1",
        listTypeId: 1,
        language: ["ENGLISH"],
        dateAdded: new Date()
      };

      vi.mocked(queries.findExistingListTypeSubscription).mockResolvedValue(mockSubscription);

      const result = await hasExistingSubscription("user1", 1);

      expect(result).toBe(true);
      expect(queries.findExistingListTypeSubscription).toHaveBeenCalledWith("user1", 1);
    });

    it("should return false when subscription does not exist", async () => {
      vi.mocked(queries.findExistingListTypeSubscription).mockResolvedValue(null);

      const result = await hasExistingSubscription("user1", 1);

      expect(result).toBe(false);
    });
  });
});
