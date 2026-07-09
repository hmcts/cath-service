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
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).time;

    const result = validateUtAdministrativeAppealsChamberDailyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when appellant is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).appellant;

    const result = validateUtAdministrativeAppealsChamberDailyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseReferenceNumber is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).caseReferenceNumber;

    const result = validateUtAdministrativeAppealsChamberDailyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when judges is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).judges;

    const result = validateUtAdministrativeAppealsChamberDailyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when members is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).members;

    const result = validateUtAdministrativeAppealsChamberDailyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when modeOfHearing is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).modeOfHearing;

    const result = validateUtAdministrativeAppealsChamberDailyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venue is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).venue;

    const result = validateUtAdministrativeAppealsChamberDailyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when additionalInformation is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).additionalInformation;

    const result = validateUtAdministrativeAppealsChamberDailyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
