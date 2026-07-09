import { describe, expect, it } from "vitest";
import { validateFttLandsRegistrationTribunalWeeklyHearingList } from "./json-validator.js";

const VALID_DATA = [
  {
    date: "02/01/2025",
    hearingTime: "10:00am",
    caseName: "A Vs B",
    caseReferenceNumber: "LRT/00001/2025",
    judge: "Judge Smith",
    venuePlatform: "London"
  }
];

describe("validateFttLandsRegistrationTribunalWeeklyHearingList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateFttLandsRegistrationTribunalWeeklyHearingList(VALID_DATA);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when date is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].date;
    const result = validateFttLandsRegistrationTribunalWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingTime is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].hearingTime;
    const result = validateFttLandsRegistrationTribunalWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseName is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].caseName;
    const result = validateFttLandsRegistrationTribunalWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseReferenceNumber is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].caseReferenceNumber;
    const result = validateFttLandsRegistrationTribunalWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when judge is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].judge;
    const result = validateFttLandsRegistrationTribunalWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venuePlatform is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].venuePlatform;
    const result = validateFttLandsRegistrationTribunalWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
