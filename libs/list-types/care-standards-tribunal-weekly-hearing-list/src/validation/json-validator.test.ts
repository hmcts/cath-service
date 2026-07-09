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
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].date;
    const result = validateCareStandardsTribunalWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseName is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].caseName;
    const result = validateCareStandardsTribunalWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingLength is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].hearingLength;
    const result = validateCareStandardsTribunalWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingType is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].hearingType;
    const result = validateCareStandardsTribunalWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venue is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].venue;
    const result = validateCareStandardsTribunalWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when additionalInformation is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].additionalInformation;
    const result = validateCareStandardsTribunalWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
