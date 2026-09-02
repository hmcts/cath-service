import { describe, expect, it } from "vitest";
import { validateUtiacJrLondonDailyHearingList } from "./json-validator-london.js";

describe("validateUtiacJrLondonDailyHearingList", () => {
  it("should return isValid true for valid data", () => {
    // Arrange
    const validData = [
      {
        hearingTime: "10:00am",
        caseTitle: "Smith v Secretary of State",
        representative: "",
        caseReferenceNumber: "JR/2025/001",
        judges: "Judge Smith",
        hearingType: "Permission",
        location: "Field House, London",
        additionalInformation: ""
      }
    ];

    // Act
    const result = validateUtiacJrLondonDailyHearingList(validData);

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
    const result = validateUtiacJrLondonDailyHearingList(invalidData);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
