import { describe, expect, it } from "vitest";
import { validateCicWeeklyHearingList } from "./json-validator.js";

const VALID_DATA = [
  {
    date: "02/01/2025",
    hearingTime: "10am",
    caseReferenceNumber: "CIC/2025/001",
    caseName: "A Vs B",
    "venue/platform": "Hearing Centre",
    judges: "Judge Smith",
    members: "Member Jones",
    additionalInformation: ""
  }
];

describe("validateCicWeeklyHearingList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateCicWeeklyHearingList(VALID_DATA);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when date is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.date;

    const result = validateCicWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingTime is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.hearingTime;

    const result = validateCicWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseReferenceNumber is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.caseReferenceNumber;

    const result = validateCicWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseName is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.caseName;

    const result = validateCicWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venue/platform is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item["venue/platform"];

    const result = validateCicWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when judges is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.judges;

    const result = validateCicWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when members is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.members;

    const result = validateCicWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when additionalInformation is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.additionalInformation;

    const result = validateCicWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
