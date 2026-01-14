import { describe, expect, it } from "vitest";
import { validateStandardDailyCauseList } from "./json-validator.js";

describe("validateStandardDailyCauseList", () => {
  it("should validate a valid hearing list", () => {
    const validData = [
      {
        venue: "Court 1",
        judge: "Judge Smith",
        time: "10:00",
        caseNumber: "T20257890",
        caseDetails: "R v Jones",
        hearingType: "Trial",
        additionalInformation: "Note: Bring exhibits"
      }
    ];

    const result = validateStandardDailyCauseList(validData);

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("should allow empty additional information", () => {
    const validData = [
      {
        venue: "Court 1",
        judge: "Judge Smith",
        time: "10:00",
        caseNumber: "T20257890",
        caseDetails: "R v Jones",
        hearingType: "Trial",
        additionalInformation: ""
      }
    ];

    const result = validateStandardDailyCauseList(validData);

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("should reject data with missing required fields", () => {
    const invalidData = [
      {
        venue: "Court 1",
        judge: "Judge Smith",
        time: "10:00"
        // Missing caseNumber, caseDetails, hearingType
      }
    ];

    const result = validateStandardDailyCauseList(invalidData);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should reject invalid time format", () => {
    const invalidData = [
      {
        venue: "Court 1",
        judge: "Judge Smith",
        time: "25:00", // Invalid hour
        caseNumber: "T20257890",
        caseDetails: "R v Jones",
        hearingType: "Trial",
        additionalInformation: ""
      }
    ];

    const result = validateStandardDailyCauseList(invalidData);

    expect(result.isValid).toBe(false);
  });

  it("should reject data with HTML tags", () => {
    const invalidData = [
      {
        venue: "Court 1",
        judge: "<script>alert('xss')</script>",
        time: "10:00",
        caseNumber: "T20257890",
        caseDetails: "R v Jones",
        hearingType: "Trial",
        additionalInformation: ""
      }
    ];

    const result = validateStandardDailyCauseList(invalidData);

    expect(result.isValid).toBe(false);
  });
});
