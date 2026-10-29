import { describe, expect, it } from "vitest";
import { convertListTypeNameToKebabCase, resolveListTypePackageName } from "./list-type-package.js";

describe("list-type-package", () => {
  describe("convertListTypeNameToKebabCase", () => {
    it("should convert CIVIL_AND_FAMILY_DAILY_CAUSE_LIST to kebab-case", () => {
      // Act
      const result = convertListTypeNameToKebabCase("CIVIL_AND_FAMILY_DAILY_CAUSE_LIST");

      // Assert
      expect(result).toBe("civil-and-family-daily-cause-list");
    });

    it("should convert CROWN_DAILY_PDDA_LIST to kebab-case without applying aliases", () => {
      // Act
      const result = convertListTypeNameToKebabCase("CROWN_DAILY_PDDA_LIST");

      // Assert
      expect(result).toBe("crown-daily-pdda-list");
    });

    it("should convert single word names", () => {
      // Act
      const result = convertListTypeNameToKebabCase("TEST");

      // Assert
      expect(result).toBe("test");
    });

    it("should handle empty string", () => {
      // Act
      const result = convertListTypeNameToKebabCase("");

      // Assert
      expect(result).toBe("");
    });
  });

  describe("resolveListTypePackageName", () => {
    it("should resolve an aliased list type to its parent package", () => {
      // Act
      const result = resolveListTypePackageName("CROWN_DAILY_PDDA_LIST");

      // Assert
      expect(result).toBe("crown-daily-list");
    });

    it("should resolve every UTIAC JR regional list type to the shared package", () => {
      // Arrange
      const names = ["LONDON", "LEEDS", "MANCHESTER", "BIRMINGHAM", "CARDIFF"].map((region) => `UT_IAC_JR_${region}_DAILY_HEARING_LIST`);

      // Act
      const result = names.map(resolveListTypePackageName);

      // Assert
      expect(new Set(result)).toEqual(new Set(["utiac-jr-daily-hearing-list"]));
    });

    it("should pass a non-aliased list type through as kebab-case", () => {
      // Act
      const result = resolveListTypePackageName("CIVIL_AND_FAMILY_DAILY_CAUSE_LIST");

      // Assert
      expect(result).toBe("civil-and-family-daily-cause-list");
    });
  });
});
