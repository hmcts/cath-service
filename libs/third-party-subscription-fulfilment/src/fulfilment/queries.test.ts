import { prisma } from "@hmcts/postgres-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { findArtefactForFulfilment, findListTypeName, findMatchingSubscriptions } from "./queries.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    artefact: { findUnique: vi.fn() },
    listType: { findUnique: vi.fn() },
    thirdPartySubscription: { findMany: vi.fn() }
  }
}));

describe("third-party fulfilment queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findMatchingSubscriptions", () => {
    it("should query subscriptions by list type name and sensitivities", async () => {
      // Arrange
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({ id: 999 } as never);
      vi.mocked(prisma.thirdPartySubscription.findMany).mockResolvedValue([{ thirdPartyUserId: "user-1" }, { thirdPartyUserId: "user-2" }] as never);

      // Act
      const result = await findMatchingSubscriptions("CIVIL_DAILY_CAUSE_LIST", ["PRIVATE", "CLASSIFIED"]);

      // Assert
      expect(result).toEqual(["user-1", "user-2"]);
      expect(prisma.listType.findUnique).toHaveBeenCalledWith({ where: { name: "CIVIL_DAILY_CAUSE_LIST" }, select: { id: true } });
      expect(prisma.thirdPartySubscription.findMany).toHaveBeenCalledWith({
        where: { listTypeId: 999, sensitivity: { in: ["PRIVATE", "CLASSIFIED"] } },
        select: { thirdPartyUserId: true }
      });
    });

    it("should return an empty list when the list type name is unknown", async () => {
      // Arrange
      vi.mocked(prisma.listType.findUnique).mockResolvedValue(null);

      // Act
      const result = await findMatchingSubscriptions("UNKNOWN_LIST", ["PUBLIC"]);

      // Assert
      expect(result).toEqual([]);
      expect(prisma.thirdPartySubscription.findMany).not.toHaveBeenCalled();
    });

    it("should return an empty list without querying when no sensitivities are allowed", async () => {
      // Act
      const result = await findMatchingSubscriptions("CIVIL_DAILY_CAUSE_LIST", []);

      // Assert
      expect(result).toEqual([]);
      expect(prisma.listType.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("findListTypeName", () => {
    it("should return the list type name when found", async () => {
      // Arrange
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({ name: "CIVIL_DAILY_CAUSE_LIST" } as never);

      // Act
      const result = await findListTypeName(999);

      // Assert
      expect(result).toBe("CIVIL_DAILY_CAUSE_LIST");
      expect(prisma.listType.findUnique).toHaveBeenCalledWith({ where: { id: 999 }, select: { name: true } });
    });

    it("should return null when the list type is not found", async () => {
      // Arrange
      vi.mocked(prisma.listType.findUnique).mockResolvedValue(null);

      // Act
      const result = await findListTypeName(999);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("findArtefactForFulfilment", () => {
    it("should select the artefact fields with the list type name", async () => {
      // Arrange
      const artefact = { artefactId: "artefact-1", listType: { name: "CIVIL_DAILY_CAUSE_LIST" } };
      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(artefact as never);

      // Act
      const result = await findArtefactForFulfilment("artefact-1");

      // Assert
      expect(result).toEqual(artefact);
      expect(prisma.artefact.findUnique).toHaveBeenCalledWith({
        where: { artefactId: "artefact-1" },
        select: {
          artefactId: true,
          locationId: true,
          contentDate: true,
          sensitivity: true,
          language: true,
          displayFrom: true,
          displayTo: true,
          isFlatFile: true,
          sourceArtefactId: true,
          listType: { select: { name: true } }
        }
      });
    });
  });
});
