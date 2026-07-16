import { describe, expect, it } from "vitest";
import { validateGrcWeeklyHearingList } from "./json-validator.js";

const VALID_DATA = [
  {
    date: "01/01/2025",
    hearingTime: "10:30am",
    caseReferenceNumber: "GRC/2025/001",
    caseName: "A Vs B",
    judges: "Judge Smith",
    members: "Member One",
    modeOfHearing: "Oral Hearing",
    venue: "GRC Hearing Centre",
    additionalInformation: "No additional information"
  }
];

describe("validateGrcWeeklyHearingList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateGrcWeeklyHearingList(VALID_DATA);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when date is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].date;
    const result = validateGrcWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingTime is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].hearingTime;
    const result = validateGrcWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseReferenceNumber is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].caseReferenceNumber;
    const result = validateGrcWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseName is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].caseName;
    const result = validateGrcWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when judges is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].judges;
    const result = validateGrcWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when members is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].members;
    const result = validateGrcWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when modeOfHearing is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].modeOfHearing;
    const result = validateGrcWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venue is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].venue;
    const result = validateGrcWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when additionalInformation is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].additionalInformation;
    const result = validateGrcWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
