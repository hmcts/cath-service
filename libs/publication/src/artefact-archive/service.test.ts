import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteArtefactBlobs } from "../repository/queries.js";
import { archiveAndDeleteArtefact, deleteArtefactArchiveOnOrBefore, type ExpiredArtefact, findExpiredArtefacts } from "./queries.js";
import { archiveExpiredArtefacts, purgeArtefactArchive } from "./service.js";

vi.mock("./queries.js", () => ({
  findExpiredArtefacts: vi.fn(),
  archiveAndDeleteArtefact: vi.fn(),
  deleteArtefactArchiveOnOrBefore: vi.fn()
}));

vi.mock("../repository/queries.js", () => ({
  deleteArtefactBlobs: vi.fn()
}));

const NOW = new Date("2026-06-02T01:00:00.000Z");

function buildArtefact(artefactId: string, overrides: Partial<ExpiredArtefact> = {}): ExpiredArtefact {
  return {
    artefactId,
    type: "LIST",
    locationId: "123",
    contentDate: new Date("2026-05-01T00:00:00.000Z"),
    sensitivity: "PUBLIC",
    language: "ENGLISH",
    displayFrom: new Date("2026-05-01T00:00:00.000Z"),
    displayTo: new Date("2026-05-02T00:00:00.000Z"),
    isFlatFile: false,
    provenance: "MANUAL_UPLOAD",
    sourceArtefactId: `${artefactId}.json`,
    supersededCount: 0,
    lastReceivedDate: new Date("2026-04-30T10:00:00.000Z"),
    listType: { name: "CIVIL_DAILY_CAUSE_LIST" },
    ...overrides
  };
}

function buildArtefacts(count: number, prefix: string): ExpiredArtefact[] {
  return Array.from({ length: count }, (_, index) => buildArtefact(`${prefix}-${String(index).padStart(3, "0")}`));
}

