import { describe, expect, it } from "vitest";
import { validateGrcWeeklyHearingList } from "./json-validator.js";

const VALID_DATA = [
  {
    date: "01/01/2025",
    hearingTime: "10:30am",
    caseReferenceNumber: "GRC/2025/001",
    caseName: "A Vs B",
    judges: "Judge Smith",
    members: "",
    modeOfHearing: "Oral Hearing",
    venue: "GRC Hearing Centre",
    additionalInformation: ""
  }
];

describe("validateGrcWeeklyHearingList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateGrcWeeklyHearingList(VALID_DATA);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when date is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.date;

    const result = validateGrcWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingTime is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.hearingTime;

    const result = validateGrcWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseReferenceNumber is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.caseReferenceNumber;

    const result = validateGrcWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseName is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.caseName;

    const result = validateGrcWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when judges is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.judges;

    const result = validateGrcWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when members is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.members;

    const result = validateGrcWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when modeOfHearing is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.modeOfHearing;

    const result = validateGrcWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venue is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.venue;

    const result = validateGrcWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when additionalInformation is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.additionalInformation;

    const result = validateGrcWeeklyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
