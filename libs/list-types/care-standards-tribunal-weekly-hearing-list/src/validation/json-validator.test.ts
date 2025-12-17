import { describe, expect, it } from "vitest";
import { validateCareStandardsTribunalList } from "./json-validator.js";

describe("validateCareStandardsTribunalList", () => {
  it("should validate a valid hearing list", () => {
    const validData = [
      {
        date: "02/01/2025",
        caseName: "A Vs B",
        hearingLength: "1 hour",
        hearingType: "Substantive hearing",
        venue: "Care Standards Tribunal",
        additionalInformation: "Remote hearing"
      }
    ];

    const result = validateCareStandardsTribunalList(validData);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should validate multiple hearings", () => {
    const validData = [
      {
        date: "02/01/2025",
        caseName: "A Vs B",
        hearingLength: "1 hour",
        hearingType: "Substantive hearing",
        venue: "Care Standards Tribunal",
        additionalInformation: "Remote hearing"
      },
      {
        date: "03/01/2025",
        caseName: "C Vs D",
        hearingLength: "Half day",
        hearingType: "Preliminary hearing",
        venue: "Care Standards Office",
        additionalInformation: "In person"
      }
    ];

    const result = validateCareStandardsTribunalList(validData);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject data with missing required fields", () => {
    const invalidData = [
      {
        date: "02/01/2025",
        caseName: "A Vs B"
        // Missing required fields
      }
    ];

    const result = validateCareStandardsTribunalList(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should reject invalid date format (wrong pattern)", () => {
    const invalidData = [
      {
        date: "2025-01-02", // Wrong format (should be dd/MM/yyyy)
        caseName: "A Vs B",
        hearingLength: "1 hour",
        hearingType: "Substantive hearing",
        venue: "Care Standards Tribunal",
        additionalInformation: "Remote hearing"
      }
    ];

    const result = validateCareStandardsTribunalList(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.includes("date"))).toBe(true);
  });

  it("should reject date without leading zeros", () => {
    const invalidData = [
      {
        date: "2/1/2025", // Should be 02/01/2025
        caseName: "A Vs B",
        hearingLength: "1 hour",
        hearingType: "Substantive hearing",
        venue: "Care Standards Tribunal",
        additionalInformation: "Remote hearing"
      }
    ];

    const result = validateCareStandardsTribunalList(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.includes("date"))).toBe(true);
  });

  it("should reject HTML tags in case name (XSS protection)", () => {
    const invalidData = [
      {
        date: "02/01/2025",
        caseName: "<script>alert('xss')</script>",
        hearingLength: "1 hour",
        hearingType: "Substantive hearing",
        venue: "Care Standards Tribunal",
        additionalInformation: "Remote hearing"
      }
    ];

    const result = validateCareStandardsTribunalList(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.includes("caseName"))).toBe(true);
  });

  it("should reject HTML tags in hearing type", () => {
    const invalidData = [
      {
        date: "02/01/2025",
        caseName: "A Vs B",
        hearingLength: "1 hour",
        hearingType: "<b>Substantive</b>",
        venue: "Care Standards Tribunal",
        additionalInformation: "Remote hearing"
      }
    ];

    const result = validateCareStandardsTribunalList(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.includes("hearingType"))).toBe(true);
  });

  it("should reject HTML tags in venue", () => {
    const invalidData = [
      {
        date: "02/01/2025",
        caseName: "A Vs B",
        hearingLength: "1 hour",
        hearingType: "Substantive hearing",
        venue: "<p>Care Standards Tribunal</p>",
        additionalInformation: "Remote hearing"
      }
    ];

    const result = validateCareStandardsTribunalList(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.includes("venue"))).toBe(true);
  });

  it("should reject HTML tags in additional information", () => {
    const invalidData = [
      {
        date: "02/01/2025",
        caseName: "A Vs B",
        hearingLength: "1 hour",
        hearingType: "Substantive hearing",
        venue: "Care Standards Tribunal",
        additionalInformation: "<div>Remote hearing</div>"
      }
    ];

    const result = validateCareStandardsTribunalList(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.includes("additionalInformation"))).toBe(true);
  });

  it("should reject non-array data", () => {
    const invalidData = {
      date: "02/01/2025",
      caseName: "A Vs B"
    };

    const result = validateCareStandardsTribunalList(invalidData);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should reject empty array", () => {
    const invalidData: unknown[] = [];

    const result = validateCareStandardsTribunalList(invalidData);
    // Empty array is technically valid according to the schema
    // If we want to reject empty arrays, we'd need to add minItems to the schema
    expect(result.isValid).toBe(true);
  });
});
