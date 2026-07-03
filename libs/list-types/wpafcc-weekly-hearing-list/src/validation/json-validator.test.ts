import { describe, expect, it } from "vitest";
import { validateWpafccWeeklyHearingList } from "./json-validator.js";

describe("validateWpafccWeeklyHearingList", () => {
  it("should return isValid true for valid data", () => {
    // Arrange
    const validData = [
      {
        date: "01/01/2025",
        hearingTime: "10:30am",
        caseReferenceNumber: "12345",
        caseName: "A Vs B",
        panel: "Firstname Surname",
        modeOfHearing: "Oral Hearing",
        venue: "This is the venue of the hearing",
        additionalInformation: "This is additional information"
      }
    ];

    // Act
    const result = validateWpafccWeeklyHearingList(validData);

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
    const result = validateWpafccWeeklyHearingList(invalidData);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
