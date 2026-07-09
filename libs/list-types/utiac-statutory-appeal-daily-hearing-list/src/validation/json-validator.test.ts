import { describe, expect, it } from "vitest";
import { validateUtiacStatutoryAppealDailyHearingList } from "./json-validator.js";

const VALID_DATA = [
  {
    hearingTime: "10:00am",
    appellant: "John Smith",
    appealReferenceNumber: "IA/2025/001",
    judges: "Judge Smith",
    hearingType: "Substantive",
    location: "Field House"
  }
];

describe("validateUtiacStatutoryAppealDailyHearingList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateUtiacStatutoryAppealDailyHearingList(VALID_DATA);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when hearingTime is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].hearingTime;
    const result = validateUtiacStatutoryAppealDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when appellant is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].appellant;
    const result = validateUtiacStatutoryAppealDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when appealReferenceNumber is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].appealReferenceNumber;
    const result = validateUtiacStatutoryAppealDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when judges is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].judges;
    const result = validateUtiacStatutoryAppealDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingType is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].hearingType;
    const result = validateUtiacStatutoryAppealDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when location is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].location;
    const result = validateUtiacStatutoryAppealDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
