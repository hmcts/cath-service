import { describe, expect, it } from "vitest";
import { isAcceptedRejection } from "./rejection-policy.js";

describe("isAcceptedRejection", () => {
  it.each([
    "provenance THIRD_PARTY is not a sign-in user (third parties sync separately)",
    "API_COURTEL subscription belongs to a legacy third party",
    "duplicate of an older subscription after search type mapping",
    "status PENDING is not migrated",
    "status SUSPENDED is not migrated",
    "third party not migrated",
    "unsupported sensitivity INTERNAL",
    "artefact type JUDGEMENTS_AND_OUTCOMES is not supported",
    "artefact type GENERAL_PUBLICATION is not supported",
    "artefact type LCSU is not supported",
    "empty list type filter is not migrated"
  ])("should accept %s", (reason) => {
    // Act
    const result = isAcceptedRejection(reason);

    // Assert
    expect(result).toBe(true);
  });

  it.each([
    "unknown list type ADMIRALTY_COURT_KB_DAILY_CAUSE_LIST",
    "unknown list type SJP_PRESS_REGISTER dropped",
    "user not migrated",
    "provenance null is not a sign-in user (third parties sync separately)",
    "duplicate provenance_user_id in legacy",
    "payload fails schema validation",
    "unsupported sensitivity SECRET",
    "status DELETED is not migrated",
    "name differs",
    "no list types could be mapped",
    "email not in location-data.ts"
  ])("should block %s", (reason) => {
    // Act
    const result = isAcceptedRejection(reason);

    // Assert
    expect(result).toBe(false);
  });
});
