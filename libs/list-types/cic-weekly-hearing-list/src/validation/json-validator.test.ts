import { describe, expect, it } from "vitest";
import { validateCicWeeklyHearingList } from "./json-validator.js";

describe("validateCicWeeklyHearingList", () => {
  it("should return valid when all required fields are present", () => {
    // Arrange
    const validData = [
      {
        date: "02/01/2025",
        hearingTime: "10am",
        caseReferenceNumber: "CIC/2025/001",
        caseName: "A Vs B",
        "venue/platform": "Hearing Centre",
        judges: "Judge Smith",
        members: "Member Jones",
        additionalInformation: ""
      }
    ];

    // Act
    const result = validateCicWeeklyHearingList(validData);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when required fields are missing", () => {
    // Arrange
    const invalidData = [{}];

    // Act
    const result = validateCicWeeklyHearingList(invalidData);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
