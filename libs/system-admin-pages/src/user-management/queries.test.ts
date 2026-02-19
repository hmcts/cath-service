import { prisma } from "@hmcts/postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteUserById, getUserById, searchUsers } from "./queries.js";

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn()
    },
    subscription: {
      findMany: vi.fn(),
      deleteMany: vi.fn()
    },
    notificationAuditLog: {
      deleteMany: vi.fn()
    },
    $transaction: vi.fn()
  }
}));

describe("User Management Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("searchUsers", () => {
    it("should return paginated users with no filters", async () => {
      // Arrange
      const mockUsers = [
        {
          userId: "123",
          email: "test@example.com",
          firstName: "Test",
          surname: "User",
          userProvenance: "CFT_IDAM",
          userProvenanceId: "prov123",
          role: "VERIFIED",
          createdDate: new Date(),
          lastSignedInDate: new Date()
        }
      ];

      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      // Act
      const result = await searchUsers({}, 1);

      // Assert
      expect(result.users).toEqual(mockUsers);
      expect(result.totalCount).toBe(1);
      expect(result.currentPage).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {},
        select: expect.any(Object),
        skip: 0,
        take: 25,
        orderBy: { createdDate: "desc" }
      });
    });

    it("should filter by email with partial match", async () => {
      // Arrange
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.count).mockResolvedValue(0);

      // Act
      await searchUsers({ email: "test@example.com" }, 1);

      // Assert
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            email: { contains: "test@example.com", mode: "insensitive" }
          }
        })
      );
    });

    it("should filter by userId with exact match", async () => {
      // Arrange
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.count).mockResolvedValue(0);

      // Act
      await searchUsers({ userId: "123" }, 1);

      // Assert
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "123" }
        })
      );
    });

    it("should filter by multiple roles", async () => {
      // Arrange
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.count).mockResolvedValue(0);

      // Act
      await searchUsers({ roles: ["SYSTEM_ADMIN", "VERIFIED"] }, 1);

      // Assert
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { role: { in: ["SYSTEM_ADMIN", "VERIFIED"] } }
        })
      );
    });

    it("should calculate pagination correctly for page 2", async () => {
      // Arrange
      vi.mocked(prisma.user.findMany).mockResolvedValue([]);
      vi.mocked(prisma.user.count).mockResolvedValue(50);

      // Act
      const result = await searchUsers({}, 2);

      // Assert
      expect(result.currentPage).toBe(2);
      expect(result.totalPages).toBe(2);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 25,
          take: 25
        })
      );
    });
  });

  describe("getUserById", () => {
    it("should return user when found", async () => {
      // Arrange
      const mockUser = {
        userId: "123",
        email: "test@example.com",
        firstName: "Test",
        surname: "User",
        userProvenance: "CFT_IDAM",
        userProvenanceId: "prov123",
        role: "VERIFIED",
        createdDate: new Date(),
        lastSignedInDate: new Date()
      };

      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

      // Act
      const result = await getUserById("123");

      // Assert
      expect(result).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { userId: "123" },
        select: expect.any(Object)
      });
    });

    it("should return null when user not found", async () => {
      // Arrange
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      // Act
      const result = await getUserById("nonexistent");

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("deleteUserById", () => {
    it("should delete user, subscriptions, and audit logs in transaction", async () => {
      // Arrange
      const mockSubscriptions = [{ subscriptionId: "sub1" }, { subscriptionId: "sub2" }];
      const mockTx = {
        subscription: {
          findMany: vi.fn().mockResolvedValue(mockSubscriptions),
          deleteMany: vi.fn().mockResolvedValue({ count: 2 })
        },
        notificationAuditLog: {
          deleteMany: vi.fn().mockResolvedValue({ count: 5 })
        },
        user: { delete: vi.fn().mockResolvedValue({ userId: "123" }) }
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      // Act
      await deleteUserById("123");

      // Assert
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(mockTx.subscription.findMany).toHaveBeenCalledWith({
        where: { userId: "123" },
        select: { subscriptionId: true }
      });
      expect(mockTx.notificationAuditLog.deleteMany).toHaveBeenCalledWith({
        where: { subscriptionId: { in: ["sub1", "sub2"] } }
      });
      expect(mockTx.subscription.deleteMany).toHaveBeenCalledWith({
        where: { userId: "123" }
      });
      expect(mockTx.user.delete).toHaveBeenCalledWith({
        where: { userId: "123" }
      });
    });

    it("should skip audit log deletion when user has no subscriptions", async () => {
      // Arrange
      const mockTx = {
        subscription: {
          findMany: vi.fn().mockResolvedValue([]),
          deleteMany: vi.fn().mockResolvedValue({ count: 0 })
        },
        notificationAuditLog: {
          deleteMany: vi.fn()
        },
        user: { delete: vi.fn().mockResolvedValue({ userId: "123" }) }
      };

      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      // Act
      await deleteUserById("123");

      // Assert
      expect(mockTx.subscription.findMany).toHaveBeenCalled();
      expect(mockTx.notificationAuditLog.deleteMany).not.toHaveBeenCalled();
      expect(mockTx.subscription.deleteMany).toHaveBeenCalled();
      expect(mockTx.user.delete).toHaveBeenCalled();
    });
  });
});
