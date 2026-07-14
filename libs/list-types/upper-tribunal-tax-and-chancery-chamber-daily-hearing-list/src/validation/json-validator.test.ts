import { describe, expect, it } from "vitest";
import { validateUtTaxAndChanceryChamberDailyHearingList } from "./json-validator.js";

const VALID_DATA = [
  {
    time: "10am",
    caseReferenceNumber: "12345",
    caseName: "Case name 1",
    judges: "Judge 1",
    members: "Member 1",
    hearingType: "Hearing type 1",
    venue: "Venue 1",
    additionalInformation: "This is additional information"
  }
];

describe("validateUtTaxAndChanceryChamberDailyHearingList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateUtTaxAndChanceryChamberDailyHearingList(VALID_DATA);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when time is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].time;
    const result = validateUtTaxAndChanceryChamberDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseReferenceNumber is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].caseReferenceNumber;
    const result = validateUtTaxAndChanceryChamberDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseName is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].caseName;
    const result = validateUtTaxAndChanceryChamberDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when judges is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].judges;
    const result = validateUtTaxAndChanceryChamberDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when members is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].members;
    const result = validateUtTaxAndChanceryChamberDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingType is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].hearingType;
    const result = validateUtTaxAndChanceryChamberDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venue is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].venue;
    const result = validateUtTaxAndChanceryChamberDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when additionalInformation is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].additionalInformation;
    const result = validateUtTaxAndChanceryChamberDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
