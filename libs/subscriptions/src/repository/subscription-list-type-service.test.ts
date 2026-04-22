import { prisma } from "@hmcts/postgres";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as queries from "./subscription-list-type-queries.js";
import {
  createSubscriptionListTypes,
  getSubscriptionListTypesByUserId,
  pruneStaleListTypesForUser,
  removeSubscriptionListType,
  replaceSubscriptionListTypes
} from "./subscription-list-type-service.js";

vi.mock("./subscription-list-type-queries.js");
vi.mock("@hmcts/postgres", () => ({
  prisma: {
    listType: {
      findFirst: vi.fn()
    }
  }
}));

describe("Subscription List Type Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createSubscriptionListTypes", () => {
    it("should upsert a single record with ENGLISH language as array", async () => {
      vi.mocked(queries.upsertSubscriptionListType).mockResolvedValue({} as any);

      await createSubscriptionListTypes("user-123", [1, 3, 5], "ENGLISH");

      expect(queries.upsertSubscriptionListType).toHaveBeenCalledWith("user-123", [1, 3, 5], ["ENGLISH"]);
    });

    it("should upsert a single record with WELSH language as array", async () => {
      vi.mocked(queries.upsertSubscriptionListType).mockResolvedValue({} as any);

      await createSubscriptionListTypes("user-123", [2], "WELSH");

      expect(queries.upsertSubscriptionListType).toHaveBeenCalledWith("user-123", [2], ["WELSH"]);
    });

    it("should expand ENGLISH_AND_WELSH into both languages", async () => {
      vi.mocked(queries.upsertSubscriptionListType).mockResolvedValue({} as any);

      await createSubscriptionListTypes("user-123", [1, 2], "ENGLISH_AND_WELSH");

      expect(queries.upsertSubscriptionListType).toHaveBeenCalledWith("user-123", [1, 2], ["ENGLISH", "WELSH"]);
    });

    it("should append new list type ids to existing ones and update language", async () => {
      vi.mocked(queries.findSubscriptionListTypeByUserId).mockResolvedValue({
        subscriptionListTypeId: "slt-1",
        userId: "user-123",
        listTypeIds: [1, 2],
        listLanguage: ["ENGLISH"],
        dateAdded: new Date()
      });
      vi.mocked(queries.upsertSubscriptionListType).mockResolvedValue({} as any);

      await createSubscriptionListTypes("user-123", [3, 4], "WELSH");

      expect(queries.upsertSubscriptionListType).toHaveBeenCalledWith("user-123", [1, 2, 3, 4], ["WELSH"]);
    });

    it("should deduplicate list type ids when new ids overlap with existing ones", async () => {
      vi.mocked(queries.findSubscriptionListTypeByUserId).mockResolvedValue({
        subscriptionListTypeId: "slt-1",
        userId: "user-123",
        listTypeIds: [1, 2, 3],
        listLanguage: ["ENGLISH"],
        dateAdded: new Date()
      });
      vi.mocked(queries.upsertSubscriptionListType).mockResolvedValue({} as any);

      await createSubscriptionListTypes("user-123", [2, 3, 5], "ENGLISH");

      expect(queries.upsertSubscriptionListType).toHaveBeenCalledWith("user-123", [1, 2, 3, 5], ["ENGLISH"]);
    });
  });

  describe("replaceSubscriptionListTypes", () => {
    it("should upsert with the provided IDs without merging existing ones", async () => {
      vi.mocked(queries.upsertSubscriptionListType).mockResolvedValue({} as any);

      await replaceSubscriptionListTypes("user-123", [2, 3], "ENGLISH");

      expect(queries.upsertSubscriptionListType).toHaveBeenCalledWith("user-123", [2, 3], ["ENGLISH"]);
      expect(queries.findSubscriptionListTypeByUserId).not.toHaveBeenCalled();
    });

    it("should expand ENGLISH_AND_WELSH into both languages", async () => {
      vi.mocked(queries.upsertSubscriptionListType).mockResolvedValue({} as any);

      await replaceSubscriptionListTypes("user-123", [1], "ENGLISH_AND_WELSH");

      expect(queries.upsertSubscriptionListType).toHaveBeenCalledWith("user-123", [1], ["ENGLISH", "WELSH"]);
    });
  });

  describe("getSubscriptionListTypesByUserId", () => {
    it("should return enriched DTO with resolved list type names", async () => {
      const userId = "user-123";
      const mockRecord = {
        subscriptionListTypeId: "slt-1",
        userId,
        listTypeIds: [1, 2],
        listLanguage: ["ENGLISH"],
        dateAdded: new Date("2024-01-01")
      };

      vi.mocked(queries.findSubscriptionListTypeByUserId).mockResolvedValue(mockRecord);
      vi.mocked(prisma.listType.findFirst)
        .mockResolvedValueOnce({ id: 1, name: "CIVIL_DAILY_CAUSE_LIST", friendlyName: "Civil Daily Cause List" } as any)
        .mockResolvedValueOnce({ id: 2, name: "FAMILY_DAILY_CAUSE_LIST", friendlyName: "Family Daily Cause List" } as any);

      const result = await getSubscriptionListTypesByUserId(userId);

      expect(result).toEqual({
        subscriptionListTypeId: "slt-1",
        listTypeIds: [1, 2],
        listTypeNames: ["Civil Daily Cause List", "Family Daily Cause List"],
        listLanguage: ["ENGLISH"],
        dateAdded: new Date("2024-01-01")
      });
    });

    it("should fall back to name when friendlyName is null", async () => {
      vi.mocked(queries.findSubscriptionListTypeByUserId).mockResolvedValue({
        subscriptionListTypeId: "slt-1",
        userId: "user-123",
        listTypeIds: [4],
        listLanguage: ["WELSH"],
        dateAdded: new Date()
      });
      vi.mocked(prisma.listType.findFirst).mockResolvedValue({ id: 4, name: "SJP_PRESS_REGISTER", friendlyName: null } as any);

      const result = await getSubscriptionListTypesByUserId("user-123");

      expect(result?.listTypeNames).toEqual(["SJP_PRESS_REGISTER"]);
    });

    it("should fall back to listTypeId as string when list type record is not found", async () => {
      vi.mocked(queries.findSubscriptionListTypeByUserId).mockResolvedValue({
        subscriptionListTypeId: "slt-1",
        userId: "user-123",
        listTypeIds: [999],
        listLanguage: ["ENGLISH"],
        dateAdded: new Date()
      });
      vi.mocked(prisma.listType.findFirst).mockResolvedValue(null);

      const result = await getSubscriptionListTypesByUserId("user-123");

      expect(result?.listTypeNames).toEqual(["999"]);
    });

    it("should return null when user has no subscription list type record", async () => {
      vi.mocked(queries.findSubscriptionListTypeByUserId).mockResolvedValue(null);

      const result = await getSubscriptionListTypesByUserId("user-123");

      expect(result).toBeNull();
      expect(prisma.listType.findFirst).not.toHaveBeenCalled();
    });
  });

  describe("removeSubscriptionListType", () => {
    it("should delete the record for the user", async () => {
      vi.mocked(queries.deleteAllSubscriptionListTypesByUserId).mockResolvedValue(1);

      const result = await removeSubscriptionListType("user-123");

      expect(result).toBe(1);
      expect(queries.deleteAllSubscriptionListTypesByUserId).toHaveBeenCalledWith("user-123");
    });

    it("should return 0 when no record exists for the user", async () => {
      vi.mocked(queries.deleteAllSubscriptionListTypesByUserId).mockResolvedValue(0);

      const result = await removeSubscriptionListType("user-123");

      expect(result).toBe(0);
    });
  });

  describe("pruneStaleListTypesForUser", () => {
    it("should do nothing when user has no subscription list type record", async () => {
      vi.mocked(queries.findSubscriptionListTypeByUserId).mockResolvedValue(null);

      await pruneStaleListTypesForUser("user-123", [100], [200]);

      expect(queries.upsertSubscriptionListType).not.toHaveBeenCalled();
      expect(queries.deleteAllSubscriptionListTypesByUserId).not.toHaveBeenCalled();
    });

    it("should do nothing when removed location shares all its list types with remaining locations", async () => {
      vi.mocked(queries.findSubscriptionListTypeByUserId).mockResolvedValue({
        subscriptionListTypeId: "slt-1",
        userId: "user-123",
        listTypeIds: [1, 2],
        listLanguage: ["ENGLISH"],
        dateAdded: new Date()
      });
      vi.mocked(queries.getListTypeIdsForLocation).mockResolvedValueOnce([1, 2]).mockResolvedValueOnce([1, 2]);

      await pruneStaleListTypesForUser("user-123", [100], [200]);

      expect(queries.upsertSubscriptionListType).not.toHaveBeenCalled();
      expect(queries.deleteAllSubscriptionListTypesByUserId).not.toHaveBeenCalled();
    });

    it("should remove list type IDs that are only linked to the removed location", async () => {
      vi.mocked(queries.findSubscriptionListTypeByUserId).mockResolvedValue({
        subscriptionListTypeId: "slt-1",
        userId: "user-123",
        listTypeIds: [1, 2, 5, 6],
        listLanguage: ["ENGLISH"],
        dateAdded: new Date()
      });
      vi.mocked(queries.getListTypeIdsForLocation).mockResolvedValueOnce([5, 6]).mockResolvedValueOnce([1, 2]);

      await pruneStaleListTypesForUser("user-123", [100], [200]);

      expect(queries.upsertSubscriptionListType).toHaveBeenCalledWith("user-123", [1, 2], ["ENGLISH"]);
      expect(queries.deleteAllSubscriptionListTypesByUserId).not.toHaveBeenCalled();
    });

    it("should delete the record entirely when all list types become orphaned", async () => {
      vi.mocked(queries.findSubscriptionListTypeByUserId).mockResolvedValue({
        subscriptionListTypeId: "slt-1",
        userId: "user-123",
        listTypeIds: [5, 6],
        listLanguage: ["ENGLISH"],
        dateAdded: new Date()
      });
      vi.mocked(queries.getListTypeIdsForLocation).mockResolvedValueOnce([5, 6]);

      await pruneStaleListTypesForUser("user-123", [100], []);

      expect(queries.deleteAllSubscriptionListTypesByUserId).toHaveBeenCalledWith("user-123");
      expect(queries.upsertSubscriptionListType).not.toHaveBeenCalled();
    });

    it("should only remove IDs not covered by any remaining location", async () => {
      vi.mocked(queries.findSubscriptionListTypeByUserId).mockResolvedValue({
        subscriptionListTypeId: "slt-1",
        userId: "user-123",
        listTypeIds: [1, 3, 5],
        listLanguage: ["WELSH"],
        dateAdded: new Date()
      });
      vi.mocked(queries.getListTypeIdsForLocation).mockResolvedValueOnce([3, 5]).mockResolvedValueOnce([1, 3]);

      await pruneStaleListTypesForUser("user-123", [100], [200]);

      expect(queries.upsertSubscriptionListType).toHaveBeenCalledWith("user-123", [1, 3], ["WELSH"]);
    });
  });
});
