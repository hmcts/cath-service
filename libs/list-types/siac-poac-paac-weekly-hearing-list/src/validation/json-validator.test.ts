import { describe, expect, it } from "vitest";
import { validateSiacPoacPaacWeeklyHearingList } from "./json-validator.js";

const VALID_DATA = [
  {
    date: "02/01/2025",
    time: "10:00am",
    appellant: "A Vs B",
    caseReferenceNumber: "SC/00001/2025",
    hearingType: "Substantive hearing",
    courtroom: "Court 1",
    additionalInformation: "Remote hearing"
  }
];

describe("validateSiacPoacPaacWeeklyHearingList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateSiacPoacPaacWeeklyHearingList(VALID_DATA);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when date is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].date;
    const result = validateSiacPoacPaacWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when time is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].time;
    const result = validateSiacPoacPaacWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when appellant is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].appellant;
    const result = validateSiacPoacPaacWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseReferenceNumber is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].caseReferenceNumber;
    const result = validateSiacPoacPaacWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingType is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].hearingType;
    const result = validateSiacPoacPaacWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtroom is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].courtroom;
    const result = validateSiacPoacPaacWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when additionalInformation is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].additionalInformation;
    const result = validateSiacPoacPaacWeeklyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
