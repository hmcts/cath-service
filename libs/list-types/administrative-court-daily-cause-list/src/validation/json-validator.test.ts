import { describe, expect, it } from "vitest";
import { validateAdministrativeCourtDailyCauseList } from "./json-validator.js";

describe("validateAdministrativeCourtDailyCauseList", () => {
  it("should return valid when all required fields are present", () => {
    // Arrange
    const validData = [
      {
        venue: "Court 1",
        judge: "Judge Smith",
        time: "10:00am",
        caseNumber: "AC/2025/001",
        caseDetails: "R v Smith",
        hearingType: "Hearing"
      }
    ];

    // Act
    const result = validateAdministrativeCourtDailyCauseList(validData);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when required fields are missing", () => {
    // Arrange
    const invalidData = [{}];

    // Act
    const result = validateAdministrativeCourtDailyCauseList(invalidData);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
