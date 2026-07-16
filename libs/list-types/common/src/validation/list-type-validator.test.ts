import { describe, expect, it, vi } from "vitest";
import type { ListTypeInfo } from "./list-type-validator.js";
import { convertListTypeNameToKebabCase, validateListTypeJson } from "./list-type-validator.js";

// Test data matching ListTypeInfo interface
const testListTypes: ListTypeInfo[] = [
  { id: 1, name: "UNKNOWN_FICTITIOUS_LIST", friendlyName: "Unknown Fictitious List" },
  { id: 8, name: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST", friendlyName: "Civil and Family Daily Cause List" },
  { id: 26, name: "SJP_DELTA_PRESS_LIST", friendlyName: "Single Justice Procedure Press List (New cases)" },
  { id: 27, name: "SJP_DELTA_PUBLIC_LIST", friendlyName: "Single Justice Procedure Public List (New cases)" },
  { id: 57, name: "MAGISTRATES_ADULT_COURT_LIST_DAILY", friendlyName: "Magistrates Adult Court List - Daily" },
  { id: 58, name: "MAGISTRATES_ADULT_COURT_LIST_FUTURE", friendlyName: "Magistrates Adult Court List - Future" },
  { id: 59, name: "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY", friendlyName: "Magistrates Public Adult Court List - Daily" },
  { id: 60, name: "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE", friendlyName: "Magistrates Public Adult Court List - Future" },
  { id: 99, name: "CROWN_COURT_DAILY_LIST", friendlyName: "Crown Court Daily List" }
];

// Mock the dynamic import for @hmcts/civil-daily-cause-list
vi.mock("@hmcts/civil-daily-cause-list", () => ({
  validateCivilDailyCauseList: vi.fn().mockReturnValue({
    isValid: true,
    errors: [],
    schemaVersion: "1.0.0"
  })
}));

// Mock the dynamic import for @hmcts/civil-and-family-daily-cause-list
vi.mock("@hmcts/civil-and-family-daily-cause-list", () => ({
  validateCivilFamilyCauseList: vi.fn().mockReturnValue({
    isValid: true,
    errors: [],
    schemaVersion: "1.0.0"
  }),
  extractCaseSummary: vi.fn().mockReturnValue([]),
  formatCaseSummaryForEmail: vi.fn().mockReturnValue("")
}));

// Mock the dynamic import for @hmcts/sjp-press-list (used by both SJP_PRESS_LIST and SJP_DELTA_PRESS_LIST)
vi.mock("@hmcts/sjp-press-list", () => ({
  validateSjpPressList: vi.fn().mockReturnValue({
    isValid: true,
    errors: [],
    schemaVersion: "1.0.0"
  })
}));

// Mock the dynamic import for @hmcts/sjp-public-list (used by both SJP_PUBLIC_LIST and SJP_DELTA_PUBLIC_LIST)
vi.mock("@hmcts/sjp-public-list", () => ({
  validateSjpPublicList: vi.fn().mockReturnValue({
    isValid: true,
    errors: [],
    schemaVersion: "1.0.0"
  })
}));

// Mock the dynamic import for @hmcts/magistrates-adult-court-list (used by both DAILY and FUTURE variants)
vi.mock("@hmcts/magistrates-adult-court-list", () => ({
  validateMagistratesAdultCourtList: vi.fn().mockReturnValue({
    isValid: true,
    errors: [],
    schemaVersion: "1.0"
  })
}));

// Mock the dynamic import for @hmcts/magistrates-public-adult-court-list (used by both daily and future variants)
vi.mock("@hmcts/magistrates-public-adult-court-list", () => ({
  validateMagistratesPublicAdultCourtList: vi.fn().mockReturnValue({
    isValid: true,
    errors: [],
    schemaVersion: "1.0"
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
      const result = await validateListTypeJson("999", {}, testListTypes);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("Invalid list type ID");
    });

    it("should return error for list type without JSON schema", async () => {
      // Using list type ID 99 (CROWN_COURT_DAILY_LIST) which doesn't have a schema package
      const result = await validateListTypeJson("99", { test: "data" }, testListTypes);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("does not support JSON uploads");
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

      const result = await validateListTypeJson("8", validData, testListTypes);

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

      const result = await validateListTypeJson("8", invalidData, testListTypes);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should handle non-string list type ID", async () => {
      const result = await validateListTypeJson("abc", {}, testListTypes);

      expect(result.isValid).toBe(false);
    });

    it.each([
      ["26", "SJP_DELTA_PRESS_LIST", "sjp-press-list"],
      ["27", "SJP_DELTA_PUBLIC_LIST", "sjp-public-list"],
      ["57", "MAGISTRATES_ADULT_COURT_LIST_DAILY", "magistrates-adult-court-list"],
      ["58", "MAGISTRATES_ADULT_COURT_LIST_FUTURE", "magistrates-adult-court-list"],
      ["59", "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY", "magistrates-public-adult-court-list"],
      ["60", "MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE", "magistrates-public-adult-court-list"]
    ])("should validate %s (%s) using the %s package alias", async (id) => {
      const result = await validateListTypeJson(id, { test: "data" }, testListTypes);

      expect(result.isValid).toBe(true);
    });

    it("should validate MAGISTRATES_ADULT_COURT_LIST_DAILY using the magistrates-adult-court-list package alias", async () => {
      const result = await validateListTypeJson("57", { test: "data" }, testListTypes);

      expect(result.isValid).toBe(true);
    });

    it("should validate MAGISTRATES_ADULT_COURT_LIST_FUTURE using the magistrates-adult-court-list package alias", async () => {
      const result = await validateListTypeJson("58", { test: "data" }, testListTypes);

      expect(result.isValid).toBe(true);
    });
  });
});
