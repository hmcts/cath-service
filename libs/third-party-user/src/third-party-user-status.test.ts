import { describe, expect, it } from "vitest";
import { isThirdPartyUserStatus, THIRD_PARTY_USER_STATUSES } from "./third-party-user-status.js";

describe("third-party-user-status", () => {
  describe("THIRD_PARTY_USER_STATUSES", () => {
    it("should list PENDING, ACTIVE and SUSPENDED in that order", () => {
      expect(THIRD_PARTY_USER_STATUSES).toEqual(["PENDING", "ACTIVE", "SUSPENDED"]);
    });
  });

  describe("isThirdPartyUserStatus", () => {
    it.each(["PENDING", "ACTIVE", "SUSPENDED"])("should accept %s", (value) => {
      expect(isThirdPartyUserStatus(value)).toBe(true);
    });

    it.each([
      ["an unknown value", "DELETED"],
      ["a lowercase value", "active"],
      ["an empty string", ""],
      ["a padded value", " ACTIVE "],
      ["undefined", undefined],
      ["null", null],
      ["a number", 1],
      ["an array", ["ACTIVE"]],
      ["an object", { status: "ACTIVE" }]
    ])("should reject %s", (_label, value) => {
      expect(isThirdPartyUserStatus(value)).toBe(false);
    });
  });
});
