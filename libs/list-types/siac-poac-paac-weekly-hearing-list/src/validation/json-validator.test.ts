import { describe, expect, it } from "vitest";
import { validateSiacPoacPaacWeeklyHearingList } from "./json-validator.js";

describe("validateSiacPoacPaacWeeklyHearingList", () => {
  it("should return valid when all required fields are present", () => {
    // Arrange
    const validData = [
      {
        date: "02/01/2025",
        time: "10:00am",
        appellant: "A Vs B",
        caseReferenceNumber: "SC/00001/2025",
        hearingType: "Substantive hearing",
        courtroom: "Court 1",
        additionalInformation: ""
      }
    ];

    // Act
    const result = validateSiacPoacPaacWeeklyHearingList(validData);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when required fields are missing", () => {
    // Arrange
    const invalidData = [{}];

    // Act
    const result = validateSiacPoacPaacWeeklyHearingList(invalidData);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
