import { describe, expect, it } from "vitest";
import { validateUtLandsChamberDailyHearingList } from "./json-validator.js";

const VALID_DATA = [
  {
    time: "10am",
    caseReferenceNumber: "12345",
    caseName: "Case name 1",
    judges: "Judge 1",
    members: "Member 1",
    hearingType: "Hearing type 1",
    venue: "Venue 1",
    modeOfHearing: "Mode of hearing 1",
    additionalInformation: "This is additional information"
  }
];

describe("validateUtLandsChamberDailyHearingList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateUtLandsChamberDailyHearingList(VALID_DATA);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when time is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).time;

    const result = validateUtLandsChamberDailyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseReferenceNumber is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).caseReferenceNumber;

    const result = validateUtLandsChamberDailyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseName is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).caseName;

    const result = validateUtLandsChamberDailyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when judges is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).judges;

    const result = validateUtLandsChamberDailyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when members is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).members;

    const result = validateUtLandsChamberDailyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingType is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).hearingType;

    const result = validateUtLandsChamberDailyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venue is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).venue;

    const result = validateUtLandsChamberDailyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when modeOfHearing is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).modeOfHearing;

    const result = validateUtLandsChamberDailyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when additionalInformation is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).additionalInformation;

    const result = validateUtLandsChamberDailyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
