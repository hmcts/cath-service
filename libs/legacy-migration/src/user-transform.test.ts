import { describe, expect, it } from "vitest";
import type { LegacyUser } from "./legacy-account-source.js";
import { type MigratedUser, transformUsers } from "./user-transform.js";

const CREATED = new Date("2024-01-01T09:00:00Z");
const VERIFIED = new Date("2025-06-01T09:00:00Z");

function buildLegacyUser(overrides: Partial<LegacyUser> = {}): LegacyUser {
  return {
    user_id: "11111111-1111-1111-1111-111111111111",
    user_provenance: "PI_AAD",
    provenance_user_id: "b2c-object-id-1",
    email: "Journalist@Example.com ",
    roles: "VERIFIED",
    forenames: "Jo",
    surname: "Bloggs",
    created_date: CREATED,
    last_signed_in_date: null,
    last_verified_date: VERIFIED,
    ...overrides
  };
}

function buildMigratedUser(overrides: Partial<MigratedUser> = {}): MigratedUser {
  return {
    userId: "11111111-1111-1111-1111-111111111111",
    email: "journalist@example.com",
    firstName: "Jo",
    surname: "Bloggs",
    userProvenance: "PI_AAD",
    userProvenanceId: "b2c-object-id-1",
    role: "VERIFIED",
    createdDate: CREATED,
    lastSignedInDate: null,
    lastVerifiedDate: VERIFIED,
    ...overrides
  };
}

describe("transformUsers", () => {
  it("should keep the legacy userId and normalise the email", () => {
    // Act
    const result = transformUsers([buildLegacyUser()]);

    // Assert
    expect(result.rows).toEqual([buildMigratedUser()]);
    expect(result.rejections).toHaveLength(0);
  });

  it("should prefix Crime IDAM provenance ids to match the new sign-in", () => {
    // Arrange
    const legacy = buildLegacyUser({ user_provenance: "CRIME_IDAM", provenance_user_id: "crime-user" });

    // Act
    const result = transformUsers([legacy]);

    // Assert
    expect(result.rows[0].userProvenanceId).toBe("CRIME_IDAM:crime-user");
  });

  it("should map legacy super admin roles that do not exist here", () => {
    // Arrange
    const legacy = buildLegacyUser({ user_provenance: "SSO", roles: "INTERNAL_SUPER_ADMIN_CTSC" });

    // Act
    const result = transformUsers([legacy]);

    // Assert
    expect(result.rows[0].role).toBe("INTERNAL_ADMIN_CTSC");
  });

  it("should fall back to the epoch when the legacy created date is missing", () => {
    // Act
    const result = transformUsers([buildLegacyUser({ created_date: null })]);

    // Assert
    expect(result.rows[0].createdDate).toEqual(new Date(0));
  });

  it("should reject legacy third parties, users without an email, and unmapped roles", () => {
    // Arrange
    const legacyUsers = [
      buildLegacyUser({ user_id: "a", provenance_user_id: "p-a", user_provenance: "THIRD_PARTY", roles: "GENERAL_THIRD_PARTY" }),
      buildLegacyUser({ user_id: "b", provenance_user_id: "p-b", email: null }),
      buildLegacyUser({ user_id: "c", provenance_user_id: "p-c", roles: "VERIFIED_THIRD_PARTY_ALL" })
    ];

    // Act
    const result = transformUsers(legacyUsers);

    // Assert
    expect(result.rejections.map(({ entityId }) => entityId)).toEqual(["a", "b", "c"]);
    expect(result.rows).toHaveLength(0);
  });

  it("should reject the second of two legacy users sharing a provenance id", () => {
    // Arrange
    const legacyUsers = [buildLegacyUser(), buildLegacyUser({ user_id: "33333333-3333-3333-3333-333333333333" })];

    // Act
    const result = transformUsers(legacyUsers);

    // Assert
    expect(result.rows).toHaveLength(1);
    expect(result.rejections).toEqual([{ entityId: "33333333-3333-3333-3333-333333333333", reason: "duplicate provenance_user_id in legacy" }]);
  });
});
