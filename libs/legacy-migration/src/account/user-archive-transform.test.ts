import { describe, expect, it } from "vitest";
import type { LegacyArchivedUser } from "./legacy-account-source.js";
import { transformArchivedUsers } from "./user-archive-transform.js";

function buildLegacyArchivedUser(overrides: Partial<LegacyArchivedUser> = {}): LegacyArchivedUser {
  return {
    user_id: "archived-1",
    user_provenance: "PI_AAD",
    provenance_user_id: "aad-oid-1",
    email: "Former.Admin@Example.com",
    roles: "INTERNAL_ADMIN_LOCAL",
    last_signed_in_date: new Date("2026-05-01T09:00:00Z"),
    archived_date: new Date("2026-08-01T02:00:00Z"),
    ...overrides
  };
}

describe("transformArchivedUsers", () => {
  it("should copy archived accounts exactly as legacy recorded them", () => {
    // Act
    const result = transformArchivedUsers([buildLegacyArchivedUser()]);

    // Assert
    expect(result.rows).toEqual([
      {
        userId: "archived-1",
        userProvenance: "PI_AAD",
        provenanceUserId: "aad-oid-1",
        email: "Former.Admin@Example.com",
        roles: "INTERNAL_ADMIN_LOCAL",
        lastSignedInDate: new Date("2026-05-01T09:00:00Z"),
        archivedDate: new Date("2026-08-01T02:00:00Z")
      }
    ]);
    expect(result.rejections).toHaveLength(0);
  });

  it("should keep provenances this service does not migrate as users", () => {
    // Act
    const result = transformArchivedUsers([buildLegacyArchivedUser({ user_provenance: "THIRD_PARTY", roles: "GENERAL_THIRD_PARTY" })]);

    // Assert
    expect(result.rows[0]).toMatchObject({ userProvenance: "THIRD_PARTY", roles: "GENERAL_THIRD_PARTY" });
  });

  it("should reject an archived account with no archived date", () => {
    // Act
    const result = transformArchivedUsers([buildLegacyArchivedUser({ archived_date: null })]);

    // Assert
    expect(result.rows).toHaveLength(0);
    expect(result.rejections).toEqual([{ entityId: "archived-1", reason: "missing archived date" }]);
  });
});
