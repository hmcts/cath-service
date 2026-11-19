import { archiveExpiredArtefacts, purgeArtefactArchive } from "@hmcts/publication";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { closeConnections } from "./close-connections.js";
import expiredArtefacts from "./expired-artefacts.js";

vi.mock("@hmcts/publication", () => ({
  archiveExpiredArtefacts: vi.fn(),
  purgeArtefactArchive: vi.fn()
}));

vi.mock("./close-connections.js", () => ({
  closeConnections: vi.fn().mockResolvedValue(undefined)
}));

const SEARCH_DATE = new Date("2026-06-02T01:00:00.000Z");
const PURGE_CUTOFF = new Date("2026-03-02T01:00:00.000Z");

describe("expiredArtefacts", () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(purgeArtefactArchive).mockResolvedValue({ cutoff: PURGE_CUTOFF, deleted: 5 });
  });

  it("should log the archived count with the search date and the purged count with the cutoff, then resolve", async () => {
    // Arrange
    vi.mocked(archiveExpiredArtefacts).mockResolvedValue({ searchDate: SEARCH_DATE, archived: 3, failed: [] });

    // Act
    await expiredArtefacts();

    // Assert
    expect(consoleInfoSpy).toHaveBeenCalledWith("[ExpiredArtefacts] Archived 3 artefacts with display_to before 2026-06-02T01:00:00.000Z");
    expect(consoleInfoSpy).toHaveBeenCalledWith("[ExpiredArtefacts] Deleted 5 artefact_archive rows archived on or before 2026-03-02T01:00:00.000Z");
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(closeConnections).toHaveBeenCalledTimes(1);
  });

  it("should log each failure, still run the purge, then throw and close connections", async () => {
    // Arrange
    vi.mocked(archiveExpiredArtefacts).mockResolvedValue({
      searchDate: SEARCH_DATE,
      archived: 2,
      failed: [
        { artefactId: "a", stage: "database", message: "Deadlock detected" },
        { artefactId: "b", stage: "blob", message: "Failed to delete blobs for artefact b: artefact/b (Timeout)" }
      ]
    });

    // Act
    const result = expiredArtefacts();

    // Assert
    await expect(result).rejects.toThrow("2 artefact(s) failed to archive cleanly");
    expect(consoleErrorSpy).toHaveBeenCalledWith("[ExpiredArtefacts] Artefact a failed at the database stage: Deadlock detected");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[ExpiredArtefacts] Artefact b failed at the blob stage: Failed to delete blobs for artefact b: artefact/b (Timeout)"
    );
    expect(purgeArtefactArchive).toHaveBeenCalledTimes(1);
    expect(consoleInfoSpy).toHaveBeenCalledWith("[ExpiredArtefacts] Deleted 5 artefact_archive rows archived on or before 2026-03-02T01:00:00.000Z");
    expect(closeConnections).toHaveBeenCalledTimes(1);
  });

  it("should propagate a purge failure and still close connections", async () => {
    // Arrange
    vi.mocked(archiveExpiredArtefacts).mockResolvedValue({ searchDate: SEARCH_DATE, archived: 0, failed: [] });
    vi.mocked(purgeArtefactArchive).mockRejectedValue(new Error("Database unavailable"));

    // Act
    const result = expiredArtefacts();

    // Assert
    await expect(result).rejects.toThrow("Database unavailable");
    expect(closeConnections).toHaveBeenCalledTimes(1);
  });

  it("should propagate an archive failure without purging and still close connections", async () => {
    // Arrange
    vi.mocked(archiveExpiredArtefacts).mockRejectedValue(new Error("Database unavailable"));

    // Act
    const result = expiredArtefacts();

    // Assert
    await expect(result).rejects.toThrow("Database unavailable");
    expect(purgeArtefactArchive).not.toHaveBeenCalled();
    expect(closeConnections).toHaveBeenCalledTimes(1);
  });
});
