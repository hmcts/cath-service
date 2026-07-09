import { describe, expect, it } from "vitest";
import { validateCareStandardsTribunalWeeklyHearingList } from "./json-validator.js";

const VALID_DATA = [
  {
    date: "02/01/2025",
    caseName: "A Vs B",
    hearingLength: "1 hour",
    hearingType: "mda",
    venue: "This is the venue of the hearing",
    additionalInformation: "This is additional information"
  }
];

describe("validateCareStandardsTribunalWeeklyHearingList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateCareStandardsTribunalWeeklyHearingList(VALID_DATA);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when date is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.date;

    const result = validateCareStandardsTribunalWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseName is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.caseName;

    const result = validateCareStandardsTribunalWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingLength is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.hearingLength;

    const result = validateCareStandardsTribunalWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingType is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.hearingType;

    const result = validateCareStandardsTribunalWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venue is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.venue;

    const result = validateCareStandardsTribunalWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when additionalInformation is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.additionalInformation;

    const result = validateCareStandardsTribunalWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
