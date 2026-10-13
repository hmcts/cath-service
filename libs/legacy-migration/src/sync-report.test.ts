import { describe, expect, it } from "vitest";
import { findBlockingIssues, formatSyncReport, type SyncReport } from "./sync-report.js";

function buildReport(overrides: Partial<SyncReport> = {}): SyncReport {
  return {
    isDryRun: true,
    domains: [
      {
        entityType: "subscription",
        read: 4,
        existing: 0,
        loaded: 1,
        rejections: [
          { entityId: "s-2", reason: "duplicate of an older subscription after search type mapping" },
          { entityId: "s-3", reason: "duplicate of an older subscription after search type mapping" },
          { entityId: "s-4", reason: "unmapped search type PARTY_NAME" }
        ],
        dropLimitViolation: null
      }
    ],
    steps: [{ name: "location_drift", processed: 1, rejections: [{ entityId: "9", reason: "name differs" }] }],
    ...overrides
  };
}

describe("findBlockingIssues", () => {
  it("should return the reasons of rejections the policy does not accept, from domains and steps", () => {
    // Act
    const result = findBlockingIssues(buildReport());

    // Assert
    expect(result).toEqual(["unmapped search type PARTY_NAME", "name differs"]);
  });

  it("should return nothing when every rejection is accepted", () => {
    // Arrange
    const report = buildReport({
      domains: [
        {
          entityType: "artefact",
          read: 1,
          existing: 0,
          loaded: 0,
          rejections: [{ entityId: "a-1", reason: "artefact type JUDGEMENTS_AND_OUTCOMES is not supported" }],
          dropLimitViolation: null
        }
      ],
      steps: [{ name: "oauth_secrets", processed: 0, rejections: [], skipped: "no legacy vault configured" }]
    });

    // Act
    const result = findBlockingIssues(report);

    // Assert
    expect(result).toEqual([]);
  });

  it("should treat a drop limit violation as blocking", () => {
    // Arrange
    const report = buildReport({
      domains: [{ entityType: "user", read: 0, existing: 100, loaded: 0, rejections: [], dropLimitViolation: "user: refusing to replace 100 rows with 0" }],
      steps: []
    });

    // Act
    const result = findBlockingIssues(report);

    // Assert
    expect(result).toEqual(["user: refusing to replace 100 rows with 0"]);
  });
});

describe("formatSyncReport", () => {
  it("should mark accepted reasons and end with the blocking issue count", () => {
    // Act
    const result = formatSyncReport("Legacy account sync", buildReport());

    // Assert
    expect(result.split("\n")).toEqual([
      "Legacy account sync (dry run)",
      "subscription: read=4 existing=0 loaded=1 rejected=3",
      "  2 x duplicate of an older subscription after search type mapping (accepted)",
      "  1 x unmapped search type PARTY_NAME",
      "location_drift: processed=1 rejected=1",
      "  1 x name differs",
      "blocking issues: 2"
    ]);
  });
});
