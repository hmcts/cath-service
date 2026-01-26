import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as validation from "../validation/validation.js";
import * as queries from "./queries.js";
import {
  createCaseSubscription,
  createMultipleSubscriptions,
  createSubscription,
  deleteSubscriptionsByIds,
  getAllSubscriptionsByUserId,
  getCaseSubscriptionsByUserId,
  getCourtSubscriptionsByUserId,
  getSubscriptionDetailsForConfirmation,
  getSubscriptionsByCase,
  getSubscriptionsByLocation,
  getUserSubscriptions,
  removeSubscription,
  replaceUserSubscriptions
} from "./service.js";

vi.mock("./queries.js");
vi.mock("../validation/validation.js");
vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn()
}));

import { getLocationById } from "@hmcts/location";

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
        searchType: "LOCATION_ID",
        searchValue: "456",
        dateAdded: new Date()
      });

      const result = await createSubscription(userId, locationId);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.searchValue).toBe("456");
      expect(validation.validateLocationId).toHaveBeenCalledWith(locationId);
      expect(queries.createSubscriptionRecord).toHaveBeenCalledWith(userId, 456);
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
        searchType: "LOCATION_ID",
        searchValue: "456",
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

  describe("removeSubscription", () => {
    const subscriptionId = "sub123";
    const userId = "user123";

    it("should remove subscription successfully", async () => {
      const subscription = {
        subscriptionId,
        userId,
        searchType: "LOCATION_ID",
        searchValue: "456",
        dateAdded: new Date()
      };

      vi.mocked(queries.findSubscriptionById).mockResolvedValue(subscription);
      vi.mocked(queries.deleteSubscriptionRecord).mockResolvedValue(1);

      const result = await removeSubscription(subscriptionId, userId);

      expect(result).toBe(1);
      expect(queries.findSubscriptionById).toHaveBeenCalledWith(subscriptionId, userId);
      expect(queries.deleteSubscriptionRecord).toHaveBeenCalledWith(subscriptionId, userId);
    });

    it("should throw error if subscription not found during lookup", async () => {
      vi.mocked(queries.findSubscriptionById).mockResolvedValue(null);

      await expect(removeSubscription(subscriptionId, userId)).rejects.toThrow("Subscription not found");
      expect(queries.findSubscriptionById).toHaveBeenCalledWith(subscriptionId, userId);
      expect(queries.deleteSubscriptionRecord).not.toHaveBeenCalled();
    });

    it("should throw error if delete returns 0 count", async () => {
      const subscription = {
        subscriptionId,
        userId,
        searchType: "LOCATION_ID",
        searchValue: "456",
        dateAdded: new Date()
      };

      vi.mocked(queries.findSubscriptionById).mockResolvedValue(subscription);
      vi.mocked(queries.deleteSubscriptionRecord).mockResolvedValue(0);

      await expect(removeSubscription(subscriptionId, userId)).rejects.toThrow("Subscription not found");
      expect(queries.deleteSubscriptionRecord).toHaveBeenCalledWith(subscriptionId, userId);
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
        searchType: "LOCATION_ID",
        searchValue: "456",
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
        searchType: "LOCATION_ID",
        searchValue: "456",
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
        { subscriptionId: "sub1", userId, searchType: "LOCATION_ID", searchValue: "456", dateAdded: new Date() },
        { subscriptionId: "sub2", userId, searchType: "LOCATION_ID", searchValue: "789", dateAdded: new Date() }
      ];
      const newLocationIds = ["789", "101"];

      vi.mocked(queries.findSubscriptionsByUserId).mockResolvedValue(existingSubscriptions);
      vi.mocked(validation.validateLocationId).mockResolvedValue(true);
      vi.mocked(queries.deleteSubscriptionRecord).mockResolvedValue(1);
      vi.mocked(queries.createSubscriptionRecord).mockResolvedValue({
        subscriptionId: "sub3",
        userId,
        searchType: "LOCATION_ID",
        searchValue: "101",
        dateAdded: new Date()
      });

      const result = await replaceUserSubscriptions(userId, newLocationIds);

      expect(result.added).toBe(1);
      expect(result.removed).toBe(1);
      expect(queries.deleteSubscriptionRecord).toHaveBeenCalledWith("sub1", userId);
      expect(queries.createSubscriptionRecord).toHaveBeenCalledWith(userId, 101);
    });

    it("should only add subscriptions when no existing ones", async () => {
      const newLocationIds = ["456", "789"];

      vi.mocked(queries.findSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(validation.validateLocationId).mockResolvedValue(true);
      vi.mocked(queries.createSubscriptionRecord).mockResolvedValue({
        subscriptionId: "sub1",
        userId,
        searchType: "LOCATION_ID",
        searchValue: "456",
        dateAdded: new Date()
      });

      const result = await replaceUserSubscriptions(userId, newLocationIds);

      expect(result.added).toBe(2);
      expect(result.removed).toBe(0);
      expect(queries.deleteSubscriptionRecord).not.toHaveBeenCalled();
    });

    it("should only remove subscriptions when new list is empty", async () => {
      const existingSubscriptions = [
        { subscriptionId: "sub1", userId, searchType: "LOCATION_ID", searchValue: "456", dateAdded: new Date() },
        { subscriptionId: "sub2", userId, searchType: "LOCATION_ID", searchValue: "789", dateAdded: new Date() }
      ];

      vi.mocked(queries.findSubscriptionsByUserId).mockResolvedValue(existingSubscriptions);
      vi.mocked(queries.deleteSubscriptionRecord).mockResolvedValue(1);

      const result = await replaceUserSubscriptions(userId, []);

      expect(result.added).toBe(0);
      expect(result.removed).toBe(2);
      expect(queries.deleteSubscriptionRecord).toHaveBeenCalledTimes(2);
      expect(queries.deleteSubscriptionRecord).toHaveBeenCalledWith("sub1", userId);
      expect(queries.deleteSubscriptionRecord).toHaveBeenCalledWith("sub2", userId);
      expect(queries.createSubscriptionRecord).not.toHaveBeenCalled();
    });

    it("should throw error when exceeding max subscriptions", async () => {
      const existingSubscriptions = Array.from({ length: 48 }, (_, i) => ({
        subscriptionId: `sub${i}`,
        userId,
        searchType: "LOCATION_ID",
        searchValue: `${i}`,
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
      vi.mocked(validation.validateLocationId).mockResolvedValue(false);

      await expect(replaceUserSubscriptions(userId, newLocationIds)).rejects.toThrow("Invalid location ID");
    });

    it("should keep same subscriptions when lists match", async () => {
      const existingSubscriptions = [
        { subscriptionId: "sub1", userId, searchType: "LOCATION_ID", searchValue: "456", dateAdded: new Date() },
        { subscriptionId: "sub2", userId, searchType: "LOCATION_ID", searchValue: "789", dateAdded: new Date() }
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

  describe("getAllSubscriptionsByUserId", () => {
    const mockUserId = "user-123";
    const mockSubscriptions = [
      {
        subscriptionId: "sub-1",
        userId: mockUserId,
        searchType: "LOCATION_ID",
        searchValue: "1",
        dateAdded: new Date("2024-01-01")
      },
      {
        subscriptionId: "sub-2",
        userId: mockUserId,
        searchType: "LOCATION_ID",
        searchValue: "2",
        dateAdded: new Date("2024-01-02")
      }
    ];

    it("should return all subscriptions with location details in English", async () => {
      vi.mocked(queries.findSubscriptionsWithLocationByUserId).mockResolvedValue(mockSubscriptions);
      vi.mocked(getLocationById).mockImplementation(async (id) => {
        if (id === 1) {
          return {
            locationId: 1,
            name: "Birmingham Crown Court",
            welshName: "Welsh Birmingham Crown Court"
          } as any;
        }
        if (id === 2) {
          return {
            locationId: 2,
            name: "Manchester Crown Court",
            welshName: null
          } as any;
        }
        return null;
      });

      const result = await getAllSubscriptionsByUserId(mockUserId, "en");

      expect(result).toEqual([
        {
          subscriptionId: "sub-1",
          type: "court",
          courtOrTribunalName: "Birmingham Crown Court",
          locationId: 1,
          dateAdded: new Date("2024-01-01")
        },
        {
          subscriptionId: "sub-2",
          type: "court",
          courtOrTribunalName: "Manchester Crown Court",
          locationId: 2,
          dateAdded: new Date("2024-01-02")
        }
      ]);

      expect(queries.findSubscriptionsWithLocationByUserId).toHaveBeenCalledWith(mockUserId);
    });

    it("should return subscriptions with Welsh names when locale is cy", async () => {
      vi.mocked(queries.findSubscriptionsWithLocationByUserId).mockResolvedValue(mockSubscriptions);
      vi.mocked(getLocationById).mockImplementation(async (id) => {
        if (id === 1) {
          return {
            locationId: 1,
            name: "Birmingham Crown Court",
            welshName: "Welsh Birmingham Crown Court"
          } as any;
        }
        if (id === 2) {
          return {
            locationId: 2,
            name: "Manchester Crown Court",
            welshName: null
          } as any;
        }
        return null;
      });

      const result = await getAllSubscriptionsByUserId(mockUserId, "cy");

      expect(result[0].courtOrTribunalName).toBe("Welsh Birmingham Crown Court");
      expect(result[1].courtOrTribunalName).toBe("Manchester Crown Court");
    });

    it("should return empty array when user has no subscriptions", async () => {
      vi.mocked(queries.findSubscriptionsWithLocationByUserId).mockResolvedValue([]);

      const result = await getAllSubscriptionsByUserId(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe("getCaseSubscriptionsByUserId", () => {
    it("should return empty array as case subscriptions are not yet implemented", async () => {
      const result = await getCaseSubscriptionsByUserId("user-123");

      expect(result).toEqual([]);
    });
  });

  describe("getCourtSubscriptionsByUserId", () => {
    const mockUserId = "user-123";
    const mockSubscriptions = [
      {
        subscriptionId: "sub-1",
        userId: mockUserId,
        searchType: "LOCATION_ID",
        searchValue: "1",
        dateAdded: new Date("2024-01-01")
      },
      {
        subscriptionId: "sub-2",
        userId: mockUserId,
        searchType: "LOCATION_ID",
        searchValue: "2",
        dateAdded: new Date("2024-01-02")
      }
    ];

    it("should return court subscriptions with location details", async () => {
      vi.mocked(queries.findSubscriptionsWithLocationByUserId).mockResolvedValue(mockSubscriptions);
      vi.mocked(getLocationById).mockImplementation(async (id) => {
        if (id === 1) {
          return {
            locationId: 1,
            name: "Birmingham Crown Court",
            welshName: "Welsh Birmingham Crown Court"
          } as any;
        }
        if (id === 2) {
          return {
            locationId: 2,
            name: "Manchester Crown Court",
            welshName: null
          } as any;
        }
        return null;
      });

      const result = await getCourtSubscriptionsByUserId(mockUserId, "en");

      expect(result).toEqual([
        {
          subscriptionId: "sub-1",
          type: "court",
          courtOrTribunalName: "Birmingham Crown Court",
          locationId: 1,
          dateAdded: new Date("2024-01-01")
        },
        {
          subscriptionId: "sub-2",
          type: "court",
          courtOrTribunalName: "Manchester Crown Court",
          locationId: 2,
          dateAdded: new Date("2024-01-02")
        }
      ]);
    });

    it("should use Welsh names when locale is cy", async () => {
      vi.mocked(queries.findSubscriptionsWithLocationByUserId).mockResolvedValue(mockSubscriptions);
      vi.mocked(getLocationById).mockImplementation(async (id) => {
        if (id === 1) {
          return {
            locationId: 1,
            name: "Birmingham Crown Court",
            welshName: "Welsh Birmingham Crown Court"
          } as any;
        }
        if (id === 2) {
          return {
            locationId: 2,
            name: "Manchester Crown Court",
            welshName: null
          } as any;
        }
        return null;
      });

      const result = await getCourtSubscriptionsByUserId(mockUserId, "cy");

      expect(result[0].courtOrTribunalName).toBe("Welsh Birmingham Crown Court");
    });
  });

  describe("getSubscriptionDetailsForConfirmation", () => {
    const mockSubscriptions = [
      {
        subscriptionId: "sub-1",
        userId: "user-123",
        searchType: "LOCATION_ID",
        searchValue: "1",
        dateAdded: new Date("2024-01-01")
      },
      {
        subscriptionId: "sub-2",
        userId: "user-123",
        searchType: "LOCATION_ID",
        searchValue: "2",
        dateAdded: new Date("2024-01-02")
      }
    ];

    it("should return subscription details with location information", async () => {
      vi.mocked(queries.findSubscriptionsWithLocationByIds).mockResolvedValue(mockSubscriptions);
      vi.mocked(getLocationById).mockImplementation(async (id) => {
        if (id === 1) {
          return {
            locationId: 1,
            name: "Birmingham Crown Court",
            welshName: "Welsh Birmingham Crown Court"
          } as any;
        }
        if (id === 2) {
          return {
            locationId: 2,
            name: "Manchester Crown Court",
            welshName: null
          } as any;
        }
        return null;
      });

      const result = await getSubscriptionDetailsForConfirmation(["sub-1", "sub-2"], "user-123", "en");

      expect(result).toEqual([
        {
          subscriptionId: "sub-1",
          type: "court",
          courtOrTribunalName: "Birmingham Crown Court",
          locationId: 1,
          dateAdded: new Date("2024-01-01")
        },
        {
          subscriptionId: "sub-2",
          type: "court",
          courtOrTribunalName: "Manchester Crown Court",
          locationId: 2,
          dateAdded: new Date("2024-01-02")
        }
      ]);
    });

    it("should return empty array when no subscription IDs provided", async () => {
      const result = await getSubscriptionDetailsForConfirmation([], "user-123");

      expect(result).toEqual([]);
      expect(queries.findSubscriptionsWithLocationByIds).not.toHaveBeenCalled();
    });

    it("should use Welsh names when locale is cy", async () => {
      vi.mocked(queries.findSubscriptionsWithLocationByIds).mockResolvedValue(mockSubscriptions);
      vi.mocked(getLocationById).mockImplementation(async (id) => {
        if (id === 1) {
          return {
            locationId: 1,
            name: "Birmingham Crown Court",
            welshName: "Welsh Birmingham Crown Court"
          } as any;
        }
        return null;
      });

      const result = await getSubscriptionDetailsForConfirmation(["sub-1"], "user-123", "cy");

      expect(result[0].courtOrTribunalName).toBe("Welsh Birmingham Crown Court");
    });
  });

  describe("deleteSubscriptionsByIds", () => {
    const mockUserId = "user-123";

    it("should delete subscriptions in a transaction when user owns them", async () => {
      vi.mocked(queries.deleteSubscriptionsByIds).mockResolvedValue(2);

      const result = await deleteSubscriptionsByIds(["sub-1", "sub-2"], mockUserId);

      expect(result).toBe(2);
      expect(queries.deleteSubscriptionsByIds).toHaveBeenCalledWith(["sub-1", "sub-2"], mockUserId);
    });

    it("should throw error when no subscriptions provided", async () => {
      await expect(deleteSubscriptionsByIds([], mockUserId)).rejects.toThrow("No subscriptions provided for deletion");
    });

    it("should throw error when count does not match (some subscriptions do not exist or user does not own them)", async () => {
      vi.mocked(queries.deleteSubscriptionsByIds).mockResolvedValue(1);

      await expect(deleteSubscriptionsByIds(["sub-1", "sub-2"], mockUserId)).rejects.toThrow("Unauthorized: User does not own all selected subscriptions");
      expect(queries.deleteSubscriptionsByIds).toHaveBeenCalledWith(["sub-1", "sub-2"], mockUserId);
    });

    it("should handle transaction rollback on database error", async () => {
      vi.mocked(queries.deleteSubscriptionsByIds).mockRejectedValue(new Error("Database connection failed"));

      await expect(deleteSubscriptionsByIds(["sub-1"], mockUserId)).rejects.toThrow("Database connection failed");
    });

    it("should delete correct subscriptions with proper where clause", async () => {
      const subscriptionIds = ["sub-1", "sub-2", "sub-3"];
      vi.mocked(queries.deleteSubscriptionsByIds).mockResolvedValue(3);

      await deleteSubscriptionsByIds(subscriptionIds, mockUserId);

      expect(queries.deleteSubscriptionsByIds).toHaveBeenCalledWith(subscriptionIds, mockUserId);
    });

    it("should throw error when no subscriptions match deletion criteria", async () => {
      vi.mocked(queries.deleteSubscriptionsByIds).mockResolvedValue(0);

      await expect(deleteSubscriptionsByIds(["sub-1"], mockUserId)).rejects.toThrow("Unauthorized: User does not own all selected subscriptions");
    });
  });

  describe("getUserSubscriptions", () => {
    it("should return all subscriptions for a user", async () => {
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

      vi.mocked(queries.findSubscriptionsByUserId).mockResolvedValue(mockSubscriptions);

      const result = await getUserSubscriptions(userId);

      expect(queries.findSubscriptionsByUserId).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockSubscriptions);
    });
  });

  describe("getSubscriptionsByCase", () => {
    it("should return only case subscriptions for a user", async () => {
      const userId = "user123";
      const mockSubscriptions = [
        {
          subscriptionId: "sub1",
          userId,
          searchType: "CASE_NUMBER",
          searchValue: "CASE123",
          caseName: "Test Case",
          caseNumber: "CASE123",
          dateAdded: new Date()
        }
      ];

      vi.mocked(queries.findByUserIdAndType).mockResolvedValue(mockSubscriptions);

      const result = await getSubscriptionsByCase(userId);

      expect(queries.findByUserIdAndType).toHaveBeenCalledWith(userId, "CASE_NUMBER");
      expect(result).toEqual(mockSubscriptions);
    });
  });

  describe("getSubscriptionsByLocation", () => {
    it("should return only location subscriptions for a user", async () => {
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
        }
      ];

      vi.mocked(queries.findByUserIdAndType).mockResolvedValue(mockSubscriptions);

      const result = await getSubscriptionsByLocation(userId);

      expect(queries.findByUserIdAndType).toHaveBeenCalledWith(userId, "LOCATION_ID");
      expect(result).toEqual(mockSubscriptions);
    });
  });

  describe("createCaseSubscription", () => {
    it("should create a case subscription successfully", async () => {
      const userId = "user123";
      const caseNumber = "CASE123";
      const caseName = "Test Case";

      vi.mocked(queries.countSubscriptionsByUserId).mockResolvedValue(5);
      vi.mocked(queries.createSubscription).mockResolvedValue({
        subscriptionId: "sub123",
        userId,
        searchType: "CASE_NUMBER",
        searchValue: caseNumber,
        caseName,
        caseNumber,
        dateAdded: new Date()
      });

      const result = await createCaseSubscription(userId, caseNumber, caseName);

      expect(queries.countSubscriptionsByUserId).toHaveBeenCalledWith(userId);
      expect(queries.createSubscription).toHaveBeenCalledWith(userId, "CASE_NUMBER", caseNumber, caseName, caseNumber);
      expect(result).toEqual(
        expect.objectContaining({
          subscriptionId: "sub123",
          userId,
          searchType: "CASE_NUMBER",
          searchValue: caseNumber,
          caseName,
          caseNumber
        })
      );
    });

    it("should create a case subscription with null case name", async () => {
      const userId = "user123";
      const caseNumber = "CASE123";

      vi.mocked(queries.countSubscriptionsByUserId).mockResolvedValue(5);
      vi.mocked(queries.createSubscription).mockResolvedValue({
        subscriptionId: "sub123",
        userId,
        searchType: "CASE_NUMBER",
        searchValue: caseNumber,
        caseName: null,
        caseNumber,
        dateAdded: new Date()
      });

      const result = await createCaseSubscription(userId, caseNumber, null);

      expect(queries.createSubscription).toHaveBeenCalledWith(userId, "CASE_NUMBER", caseNumber, null, caseNumber);
      expect(result.caseName).toBeNull();
    });

    it("should throw error when max subscriptions exceeded", async () => {
      const userId = "user123";
      const caseNumber = "CASE123";
      const caseName = "Test Case";

      vi.mocked(queries.countSubscriptionsByUserId).mockResolvedValue(50);

      await expect(createCaseSubscription(userId, caseNumber, caseName)).rejects.toThrow("Maximum 50 subscriptions allowed");
      expect(queries.createSubscription).not.toHaveBeenCalled();
    });
  });

  describe("getCaseSubscriptionsByUserId", () => {
    it("should return formatted case subscriptions", async () => {
      const userId = "user123";
      const mockSubscriptions = [
        {
          subscriptionId: "sub1",
          userId,
          searchType: "CASE_NUMBER",
          searchValue: "CASE123",
          caseName: "Test Case",
          caseNumber: "CASE123",
          dateAdded: new Date("2024-01-01")
        },
        {
          subscriptionId: "sub2",
          userId,
          searchType: "CASE_NUMBER",
          searchValue: "CASE456",
          caseName: "Another Case",
          caseNumber: "CASE456",
          dateAdded: new Date("2024-01-02")
        }
      ];

      vi.mocked(queries.findByUserIdAndType).mockResolvedValue(mockSubscriptions);

      const result = await getCaseSubscriptionsByUserId(userId);

      expect(queries.findByUserIdAndType).toHaveBeenCalledWith(userId, "CASE_NUMBER");
      expect(result).toEqual([
        {
          subscriptionId: "sub1",
          type: "case",
          caseName: "Test Case",
          caseNumber: "CASE123",
          dateAdded: new Date("2024-01-01")
        },
        {
          subscriptionId: "sub2",
          type: "case",
          caseName: "Another Case",
          caseNumber: "CASE456",
          dateAdded: new Date("2024-01-02")
        }
      ]);
    });

    it("should return empty array when no case subscriptions exist", async () => {
      const userId = "user123";

      vi.mocked(queries.findByUserIdAndType).mockResolvedValue([]);

      const result = await getCaseSubscriptionsByUserId(userId);

      expect(result).toEqual([]);
    });
  });
});
