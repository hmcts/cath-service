import { deleteExpiredAuditLogs } from "@hmcts/system-admin-pages/audit-log/repository";
import { beforeEach, describe, expect, it, vi } from "vitest";
import clearAudit from "./clear-audit.js";
import { closeConnections } from "./close-connections.js";

vi.mock("@hmcts/system-admin-pages/audit-log/repository", () => ({
  deleteExpiredAuditLogs: vi.fn()
}));

vi.mock("./close-connections.js", () => ({
  closeConnections: vi.fn().mockResolvedValue(undefined)
}));

describe("clearAudit", () => {
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  });

  it("should delete expired audit logs, log the count and cutoff and close connections", async () => {
    // Arrange
    vi.mocked(deleteExpiredAuditLogs).mockResolvedValue({ cutoff: new Date("2026-03-04T01:00:00.000Z"), deleted: 12 });

    // Act
    await clearAudit();

    // Assert
    expect(deleteExpiredAuditLogs).toHaveBeenCalledTimes(1);
    expect(consoleInfoSpy).toHaveBeenCalledWith("[ClearAudit] Deleted 12 audit log rows with timestamp before 2026-03-04T01:00:00.000Z");
    expect(closeConnections).toHaveBeenCalledTimes(1);
  });

  it("should propagate a deletion failure and still close connections", async () => {
    // Arrange
    vi.mocked(deleteExpiredAuditLogs).mockRejectedValue(new Error("Database unavailable"));

    // Act
    const result = clearAudit();

    // Assert
    await expect(result).rejects.toThrow("Database unavailable");
    expect(consoleInfoSpy).not.toHaveBeenCalled();
    expect(closeConnections).toHaveBeenCalledTimes(1);
  });
});
