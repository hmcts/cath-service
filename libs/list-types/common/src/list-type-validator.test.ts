import { describe, expect, it, vi } from "vitest";
import { convertListTypeNameToKebabCase, validateListTypeJson } from "./list-type-validator.js";
import { mockListTypes } from "./mock-list-types.js";

// Mock the dynamic import for @hmcts/civil-and-family-daily-cause-list
vi.mock("@hmcts/civil-and-family-daily-cause-list", () => ({
  validateCivilFamilyCauseList: vi.fn().mockReturnValue({
    isValid: true,
    errors: [],
    schemaVersion: "1.0.0"
  })
}));

describe("list-type-validator", () => {
  describe("convertListTypeNameToKebabCase", () => {
    it("should convert CIVIL_AND_FAMILY_DAILY_CAUSE_LIST to kebab-case", () => {
      const result = convertListTypeNameToKebabCase("CIVIL_AND_FAMILY_DAILY_CAUSE_LIST");
      expect(result).toBe("civil-and-family-daily-cause-list");
    });

    it("should convert CROWN_DAILY_LIST to kebab-case", () => {
      const result = convertListTypeNameToKebabCase("CROWN_DAILY_LIST");
      expect(result).toBe("crown-daily-list");
    });

    it("should convert single word names", () => {
      const result = convertListTypeNameToKebabCase("TEST");
      expect(result).toBe("test");
    });

    it("should handle empty string", () => {
      const result = convertListTypeNameToKebabCase("");
      expect(result).toBe("");
    });
  });

  describe("validateListTypeJson", () => {
    it("should return error for invalid list type ID", async () => {
      const result = await validateListTypeJson("999", {}, mockListTypes);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("Invalid list type ID");
    });

    it("should return error for list type without JSON schema", async () => {
      // Using list type ID 1 (CIVIL_DAILY_CAUSE_LIST) which doesn't have a schema package
      const result = await validateListTypeJson("1", { test: "data" }, mockListTypes);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("No JSON schema available");
    });

    it("should validate Civil and Family Daily Cause List with valid data", async () => {
      const validData = {
        document: {
          publicationDate: "2025-11-12T09:00:00.000Z",
          documentName: "Civil and Family Daily Cause List",
          version: "1.0"
        },
        venue: {
          venueName: "Oxford Combined Court Centre"
        },
        courtLists: []
      };

      const result = await validateListTypeJson("8", validData, mockListTypes);

      expect(result.isValid).toBe(true);
    });

    it("should return validation errors for invalid Civil and Family Daily Cause List data", async () => {
      // Override the mock for this test to return invalid
      const { validateCivilFamilyCauseList } = await import("@hmcts/civil-and-family-daily-cause-list");
      vi.mocked(validateCivilFamilyCauseList).mockReturnValueOnce({
        isValid: false,
        errors: [{ message: "Missing required field" }],
        schemaVersion: "1.0.0"
      });

      const invalidData = {
        invalid: "data"
      };

      const result = await validateListTypeJson("8", invalidData, mockListTypes);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should handle non-string list type ID", async () => {
      const result = await validateListTypeJson("abc", {}, mockListTypes);

      expect(result.isValid).toBe(false);
    });
  });
});
