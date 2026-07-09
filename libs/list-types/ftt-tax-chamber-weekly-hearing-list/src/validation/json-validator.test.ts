import { describe, expect, it } from "vitest";
import { validateFttTaxChamberWeeklyHearingList } from "./json-validator.js";

describe("validateFttTaxChamberWeeklyHearingList", () => {
  it("should return valid when all required fields are present", () => {
    // Arrange
    const validData = [
      {
        date: "02/01/2025",
        hearingTime: "10:00am",
        caseName: "A Vs HMRC",
        caseReferenceNumber: "TC/00001/2025",
        judges: "Judge Smith",
        members: "Member Jones",
        venuePlatform: "London"
      }
    ];

    // Act
    const result = validateFttTaxChamberWeeklyHearingList(validData);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when required fields are missing", () => {
    // Arrange
    const invalidData = [{}];

    // Act
    const result = validateFttTaxChamberWeeklyHearingList(invalidData);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
