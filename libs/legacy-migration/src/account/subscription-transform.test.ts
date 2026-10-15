import { describe, expect, it } from "vitest";
import type { LegacySubscription } from "./legacy-account-source.js";
import { type MigratedSubscription, type SubscriptionContext, transformSubscriptions } from "./subscription-transform.js";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const ADDED = new Date("2024-02-01T10:00:00Z");

function buildLegacySubscription(overrides: Partial<LegacySubscription> = {}): LegacySubscription {
  return {
    id: "sub-1",
    user_id: USER_ID,
    search_type: "LOCATION_ID",
    search_value: "9",
    channel: "EMAIL",
    case_number: null,
    case_name: null,
    created_date: ADDED,
    ...overrides
  };
}

function buildContext(overrides: Partial<SubscriptionContext> = {}): SubscriptionContext {
  return { migratedUserIds: new Set([USER_ID]), locationIds: new Set(["9"]), ...overrides };
}

function buildMigratedSubscription(overrides: Partial<MigratedSubscription> = {}): MigratedSubscription {
  return {
    subscriptionId: "sub-1",
    userId: USER_ID,
    searchType: "LOCATION_ID",
    searchValue: "9",
    caseName: null,
    caseNumber: null,
    dateAdded: ADDED,
    ...overrides
  };
}

describe("transformSubscriptions", () => {
  it("should keep the legacy subscription id for a location subscription", () => {
    // Act
    const result = transformSubscriptions([buildLegacySubscription()], buildContext());

    // Assert
    expect(result.rows).toEqual([buildMigratedSubscription()]);
  });

  it("should map CASE_ID to CASE_NUMBER and default the case number to the search value", () => {
    // Arrange
    const legacy = buildLegacySubscription({ search_type: "CASE_ID", search_value: "T20240001" });

    // Act
    const result = transformSubscriptions([legacy], buildContext());

    // Assert
    expect(result.rows[0]).toMatchObject({ searchType: "CASE_NUMBER", searchValue: "T20240001", caseNumber: "T20240001" });
  });

  it("should keep the oldest subscription when two collapse onto one key after mapping", () => {
    // Arrange
    const older = buildLegacySubscription({ id: "older", search_type: "CASE_URN", search_value: "X1", created_date: new Date("2023-01-01Z") });
    const newer = buildLegacySubscription({ id: "newer", search_type: "CASE_ID", search_value: "X1", created_date: new Date("2024-01-01Z") });

    // Act
    const result = transformSubscriptions([newer, older], buildContext());

    // Assert
    expect(result.rows.map(({ subscriptionId }) => subscriptionId)).toEqual(["older"]);
    expect(result.rejections).toEqual([{ entityId: "newer", reason: "duplicate of an older subscription after search type mapping" }]);
  });

  it("should reject Courtel, unmigrated-user and unknown-location subscriptions", () => {
    // Arrange
    const legacy = [
      buildLegacySubscription({ id: "courtel", channel: "API_COURTEL" }),
      buildLegacySubscription({ id: "orphan", user_id: "not-migrated" }),
      buildLegacySubscription({ id: "unknown-location", search_value: "12345" })
    ];

    // Act
    const result = transformSubscriptions(legacy, buildContext());

    // Assert
    expect(result.rejections).toEqual([
      { entityId: "courtel", reason: "API_COURTEL subscription belongs to a legacy third party" },
      { entityId: "orphan", reason: "user not migrated" },
      { entityId: "unknown-location", reason: "unknown location 12345" }
    ]);
  });
});
