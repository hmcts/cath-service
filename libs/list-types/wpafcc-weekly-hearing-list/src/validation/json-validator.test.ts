import { describe, expect, it } from "vitest";
import { validateWpafccWeeklyHearingList } from "./json-validator.js";

const VALID_DATA = [
  {
    date: "01/01/2025",
    hearingTime: "10:30am",
    caseReferenceNumber: "12345",
    caseName: "A Vs B",
    panel: "Firstname Surname",
    modeOfHearing: "Oral Hearing",
    venue: "This is the venue of the hearing",
    additionalInformation: "This is additional information"
  }
];

describe("validateWpafccWeeklyHearingList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateWpafccWeeklyHearingList(VALID_DATA);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when date is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).date;

    const result = validateWpafccWeeklyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingTime is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).hearingTime;

    const result = validateWpafccWeeklyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseReferenceNumber is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).caseReferenceNumber;

    const result = validateWpafccWeeklyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when caseName is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).caseName;

    const result = validateWpafccWeeklyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when panel is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).panel;

    const result = validateWpafccWeeklyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when modeOfHearing is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).modeOfHearing;

    const result = validateWpafccWeeklyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when venue is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).venue;

    const result = validateWpafccWeeklyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when additionalInformation is missing", () => {
    const data = [{ ...VALID_DATA[0] }];
    delete (data[0] as Record<string, unknown>).additionalInformation;

    const result = validateWpafccWeeklyHearingList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
