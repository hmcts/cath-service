import { describe, expect, it } from "vitest";
import { validateUtiacJrDailyHearingList } from "./json-validator.js";

const VALID_DATA = [
  {
    venue: "Leeds Combined Court Centre",
    judges: "Judge Smith",
    hearingTime: "10:30am",
    caseReferenceNumber: "JR/2025/003",
    caseTitle: "Smith v Secretary of State",
    hearingType: "Permission",
    additionalInformation: "Remote hearing"
  }
];

describe("validateUtiacJrDailyHearingList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateUtiacJrDailyHearingList(VALID_DATA);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when venue is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].venue;
    const result = validateUtiacJrDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when judges is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].judges;
    const result = validateUtiacJrDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingTime is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].hearingTime;
    const result = validateUtiacJrDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseReferenceNumber is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].caseReferenceNumber;
    const result = validateUtiacJrDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseTitle is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].caseTitle;
    const result = validateUtiacJrDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingType is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].hearingType;
    const result = validateUtiacJrDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when additionalInformation is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].additionalInformation;
    const result = validateUtiacJrDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
