import { describe, expect, it } from "vitest";
import { validateGrcWeeklyHearingList } from "./json-validator.js";

describe("validateGrcWeeklyHearingList", () => {
  it("should return isValid true for valid data", () => {
    // Arrange
    const validData = [
      {
        date: "01/01/2025",
        hearingTime: "10:00am",
        caseReferenceNumber: "GRC/2025/001",
        caseName: "A Vs B",
        judges: "Judge Smith",
        members: "",
        modeOfHearing: "Remote",
        venue: "GRC Hearing Centre",
        additionalInformation: ""
      }
    ];

    // Act
    const result = validateGrcWeeklyHearingList(validData);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("should return isValid false when required fields are missing", () => {
    // Arrange
    const invalidData = [
      {
        date: "01/01/2025"
      }
    ];

    // Act
    const result = validateGrcWeeklyHearingList(invalidData);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
