import { describe, expect, it } from "vitest";
import { validateUtiacStatutoryAppealDailyHearingList } from "./json-validator.js";

describe("validateUtiacStatutoryAppealDailyHearingList", () => {
  it("should return isValid true for valid data", () => {
    // Arrange
    const validData = [
      {
        hearingTime: "10:00am",
        appellant: "John Smith",
        appealReferenceNumber: "IA/2025/001",
        judges: "Judge Smith",
        hearingType: "Substantive",
        location: "Field House"
      }
    ];

    // Act
    const result = validateUtiacStatutoryAppealDailyHearingList(validData);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("should return isValid false when required fields are missing", () => {
    // Arrange
    const invalidData = [
      {
        hearingTime: "10:00am"
      }
    ];

    // Act
    const result = validateUtiacStatutoryAppealDailyHearingList(invalidData);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
