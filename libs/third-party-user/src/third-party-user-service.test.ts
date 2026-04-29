import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createThirdPartyUser,
  deleteThirdPartyUser,
  findAllThirdPartyUsers,
  findThirdPartyUserById,
  updateThirdPartySubscriptions
} from "./third-party-user-service.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    thirdPartyUser: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn()
    },
    thirdPartySubscription: {
      deleteMany: vi.fn(),
      createMany: vi.fn()
    },
    $transaction: vi.fn()
  }
}));

import { prisma } from "@hmcts/postgres-prisma";

describe("third-party-user-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findAllThirdPartyUsers", () => {
    it("should return all third party users with subscription counts", async () => {
      const mockUsers = [{ id: "1", name: "Test User", createdAt: new Date(), _count: { subscriptions: 2 } }];
      vi.mocked(prisma.thirdPartyUser.findMany).mockResolvedValue(mockUsers as never);

      const result = await findAllThirdPartyUsers();

      expect(result).toEqual(mockUsers);
      expect(prisma.thirdPartyUser.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { subscriptions: true } } }
      });
    });
  });

  describe("findThirdPartyUserById", () => {
    it("should return user with subscriptions when found", async () => {
      const mockUser = { id: "1", name: "Test User", createdAt: new Date(), subscriptions: [] };
      vi.mocked(prisma.thirdPartyUser.findUnique).mockResolvedValue(mockUser as never);

      const result = await findThirdPartyUserById("1");

      expect(result).toEqual(mockUser);
      expect(prisma.thirdPartyUser.findUnique).toHaveBeenCalledWith({
        where: { id: "1" },
        include: { subscriptions: true }
      });
    });

    it("should return null when user not found", async () => {
      vi.mocked(prisma.thirdPartyUser.findUnique).mockResolvedValue(null);

      const result = await findThirdPartyUserById("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("createThirdPartyUser", () => {
    it("should create and return a new user when name does not exist", async () => {
      const mockUser = { id: "1", name: "New User", createdAt: new Date() };
      vi.mocked(prisma.thirdPartyUser.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.thirdPartyUser.create).mockResolvedValue(mockUser as never);

      const result = await createThirdPartyUser("New User");

      expect(result).toEqual(mockUser);
      expect(prisma.thirdPartyUser.create).toHaveBeenCalledWith({ data: { name: "New User" } });
    });

    it("should return existing user when name already exists (idempotency)", async () => {
      const existingUser = { id: "1", name: "Existing User", createdAt: new Date() };
      vi.mocked(prisma.thirdPartyUser.findFirst).mockResolvedValue(existingUser as never);

      const result = await createThirdPartyUser("Existing User");

      expect(result).toEqual(existingUser);
      expect(prisma.thirdPartyUser.create).not.toHaveBeenCalled();
    });
  });

  describe("updateThirdPartySubscriptions", () => {
    it("should delete existing and create new subscriptions in a transaction", async () => {
      const mockTx = {
        thirdPartySubscription: {
          deleteMany: vi.fn(),
          createMany: vi.fn()
        }
      };
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(mockTx as never));

      await updateThirdPartySubscriptions("user-1", { CIVIL_DAILY_CAUSE_LIST: "PUBLIC", FAMILY_DAILY_CAUSE_LIST: "PRIVATE" });

      expect(mockTx.thirdPartySubscription.deleteMany).toHaveBeenCalledWith({ where: { thirdPartyUserId: "user-1" } });
      expect(mockTx.thirdPartySubscription.createMany).toHaveBeenCalledWith({
        data: [
          { thirdPartyUserId: "user-1", listType: "CIVIL_DAILY_CAUSE_LIST", sensitivity: "PUBLIC" },
          { thirdPartyUserId: "user-1", listType: "FAMILY_DAILY_CAUSE_LIST", sensitivity: "PRIVATE" }
        ]
      });
    });

    it("should skip unselected subscriptions", async () => {
      const mockTx = {
        thirdPartySubscription: {
          deleteMany: vi.fn(),
          createMany: vi.fn()
        }
      };
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(mockTx as never));

      await updateThirdPartySubscriptions("user-1", { CIVIL_DAILY_CAUSE_LIST: "UNSELECTED", FAMILY_DAILY_CAUSE_LIST: "PUBLIC" });

      expect(mockTx.thirdPartySubscription.createMany).toHaveBeenCalledWith({
        data: [{ thirdPartyUserId: "user-1", listType: "FAMILY_DAILY_CAUSE_LIST", sensitivity: "PUBLIC" }]
      });
    });

    it("should not call createMany when all subscriptions are unselected", async () => {
      const mockTx = {
        thirdPartySubscription: {
          deleteMany: vi.fn(),
          createMany: vi.fn()
        }
      };
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(mockTx as never));

      await updateThirdPartySubscriptions("user-1", { CIVIL_DAILY_CAUSE_LIST: "UNSELECTED" });

      expect(mockTx.thirdPartySubscription.createMany).not.toHaveBeenCalled();
    });
  });

  describe("deleteThirdPartyUser", () => {
    it("should delete the user by id", async () => {
      vi.mocked(prisma.thirdPartyUser.delete).mockResolvedValue({ id: "1", name: "User", createdAt: new Date() } as never);

      await deleteThirdPartyUser("1");

      expect(prisma.thirdPartyUser.delete).toHaveBeenCalledWith({ where: { id: "1" } });
    });
  });
});
