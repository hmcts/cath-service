import { describe, expect, it } from "vitest";
import { validateAstDailyHearingList } from "./json-validator.js";

describe("validateAstDailyHearingList", () => {
  it("should return valid when all required fields are present", () => {
    // Arrange
    const validData = [
      {
        appellant: "John Smith",
        appealReferenceNumber: "AST/2025/001",
        caseType: "Asylum Support",
        hearingType: "Substantive",
        hearingTime: "10am",
        additionalInformation: ""
      }
    ];

    // Act
    const result = validateAstDailyHearingList(validData);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when required fields are missing", () => {
    // Arrange
    const invalidData = [{}];

    // Act
    const result = validateAstDailyHearingList(invalidData);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
