import { describe, expect, it } from "vitest";
import { validateCourtOfAppealCivil } from "./json-validator.js";

describe("validateCourtOfAppealCivil", () => {
  it("should validate data with both tabs populated", () => {
    const validData = {
      dailyHearings: [
        {
          venue: "Court 1",
          judge: "Judge Smith",
          time: "10:00",
          caseNumber: "T20257890",
          caseDetails: "Case A vs B",
          hearingType: "Appeal",
          additionalInformation: ""
        }
      ],
      futureJudgments: [
        {
          date: "15/01/2025",
          venue: "Court 2",
          judge: "Judge Brown",
          time: "14:30",
          caseNumber: "T20257891",
          caseDetails: "Case C vs D",
          hearingType: "Judgment",
          additionalInformation: ""
        }
      ]
    };

    const result = validateCourtOfAppealCivil(validData);

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("should validate data with empty tabs", () => {
    const validData = {
      dailyHearings: [],
      futureJudgments: []
    };

    const result = validateCourtOfAppealCivil(validData);

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("should validate data with only daily hearings", () => {
    const validData = {
      dailyHearings: [
        {
          venue: "Court 1",
          judge: "Judge Smith",
          time: "10:00",
          caseNumber: "T20257890",
          caseDetails: "Case details",
          hearingType: "Appeal",
          additionalInformation: ""
        }
      ],
      futureJudgments: []
    };

    const result = validateCourtOfAppealCivil(validData);

    expect(result.isValid).toBe(true);
  });

  it("should reject data missing required structure", () => {
    const invalidData = {
      dailyHearings: []
      // Missing futureJudgments
    };

    const result = validateCourtOfAppealCivil(invalidData);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should reject invalid date format in future judgments", () => {
    const invalidData = {
      dailyHearings: [],
      futureJudgments: [
        {
          date: "2025-01-15", // Wrong format (should be dd/MM/yyyy)
          venue: "Court 2",
          judge: "Judge Brown",
          time: "14:30",
          caseNumber: "T20257891",
          caseDetails: "Case details",
          hearingType: "Judgment",
          additionalInformation: ""
        }
      ]
    };

    const result = validateCourtOfAppealCivil(invalidData);

    expect(result.isValid).toBe(false);
  });

  it("should reject invalid time format", () => {
    const invalidData = {
      dailyHearings: [
        {
          venue: "Court 1",
          judge: "Judge Smith",
          time: "25:00", // Invalid
          caseNumber: "T20257890",
          caseDetails: "Case details",
          hearingType: "Appeal",
          additionalInformation: ""
        }
      ],
      futureJudgments: []
    };

    const result = validateCourtOfAppealCivil(invalidData);

    expect(result.isValid).toBe(false);
  });
});
