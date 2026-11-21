import { archiveAndDeleteUser } from "@hmcts/account/user-archive";
import { deleteB2cUser, getGraphApiAccessToken } from "@hmcts/auth";
import { prisma } from "@hmcts/postgres-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteUserById, getUserById, searchUsers } from "./queries.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn()
    }
  }
}));

vi.mock("@hmcts/account/user-archive", () => ({
  archiveAndDeleteUser: vi.fn()
}));

vi.mock("@hmcts/auth", () => ({
  deleteB2cUser: vi.fn(),
  getGraphApiAccessToken: vi.fn()
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
    it("should delegate to archiveAndDeleteUser with a deleter that gets a Graph token and deletes the B2C user", async () => {
      // Arrange
      vi.mocked(archiveAndDeleteUser).mockResolvedValue(true);
      vi.mocked(getGraphApiAccessToken).mockResolvedValue("graph-token");
      vi.mocked(deleteB2cUser).mockResolvedValue(undefined);

      // Act
      await deleteUserById("123");

      // Assert
      expect(archiveAndDeleteUser).toHaveBeenCalledWith("123", expect.any(Function));
      expect(getGraphApiAccessToken).not.toHaveBeenCalled();

      const deleter = vi.mocked(archiveAndDeleteUser).mock.calls[0][1];
      await deleter("b2c-oid-1");
      expect(getGraphApiAccessToken).toHaveBeenCalledTimes(1);
      expect(deleteB2cUser).toHaveBeenCalledWith("graph-token", "b2c-oid-1");
    });

    it("should throw 'User not found' when archiveAndDeleteUser returns false", async () => {
      // Arrange
      vi.mocked(archiveAndDeleteUser).mockResolvedValue(false);

      // Act & Assert
      await expect(deleteUserById("missing")).rejects.toThrow("User not found");
    });

    it("should propagate errors from archiveAndDeleteUser", async () => {
      // Arrange
      const dbError = new Error("insert failed");
      vi.mocked(archiveAndDeleteUser).mockRejectedValue(dbError);

      // Act & Assert
      await expect(deleteUserById("123")).rejects.toBe(dbError);
    });
  });
});
