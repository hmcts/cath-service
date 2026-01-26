import { beforeEach, describe, expect, it, vi } from "vitest";
import { findActiveSubscriptionsByCaseNames, findActiveSubscriptionsByCaseNumbers, findActiveSubscriptionsByLocation } from "./subscription-queries.js";

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

    const { prisma } = await import("@hmcts/postgres");
    vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions as never);

    const result = await findActiveSubscriptionsByCaseNumbers(["CASE-789"]);

    expect(result).toHaveLength(1);
    expect(result[0].searchValue).toBe("CASE-789");
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

    const { prisma } = await import("@hmcts/postgres");
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
    const { prisma } = await import("@hmcts/postgres");
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

    const result = await findActiveSubscriptionsByLocation(999);

    expect(result).toHaveLength(0);
  });

  it("should return empty array when no subscriptions found for case numbers", async () => {
    const { prisma } = await import("@hmcts/postgres");
    vi.mocked(prisma.subscription.findMany).mockResolvedValue([]);

    const result = await findActiveSubscriptionsByCaseNumbers(["NON-EXISTENT"]);

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

    const { prisma } = await import("@hmcts/postgres");
    vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions as never);

    const result = await findActiveSubscriptionsByLocation(100);

    expect(result).toHaveLength(1);
    expect(result[0].user.firstName).toBeNull();
    expect(result[0].user.surname).toBeNull();
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

      const { prisma } = await import("@hmcts/postgres");
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

      const { prisma } = await import("@hmcts/postgres");
      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions as never);

      const result = await findActiveSubscriptionsByCaseNames(["White v Black"]);

      expect(result).toHaveLength(1);
      expect(result[0].searchValue).toBe("White v Black");
      expect(result[0].caseName).toBe("White v Black");
    });

    it("should return empty array when no subscriptions found for case names", async () => {
      const { prisma } = await import("@hmcts/postgres");
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

      const { prisma } = await import("@hmcts/postgres");
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

      const { prisma } = await import("@hmcts/postgres");
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

      const { prisma } = await import("@hmcts/postgres");
      vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions as never);

      const result = await findActiveSubscriptionsByCaseNames([longCaseName]);

      expect(result).toHaveLength(1);
      expect(result[0].caseName).toBe(longCaseName);
    });
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

    const { prisma } = await import("@hmcts/postgres");
    vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions as never);

    const result = await findActiveSubscriptionsByCaseNumbers(["2024/ABC/12345"]);

    expect(result).toHaveLength(1);
    expect(result[0].caseNumber).toBe("2024/ABC/12345");
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

    const { prisma } = await import("@hmcts/postgres");
    vi.mocked(prisma.subscription.findMany).mockResolvedValue(mockSubscriptions as never);

    const result = await findActiveSubscriptionsByLocation(200);

    expect(result).toHaveLength(2);
    expect(result[0].user.firstName).toBe("Jane");
    expect(result[0].user.surname).toBeNull();
    expect(result[1].user.firstName).toBeNull();
    expect(result[1].user.surname).toBe("Brown");
  });
});
