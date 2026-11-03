import { describe, expect, it } from "vitest";
import {
  IS_MAGISTRATES_MEDIA_PROTOCOL,
  IS_NOT_MAGISTRATES_MEDIA_PROTOCOL,
  isMagistratesMediaProtocol,
  isNotMagistratesMediaProtocol
} from "./subscription-template-helper.js";

const MAGISTRATES_NAMES = [
  "MAGISTRATES_PUBLIC_LIST",
  "MAGISTRATES_STANDARD_LIST",
  "MAGISTRATES_ADULT_COURT_LIST_DAILY",
  "MAGISTRATES_ADULT_COURT_LIST_FUTURE",
  "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY",
  "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE"
];

const SJP_NAMES = ["SJP_PRESS_LIST", "SJP_PUBLIC_LIST", "SJP_DELTA_PRESS_LIST", "SJP_DELTA_PUBLIC_LIST"];

describe("subscription-template-helper", () => {
  describe("personalisation flag constants", () => {
    it("should match the Notify template placeholder names", () => {
      // Assert
      expect(IS_MAGISTRATES_MEDIA_PROTOCOL).toBe("is_magistrates_media_protocol");
      expect(IS_NOT_MAGISTRATES_MEDIA_PROTOCOL).toBe("is_not_magistrates_media_protocol");
    });
  });

  describe("isMagistratesMediaProtocol", () => {
    it.each(MAGISTRATES_NAMES)("should return true for %s", (listTypeName) => {
      // Act
      const result = isMagistratesMediaProtocol(listTypeName);

      // Assert
      expect(result).toBe(true);
    });

    it.each(SJP_NAMES)("should return false for SJP list %s", (listTypeName) => {
      // Act
      const result = isMagistratesMediaProtocol(listTypeName);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for a non-Magistrates list type", () => {
      // Act
      const result = isMagistratesMediaProtocol("CROWN_DAILY_LIST");

      // Assert
      expect(result).toBe(false);
    });

    it.each([undefined, null, ""])("should return false when the list type name is %j", (listTypeName) => {
      // Act
      const result = isMagistratesMediaProtocol(listTypeName);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("isNotMagistratesMediaProtocol", () => {
    it("should return false for a Magistrates list type", () => {
      // Act
      const result = isNotMagistratesMediaProtocol("MAGISTRATES_STANDARD_LIST");

      // Assert
      expect(result).toBe(false);
    });

    it("should return true for a non-Magistrates list type", () => {
      // Act
      const result = isNotMagistratesMediaProtocol("CROWN_DAILY_LIST");

      // Assert
      expect(result).toBe(true);
    });

    it("should return true when the list type name is undefined", () => {
      // Act
      const result = isNotMagistratesMediaProtocol(undefined);

      // Assert
      expect(result).toBe(true);
    });
  });
});
