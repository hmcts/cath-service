import { prisma } from "@hmcts/postgres-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type ArchivableUser, archiveAndDeleteUserRecord, findUserForArchive } from "./query.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    $transaction: vi.fn()
  }
}));

const USER: ArchivableUser = {
  userId: "11111111-1111-1111-1111-111111111111",
  userProvenance: "CFT_IDAM",
  userProvenanceId: "cft-123",
  email: "person@example.com",
  role: "VERIFIED",
  lastSignedInDate: new Date("2026-03-05T10:00:00.000Z")
};

function createMockTx() {
  return {
    userArchive: { create: vi.fn().mockResolvedValue({}) },
    subscription: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
    subscriptionListType: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    user: { delete: vi.fn().mockResolvedValue({}) }
  };
}

describe("user-archive query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findUserForArchive", () => {
    it("should select only the columns needed for the archive", async () => {
      // Arrange
      vi.mocked(prisma.user.findUnique).mockResolvedValue(USER as never);

      // Act
      const result = await findUserForArchive(USER.userId);

      // Assert
      expect(result).toEqual(USER);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { userId: USER.userId },
        select: { userId: true, userProvenance: true, userProvenanceId: true, email: true, role: true, lastSignedInDate: true }
      });
    });
  });

  describe("archiveAndDeleteUserRecord", () => {
    it("should delete subscriptions, list type subscriptions and the user, then archive with the ticket column mapping, on the same transaction", async () => {
      // Arrange
      const tx = createMockTx();
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(tx));

      // Act
      await archiveAndDeleteUserRecord(USER);

      // Assert
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(tx.userArchive.create).toHaveBeenCalledWith({
        data: {
          userId: USER.userId,
          userProvenance: "CFT_IDAM",
          provenanceUserId: "cft-123",
          email: "person@example.com",
          roles: "VERIFIED",
          lastSignedInDate: USER.lastSignedInDate
        }
      });
      expect(tx.subscription.deleteMany).toHaveBeenCalledWith({ where: { userId: USER.userId } });
      expect(tx.subscriptionListType.deleteMany).toHaveBeenCalledWith({ where: { userId: USER.userId } });
      expect(tx.user.delete).toHaveBeenCalledWith({ where: { userId: USER.userId } });

      const order = [
        tx.subscription.deleteMany.mock.invocationCallOrder[0],
        tx.subscriptionListType.deleteMany.mock.invocationCallOrder[0],
        tx.user.delete.mock.invocationCallOrder[0],
        tx.userArchive.create.mock.invocationCallOrder[0]
      ];
      expect(order).toEqual([...order].sort((a, b) => a - b));
    });

    it("should propagate an archive insert failure out of the transaction so the deletes roll back", async () => {
      // Arrange
      const tx = createMockTx();
      const insertError = new Error("insert failed");
      tx.userArchive.create.mockRejectedValue(insertError);
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(tx));

      // Act & Assert
      await expect(archiveAndDeleteUserRecord(USER)).rejects.toBe(insertError);
      expect(tx.user.delete).toHaveBeenCalledTimes(1);
    });

    it("should not write an archive row when the user has already been deleted by a concurrent delete", async () => {
      // Arrange
      const tx = createMockTx();
      const notFoundError = Object.assign(new Error("Record to delete does not exist."), { code: "P2025" });
      tx.user.delete.mockRejectedValue(notFoundError);
      vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => callback(tx));

      // Act & Assert
      await expect(archiveAndDeleteUserRecord(USER)).rejects.toBe(notFoundError);
      expect(tx.userArchive.create).not.toHaveBeenCalled();
    });
  });
});
