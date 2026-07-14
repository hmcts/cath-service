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
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].venue;
    const result = validateAdministrativeCourtDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when judge is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].judge;
    const result = validateAdministrativeCourtDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when time is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].time;
    const result = validateAdministrativeCourtDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseNumber is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].caseNumber;
    const result = validateAdministrativeCourtDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseDetails is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].caseDetails;
    const result = validateAdministrativeCourtDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingType is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].hearingType;
    const result = validateAdministrativeCourtDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
