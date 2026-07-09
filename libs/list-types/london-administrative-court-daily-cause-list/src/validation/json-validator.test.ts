import { describe, expect, it } from "vitest";
import { validateLondonAdministrativeCourtDailyCauseList } from "./json-validator.js";

describe("validateLondonAdministrativeCourtDailyCauseList", () => {
  it("should return valid when all required fields are present", () => {
    // Arrange — root is an object with mainHearings and planningCourt arrays
    const validData = {
      mainHearings: [
        {
          venue: "Court 1",
          judge: "Judge Smith",
          time: "10:00am",
          caseNumber: "AC/2025/001",
          caseDetails: "R v Smith",
          hearingType: "Hearing"
        }
      ],
      planningCourt: [
        {
          venue: "Court 2",
          judge: "Judge Jones",
          time: "2:30pm",
          caseNumber: "AC/2025/002",
          caseDetails: "R v Jones",
          hearingType: "Directions"
        }
      ]
    };

    // Act
    const result = validateLondonAdministrativeCourtDailyCauseList(validData);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when required fields are missing", () => {
    // Arrange — missing both required top-level properties
    const invalidData = {};

    // Act
    const result = validateLondonAdministrativeCourtDailyCauseList(invalidData);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
