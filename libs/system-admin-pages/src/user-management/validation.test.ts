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
    it("should return null for valid user ID", () => {
      expect(validateUserId("abc123")).toBeNull();
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

    it("should return error for user ID with special characters", () => {
      const result = validateUserId("user-id-123");
      expect(result).not.toBeNull();
      expect(result?.text).toBe("User ID must contain only letters and numbers");
    });
  });

  describe("validateUserProvenanceId", () => {
    it("should return null for valid user provenance ID", () => {
      expect(validateUserProvenanceId("prov123")).toBeNull();
    });

    it("should return null for undefined user provenance ID", () => {
      expect(validateUserProvenanceId(undefined)).toBeNull();
    });

    it("should return error for user provenance ID exceeding 50 characters", () => {
      const longId = "a".repeat(51);
      const result = validateUserProvenanceId(longId);
      expect(result).not.toBeNull();
      expect(result?.text).toBe("User Provenance ID must be 50 characters or less");
    });

    it("should return error for user provenance ID with special characters", () => {
      const result = validateUserProvenanceId("prov-123");
      expect(result).not.toBeNull();
      expect(result?.text).toBe("User Provenance ID must contain only letters and numbers");
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
        userId: "user123",
        roles: ["SYSTEM_ADMIN"]
      };
      const errors = validateSearchFilters(filters);
      expect(errors).toEqual([]);
    });

    it("should return multiple errors for multiple invalid fields", () => {
      const filters = {
        email: "al", // Email format not validated - allows partial search
        userId: "user-with-dashes",
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
