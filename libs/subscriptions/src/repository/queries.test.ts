import { prisma } from "@hmcts/postgres-prisma";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  countSubscriptionsByUserId,
  createCaseSubscriptionRecord,
  createSubscriptionRecord,
  deleteSubscriptionRecord,
  deleteSubscriptionsByIds,
  findCaseSubscriptionsByUserId,
  findSubscriptionById,
  findSubscriptionByUserAndLocation,
  findSubscriptionsByLocationId,
  findSubscriptionsByUserId,
  findSubscriptionsWithLocationByIds,
  findSubscriptionsWithLocationByUserId,
  searchByCaseName,
  searchByCaseNumber
} from "./queries.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    subscription: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn()
    },
    artefactSearch: {
      findMany: vi.fn()
    },
    listSearchConfig: {
      findMany: vi.fn()
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
          searchType: "LOCATION_ID",
          searchValue: "456",
          dateAdded: new Date()
        },
        {
          subscriptionId: "sub2",
          userId,
          searchType: "LOCATION_ID",
          searchValue: "789",
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

  describe("findSubscriptionsByLocationId", () => {
    it("should find all subscriptions for a location", async () => {
      const locationId = 456;
      const mockSubscriptions = [
        {
          subscriptionId: "sub1",
          userId: "user123",
          searchType: "LOCATION_ID",
          searchValue: "456",
          dateAdded: new Date()
        },
        {
          subscriptionId: "sub2",
          userId: "user456",
          searchType: "LOCATION_ID",
          searchValue: "456",
          dateAdded: new Date()
        }
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions);

      const result = await findSubscriptionsByLocationId(locationId);

      expect(result).toEqual(mockSubscriptions);
      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: {
          searchType: "LOCATION_ID",
          searchValue: "456"
        },
        orderBy: {
          dateAdded: "desc"
        }
      });
    });

    it("should return empty array when no subscriptions found", async () => {
      const locationId = 456;

      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      const result = await findSubscriptionsByLocationId(locationId);

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
        searchType: "LOCATION_ID",
        searchValue: "456",
        dateAdded: new Date()
      };

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(mockSubscription);

      const result = await findSubscriptionByUserAndLocation(userId, locationId);

      expect(result).toEqual(mockSubscription);
      expect(prisma.subscription.findUnique).toHaveBeenCalledWith({
        where: {
          unique_user_subscription: {
            userId,
            searchType: "LOCATION_ID",
            searchValue: "456"
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
      const userId = "user123";
      const mockSubscription = {
        subscriptionId,
        userId: "user123",
        searchType: "LOCATION_ID",
        searchValue: "456",
        dateAdded: new Date()
      };

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(mockSubscription);

      const result = await findSubscriptionById(subscriptionId, userId);

      expect(result).toEqual(mockSubscription);
      expect(prisma.subscription.findFirst).toHaveBeenCalledWith({
        where: { subscriptionId, userId }
      });
    });

    it("should return null when subscription not found", async () => {
      const subscriptionId = "sub123";
      const userId = "user123";

      vi.mocked(prisma.subscription.findFirst).mockResolvedValue(null);

      const result = await findSubscriptionById(subscriptionId, userId);

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
        searchType: "LOCATION_ID",
        searchValue: "456",
        dateAdded: new Date()
      };

      vi.mocked(prisma.subscription.create).mockResolvedValue(mockSubscription);

      const result = await createSubscriptionRecord(userId, locationId);

      expect(result).toEqual(mockSubscription);
      expect(prisma.subscription.create).toHaveBeenCalledWith({
        data: {
          userId,
          searchType: "LOCATION_ID",
          searchValue: "456"
        }
      });
    });
  });

  describe("deleteSubscriptionRecord", () => {
    it("should delete a subscription", async () => {
      const subscriptionId = "sub1";
      const userId = "user123";

      vi.mocked(prisma.subscription.deleteMany).mockResolvedValue({ count: 1 });

      const result = await deleteSubscriptionRecord(subscriptionId, userId);

      expect(result).toBe(1);
      expect(prisma.subscription.deleteMany).toHaveBeenCalledWith({
        where: { subscriptionId, userId }
      });
    });

    it("should return 0 when subscription not found or user does not own it", async () => {
      const subscriptionId = "sub1";
      const userId = "user123";

      vi.mocked(prisma.subscription.deleteMany).mockResolvedValue({ count: 0 });

      const result = await deleteSubscriptionRecord(subscriptionId, userId);

      expect(result).toBe(0);
    });
  });

  describe("findSubscriptionsWithLocationByUserId", () => {
    it("should find subscriptions with location details", async () => {
      const userId = "user123";
      const mockSubscriptions = [
        {
          subscriptionId: "sub1",
          userId,
          searchType: "LOCATION_ID",
          searchValue: "1",
          dateAdded: new Date("2024-01-01")
        },
        {
          subscriptionId: "sub2",
          userId,
          searchType: "LOCATION_ID",
          searchValue: "2",
          dateAdded: new Date("2024-01-02")
        }
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions);

      const result = await findSubscriptionsWithLocationByUserId(userId);

      expect(result).toEqual(mockSubscriptions);
      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          searchType: "LOCATION_ID"
        },
        orderBy: { dateAdded: "desc" }
      });
    });

    it("should return empty array when no subscriptions found", async () => {
      const userId = "user123";

      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      const result = await findSubscriptionsWithLocationByUserId(userId);

      expect(result).toEqual([]);
    });
  });

  describe("findSubscriptionsWithLocationByIds", () => {
    it("should find subscriptions with location details by IDs", async () => {
      const userId = "user123";
      const subscriptionIds = ["sub-1", "sub-2"];
      const mockSubscriptions = [
        {
          subscriptionId: "sub-1",
          userId: "user123",
          searchType: "LOCATION_ID",
          searchValue: "1",
          dateAdded: new Date("2024-01-01")
        },
        {
          subscriptionId: "sub-2",
          userId: "user123",
          searchType: "LOCATION_ID",
          searchValue: "2",
          dateAdded: new Date("2024-01-02")
        }
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions);

      const result = await findSubscriptionsWithLocationByIds(subscriptionIds, userId);

      expect(result).toEqual(mockSubscriptions);
      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: {
          subscriptionId: { in: subscriptionIds },
          userId,
          searchType: "LOCATION_ID"
        },
        orderBy: { dateAdded: "desc" }
      });
    });

    it("should return empty array when no subscriptions found", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      const result = await findSubscriptionsWithLocationByIds(["sub-1"], "user123");

      expect(result).toEqual([]);
    });
  });

  describe("searchByCaseName", () => {
    it("should search active artefacts for list types with a case name field configured", async () => {
      const mockConfigs = [{ listTypeId: 1 }, { listTypeId: 2 }];
      const mockResults = [
        { caseNumber: "AB-123", caseName: "Smith v Jones" },
        { caseNumber: "AB-456", caseName: "Smith v Crown" }
      ];

      vi.mocked(prisma.listSearchConfig.findMany).mockResolvedValue(mockConfigs as any);
      vi.mocked(prisma.artefactSearch.findMany).mockResolvedValue(mockResults as any);

      const result = await searchByCaseName("Smith");

      expect(result).toEqual(mockResults);
      expect(prisma.listSearchConfig.findMany).toHaveBeenCalledWith({
        where: { caseNameFieldName: { not: "" } },
        select: { listTypeId: true }
      });
      expect(prisma.artefactSearch.findMany).toHaveBeenCalledWith({
        where: {
          caseName: { contains: "Smith", mode: "insensitive" },
          artefact: {
            listTypeId: { in: [1, 2] },
            displayFrom: { lte: expect.any(Date) },
            displayTo: { gte: expect.any(Date) }
          }
        },
        select: { caseNumber: true, caseName: true },
        distinct: ["caseNumber", "caseName"],
        take: 50
      });
    });

    it("should return empty array when no list search configs exist", async () => {
      vi.mocked(prisma.listSearchConfig.findMany).mockResolvedValue([]);

      const result = await searchByCaseName("Smith");

      expect(result).toEqual([]);
      expect(prisma.artefactSearch.findMany).not.toHaveBeenCalled();
    });

    it("should return empty array when no matching artefacts found", async () => {
      vi.mocked(prisma.listSearchConfig.findMany).mockResolvedValue([{ listTypeId: 1 }] as any);
      vi.mocked(prisma.artefactSearch.findMany).mockResolvedValue([]);

      const result = await searchByCaseName("Unknown");

      expect(result).toEqual([]);
    });
  });

  describe("searchByCaseNumber", () => {
    it("should search artefact_search by exact case number", async () => {
      const mockResults = [{ caseNumber: "AB-123", caseName: "Smith v Jones" }];

      vi.mocked(prisma.artefactSearch.findMany).mockResolvedValue(mockResults as any);

      const result = await searchByCaseNumber("AB-123");

      expect(result).toEqual(mockResults);
      expect(prisma.artefactSearch.findMany).toHaveBeenCalledWith({
        where: { caseNumber: "AB-123" },
        select: { caseNumber: true, caseName: true },
        distinct: ["caseNumber", "caseName"]
      });
    });

    it("should return empty array when no match found", async () => {
      vi.mocked(prisma.artefactSearch.findMany).mockResolvedValue([]);

      const result = await searchByCaseNumber("UNKNOWN-999");

      expect(result).toEqual([]);
    });
  });

  describe("createCaseSubscriptionRecord", () => {
    it("should create a case subscription with case fields", async () => {
      const mockSubscription = {
        subscriptionId: "sub1",
        userId: "user123",
        searchType: "CASE_NAME",
        searchValue: "Smith v Jones",
        caseName: "Smith v Jones",
        caseNumber: "AB-123",
        dateAdded: new Date()
      };

      vi.mocked(prisma.subscription.create).mockResolvedValue(mockSubscription as any);

      const result = await createCaseSubscriptionRecord("user123", "CASE_NAME", "Smith v Jones", "Smith v Jones", "AB-123");

      expect(result).toEqual(mockSubscription);
      expect(prisma.subscription.create).toHaveBeenCalledWith({
        data: {
          userId: "user123",
          searchType: "CASE_NAME",
          searchValue: "Smith v Jones",
          caseName: "Smith v Jones",
          caseNumber: "AB-123"
        }
      });
    });
  });

  describe("findCaseSubscriptionsByUserId", () => {
    it("should find case subscriptions for a user", async () => {
      const userId = "user123";
      const mockSubscriptions = [
        {
          subscriptionId: "sub1",
          userId,
          searchType: "CASE_NAME",
          searchValue: "Smith v Jones",
          caseName: "Smith v Jones",
          caseNumber: "AB-123",
          dateAdded: new Date()
        },
        {
          subscriptionId: "sub2",
          userId,
          searchType: "CASE_NUMBER",
          searchValue: "CD-456",
          caseName: "R v Doe",
          caseNumber: "CD-456",
          dateAdded: new Date()
        }
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions as any);

      const result = await findCaseSubscriptionsByUserId(userId);

      expect(result).toEqual(mockSubscriptions);
      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          searchType: { in: ["CASE_NAME", "CASE_NUMBER"] }
        },
        orderBy: { dateAdded: "desc" }
      });
    });

    it("should return empty array when no case subscriptions found", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      const result = await findCaseSubscriptionsByUserId("user123");

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
