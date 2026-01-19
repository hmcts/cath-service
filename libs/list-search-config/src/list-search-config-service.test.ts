import { describe, expect, it } from "vitest";
import { validateFieldName } from "./list-search-config-service.js";

describe("list-search-config-service", () => {
  describe("validateFieldName", () => {
    it("should return null for valid field names", () => {
      expect(validateFieldName("caseNumber", "Case number")).toBeNull();
      expect(validateFieldName("case_number", "Case number")).toBeNull();
      expect(validateFieldName("caseNumber123", "Case number")).toBeNull();
      expect(validateFieldName("CASE_NUMBER", "Case number")).toBeNull();
    });

    it("should return error for empty field name", () => {
      const result = validateFieldName("", "Case number field name");
      expect(result).toEqual({
        field: "Case number field name",
        message: "Enter the case number field name"
      });
    });

    it("should return error for whitespace-only field name", () => {
      const result = validateFieldName("   ", "Case number field name");
      expect(result).toEqual({
        field: "Case number field name",
        message: "Enter the case number field name"
      });
    });

    it("should return error for field name with invalid characters", () => {
      const result = validateFieldName("case-number", "Case number field name");
      expect(result).toEqual({
        field: "Case number field name",
        message: "Case number field name must contain only letters, numbers and underscores"
      });
    });

    it("should return error for field name with spaces", () => {
      const result = validateFieldName("case number", "Case number field name");
      expect(result).toEqual({
        field: "Case number field name",
        message: "Case number field name must contain only letters, numbers and underscores"
      });
    });

    it("should return error for field name with special characters", () => {
      const result = validateFieldName("case@number", "Case number field name");
      expect(result).toEqual({
        field: "Case number field name",
        message: "Case number field name must contain only letters, numbers and underscores"
      });
    });

    it("should return error for field name exceeding 100 characters", () => {
      const longFieldName = "a".repeat(101);
      const result = validateFieldName(longFieldName, "Case number field name");
      expect(result).toEqual({
        field: "Case number field name",
        message: "Case number field name must be 100 characters or less"
      });
    });

    it("should accept field name with exactly 100 characters", () => {
      const maxLengthFieldName = "a".repeat(100);
      const result = validateFieldName(maxLengthFieldName, "Case number field name");
      expect(result).toBeNull();
    });
  });
});
