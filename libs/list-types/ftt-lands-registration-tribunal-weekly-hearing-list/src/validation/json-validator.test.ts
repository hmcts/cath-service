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
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.date;

    const result = validateFttLandsRegistrationTribunalWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingTime is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.hearingTime;

    const result = validateFttLandsRegistrationTribunalWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseName is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.caseName;

    const result = validateFttLandsRegistrationTribunalWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseReferenceNumber is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.caseReferenceNumber;

    const result = validateFttLandsRegistrationTribunalWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when judge is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.judge;

    const result = validateFttLandsRegistrationTribunalWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venuePlatform is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.venuePlatform;

    const result = validateFttLandsRegistrationTribunalWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
