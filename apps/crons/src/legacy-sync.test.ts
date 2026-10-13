import { runLegacySync, SyncAbortedError, type SyncReport } from "@hmcts/legacy-migration";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { legacySync } from "./legacy-sync.js";

vi.mock("@hmcts/legacy-migration", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@hmcts/legacy-migration")>()),
  runLegacySync: vi.fn()
}));

const CLEAN_REPORT: SyncReport = {
  isDryRun: true,
  domains: [
    {
      entityType: "subscription",
      read: 2,
      existing: 0,
      loaded: 1,
      rejections: [{ entityId: "s-2", reason: "duplicate of an older subscription after search type mapping" }],
      dropLimitViolation: null
    }
  ],
  steps: []
};

describe("legacySync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubEnv("LEGACY_ACCOUNT_DATABASE_URL", "postgres://legacy");
    vi.stubEnv("LEGACY_SYNC_APPLY", "");
    vi.mocked(runLegacySync).mockResolvedValue(CLEAN_REPORT);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should fail when the legacy database URL is not set", async () => {
    // Arrange
    vi.stubEnv("LEGACY_ACCOUNT_DATABASE_URL", "");

    // Act
    const run = legacySync();

    // Assert
    await expect(run).rejects.toThrow("LEGACY_ACCOUNT_DATABASE_URL is required");
    expect(runLegacySync).not.toHaveBeenCalled();
  });

  it("should dry run unless apply is explicitly switched on", async () => {
    // Act
    await legacySync();

    // Assert
    expect(runLegacySync).toHaveBeenCalledWith({ legacyAccountDatabaseUrl: "postgres://legacy", isDryRun: true, maxDropRatio: 0.05 });
  });

  it("should apply when LEGACY_SYNC_APPLY is true", async () => {
    // Arrange
    vi.stubEnv("LEGACY_SYNC_APPLY", "true");

    // Act
    await legacySync();

    // Assert
    expect(runLegacySync).toHaveBeenCalledWith(expect.objectContaining({ isDryRun: false }));
  });

  it("should succeed when every rejection is accepted", async () => {
    // Act
    const run = legacySync();

    // Assert
    await expect(run).resolves.toBeUndefined();
  });

  it("should log the report and then fail when it has blocking issues", async () => {
    // Arrange
    vi.mocked(runLegacySync).mockResolvedValue({
      ...CLEAN_REPORT,
      domains: [{ ...CLEAN_REPORT.domains[0], rejections: [{ entityId: "s-3", reason: "unmapped search type PARTY_NAME" }] }]
    });

    // Act
    const run = legacySync();

    // Assert
    await expect(run).rejects.toThrow("Legacy account sync found 1 blocking issues");
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("1 x unmapped search type PARTY_NAME"));
  });

  it("should log the report carried by an aborted run, then still fail", async () => {
    // Arrange
    const abort = new SyncAbortedError("user: refusing to replace 100 rows with 0", { ...CLEAN_REPORT, isDryRun: false });
    vi.mocked(runLegacySync).mockRejectedValue(abort);

    // Act
    const run = legacySync();

    // Assert
    await expect(run).rejects.toBe(abort);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Legacy account sync aborted (applied)"));
  });

  it("should rethrow other failures without logging a report", async () => {
    // Arrange
    vi.mocked(runLegacySync).mockRejectedValue(new Error("connection refused"));

    // Act
    const run = legacySync();

    // Assert
    await expect(run).rejects.toThrow("connection refused");
    expect(console.log).not.toHaveBeenCalled();
  });
});
