import { describe, expect, it } from "vitest";
import { validateLondonAdminCourt } from "./json-validator.js";

describe("validateLondonAdminCourt", () => {
  it("should validate data with both tabs populated", () => {
    const validData = {
      mainHearings: [
        {
          venue: "Court 1",
          judge: "Judge Smith",
          time: "10:00",
          caseNumber: "T20257890",
          caseDetails: "R v Jones",
          hearingType: "Trial",
          additionalInformation: ""
        }
      ],
      planningCourt: [
        {
          venue: "Court 2",
          judge: "Judge Brown",
          time: "14:30",
          caseNumber: "T20257891",
          caseDetails: "Planning matter",
          hearingType: "Hearing",
          additionalInformation: ""
        }
      ]
    };

    const result = validateLondonAdminCourt(validData);

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("should validate data with empty tabs", () => {
    const validData = {
      mainHearings: [],
      planningCourt: []
    };

    const result = validateLondonAdminCourt(validData);

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("should validate data with only main hearings", () => {
    const validData = {
      mainHearings: [
        {
          venue: "Court 1",
          judge: "Judge Smith",
          time: "10:00",
          caseNumber: "T20257890",
          caseDetails: "R v Jones",
          hearingType: "Trial",
          additionalInformation: ""
        }
      ],
      planningCourt: []
    };

    const result = validateLondonAdminCourt(validData);

    expect(result.isValid).toBe(true);
  });

  it("should reject data missing required structure", () => {
    const invalidData = {
      mainHearings: []
      // Missing planningCourt
    };

    const result = validateLondonAdminCourt(invalidData);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should reject invalid time format", () => {
    const invalidData = {
      mainHearings: [
        {
          venue: "Court 1",
          judge: "Judge Smith",
          time: "25:00", // Invalid
          caseNumber: "T20257890",
          caseDetails: "R v Jones",
          hearingType: "Trial",
          additionalInformation: ""
        }
      ],
      planningCourt: []
    };

    const result = validateLondonAdminCourt(invalidData);

    expect(result.isValid).toBe(false);
  });
});
