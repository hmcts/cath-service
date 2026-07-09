import { describe, expect, it } from "vitest";
import { validateRcjStandardDailyCauseList } from "./json-validator.js";

describe("validateRcjStandardDailyCauseList", () => {
  it("should return valid when all required fields are present", () => {
    // Arrange
    const validData = [
      {
        venue: "Court 1",
        judge: "Judge Smith",
        time: "10:00am",
        caseNumber: "T20257890",
        caseDetails: "R v Smith",
        hearingType: "Trial"
      }
    ];

    // Act
    const result = validateRcjStandardDailyCauseList(validData);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when required fields are missing", () => {
    // Arrange
    const invalidData = [{}];

    // Act
    const result = validateRcjStandardDailyCauseList(invalidData);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
