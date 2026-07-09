import { describe, expect, it } from "vitest";
import { validateUtLandsChamberDailyHearingList } from "./json-validator.js";

describe("validateUtLandsChamberDailyHearingList", () => {
  it("should return valid when all required fields are present", () => {
    // Arrange
    const validData = [
      {
        time: "10am",
        caseReferenceNumber: "12345",
        caseName: "Case name 1",
        judges: "Judge 1",
        members: "Member 1",
        hearingType: "Hearing type 1",
        venue: "Venue 1",
        modeOfHearing: "Mode of hearing 1",
        additionalInformation: "This is additional information"
      }
    ];

    // Act
    const result = validateUtLandsChamberDailyHearingList(validData);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when required fields are missing", () => {
    // Arrange
    const invalidData = [{}];

    // Act
    const result = validateUtLandsChamberDailyHearingList(invalidData);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
