import { prisma } from "@hmcts/postgres-prisma";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteAllSubscriptionListTypesByUserId,
  findSubscriptionListTypeByUserId,
  getListTypeIdsForLocation,
  upsertSubscriptionListType
} from "./subscription-list-type-queries.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    listTypeSubJurisdiction: {
      findMany: vi.fn()
    },
    subscriptionListType: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn()
    }
  }
}));

describe("Subscription List Type Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("findSubscriptionListTypeByUserId", () => {
    it("should return the single record for a user", async () => {
      const userId = "user-123";
      const mockRecord = {
        subscriptionListTypeId: "slt-1",
        userId,
        listTypeIds: [1, 3, 5],
        listLanguage: ["ENGLISH"],
        dateAdded: new Date("2024-01-01")
      };

      vi.mocked(prisma.subscriptionListType.findUnique).mockResolvedValue(mockRecord);

      const result = await findSubscriptionListTypeByUserId(userId);

      expect(result).toEqual(mockRecord);
      expect(prisma.subscriptionListType.findUnique).toHaveBeenCalledWith({ where: { userId } });
    });

    it("should return null when no record exists for the user", async () => {
      vi.mocked(prisma.subscriptionListType.findUnique).mockResolvedValue(null);

      const result = await findSubscriptionListTypeByUserId("user-123");

      expect(result).toBeNull();
    });
  });

  describe("upsertSubscriptionListType", () => {
    it("should create a new record when none exists", async () => {
      const userId = "user-123";
      const listTypeIds = [1, 3];
      const listLanguage = ["ENGLISH"];
      const mockRecord = { subscriptionListTypeId: "slt-1", userId, listTypeIds, listLanguage, dateAdded: new Date() };

      vi.mocked(prisma.subscriptionListType.upsert).mockResolvedValue(mockRecord);

      const result = await upsertSubscriptionListType(userId, listTypeIds, listLanguage);

      expect(result).toEqual(mockRecord);
      expect(prisma.subscriptionListType.upsert).toHaveBeenCalledWith({
        where: { userId },
        create: { userId, listTypeIds, listLanguage },
        update: { listTypeIds, listLanguage }
      });
    });

    it("should update the existing record when one already exists for the user", async () => {
      const userId = "user-123";
      const listTypeIds = [2, 4];
      const listLanguage = ["ENGLISH", "WELSH"];
      const mockRecord = { subscriptionListTypeId: "slt-1", userId, listTypeIds, listLanguage, dateAdded: new Date() };

      vi.mocked(prisma.subscriptionListType.upsert).mockResolvedValue(mockRecord);

      await upsertSubscriptionListType(userId, listTypeIds, listLanguage);

      expect(prisma.subscriptionListType.upsert).toHaveBeenCalledWith({
        where: { userId },
        create: { userId, listTypeIds, listLanguage },
        update: { listTypeIds, listLanguage }
      });
    });
  });

  describe("getListTypeIdsForLocation", () => {
    it("should return unique list type IDs linked to the location via sub-jurisdictions", async () => {
      vi.mocked(prisma.listTypeSubJurisdiction.findMany).mockResolvedValue([
        { id: 1, listTypeId: 5, subJurisdictionId: 4 },
        { id: 2, listTypeId: 6, subJurisdictionId: 4 },
        { id: 3, listTypeId: 7, subJurisdictionId: 4 }
      ] as any);

      const result = await getListTypeIdsForLocation(100);

      expect(result).toEqual([5, 6, 7]);
      expect(prisma.listTypeSubJurisdiction.findMany).toHaveBeenCalledWith({
        where: {
          subJurisdiction: {
            locationSubJurisdictions: {
              some: { locationId: 100 }
            }
          }
        },
        select: { listTypeId: true }
      });
    });

    it("should deduplicate list type IDs when the same type appears via multiple sub-jurisdictions", async () => {
      vi.mocked(prisma.listTypeSubJurisdiction.findMany).mockResolvedValue([
        { id: 1, listTypeId: 1, subJurisdictionId: 1 },
        { id: 2, listTypeId: 1, subJurisdictionId: 2 },
        { id: 3, listTypeId: 2, subJurisdictionId: 2 }
      ] as any);

      const result = await getListTypeIdsForLocation(200);

      expect(result).toEqual([1, 2]);
    });

    it("should return empty array when location has no linked list types", async () => {
      vi.mocked(prisma.listTypeSubJurisdiction.findMany).mockResolvedValue([]);

      const result = await getListTypeIdsForLocation(999);

      expect(result).toEqual([]);
    });
  });

  describe("deleteAllSubscriptionListTypesByUserId", () => {
    it("should delete the record for the user and return count", async () => {
      const userId = "user-123";

      vi.mocked(prisma.subscriptionListType.deleteMany).mockResolvedValue({ count: 1 });

      const result = await deleteAllSubscriptionListTypesByUserId(userId);

      expect(result).toBe(1);
      expect(prisma.subscriptionListType.deleteMany).toHaveBeenCalledWith({ where: { userId } });
    });

    it("should return 0 when no record exists for the user", async () => {
      vi.mocked(prisma.subscriptionListType.deleteMany).mockResolvedValue({ count: 0 });

      const result = await deleteAllSubscriptionListTypesByUserId("user-123");

      expect(result).toBe(0);
    });
  });
});
