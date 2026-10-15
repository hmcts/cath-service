import { describe, expect, it } from "vitest";
import type { LegacyListTypeSubscription } from "./legacy-account-source.js";
import { type ListTypeSubscriptionContext, transformListTypeSubscriptions } from "./list-type-subscription-transform.js";

const USER_ID = "11111111-1111-1111-1111-111111111111";

function buildLegacyRow(overrides: Partial<LegacyListTypeSubscription> = {}): LegacyListTypeSubscription {
  return { id: "lts-1", user_id: USER_ID, list_type: ["CIVIL_DAILY_CAUSE_LIST"], list_language: ["ENGLISH"], ...overrides };
}

function buildContext(overrides: Partial<ListTypeSubscriptionContext> = {}): ListTypeSubscriptionContext {
  return {
    migratedUserIds: new Set([USER_ID]),
    // Arbitrary ids: resolution must go through names only.
    listTypeIdByName: new Map([
      ["CIVIL_DAILY_CAUSE_LIST", 901],
      ["UTIAC_JR_LEEDS_DAILY_HEARING_LIST", 902],
      ["CROWN_DAILY_PDDA_LIST", 903]
    ]),
    ...overrides
  };
}

describe("transformListTypeSubscriptions", () => {
  it("should resolve legacy list type names to this environment's ids, including renamed list types", () => {
    // Arrange
    const legacy = buildLegacyRow({ list_type: ["UT_IAC_JR_LEEDS_DAILY_HEARING_LIST", "CIVIL_DAILY_CAUSE_LIST"] });

    // Act
    const result = transformListTypeSubscriptions([legacy], buildContext());

    // Assert
    expect(result.rows).toEqual([{ subscriptionListTypeId: "lts-1", userId: USER_ID, listTypeIds: [901, 902], listLanguage: ["ENGLISH"] }]);
  });

  it("should collapse legacy names that map to the same list type", () => {
    // Arrange
    const legacy = buildLegacyRow({ list_type: ["CROWN_DAILY_LIST", "CROWN_DAILY_PDDA_LIST"] });

    // Act
    const result = transformListTypeSubscriptions([legacy], buildContext());

    // Assert
    expect(result.rows[0].listTypeIds).toEqual([903]);
  });

  it("should drop and report unknown list types but keep the rest", () => {
    // Arrange
    const legacy = buildLegacyRow({ list_type: ["CIVIL_DAILY_CAUSE_LIST", "SJP_PRESS_REGISTER"] });

    // Act
    const result = transformListTypeSubscriptions([legacy], buildContext());

    // Assert
    expect(result.rows[0].listTypeIds).toEqual([901]);
    expect(result.rejections).toEqual([{ entityId: "lts-1", reason: "unknown list type SJP_PRESS_REGISTER dropped" }]);
  });

  it("should reject a row when no list types can be mapped", () => {
    // Arrange
    const legacy = buildLegacyRow({ list_type: ["SJP_PRESS_REGISTER"] });

    // Act
    const result = transformListTypeSubscriptions([legacy], buildContext());

    // Assert
    expect(result.rows).toHaveLength(0);
    expect(result.rejections.map(({ reason }) => reason)).toContain("no list types could be mapped");
  });

  it.each([[[]], [null]])("should skip a legacy list type array of %j, which legacy reads as every list type", (listType) => {
    // Arrange
    const legacy = buildLegacyRow({ list_type: listType });

    // Act
    const result = transformListTypeSubscriptions([legacy], buildContext());

    // Assert
    expect(result.rows).toHaveLength(0);
    expect(result.rejections).toEqual([{ entityId: "lts-1", reason: "empty list type filter is not migrated" }]);
  });

  it("should map the legacy Crown Advance List to the Crown Warned List", () => {
    // Arrange
    const legacy = buildLegacyRow({ list_type: ["CROWN_ADVANCE_PDDA_LIST"] });
    const context = buildContext({ listTypeIdByName: new Map([["CROWN_WARNED_PDDA_LIST", 904]]) });

    // Act
    const result = transformListTypeSubscriptions([legacy], context);

    // Assert
    expect(result.rows[0].listTypeIds).toEqual([904]);
  });

  it("should reject unsupported list languages", () => {
    // Arrange
    const legacy = buildLegacyRow({ list_language: ["BI_LINGUAL"] });

    // Act
    const result = transformListTypeSubscriptions([legacy], buildContext());

    // Assert
    expect(result.rejections).toEqual([{ entityId: "lts-1", reason: "unsupported list language BI_LINGUAL" }]);
  });

  it("should sort list type ids and languages", () => {
    // Arrange
    const legacy = buildLegacyRow({ list_type: ["UT_IAC_JR_LEEDS_DAILY_HEARING_LIST", "CIVIL_DAILY_CAUSE_LIST"], list_language: ["WELSH", "ENGLISH"] });

    // Act
    const result = transformListTypeSubscriptions([legacy], buildContext());

    // Assert
    expect(result.rows[0]).toMatchObject({ listTypeIds: [901, 902], listLanguage: ["ENGLISH", "WELSH"] });
  });

  it("should reject a second row for the same user", () => {
    // Arrange
    const legacyRows = [buildLegacyRow(), buildLegacyRow({ id: "lts-2" })];

    // Act
    const result = transformListTypeSubscriptions(legacyRows, buildContext());

    // Assert
    expect(result.rows.map(({ subscriptionListTypeId }) => subscriptionListTypeId)).toEqual(["lts-1"]);
    expect(result.rejections).toEqual([{ entityId: "lts-2", reason: "duplicate list type subscription for user" }]);
  });

  it("should reject rows for users that were not migrated", () => {
    // Act
    const result = transformListTypeSubscriptions([buildLegacyRow({ user_id: "not-migrated" })], buildContext());

    // Assert
    expect(result.rejections).toEqual([{ entityId: "lts-1", reason: "user not migrated" }]);
  });
});
