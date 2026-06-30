import { describe, expect, it } from "vitest";
import { validateUtiacJrLeedsDailyHearingList } from "./json-validator.js";

describe("validateUtiacJrLeedsDailyHearingList", () => {
  it("should return isValid true for valid data", () => {
    // Arrange
    const validData = [
      {
        venue: "Leeds Combined Court Centre",
        judges: "Judge Smith",
        hearingTime: "10:00am",
        caseReferenceNumber: "JR/2025/003",
        caseTitle: "Smith v Secretary of State",
        hearingType: "Permission"
      }
    ];

    // Act
    const result = validateUtiacJrLeedsDailyHearingList(validData);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("should return isValid false when required fields are missing", () => {
    // Arrange
    const invalidData = [
      {
        venue: "Leeds Combined Court Centre"
      }
    ];

    // Act
    const result = validateUtiacJrLeedsDailyHearingList(invalidData);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
