import { beforeEach, describe, expect, it, vi } from "vitest";
import { runSyncJob, SYNC_RUN_EVENT } from "./run-sync-job.js";
import { SyncAbortedError, type SyncReport } from "./sync-report.js";

const CLEAN_REPORT: SyncReport = {
  isDryRun: false,
  domains: [
    {
      entityType: "subscription",
      read: 3,
      existing: 2,
      loaded: 2,
      rejections: [{ entityId: "s-3", reason: "duplicate of an older subscription after search type mapping" }],
      dropLimitViolation: null
    }
  ],
  steps: [{ name: "oauth_secrets", processed: 0, rejections: [], skipped: "LEGACY_THIRD_PARTY_KEY_VAULT is not set" }]
};

const BLOCKING_REPORT: SyncReport = {
  ...CLEAN_REPORT,
  domains: [
    {
      ...CLEAN_REPORT.domains[0],
      rejections: [
        { entityId: "s-4", reason: "unmapped search type PARTY_NAME" },
        { entityId: "s-5", reason: "unmapped search type PARTY_NAME" },
        { entityId: "s-6", reason: "user not migrated" }
      ]
    }
  ]
};

function buildJob(run: () => Promise<SyncReport>) {
  return { name: "accounts", title: "Legacy account sync", run };
}

describe("runSyncJob", () => {
  const monitoring = { trackEvent: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("should log the report and record a clean run with its counts", async () => {
    // Act
    await runSyncJob(
      buildJob(async () => CLEAN_REPORT),
      monitoring
    );

    // Assert
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Legacy account sync (applied)"));
    expect(monitoring.trackEvent).toHaveBeenCalledWith(SYNC_RUN_EVENT, {
      sync: "accounts",
      outcome: "clean",
      isDryRun: "false",
      blockingIssues: "0",
      blockingReasons: "{}",
      "subscription.read": "3",
      "subscription.existing": "2",
      "subscription.loaded": "2",
      "subscription.rejected": "1",
      "oauth_secrets.processed": "0",
      "oauth_secrets.rejected": "0",
      "oauth_secrets.skipped": "LEGACY_THIRD_PARTY_KEY_VAULT is not set"
    });
  });

  it("should record blocking reasons with counts and then fail", async () => {
    // Act
    const run = runSyncJob(
      buildJob(async () => BLOCKING_REPORT),
      monitoring
    );

    // Assert
    await expect(run).rejects.toThrow("Legacy account sync found 3 blocking issues");
    expect(monitoring.trackEvent).toHaveBeenCalledWith(
      SYNC_RUN_EVENT,
      expect.objectContaining({
        outcome: "blocking",
        blockingIssues: "3",
        blockingReasons: JSON.stringify({ "unmapped search type PARTY_NAME": 2, "user not migrated": 1 })
      })
    );
  });

  it("should log and record the report carried by an aborted run, then rethrow", async () => {
    // Arrange
    const abort = new SyncAbortedError("subscription: written rows differ from the transformed legacy rows; 1 missing (s-1)", CLEAN_REPORT);

    // Act
    const run = runSyncJob(
      buildJob(async () => {
        throw abort;
      }),
      monitoring
    );

    // Assert
    await expect(run).rejects.toBe(abort);
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Legacy account sync aborted (applied)"));
    expect(monitoring.trackEvent).toHaveBeenCalledWith(
      SYNC_RUN_EVENT,
      expect.objectContaining({ outcome: "aborted", abortReason: abort.message, "subscription.loaded": "2" })
    );
  });

  it("should record a failed run without a report when the sync errors for another reason", async () => {
    // Act
    const run = runSyncJob(
      buildJob(async () => {
        throw new Error("connection refused");
      }),
      monitoring
    );

    // Assert
    await expect(run).rejects.toThrow("connection refused");
    expect(monitoring.trackEvent).toHaveBeenCalledWith(SYNC_RUN_EVENT, { sync: "accounts", outcome: "failed" });
    expect(console.log).not.toHaveBeenCalled();
  });

  it("should truncate a long property to stay within the App Insights limit", async () => {
    // Arrange
    const abort = new SyncAbortedError("x".repeat(9000), CLEAN_REPORT);

    // Act
    await runSyncJob(
      buildJob(async () => {
        throw abort;
      }),
      monitoring
    ).catch(() => {});

    // Assert
    const [, properties] = monitoring.trackEvent.mock.calls[0];
    expect(properties.abortReason).toHaveLength(8001);
  });

  it("should still log and fail on blocking issues when App Insights is off", async () => {
    // Act
    const run = runSyncJob(buildJob(async () => BLOCKING_REPORT));

    // Assert
    await expect(run).rejects.toThrow("Legacy account sync found 3 blocking issues");
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("blocking issues: 3"));
  });
});
