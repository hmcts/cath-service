import { describe, expect, it } from "vitest";
import { isThirdPartyUserStatus, THIRD_PARTY_USER_STATUSES } from "./subscriber-status.js";

describe("subscriber-status", () => {
  describe("THIRD_PARTY_USER_STATUSES", () => {
    it("should list the three statuses in legacy order", () => {
      expect(THIRD_PARTY_USER_STATUSES).toEqual(["PENDING", "ACTIVE", "SUSPENDED"]);
    });
  });

  describe("isThirdPartyUserStatus", () => {
    it.each(["PENDING", "ACTIVE", "SUSPENDED"])("should accept %s", (value) => {
      // Act
      const result = isThirdPartyUserStatus(value);

      // Assert
      expect(result).toBe(true);
    });

    it.each([
      ["undefined", undefined],
      ["null", null],
      ["an empty string", ""],
      ["a lowercase status", "active"],
      ["an unknown status", "DELETED"],
      ["an array", ["ACTIVE"]],
      ["a number", 1]
    ])("should reject %s", (_label, value) => {
      // Act
      const result = isThirdPartyUserStatus(value);

      // Assert
      expect(result).toBe(false);
    });
  });
});
