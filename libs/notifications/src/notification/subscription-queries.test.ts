import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  findActiveSubscriptionsByCaseName,
  findActiveSubscriptionsByCaseNumber,
  findActiveSubscriptionsByLocation,
  findCaseSubscriptionsByUserIds,
  findListTypeSubscribersByListTypeAndLanguage
} from "./subscription-queries.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    subscription: {
      findMany: vi.fn()
    },
    subscriptionListType: {
      findMany: vi.fn()
    }
  }
}));

describe("subscription-queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findActiveSubscriptionsByLocation", () => {
    it("should return only subscribers with no subscriptionListType configured", async () => {
      const mockSubscriptions = [
        {
          subscriptionId: "sub-1",
          userId: "user-1",
          searchType: "LOCATION_ID",
          searchValue: "1",
          user: { email: "user1@example.com", firstName: "John", surname: "Doe" }
        },
        {
          subscriptionId: "sub-2",
          userId: "user-2",
          searchType: "LOCATION_ID",
          searchValue: "1",
          user: { email: "user2@example.com", firstName: "Jane", surname: "Smith" }
        }
      ];

      const { prisma } = await import("@hmcts/postgres");
      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions as never);

      const result = await findActiveSubscriptionsByLocation(1);

      expect(result).toHaveLength(2);
      expect(result[0].user.email).toBe("user1@example.com");
      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: {
          searchType: "LOCATION_ID",
          searchValue: "1",
          user: { subscriptionListTypes: { none: {} } }
        },
        include: {
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
  });

  describe("findActiveSubscriptionsByCaseNumber", () => {
    it("should return subscribers where searchType is CASE_NUMBER and searchValue matches the case number", async () => {
      const mockSubscriptions = [
        {
          subscriptionId: "sub-1",
          userId: "user-1",
          searchType: "CASE_NUMBER",
          searchValue: "AB-123",
          user: { email: "user1@example.com", firstName: "John", surname: "Doe" }
        }
      ];

      const { prisma } = await import("@hmcts/postgres");
      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions as never);

      const result = await findActiveSubscriptionsByCaseNumber("AB-123");

      expect(result).toHaveLength(1);
      expect(result[0].user.email).toBe("user1@example.com");
      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: {
          searchType: "CASE_NUMBER",
          searchValue: "AB-123"
        },
        include: {
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

    it("should return empty array when no subscribers match the case number", async () => {
      const { prisma } = await import("@hmcts/postgres");
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      const result = await findActiveSubscriptionsByCaseNumber("UNKNOWN-999");

      expect(result).toHaveLength(0);
    });
  });

  describe("findActiveSubscriptionsByCaseName", () => {
    it("should return subscribers where searchType is CASE_NAME and searchValue matches the case name", async () => {
      const mockSubscriptions = [
        {
          subscriptionId: "sub-1",
          userId: "user-1",
          searchType: "CASE_NAME",
          searchValue: "Smith v Jones",
          user: { email: "user1@example.com", firstName: "John", surname: "Doe" }
        }
      ];

      const { prisma } = await import("@hmcts/postgres");
      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions as never);

      const result = await findActiveSubscriptionsByCaseName("Smith v Jones");

      expect(result).toHaveLength(1);
      expect(result[0].user.email).toBe("user1@example.com");
      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: {
          searchType: "CASE_NAME",
          searchValue: { equals: "Smith v Jones", mode: "insensitive" }
        },
        include: {
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

    it("should return empty array when no subscribers match the case name", async () => {
      const { prisma } = await import("@hmcts/postgres");
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      const result = await findActiveSubscriptionsByCaseName("Unknown Case");

      expect(result).toHaveLength(0);
    });
  });

  describe("findCaseSubscriptionsByUserIds", () => {
    it("should return empty array when userIds is empty", async () => {
      const result = await findCaseSubscriptionsByUserIds([]);
      expect(result).toHaveLength(0);
    });

    it("should find all case subscriptions for given user IDs", async () => {
      const { prisma } = await import("@hmcts/postgres");
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([
        { userId: "user-1", searchValue: "AB-123" },
        { userId: "user-2", searchValue: "Smith v Jones" }
      ] as never);

      const result = await findCaseSubscriptionsByUserIds(["user-1", "user-2"]);

      expect(result).toHaveLength(2);
      expect(prisma.subscription.findMany).toHaveBeenCalledWith({
        where: { userId: { in: ["user-1", "user-2"] }, searchType: { in: ["CASE_NUMBER", "CASE_NAME"] } },
        select: { userId: true, searchValue: true }
      });
    });

    it("should return empty array when no case subscriptions exist for users", async () => {
      const { prisma } = await import("@hmcts/postgres");
      vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

      const result = await findCaseSubscriptionsByUserIds(["user-1"]);

      expect(result).toHaveLength(0);
    });
  });

  describe("findListTypeSubscribersByListTypeAndLanguage", () => {
    it("should return subscribers where listTypeIds contains the given id and listLanguage contains the given language", async () => {
      const mockSubscribers = [
        {
          userId: "user-1",
          user: { email: "user1@example.com", firstName: "John", surname: "Doe" }
        }
      ];

      const { prisma } = await import("@hmcts/postgres");
      vi.mocked(prisma.subscriptionListType.findMany).mockResolvedValue(mockSubscribers as never);

      const result = await findListTypeSubscribersByListTypeAndLanguage(5, "ENGLISH");

      expect(result).toHaveLength(1);
      expect(result[0].user.email).toBe("user1@example.com");
      expect(prisma.subscriptionListType.findMany).toHaveBeenCalledWith({
        where: {
          listTypeIds: { has: 5 },
          listLanguage: { has: "ENGLISH" }
        },
        select: {
          userId: true,
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

    it("should match WELSH subscribers when publication language is WELSH", async () => {
      const mockSubscribers = [
        {
          userId: "user-2",
          user: { email: "user2@example.com", firstName: "Jane", surname: "Smith" }
        }
      ];

      const { prisma } = await import("@hmcts/postgres");
      vi.mocked(prisma.subscriptionListType.findMany).mockResolvedValue(mockSubscribers as never);

      const result = await findListTypeSubscribersByListTypeAndLanguage(5, "WELSH");

      expect(prisma.subscriptionListType.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            listTypeIds: { has: 5 },
            listLanguage: { has: "WELSH" }
          }
        })
      );
      expect(result).toHaveLength(1);
    });

    it("should return empty array when no subscribers match", async () => {
      const { prisma } = await import("@hmcts/postgres");
      vi.mocked(prisma.subscriptionListType.findMany).mockResolvedValue([]);

      const result = await findListTypeSubscribersByListTypeAndLanguage(99, "ENGLISH");

      expect(result).toHaveLength(0);
    });
  });
});
