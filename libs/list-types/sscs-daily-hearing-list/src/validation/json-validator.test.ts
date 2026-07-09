import { describe, expect, it } from "vitest";
import { validateSscsDailyHearingList } from "./json-validator.js";

const VALID_DATA = [
  {
    venue: "Manchester Tribunal Centre",
    appealReferenceNumber: "SC/123/2025",
    hearingType: "Oral Hearing",
    appellant: "Smith, John",
    courtroom: "Room 1",
    hearingTime: "10:00am",
    tribunal: "SSCS",
    respondent: "Secretary of State for Work and Pensions",
    additionalInformation: "Video hearing"
  }
];

describe("validateSscsDailyHearingList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateSscsDailyHearingList(VALID_DATA);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when venue is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).venue;

    const result = validateSscsDailyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when appealReferenceNumber is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).appealReferenceNumber;

    const result = validateSscsDailyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingType is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).hearingType;

    const result = validateSscsDailyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when appellant is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).appellant;

    const result = validateSscsDailyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when courtroom is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).courtroom;

    const result = validateSscsDailyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingTime is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).hearingTime;

    const result = validateSscsDailyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when tribunal is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).tribunal;

    const result = validateSscsDailyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when respondent is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).respondent;

    const result = validateSscsDailyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when additionalInformation is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).additionalInformation;

    const result = validateSscsDailyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
