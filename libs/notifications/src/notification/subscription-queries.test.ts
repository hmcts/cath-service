import { beforeEach, describe, expect, it, vi } from "vitest";
import { findActiveSubscriptionsByCaseNumbers, findActiveSubscriptionsByLocation } from "./subscription-queries.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    subscription: {
      findMany: vi.fn()
    }
  }
}));

describe("subscription-queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should find subscriptions by location", async () => {
    const mockSubscriptions = [
      {
        subscriptionId: "sub-1",
        userId: "user-1",
        searchType: "LOCATION_ID",
        searchValue: "1",
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
        user: {
          email: "user2@example.com",
          firstName: "Jane",
          surname: "Smith"
        }
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
        searchValue: "1"
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

  it("should find subscriptions by case numbers", async () => {
    const mockSubscriptions = [
      {
        subscriptionId: "sub-1",
        userId: "user-1",
        searchType: "CASE_NUMBER",
        searchValue: "CASE-123",
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
        user: {
          email: "user2@example.com",
          firstName: "Jane",
          surname: "Smith"
        }
      }
    ];

    const { prisma } = await import("@hmcts/postgres");
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
        user: {
          email: "user1@example.com",
          firstName: "John",
          surname: "Doe"
        }
      }
    ];

    const { prisma } = await import("@hmcts/postgres");
    vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions as never);

    const result = await findActiveSubscriptionsByCaseNumbers(["CASE-789"]);

    expect(result).toHaveLength(1);
    expect(result[0].searchValue).toBe("CASE-789");
  });
});
