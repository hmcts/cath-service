import { describe, expect, it } from "vitest";
import { validateCourtOfAppealCivilDailyCauseList } from "./json-validator.js";

describe("validateCourtOfAppealCivilDailyCauseList", () => {
  it("should return valid when all required fields are present", () => {
    // Arrange — root is an object with dailyHearings and futureJudgments arrays
    const validData = {
      dailyHearings: [
        {
          venue: "Court 1",
          judge: "Judge Smith",
          time: "10:00am",
          caseNumber: "CA/2025/001",
          caseDetails: "A v B",
          hearingType: "Hearing"
        }
      ],
      futureJudgments: [
        {
          date: "02/01/2025",
          venue: "Court 2",
          judge: "Judge Jones",
          time: "2:30pm",
          caseNumber: "CA/2025/002",
          caseDetails: "C v D",
          hearingType: "Judgment"
        }
      ]
    };

    // Act
    const result = validateCourtOfAppealCivilDailyCauseList(validData);

    // Assert
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when required fields are missing", () => {
    // Arrange — missing both required top-level properties
    const invalidData = {};

    // Act
    const result = validateCourtOfAppealCivilDailyCauseList(invalidData);

    // Assert
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
