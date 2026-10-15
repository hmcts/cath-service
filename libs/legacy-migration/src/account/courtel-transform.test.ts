import { describe, expect, it } from "vitest";
import { transformCourtelSubscriptions, transformCourtelUsers } from "./courtel-transform.js";
import type { LegacySubscription, LegacyUser } from "./legacy-account-source.js";

const COURTEL_ID = "22222222-2222-2222-2222-222222222222";
const CREATED = new Date("2024-01-01T09:00:00Z");
const CONTEXT = {
  courtelUserIds: new Set([COURTEL_ID]),
  // Arbitrary ids: resolution must go through names only.
  listTypeIdByName: new Map([
    ["CIVIL_DAILY_CAUSE_LIST", 901],
    ["UTIAC_JR_LEEDS_DAILY_HEARING_LIST", 902]
  ])
};

function buildLegacyUser(overrides: Partial<LegacyUser> = {}): LegacyUser {
  return {
    user_id: COURTEL_ID,
    user_provenance: "THIRD_PARTY",
    provenance_user_id: "Courtel",
    email: "courtel@example.com",
    roles: "GENERAL_THIRD_PARTY",
    forenames: null,
    surname: null,
    created_date: CREATED,
    last_signed_in_date: null,
    last_verified_date: null,
    ...overrides
  };
}

function buildCourtelSubscription(overrides: Partial<LegacySubscription> = {}): LegacySubscription {
  return {
    id: "courtel-sub-1",
    user_id: COURTEL_ID,
    search_type: "LIST_TYPE",
    search_value: "CIVIL_DAILY_CAUSE_LIST",
    channel: "API_COURTEL",
    case_number: null,
    case_name: null,
    created_date: CREATED,
    ...overrides
  };
}

describe("transformCourtelUsers", () => {
  it("should take only third-party provenance users, named by their provenance user id", () => {
    // Arrange
    const legacy = [buildLegacyUser(), buildLegacyUser({ user_id: "media", user_provenance: "PI_AAD" })];

    // Act
    const result = transformCourtelUsers(legacy);

    // Assert
    expect(result.rows).toEqual([{ id: COURTEL_ID, name: "Courtel", createdDate: CREATED }]);
  });
});

describe("transformCourtelSubscriptions", () => {
  it("should resolve list type subscriptions by name, including renamed list types", () => {
    // Arrange
    const legacy = [buildCourtelSubscription(), buildCourtelSubscription({ id: "courtel-sub-2", search_value: "UT_IAC_JR_LEEDS_DAILY_HEARING_LIST" })];

    // Act
    const result = transformCourtelSubscriptions(legacy, CONTEXT);

    // Assert
    expect(result.rows.map(({ id, listTypeId }) => [id, listTypeId])).toEqual([
      ["courtel-sub-1", 901],
      ["courtel-sub-2", 902]
    ]);
  });

  it("should ignore email subscriptions entirely", () => {
    // Act
    const result = transformCourtelSubscriptions([buildCourtelSubscription({ channel: "EMAIL" })], CONTEXT);

    // Assert
    expect(result.rows).toHaveLength(0);
    expect(result.rejections).toHaveLength(0);
  });

  it("should reject unsupported, unknown and duplicate Courtel subscriptions", () => {
    // Arrange
    const legacy = [
      buildCourtelSubscription(),
      buildCourtelSubscription({ id: "by-location", search_type: "LOCATION_ID", search_value: "9" }),
      buildCourtelSubscription({ id: "unknown", search_value: "SJP_PRESS_REGISTER" }),
      buildCourtelSubscription({ id: "duplicate" }),
      buildCourtelSubscription({ id: "not-courtel", user_id: "someone-else" })
    ];

    // Act
    const result = transformCourtelSubscriptions(legacy, CONTEXT);

    // Assert
    expect(result.rows.map(({ id }) => id)).toEqual(["courtel-sub-1"]);
    expect(result.rejections).toEqual([
      { entityId: "by-location", reason: "Courtel subscription by LOCATION_ID is not supported" },
      { entityId: "unknown", reason: "unknown list type SJP_PRESS_REGISTER" },
      { entityId: "duplicate", reason: "duplicate Courtel subscription for list type" },
      { entityId: "not-courtel", reason: "Courtel subscription for a user that is not a legacy third party" }
    ]);
  });
});
