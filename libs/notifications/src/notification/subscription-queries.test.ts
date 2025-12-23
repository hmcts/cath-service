import { beforeEach, describe, expect, it, vi } from "vitest";
import { findActiveSubscriptionsByLocation } from "./subscription-queries.js";

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
        locationId: 1,
        user: {
          email: "user1@example.com",
          firstName: "John",
          surname: "Doe"
        }
      },
      {
        subscriptionId: "sub-2",
        userId: "user-2",
        locationId: 1,
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
      where: { locationId: 1 },
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
