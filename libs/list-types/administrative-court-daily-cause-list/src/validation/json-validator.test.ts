import { describe, expect, it } from "vitest";
import { validateAdministrativeCourtDailyCauseList } from "./json-validator.js";

const VALID_DATA = [
  {
    venue: "Court 1",
    judge: "Judge Smith",
    time: "10:00am",
    caseNumber: "AC/2025/001",
    caseDetails: "R v Smith",
    hearingType: "Hearing"
  }
];

describe("validateAdministrativeCourtDailyCauseList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateAdministrativeCourtDailyCauseList(VALID_DATA);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when venue is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.venue;

    const result = validateAdministrativeCourtDailyCauseList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when judge is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.judge;

    const result = validateAdministrativeCourtDailyCauseList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when time is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.time;

    const result = validateAdministrativeCourtDailyCauseList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseNumber is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.caseNumber;

    const result = validateAdministrativeCourtDailyCauseList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseDetails is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.caseDetails;

    const result = validateAdministrativeCourtDailyCauseList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingType is missing", () => {
    const item = { ...VALID_DATA[0] } as Record<string, unknown>;
    delete item.hearingType;

    const result = validateAdministrativeCourtDailyCauseList([item]);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
