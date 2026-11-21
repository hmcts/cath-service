import { prisma } from "@hmcts/postgres-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { archiveAndDeleteArtefact, deleteArtefactArchiveOnOrBefore, type ExpiredArtefact, findExpiredArtefacts } from "./queries.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    artefact: {
      findMany: vi.fn(),
      delete: vi.fn()
    },
    artefactArchive: {
      create: vi.fn(),
      deleteMany: vi.fn()
    },
    $transaction: vi.fn()
  }
}));

const NOW = new Date("2026-06-02T01:00:00.000Z");

function buildExpiredArtefact(overrides: Partial<ExpiredArtefact> = {}): ExpiredArtefact {
  return {
    artefactId: "550e8400-e29b-41d4-a716-446655440000",
    type: "LIST",
    locationId: "123",
    contentDate: new Date("2026-05-01T00:00:00.000Z"),
    sensitivity: "PUBLIC",
    language: "ENGLISH",
    displayFrom: new Date("2026-05-01T00:00:00.000Z"),
    displayTo: new Date("2026-05-02T00:00:00.000Z"),
    isFlatFile: false,
    provenance: "MANUAL_UPLOAD",
    sourceArtefactId: "upload.json",
    supersededCount: 2,
    lastReceivedDate: new Date("2026-04-30T10:00:00.000Z"),
    listType: { name: "CIVIL_DAILY_CAUSE_LIST" },
    ...overrides
  };
}

describe("artefact archive queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findExpiredArtefacts", () => {
    it("should select artefacts whose display_to is before now, ordered by artefactId, limited to take", async () => {
      // Arrange
      const rows = [buildExpiredArtefact()];
      vi.mocked(prisma.artefact.findMany).mockResolvedValue(rows as never);

      // Act
      const result = await findExpiredArtefacts(NOW, undefined, 100);

      // Assert
      expect(result).toEqual(rows);
      expect(prisma.artefact.findMany).toHaveBeenCalledWith({
        where: { displayTo: { lt: NOW } },
        orderBy: { artefactId: "asc" },
        take: 100,
        select: {
          artefactId: true,
          type: true,
          locationId: true,
          contentDate: true,
          sensitivity: true,
          language: true,
          displayFrom: true,
          displayTo: true,
          isFlatFile: true,
          provenance: true,
          sourceArtefactId: true,
          supersededCount: true,
          lastReceivedDate: true,
          listType: { select: { name: true } }
        }
      });
    });

    it("should add the artefactId cursor when one is given", async () => {
      // Arrange
      vi.mocked(prisma.artefact.findMany).mockResolvedValue([]);

      // Act
      await findExpiredArtefacts(NOW, "550e8400-e29b-41d4-a716-446655440000", 100);

      // Assert
      expect(vi.mocked(prisma.artefact.findMany).mock.calls[0][0]?.where).toEqual({
        displayTo: { lt: NOW },
        artefactId: { gt: "550e8400-e29b-41d4-a716-446655440000" }
      });
    });
  });

  describe("archiveAndDeleteArtefact", () => {
    it("should create the archive row and delete the artefact in one transaction", async () => {
      // Arrange
      const artefact = buildExpiredArtefact();
      vi.mocked(prisma.artefactArchive.create).mockReturnValue("create-op" as never);
      vi.mocked(prisma.artefact.delete).mockReturnValue("delete-op" as never);
      vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

      // Act
      await archiveAndDeleteArtefact(artefact);

      // Assert
      expect(prisma.$transaction).toHaveBeenCalledWith(["create-op", "delete-op"]);
      expect(prisma.artefactArchive.create).toHaveBeenCalledWith({
        data: {
          artefactId: artefact.artefactId,
          type: "LIST",
          locationId: "123",
          listTypeName: "CIVIL_DAILY_CAUSE_LIST",
          contentDate: artefact.contentDate,
          sensitivity: "PUBLIC",
          language: "ENGLISH",
          displayFrom: artefact.displayFrom,
          displayTo: artefact.displayTo,
          isFlatFile: false,
          provenance: "MANUAL_UPLOAD",
          sourceArtefactId: "upload.json",
          supersededCount: 2,
          lastReceivedDate: artefact.lastReceivedDate
        }
      });
      expect(prisma.artefact.delete).toHaveBeenCalledWith({ where: { artefactId: artefact.artefactId } });
    });

    it("should not write a listTypeId to the archive row", async () => {
      // Arrange
      vi.mocked(prisma.$transaction).mockResolvedValue([] as never);

      // Act
      await archiveAndDeleteArtefact(buildExpiredArtefact());

      // Assert
      expect(vi.mocked(prisma.artefactArchive.create).mock.calls[0][0].data).not.toHaveProperty("listTypeId");
    });

    it("should propagate a transaction failure", async () => {
      // Arrange
      vi.mocked(prisma.$transaction).mockRejectedValue(new Error("Unique constraint failed"));

      // Act
      const result = archiveAndDeleteArtefact(buildExpiredArtefact());

      // Assert
      await expect(result).rejects.toThrow("Unique constraint failed");
    });
  });

  describe("deleteArtefactArchiveOnOrBefore", () => {
    it("should delete archive rows archived on or before the cutoff and return the count", async () => {
      // Arrange
      const cutoff = new Date("2026-03-02T01:00:00.000Z");
      vi.mocked(prisma.artefactArchive.deleteMany).mockResolvedValue({ count: 7 });

      // Act
      const result = await deleteArtefactArchiveOnOrBefore(cutoff);

      // Assert
      expect(result).toBe(7);
      expect(prisma.artefactArchive.deleteMany).toHaveBeenCalledWith({ where: { archivedDate: { lte: cutoff } } });
    });
  });
});
