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
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].date;
    const result = validateCicWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingTime is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].hearingTime;
    const result = validateCicWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseReferenceNumber is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].caseReferenceNumber;
    const result = validateCicWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseName is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].caseName;
    const result = validateCicWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venue/platform is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0]["venue/platform"];
    const result = validateCicWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when judges is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].judges;
    const result = validateCicWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when members is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].members;
    const result = validateCicWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when additionalInformation is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].additionalInformation;
    const result = validateCicWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
