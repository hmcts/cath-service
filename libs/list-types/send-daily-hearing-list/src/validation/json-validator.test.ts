import { describe, expect, it } from "vitest";
import { validateSendDailyHearingList } from "./json-validator.js";

describe("validateSendDailyHearingList", () => {
  it("should return valid when all required fields are present", () => {
    // Arrange
    const validData = [
      {
        time: "10am",
        caseReferenceNumber: "SEND/2025/001",
        respondent: "Local Authority",
        hearingType: "Substantive",
        venue: "Hearing Centre",
        timeEstimate: "1 day"
      }
    ];

    // Act
    const result = validateSendDailyHearingList(validData);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when required fields are missing", () => {
    // Arrange
    const invalidData = [{}];

    // Act
    const result = validateSendDailyHearingList(invalidData);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
