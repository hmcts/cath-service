import { prisma } from "@hmcts/postgres-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { findArtefactsDisplayedFromToday, findScheduledListTypeArtefactsForToday } from "./queries.js";

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    artefact: {
      findMany: vi.fn()
    }
  }
}));

const SCHEDULED_NAMES = ["MAGISTRATES_ADULT_COURT_LIST_DAILY", "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY"];
const NOW = new Date("2026-06-02T09:30:00.000Z");
const DAY = {
  start: new Date("2026-06-01T23:00:00.000Z"),
  end: new Date("2026-06-02T23:00:00.000Z"),
  contentDate: new Date("2026-06-02T00:00:00.000Z")
};

function buildRow(overrides = {}) {
  return {
    artefactId: "artefact-1",
    locationId: "123",
    listTypeId: 999,
    contentDate: DAY.contentDate,
    language: "ENGLISH",
    isFlatFile: false,
    listType: { name: "MAGISTRATES_ADULT_COURT_LIST_DAILY" },
    ...overrides
  };
}

function whereClause() {
  return vi.mocked(prisma.artefact.findMany).mock.calls[0][0]?.where;
}

describe("subscription schedule queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findArtefactsDisplayedFromToday", () => {
    it("should filter by the London day, not expired, received before today and non-scheduled list types", async () => {
      // Arrange
      vi.mocked(prisma.artefact.findMany).mockResolvedValue([]);

      // Act
      await findArtefactsDisplayedFromToday(DAY, NOW);

      // Assert
      expect(whereClause()).toEqual({
        displayFrom: { gte: DAY.start, lt: DAY.end },
        OR: [{ displayTo: null }, { displayTo: { gt: NOW } }],
        lastReceivedDate: { lt: DAY.start },
        listType: { name: { notIn: expect.arrayContaining(SCHEDULED_NAMES) } }
      });
      expect((whereClause() as { listType: { name: { notIn: string[] } } }).listType.name.notIn).toHaveLength(SCHEDULED_NAMES.length);
    });

    it("should map rows to scheduled artefacts with the list type name", async () => {
      // Arrange
      vi.mocked(prisma.artefact.findMany).mockResolvedValue([buildRow({ listType: { name: "CIVIL_DAILY_CAUSE_LIST" } })] as never);

      // Act
      const result = await findArtefactsDisplayedFromToday(DAY, NOW);

      // Assert
      expect(result).toEqual([
        {
          artefactId: "artefact-1",
          locationId: "123",
          listTypeId: 999,
          listTypeName: "CIVIL_DAILY_CAUSE_LIST",
          contentDate: DAY.contentDate,
          language: "ENGLISH",
          isFlatFile: false
        }
      ]);
    });

    it("should drop artefacts for NoMatch locations", async () => {
      // Arrange
      vi.mocked(prisma.artefact.findMany).mockResolvedValue([
        buildRow({ artefactId: "matched" }),
        buildRow({ artefactId: "unmatched", locationId: "NoMatch456" })
      ] as never);

      // Act
      const result = await findArtefactsDisplayedFromToday(DAY, NOW);

      // Assert
      expect(result.map((artefact) => artefact.artefactId)).toEqual(["matched"]);
    });

    it("should propagate query errors", async () => {
      // Arrange
      vi.mocked(prisma.artefact.findMany).mockRejectedValue(new Error("Database unavailable"));

      // Act
      const result = findArtefactsDisplayedFromToday(DAY, NOW);

      // Assert
      await expect(result).rejects.toThrow("Database unavailable");
    });
  });

  describe("findScheduledListTypeArtefactsForToday", () => {
    it("should filter by scheduled list type names, today's content date and not expired", async () => {
      // Arrange
      vi.mocked(prisma.artefact.findMany).mockResolvedValue([]);

      // Act
      await findScheduledListTypeArtefactsForToday(DAY, NOW);

      // Assert
      const where = whereClause();
      expect(where).toEqual({
        listType: { name: { in: expect.arrayContaining(SCHEDULED_NAMES) } },
        contentDate: DAY.contentDate,
        OR: [{ displayTo: null }, { displayTo: { gt: NOW } }]
      });
      expect((where as { listType: { name: { in: string[] } } }).listType.name.in).toHaveLength(SCHEDULED_NAMES.length);
      expect(where).not.toHaveProperty("listTypeId");
      expect(where).not.toHaveProperty("displayFrom");
    });

    it("should map rows using the list type name regardless of the numeric id", async () => {
      // Arrange
      vi.mocked(prisma.artefact.findMany).mockResolvedValue([
        buildRow({ listTypeId: 999, listType: { name: "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY" } })
      ] as never);

      // Act
      const result = await findScheduledListTypeArtefactsForToday(DAY, NOW);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].listTypeName).toBe("MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY");
      expect(result[0].listTypeId).toBe(999);
    });

    it("should drop artefacts for NoMatch locations", async () => {
      // Arrange
      vi.mocked(prisma.artefact.findMany).mockResolvedValue([buildRow({ locationId: "NoMatch789" })] as never);

      // Act
      const result = await findScheduledListTypeArtefactsForToday(DAY, NOW);

      // Assert
      expect(result).toEqual([]);
    });
  });
});
