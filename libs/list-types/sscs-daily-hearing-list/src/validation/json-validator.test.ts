import { describe, expect, it } from "vitest";
import { validateSscsDailyHearingList } from "./json-validator.js";

describe("validateSscsDailyHearingList", () => {
  it("should return valid when all required fields are present", () => {
    // Arrange
    const validData = [
      {
        venue: "Manchester Tribunal Centre",
        appealReferenceNumber: "SC/123/2025",
        hearingType: "Oral Hearing",
        appellant: "Smith, John",
        courtroom: "Room 1",
        hearingTime: "10:00am",
        tribunal: "SSCS",
        respondent: "Secretary of State for Work and Pensions",
        additionalInformation: ""
      }
    ];

    // Act
    const result = validateSscsDailyHearingList(validData);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when required fields are missing", () => {
    // Arrange
    const invalidData = [{}];

    // Act
    const result = validateSscsDailyHearingList(invalidData);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
