import { describe, expect, it } from "vitest";
import { validateSendDailyHearingList } from "./json-validator.js";

const VALID_DATA = [
  {
    time: "10am",
    caseReferenceNumber: "REF001",
    respondent: "Respondent Name",
    hearingType: "Hearing",
    venue: "Venue",
    timeEstimate: "1 hour"
  }
];

describe("validateSendDailyHearingList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateSendDailyHearingList(VALID_DATA);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when time is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].time;
    const result = validateSendDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseReferenceNumber is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].caseReferenceNumber;
    const result = validateSendDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when respondent is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].respondent;
    const result = validateSendDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingType is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].hearingType;
    const result = validateSendDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venue is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].venue;
    const result = validateSendDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when timeEstimate is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].timeEstimate;
    const result = validateSendDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
