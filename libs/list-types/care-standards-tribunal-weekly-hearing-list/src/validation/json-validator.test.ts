import { describe, expect, it } from "vitest";
import { validateCareStandardsTribunalWeeklyHearingList } from "./json-validator.js";

describe("validateCareStandardsTribunalWeeklyHearingList", () => {
  it("should return valid when all required fields are present", () => {
    // Arrange
    const validData = [
      {
        date: "02/01/2025",
        caseName: "A Vs B",
        hearingLength: "1 hour",
        hearingType: "mda",
        venue: "This is the venue of the hearing",
        additionalInformation: "This is additional information"
      }
    ];

    // Act
    const result = validateCareStandardsTribunalWeeklyHearingList(validData);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when required fields are missing", () => {
    // Arrange
    const invalidData = [{}];

    // Act
    const result = validateCareStandardsTribunalWeeklyHearingList(invalidData);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
