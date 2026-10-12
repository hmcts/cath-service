import { describe, expect, it } from "vitest";
import { transformAuditLogs } from "./audit-log-transform.js";
import type { LegacyAuditLog } from "./legacy-account-source.js";

function buildLegacyLog(overrides: Partial<LegacyAuditLog> = {}): LegacyAuditLog {
  return {
    id: "audit-1",
    user_id: "user-1",
    user_email: "admin@example.com",
    roles: "INTERNAL_SUPER_ADMIN_CTSC",
    user_provenance: "SSO",
    action: "DELETE_LOCATION_SUCCESS",
    details: "Deleted location 9",
    timestamp: new Date("2026-09-01T10:00:00Z"),
    ...overrides
  };
}

describe("transformAuditLogs", () => {
  it("should copy roles and actions exactly as legacy recorded them", () => {
    // Act
    const result = transformAuditLogs([buildLegacyLog()]);

    // Assert
    expect(result.rows).toEqual([
      {
        id: "audit-1",
        timestamp: new Date("2026-09-01T10:00:00Z"),
        action: "DELETE_LOCATION_SUCCESS",
        details: "Deleted location 9",
        userId: "user-1",
        userEmail: "admin@example.com",
        userRole: "INTERNAL_SUPER_ADMIN_CTSC",
        userProvenance: "SSO"
      }
    ]);
  });

  it("should reject entries missing a field this service requires", () => {
    // Act
    const result = transformAuditLogs([buildLegacyLog({ user_email: null })]);

    // Assert
    expect(result.rows).toHaveLength(0);
    expect(result.rejections).toEqual([{ entityId: "audit-1", reason: "missing a required audit field" }]);
  });
});
