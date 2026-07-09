import { describe, expect, it } from "vitest";
import { validateFttTaxChamberWeeklyHearingList } from "./json-validator.js";

const VALID_DATA = [
  {
    date: "02/01/2025",
    hearingTime: "10:00am",
    caseName: "A Vs HMRC",
    caseReferenceNumber: "TC/00001/2025",
    judges: "Judge Smith",
    members: "Member Jones",
    venuePlatform: "London"
  }
];

describe("validateFttTaxChamberWeeklyHearingList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateFttTaxChamberWeeklyHearingList(VALID_DATA);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when date is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.date;

    const result = validateFttTaxChamberWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingTime is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.hearingTime;

    const result = validateFttTaxChamberWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseName is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.caseName;

    const result = validateFttTaxChamberWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseReferenceNumber is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.caseReferenceNumber;

    const result = validateFttTaxChamberWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when judges is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.judges;

    const result = validateFttTaxChamberWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when members is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.members;

    const result = validateFttTaxChamberWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venuePlatform is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.venuePlatform;

    const result = validateFttTaxChamberWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
