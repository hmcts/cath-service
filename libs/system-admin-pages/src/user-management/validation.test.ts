import { describe, expect, it } from "vitest";
import {
  validateDeleteConfirmation,
  validateEmail,
  validateProvenances,
  validateRoles,
  validateSearchFilters,
  validateUserId,
  validateUserProvenanceId
} from "./validation.js";

describe("User Management Validation", () => {
  describe("validateEmail", () => {
    it("should return null for valid email", () => {
      expect(validateEmail("test@example.com")).toBeNull();
    });

    it("should return null for undefined email", () => {
      expect(validateEmail(undefined)).toBeNull();
    });

    it("should return error for email exceeding 254 characters", () => {
      const longEmail = `${"a".repeat(244)}@example.com`;
      const result = validateEmail(longEmail);
      expect(result).not.toBeNull();
      expect(result?.text).toBe("Email address must be 254 characters or less");
    });

    it("should allow partial text for email search", () => {
      expect(validateEmail("al")).toBeNull();
      expect(validateEmail("test")).toBeNull();
      expect(validateEmail("@")).toBeNull();
    });
  });

  describe("validateUserId", () => {
    it("should return null for valid UUID", () => {
      expect(validateUserId("123e4567-e89b-12d3-a456-426614174000")).toBeNull();
    });

    it("should return null for valid UUID with uppercase", () => {
      expect(validateUserId("123E4567-E89B-12D3-A456-426614174000")).toBeNull();
    });

    it("should return null for undefined user ID", () => {
      expect(validateUserId(undefined)).toBeNull();
    });

    it("should return error for user ID exceeding 50 characters", () => {
      const longUserId = "a".repeat(51);
      const result = validateUserId(longUserId);
      expect(result).not.toBeNull();
      expect(result?.text).toBe("User ID must be 50 characters or less");
    });

    it("should return error for invalid UUID format", () => {
      const result = validateUserId("not-a-uuid");
      expect(result).not.toBeNull();
      expect(result?.text).toContain("UUID format");
    });

    it("should return error for alphanumeric without hyphens", () => {
      const result = validateUserId("abc123");
      expect(result).not.toBeNull();
      expect(result?.text).toContain("UUID format");
    });

    it("should return error for UUID without correct format", () => {
      const result = validateUserId("123-456-789");
      expect(result).not.toBeNull();
      expect(result?.text).toContain("UUID format");
    });
  });

  describe("validateUserProvenanceId", () => {
    it("should return null for valid user provenance ID", () => {
      expect(validateUserProvenanceId("prov123")).toBeNull();
    });

    it("should return null for user provenance ID with hyphens", () => {
      expect(validateUserProvenanceId("prov-123")).toBeNull();
    });

    it("should return null for user provenance ID with underscores", () => {
      expect(validateUserProvenanceId("prov_123")).toBeNull();
    });

    it("should return null for user provenance ID with @ symbol", () => {
      expect(validateUserProvenanceId("user@domain.com")).toBeNull();
    });

    it("should return null for user provenance ID with periods", () => {
      expect(validateUserProvenanceId("user.name")).toBeNull();
    });

    it("should return null for undefined user provenance ID", () => {
      expect(validateUserProvenanceId(undefined)).toBeNull();
    });

    it("should return error for user provenance ID exceeding 100 characters", () => {
      const longId = "a".repeat(101);
      const result = validateUserProvenanceId(longId);
      expect(result).not.toBeNull();
      expect(result?.text).toBe("User Provenance ID must be 100 characters or less");
    });

    it("should return error for user provenance ID with invalid special characters", () => {
      const result = validateUserProvenanceId("prov#123");
      expect(result).not.toBeNull();
      expect(result?.text).toBe("User Provenance ID must contain only letters, numbers, hyphens, underscores, @ and periods");
    });

    it("should return error for user provenance ID with spaces", () => {
      const result = validateUserProvenanceId("prov 123");
      expect(result).not.toBeNull();
      expect(result?.text).toBe("User Provenance ID must contain only letters, numbers, hyphens, underscores, @ and periods");
    });
  });

  describe("validateRoles", () => {
    it("should return null for valid roles", () => {
      expect(validateRoles(["SYSTEM_ADMIN", "VERIFIED"])).toBeNull();
    });

    it("should return null for undefined roles", () => {
      expect(validateRoles(undefined)).toBeNull();
    });

    it("should return null for empty roles array", () => {
      expect(validateRoles([])).toBeNull();
    });

    it("should return error for invalid role", () => {
      const result = validateRoles(["INVALID_ROLE"]);
      expect(result).not.toBeNull();
      expect(result?.text).toBe("Invalid role selection");
    });
  });

  describe("validateProvenances", () => {
    it("should return null for valid provenances", () => {
      expect(validateProvenances(["CFT_IDAM", "SSO"])).toBeNull();
    });

    it("should return null for undefined provenances", () => {
      expect(validateProvenances(undefined)).toBeNull();
    });

    it("should return null for empty provenances array", () => {
      expect(validateProvenances([])).toBeNull();
    });

    it("should return error for invalid provenance", () => {
      const result = validateProvenances(["INVALID_PROV"]);
      expect(result).not.toBeNull();
      expect(result?.text).toBe("Invalid provenance selection");
    });
  });

  describe("validateSearchFilters", () => {
    it("should return empty array for valid filters", () => {
      const filters = {
        email: "test@example.com",
        userId: "123e4567-e89b-12d3-a456-426614174000",
        roles: ["SYSTEM_ADMIN"]
      };
      const errors = validateSearchFilters(filters);
      expect(errors).toEqual([]);
    });

    it("should return multiple errors for multiple invalid fields", () => {
      const filters = {
        email: "al", // Email format not validated - allows partial search
        userId: "not-a-valid-uuid",
        roles: ["INVALID_ROLE"]
      };
      const errors = validateSearchFilters(filters);
      expect(errors).toHaveLength(2); // Only userId and roles errors
    });

    it("should return empty array when no filters provided", () => {
      const errors = validateSearchFilters({});
      expect(errors).toEqual([]);
    });
  });

  describe("validateDeleteConfirmation", () => {
    it("should return null for 'yes'", () => {
      expect(validateDeleteConfirmation("yes")).toBeNull();
    });

    it("should return null for 'no'", () => {
      expect(validateDeleteConfirmation("no")).toBeNull();
    });

    it("should return error for undefined", () => {
      const result = validateDeleteConfirmation(undefined);
      expect(result).not.toBeNull();
      expect(result?.text).toBe("Select yes or no to continue");
    });

    it("should return error for invalid value", () => {
      const result = validateDeleteConfirmation("maybe");
      expect(result).not.toBeNull();
      expect(result?.text).toBe("Select yes or no to continue");
    });
  });
});
