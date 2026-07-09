import { describe, expect, it } from "vitest";
import { validateFttLandsRegistrationTribunalWeeklyHearingList } from "./json-validator.js";

describe("validateFttLandsRegistrationTribunalWeeklyHearingList", () => {
  it("should return valid when all required fields are present", () => {
    // Arrange
    const validData = [
      {
        date: "02/01/2025",
        hearingTime: "10:00am",
        caseName: "A Vs B",
        caseReferenceNumber: "LRT/00001/2025",
        judge: "Judge Smith",
        venuePlatform: "London"
      }
    ];

    // Act
    const result = validateFttLandsRegistrationTribunalWeeklyHearingList(validData);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when required fields are missing", () => {
    // Arrange
    const invalidData = [{}];

    // Act
    const result = validateFttLandsRegistrationTribunalWeeklyHearingList(invalidData);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
