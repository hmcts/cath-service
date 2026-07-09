import { describe, expect, it } from "vitest";
import { validateAstDailyHearingList } from "./json-validator.js";

const VALID_DATA = [
  {
    appellant: "John Smith",
    appealReferenceNumber: "AST/2025/001",
    caseType: "Asylum Support",
    hearingType: "Substantive",
    hearingTime: "10am",
    additionalInformation: ""
  }
];

describe("validateAstDailyHearingList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateAstDailyHearingList(VALID_DATA);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when appellant is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.appellant;

    const result = validateAstDailyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when appealReferenceNumber is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.appealReferenceNumber;

    const result = validateAstDailyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseType is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.caseType;

    const result = validateAstDailyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingType is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.hearingType;

    const result = validateAstDailyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingTime is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.hearingTime;

    const result = validateAstDailyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when additionalInformation is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.additionalInformation;

    const result = validateAstDailyHearingList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
