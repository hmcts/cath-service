import { describe, expect, it } from "vitest";
import { validateUtAdministrativeAppealsChamberDailyHearingList } from "./json-validator.js";

const VALID_DATA = [
  {
    time: "10am",
    appellant: "Appellant 1",
    caseReferenceNumber: "12345",
    judges: "Judge 1",
    members: "Member 1",
    modeOfHearing: "Hearing mode 1",
    venue: "Venue 1",
    additionalInformation: "This is additional information"
  }
];

describe("validateUtAdministrativeAppealsChamberDailyHearingList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateUtAdministrativeAppealsChamberDailyHearingList(VALID_DATA);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when time is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].time;
    const result = validateUtAdministrativeAppealsChamberDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when appellant is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].appellant;
    const result = validateUtAdministrativeAppealsChamberDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseReferenceNumber is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].caseReferenceNumber;
    const result = validateUtAdministrativeAppealsChamberDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when judges is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].judges;
    const result = validateUtAdministrativeAppealsChamberDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when members is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].members;
    const result = validateUtAdministrativeAppealsChamberDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when modeOfHearing is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].modeOfHearing;
    const result = validateUtAdministrativeAppealsChamberDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venue is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].venue;
    const result = validateUtAdministrativeAppealsChamberDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when additionalInformation is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data[0].additionalInformation;
    const result = validateUtAdministrativeAppealsChamberDailyHearingList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