describe("artefact archive service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(archiveAndDeleteArtefact).mockResolvedValue(undefined);
    vi.mocked(deleteArtefactBlobs).mockResolvedValue(undefined);
  });

  describe("archiveExpiredArtefacts", () => {
    it("should archive every artefact across pages and advance the cursor", async () => {
      // Arrange
      const firstPage = buildArtefacts(100, "a");
      const secondPage = buildArtefacts(3, "b");
      vi.mocked(findExpiredArtefacts).mockResolvedValueOnce(firstPage).mockResolvedValueOnce(secondPage);

      // Act
      const result = await archiveExpiredArtefacts(NOW);

      // Assert
      expect(findExpiredArtefacts).toHaveBeenCalledTimes(2);
      expect(findExpiredArtefacts).toHaveBeenNthCalledWith(1, NOW, undefined, 100);
      expect(findExpiredArtefacts).toHaveBeenNthCalledWith(2, NOW, "a-099", 100);
      expect(archiveAndDeleteArtefact).toHaveBeenCalledTimes(103);
      expect(deleteArtefactBlobs).toHaveBeenCalledTimes(103);
      expect(deleteArtefactBlobs).toHaveBeenCalledWith("b-002", "b-002.json");
      expect(result).toEqual({ searchDate: NOW, archived: 103, failed: [] });
    });

    it("should query once more when the last page is exactly full", async () => {
      // Arrange
      vi.mocked(findExpiredArtefacts).mockResolvedValueOnce(buildArtefacts(100, "a")).mockResolvedValueOnce([]);

      // Act
      const result = await archiveExpiredArtefacts(NOW);

      // Assert
      expect(findExpiredArtefacts).toHaveBeenCalledTimes(2);
      expect(result.archived).toBe(100);
    });

    it("should do nothing and return zero when there are no expired artefacts", async () => {
      // Arrange
      vi.mocked(findExpiredArtefacts).mockResolvedValue([]);

      // Act
      const result = await archiveExpiredArtefacts(NOW);

      // Assert
      expect(archiveAndDeleteArtefact).not.toHaveBeenCalled();
      expect(deleteArtefactBlobs).not.toHaveBeenCalled();
      expect(result).toEqual({ searchDate: NOW, archived: 0, failed: [] });
    });

    it("should use the current time as the search date when none is injected", async () => {
      // Arrange
      vi.mocked(findExpiredArtefacts).mockResolvedValue([]);
      const before = Date.now();

      // Act
      const result = await archiveExpiredArtefacts();

      // Assert
      expect(result.searchDate.getTime()).toBeGreaterThanOrEqual(before);
      expect(findExpiredArtefacts).toHaveBeenCalledWith(result.searchDate, undefined, 100);
    });

    it("should continue after a transaction failure, record it as a database failure and leave that artefact's blobs", async () => {
      // Arrange
      vi.mocked(findExpiredArtefacts).mockResolvedValueOnce([buildArtefact("a"), buildArtefact("b"), buildArtefact("c")]);
      vi.mocked(archiveAndDeleteArtefact).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("Deadlock detected"));

      // Act
      const result = await archiveExpiredArtefacts(NOW);

      // Assert
      expect(archiveAndDeleteArtefact).toHaveBeenCalledTimes(3);
      expect(deleteArtefactBlobs).toHaveBeenCalledTimes(2);
      expect(deleteArtefactBlobs).not.toHaveBeenCalledWith("b", expect.anything());
      expect(result.archived).toBe(2);
      expect(result.failed).toEqual([{ artefactId: "b", stage: "database", message: "Deadlock detected" }]);
      expect(console.error).toHaveBeenCalledWith("[ExpiredArtefacts] Failed to archive artefact:", {
        artefactId: "b",
        stage: "database",
        error: "Deadlock detected"
      });
    });

    it("should continue after a blob failure, record it as a blob failure and still count the artefact as archived", async () => {
      // Arrange
      vi.mocked(findExpiredArtefacts).mockResolvedValueOnce([buildArtefact("a"), buildArtefact("b")]);
      vi.mocked(deleteArtefactBlobs).mockRejectedValueOnce(new Error("Failed to delete blobs for artefact a: artefact/a (Timeout)"));

      // Act
      const result = await archiveExpiredArtefacts(NOW);

      // Assert
      expect(deleteArtefactBlobs).toHaveBeenCalledTimes(2);
      expect(result.archived).toBe(2);
      expect(result.failed).toEqual([{ artefactId: "a", stage: "blob", message: "Failed to delete blobs for artefact a: artefact/a (Timeout)" }]);
    });

    it("should record a non-Error rejection as a string message", async () => {
      // Arrange
      vi.mocked(findExpiredArtefacts).mockResolvedValueOnce([buildArtefact("a")]);
      vi.mocked(archiveAndDeleteArtefact).mockRejectedValueOnce("connection reset");

      // Act
      const result = await archiveExpiredArtefacts(NOW);

      // Assert
      expect(result.failed).toEqual([{ artefactId: "a", stage: "database", message: "connection reset" }]);
    });

    it("should delete blobs only after the transaction has resolved", async () => {
      // Arrange
      const calls: string[] = [];
      vi.mocked(findExpiredArtefacts).mockResolvedValueOnce([buildArtefact("a")]);
      vi.mocked(archiveAndDeleteArtefact).mockImplementation(async () => {
        await Promise.resolve();
        calls.push("transaction");
      });
      vi.mocked(deleteArtefactBlobs).mockImplementation(async () => {
        calls.push("blobs");
      });

      // Act
      await archiveExpiredArtefacts(NOW);

      // Assert
      expect(calls).toEqual(["transaction", "blobs"]);
    });

    it("should propagate a failure to read expired artefacts", async () => {
      // Arrange
      vi.mocked(findExpiredArtefacts).mockRejectedValue(new Error("Database unavailable"));

      // Act
      const result = archiveExpiredArtefacts(NOW);

      // Assert
      await expect(result).rejects.toThrow("Database unavailable");
    });
  });

  describe("purgeArtefactArchive", () => {
    it.each([
      { now: "2026-08-15T01:00:00.000Z", cutoff: "2026-05-15T01:00:00.000Z", label: "15 Aug to 15 May" },
      { now: "2026-05-31T01:00:00.000Z", cutoff: "2026-02-28T01:00:00.000Z", label: "31 May to 28 Feb in a non-leap year" },
      { now: "2028-05-31T01:00:00.000Z", cutoff: "2028-02-29T01:00:00.000Z", label: "31 May to 29 Feb in a leap year" },
      { now: "2026-03-31T01:00:00.000Z", cutoff: "2025-12-31T01:00:00.000Z", label: "31 Mar to 31 Dec of the previous year" },
      { now: "2026-08-15T23:59:58.123Z", cutoff: "2026-05-15T23:59:58.123Z", label: "keeping the time of day" }
    ])("should purge with a cutoff of $label", async ({ now, cutoff }) => {
      // Arrange
      vi.mocked(deleteArtefactArchiveOnOrBefore).mockResolvedValue(4);

      // Act
      const result = await purgeArtefactArchive(new Date(now));

      // Assert
      expect(deleteArtefactArchiveOnOrBefore).toHaveBeenCalledWith(new Date(cutoff));
      expect(result).toEqual({ cutoff: new Date(cutoff), deleted: 4 });
    });

    it("should use the current time when none is injected", async () => {
      // Arrange
      vi.mocked(deleteArtefactArchiveOnOrBefore).mockResolvedValue(0);

      // Act
      const result = await purgeArtefactArchive();

      // Assert
      expect(result.cutoff.getTime()).toBeLessThan(Date.now());
      expect(result.deleted).toBe(0);
    });

    it("should propagate a purge failure", async () => {
      // Arrange
      vi.mocked(deleteArtefactArchiveOnOrBefore).mockRejectedValue(new Error("Database unavailable"));

      // Act
      const result = purgeArtefactArchive(NOW);

      // Assert
      await expect(result).rejects.toThrow("Database unavailable");
    });
  });
});
