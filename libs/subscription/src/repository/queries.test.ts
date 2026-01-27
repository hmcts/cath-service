import { prisma } from "@hmcts/postgres";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  countSubscriptionsByUserId,
  createSubscription,
  createSubscriptionRecord,
  deleteSubscription,
  deleteSubscriptionRecord,
  deleteSubscriptionsByIds,
  findActiveSubscriptionsByCaseNames,
  findActiveSubscriptionsByCaseNumbers,
  findActiveSubscriptionsByLocation,
  findByUserId,
  findByUserIdAndType,
  findSubscriptionById,
  findSubscriptionByUserAndLocation,
  findSubscriptionsByLocationId,
  findSubscriptionsByUserId,
  findSubscriptionsWithLocationByIds,
  findSubscriptionsWithLocationByUserId
} from "./queries.js";

vi.mock("@hmcts/postgres", () => ({
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

  describe("findByUserId", () => {
    it("should find all subscriptions for a user", async () => {
      const userId = "user123";
      const mockSubscriptions = [
        {
          subscriptionId: "sub1",
          userId,
          searchType: "LOCATION_ID",
          searchValue: "456",
          caseName: null,
          caseNumber: null,
          dateAdded: new Date()
        },
        {
          subscriptionId: "sub2",
          userId,
          searchType: "CASE_NUMBER",
          searchValue: "CASE123",
          caseName: "Test Case",
          caseNumber: "CASE123",
          dateAdded: new Date()
        }
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions);

      const result = await findByUserId(userId);

      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: {
          userId
        },
        orderBy: {
          dateAdded: "desc"
        }
      });
      expect(result).toEqual(mockSubscriptions);
    });
  });

  describe("findByUserIdAndType", () => {
    it("should find subscriptions for a user by type", async () => {
      const userId = "user123";
      const searchType = "CASE_NUMBER";
      const mockSubscriptions = [
        {
          subscriptionId: "sub1",
          userId,
          searchType,
          searchValue: "CASE123",
          caseName: "Test Case",
          caseNumber: "CASE123",
          dateAdded: new Date()
        }
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions);

      const result = await findByUserIdAndType(userId, searchType);

      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          searchType
        },
        orderBy: {
          dateAdded: "desc"
        }
      });
      expect(result).toEqual(mockSubscriptions);
    });

    it("should return empty array when no subscriptions found", async () => {
      const userId = "user123";
      const searchType = "CASE_NUMBER";

      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      const result = await findByUserIdAndType(userId, searchType);

      expect(result).toEqual([]);
    });
  });

  describe("createSubscription", () => {
    it("should create a case subscription with all fields", async () => {
      const userId = "user123";
      const searchType = "CASE_NUMBER";
      const searchValue = "CASE123";
      const caseName = "Test Case";
      const caseNumber = "CASE123";

      const mockSubscription = {
        subscriptionId: "sub1",
        userId,
        searchType,
        searchValue,
        caseName,
        caseNumber,
        dateAdded: new Date()
      };

      vi.mocked(prisma.subscription.create).mockResolvedValue(mockSubscription);

      const result = await createSubscription(userId, searchType, searchValue, caseName, caseNumber);

      expect(prisma.subscription.create).toHaveBeenCalledWith({
        data: {
          userId,
          searchType,
          searchValue,
          caseName,
          caseNumber
        }
      });
      expect(result).toEqual(mockSubscription);
    });

    it("should create a subscription with null case fields", async () => {
      const userId = "user123";
      const searchType = "LOCATION_ID";
      const searchValue = "456";

      const mockSubscription = {
        subscriptionId: "sub1",
        userId,
        searchType,
        searchValue,
        caseName: null,
        caseNumber: null,
        dateAdded: new Date()
      };

      vi.mocked(prisma.subscription.create).mockResolvedValue(mockSubscription);

      const result = await createSubscription(userId, searchType, searchValue, null, null);

      expect(prisma.subscription.create).toHaveBeenCalledWith({
        data: {
          userId,
          searchType,
          searchValue,
          caseName: null,
          caseNumber: null
        }
      });
      expect(result).toEqual(mockSubscription);
    });
  });

  describe("deleteSubscription", () => {
    it("should delete a subscription by id", async () => {
      const subscriptionId = "sub1";
      const mockSubscription = {
        subscriptionId,
        userId: "user123",
        searchType: "CASE_NUMBER",
        searchValue: "CASE123",
        caseName: "Test Case",
        caseNumber: "CASE123",
        dateAdded: new Date()
      };

      vi.mocked(prisma.subscription.delete).mockResolvedValue(mockSubscription);

      const result = await deleteSubscription(subscriptionId);

      expect(prisma.subscription.delete).toHaveBeenCalledWith({
        where: {
          subscriptionId
        }
      });
      expect(result).toEqual(mockSubscription);
    });

    it("should throw error when subscription not found", async () => {
      const subscriptionId = "nonexistent";

      vi.mocked(prisma.subscription.delete).mockRejectedValue(new Error("Record not found"));

      await expect(deleteSubscription(subscriptionId)).rejects.toThrow("Record not found");
    });
  });

  describe("findActiveSubscriptionsByLocation", () => {
    it("should find subscriptions by location", async () => {
      const mockSubscriptions = [
        {
          subscriptionId: "sub-1",
          userId: "user-1",
          searchType: "LOCATION_ID",
          searchValue: "1",
          caseName: null,
          caseNumber: null,
          user: {
            email: "user1@example.com",
            firstName: "John",
            surname: "Doe"
          }
        },
        {
          subscriptionId: "sub-2",
          userId: "user-2",
          searchType: "LOCATION_ID",
          searchValue: "1",
          caseName: null,
          caseNumber: null,
          user: {
            email: "user2@example.com",
            firstName: "Jane",
            surname: "Smith"
          }
        }
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions as never);

      const result = await findActiveSubscriptionsByLocation(1);

      expect(result).toHaveLength(2);
      expect(result[0].user.email).toBe("user1@example.com");
      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: {
          searchType: "LOCATION_ID",
          searchValue: "1"
        },
        select: {
          subscriptionId: true,
          userId: true,
          searchType: true,
          searchValue: true,
          caseName: true,
          caseNumber: true,
          user: {
            select: {
              email: true,
              firstName: true,
              surname: true
            }
          }
        }
      });
    });

    it("should find subscriptions by location with different location IDs", async () => {
      const mockSubscriptions = [
        {
          subscriptionId: "sub-3",
          userId: "user-3",
          searchType: "LOCATION_ID",
          searchValue: "456",
          caseName: null,
          caseNumber: null,
          user: {
            email: "user3@example.com",
            firstName: "Alice",
            surname: "Johnson"
          }
        }
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions as never);

      const result = await findActiveSubscriptionsByLocation(456);

      expect(result).toHaveLength(1);
      expect(result[0].searchValue).toBe("456");
      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: {
          searchType: "LOCATION_ID",
          searchValue: "456"
        },
        select: {
          subscriptionId: true,
          userId: true,
          searchType: true,
          searchValue: true,
          caseName: true,
          caseNumber: true,
          user: {
            select: {
              email: true,
              firstName: true,
              surname: true
            }
          }
        }
      });
    });

    it("should return empty array when no subscriptions found for location", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      const result = await findActiveSubscriptionsByLocation(999);

      expect(result).toHaveLength(0);
    });

    it("should find subscriptions with users having null names", async () => {
      const mockSubscriptions = [
        {
          subscriptionId: "sub-4",
          userId: "user-4",
          searchType: "LOCATION_ID",
          searchValue: "100",
          caseName: null,
          caseNumber: null,
          user: {
            email: "user4@example.com",
            firstName: null,
            surname: null
          }
        }
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions as never);

      const result = await findActiveSubscriptionsByLocation(100);

      expect(result).toHaveLength(1);
      expect(result[0].user.firstName).toBeNull();
      expect(result[0].user.surname).toBeNull();
    });

    it("should find subscriptions with mixed user data completeness", async () => {
      const mockSubscriptions = [
        {
          subscriptionId: "sub-13",
          userId: "user-13",
          searchType: "LOCATION_ID",
          searchValue: "200",
          caseName: null,
          caseNumber: null,
          user: {
            email: "user13@example.com",
            firstName: "Jane",
            surname: null
          }
        },
        {
          subscriptionId: "sub-14",
          userId: "user-14",
          searchType: "LOCATION_ID",
          searchValue: "200",
          caseName: null,
          caseNumber: null,
          user: {
            email: "user14@example.com",
            firstName: null,
            surname: "Brown"
          }
        }
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions as never);

      const result = await findActiveSubscriptionsByLocation(200);

      expect(result).toHaveLength(2);
      expect(result[0].user.firstName).toBe("Jane");
      expect(result[0].user.surname).toBeNull();
      expect(result[1].user.firstName).toBeNull();
      expect(result[1].user.surname).toBe("Brown");
    });
  });

  describe("findActiveSubscriptionsByCaseNumbers", () => {
    it("should find subscriptions by case numbers", async () => {
      const mockSubscriptions = [
        {
          subscriptionId: "sub-1",
          userId: "user-1",
          searchType: "CASE_NUMBER",
          searchValue: "CASE-123",
          caseName: "Test Case A",
          caseNumber: "CASE-123",
          user: {
            email: "user1@example.com",
            firstName: "John",
            surname: "Doe"
          }
        },
        {
          subscriptionId: "sub-2",
          userId: "user-2",
          searchType: "CASE_NUMBER",
          searchValue: "CASE-456",
          caseName: "Test Case B",
          caseNumber: "CASE-456",
          user: {
            email: "user2@example.com",
            firstName: "Jane",
            surname: "Smith"
          }
        }
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions as never);

      const result = await findActiveSubscriptionsByCaseNumbers(["CASE-123", "CASE-456"]);

      expect(result).toHaveLength(2);
      expect(result[0].user.email).toBe("user1@example.com");
      expect(result[1].user.email).toBe("user2@example.com");
      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: {
          searchType: "CASE_NUMBER",
          searchValue: {
            in: ["CASE-123", "CASE-456"]
          }
        },
        select: {
          subscriptionId: true,
          userId: true,
          searchType: true,
          searchValue: true,
          caseName: true,
          caseNumber: true,
          user: {
            select: {
              email: true,
              firstName: true,
              surname: true
            }
          }
        }
      });
    });

    it("should return empty array when no case numbers provided", async () => {
      const result = await findActiveSubscriptionsByCaseNumbers([]);

      expect(result).toHaveLength(0);
    });

    it("should find subscriptions with single case number", async () => {
      const mockSubscriptions = [
        {
          subscriptionId: "sub-1",
          userId: "user-1",
          searchType: "CASE_NUMBER",
          searchValue: "CASE-789",
          caseName: "Test Case C",
          caseNumber: "CASE-789",
          user: {
            email: "user1@example.com",
            firstName: "John",
            surname: "Doe"
          }
        }
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions as never);

      const result = await findActiveSubscriptionsByCaseNumbers(["CASE-789"]);

      expect(result).toHaveLength(1);
      expect(result[0].searchValue).toBe("CASE-789");
    });

    it("should return empty array when no subscriptions found for case numbers", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      const result = await findActiveSubscriptionsByCaseNumbers(["NON-EXISTENT"]);

      expect(result).toHaveLength(0);
    });

    it("should handle case numbers with various formats", async () => {
      const mockSubscriptions = [
        {
          subscriptionId: "sub-12",
          userId: "user-12",
          searchType: "CASE_NUMBER",
          searchValue: "2024/ABC/12345",
          caseName: "Complex Case",
          caseNumber: "2024/ABC/12345",
          user: {
            email: "user12@example.com",
            firstName: "Ian",
            surname: "Roberts"
          }
        }
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions as never);

      const result = await findActiveSubscriptionsByCaseNumbers(["2024/ABC/12345"]);

      expect(result).toHaveLength(1);
      expect(result[0].caseNumber).toBe("2024/ABC/12345");
    });
  });

  describe("findActiveSubscriptionsByCaseNames", () => {
    it("should find subscriptions by case names", async () => {
      const mockSubscriptions = [
        {
          subscriptionId: "sub-5",
          userId: "user-5",
          searchType: "CASE_NAME",
          searchValue: "Smith v Jones",
          caseName: "Smith v Jones",
          caseNumber: "CASE-100",
          user: {
            email: "user5@example.com",
            firstName: "Bob",
            surname: "Wilson"
          }
        },
        {
          subscriptionId: "sub-6",
          userId: "user-6",
          searchType: "CASE_NAME",
          searchValue: "Brown v Green",
          caseName: "Brown v Green",
          caseNumber: "CASE-200",
          user: {
            email: "user6@example.com",
            firstName: "Carol",
            surname: "Davis"
          }
        }
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions as never);

      const result = await findActiveSubscriptionsByCaseNames(["Smith v Jones", "Brown v Green"]);

      expect(result).toHaveLength(2);
      expect(result[0].user.email).toBe("user5@example.com");
      expect(result[1].user.email).toBe("user6@example.com");
      expect(result[0].caseName).toBe("Smith v Jones");
      expect(result[1].caseName).toBe("Brown v Green");
      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: {
          searchType: "CASE_NAME",
          searchValue: {
            in: ["Smith v Jones", "Brown v Green"]
          }
        },
        select: {
          subscriptionId: true,
          userId: true,
          searchType: true,
          searchValue: true,
          caseName: true,
          caseNumber: true,
          user: {
            select: {
              email: true,
              firstName: true,
              surname: true
            }
          }
        }
      });
    });

    it("should return empty array when no case names provided", async () => {
      const result = await findActiveSubscriptionsByCaseNames([]);

      expect(result).toHaveLength(0);
    });

    it("should find subscriptions with single case name", async () => {
      const mockSubscriptions = [
        {
          subscriptionId: "sub-7",
          userId: "user-7",
          searchType: "CASE_NAME",
          searchValue: "White v Black",
          caseName: "White v Black",
          caseNumber: "CASE-300",
          user: {
            email: "user7@example.com",
            firstName: "David",
            surname: "Miller"
          }
        }
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions as never);

      const result = await findActiveSubscriptionsByCaseNames(["White v Black"]);

      expect(result).toHaveLength(1);
      expect(result[0].searchValue).toBe("White v Black");
      expect(result[0].caseName).toBe("White v Black");
    });

    it("should return empty array when no subscriptions found for case names", async () => {
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      const result = await findActiveSubscriptionsByCaseNames(["Non Existent Case"]);

      expect(result).toHaveLength(0);
    });

    it("should handle case names with special characters", async () => {
      const mockSubscriptions = [
        {
          subscriptionId: "sub-8",
          userId: "user-8",
          searchType: "CASE_NAME",
          searchValue: "R v O'Connor",
          caseName: "R v O'Connor",
          caseNumber: "CASE-400",
          user: {
            email: "user8@example.com",
            firstName: "Emma",
            surname: "Taylor"
          }
        }
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions as never);

      const result = await findActiveSubscriptionsByCaseNames(["R v O'Connor"]);

      expect(result).toHaveLength(1);
      expect(result[0].caseName).toBe("R v O'Connor");
    });

    it("should find multiple subscriptions for the same case name", async () => {
      const mockSubscriptions = [
        {
          subscriptionId: "sub-9",
          userId: "user-9",
          searchType: "CASE_NAME",
          searchValue: "Jones v Williams",
          caseName: "Jones v Williams",
          caseNumber: "CASE-500",
          user: {
            email: "user9@example.com",
            firstName: "Frank",
            surname: "Anderson"
          }
        },
        {
          subscriptionId: "sub-10",
          userId: "user-10",
          searchType: "CASE_NAME",
          searchValue: "Jones v Williams",
          caseName: "Jones v Williams",
          caseNumber: "CASE-500",
          user: {
            email: "user10@example.com",
            firstName: "Grace",
            surname: "Thomas"
          }
        }
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions as never);

      const result = await findActiveSubscriptionsByCaseNames(["Jones v Williams"]);

      expect(result).toHaveLength(2);
      expect(result[0].caseName).toBe("Jones v Williams");
      expect(result[1].caseName).toBe("Jones v Williams");
      expect(result[0].userId).toBe("user-9");
      expect(result[1].userId).toBe("user-10");
    });

    it("should handle case names with long text", async () => {
      const longCaseName = "The Queen on the Application of ABC Limited v The Secretary of State for Justice and Others";
      const mockSubscriptions = [
        {
          subscriptionId: "sub-11",
          userId: "user-11",
          searchType: "CASE_NAME",
          searchValue: longCaseName,
          caseName: longCaseName,
          caseNumber: "CASE-600",
          user: {
            email: "user11@example.com",
            firstName: "Henry",
            surname: "Moore"
          }
        }
      ];

      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions as never);

      const result = await findActiveSubscriptionsByCaseNames([longCaseName]);

      expect(result).toHaveLength(1);
      expect(result[0].caseName).toBe(longCaseName);
    });
  });
});
