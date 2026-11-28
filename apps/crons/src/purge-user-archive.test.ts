import { purgeExpiredUserArchives } from "@hmcts/account/user-archive";
import { prisma } from "@hmcts/postgres-prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";
import purgeUserArchive from "./purge-user-archive.js";

vi.mock("@hmcts/account/user-archive", () => ({
  purgeExpiredUserArchives: vi.fn()
}));

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    $disconnect: vi.fn()
  }
}));

describe("purgeUserArchive", () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.mocked(prisma.$disconnect).mockResolvedValue(undefined);
  });

  it("should log only the deleted count and cutoff, then disconnect", async () => {
    // Arrange
    vi.mocked(purgeExpiredUserArchives).mockResolvedValue({
      deletedCount: 2,
      cutoff: new Date("2026-08-18T02:00:00.000Z")
    });

    // Act
    await purgeUserArchive();

    // Assert
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).toHaveBeenCalledWith("Purged 2 user_archive row(s) archived on or before 2026-08-18T02:00:00.000Z");
    expect(prisma.$disconnect).toHaveBeenCalledTimes(1);
  });

  it("should reject, still disconnect and not log success when the purge fails", async () => {
    // Arrange
    const dbError = new Error("connection refused");
    vi.mocked(purgeExpiredUserArchives).mockRejectedValue(dbError);

    // Act & Assert
    await expect(purgeUserArchive()).rejects.toBe(dbError);
    expect(prisma.$disconnect).toHaveBeenCalledTimes(1);
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });
});
