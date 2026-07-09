import { describe, expect, it } from "vitest";
import { validateFttRptWeeklyHearingList } from "./json-validator.js";

describe("validateFttRptWeeklyHearingList", () => {
  it("should return valid when all required fields are present", () => {
    // Arrange
    const validData = [
      {
        date: "02/01/2025",
        time: "10:00am",
        venue: "London",
        caseType: "Leasehold",
        caseReferenceNumber: "RPT/00001/2025",
        judges: "Judge Smith",
        members: "Member Jones",
        hearingMethod: "In person",
        additionalInformation: ""
      }
    ];

    // Act
    const result = validateFttRptWeeklyHearingList(validData);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when required fields are missing", () => {
    // Arrange
    const invalidData = [{}];

    // Act
    const result = validateFttRptWeeklyHearingList(invalidData);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
