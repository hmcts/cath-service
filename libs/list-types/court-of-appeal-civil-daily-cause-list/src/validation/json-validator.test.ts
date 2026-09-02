import { describe, expect, it } from "vitest";
import { validateCourtOfAppealCivilDailyCauseList } from "./json-validator.js";

const VALID_DATA = {
  dailyHearings: [
    {
      venue: "Court 1",
      judge: "Judge Smith",
      time: "10am",
      caseNumber: "A/2025/001",
      caseDetails: "Appellant v Respondent",
      hearingType: "Appeal"
    }
  ],
  futureJudgments: [
    {
      date: "01/02/2025",
      venue: "Court 2",
      judge: "Judge Jones",
      time: "2pm",
      caseNumber: "A/2025/002",
      caseDetails: "Claimant v Defendant",
      hearingType: "Judgment"
    }
  ]
};

describe("validateCourtOfAppealCivilDailyCauseList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateCourtOfAppealCivilDailyCauseList(VALID_DATA);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when dailyHearings is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.dailyHearings;
    const result = validateCourtOfAppealCivilDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when futureJudgments is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.futureJudgments;
    const result = validateCourtOfAppealCivilDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when dailyHearings[0].venue is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.dailyHearings[0].venue;
    const result = validateCourtOfAppealCivilDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when dailyHearings[0].judge is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.dailyHearings[0].judge;
    const result = validateCourtOfAppealCivilDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when dailyHearings[0].time is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.dailyHearings[0].time;
    const result = validateCourtOfAppealCivilDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when dailyHearings[0].caseNumber is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.dailyHearings[0].caseNumber;
    const result = validateCourtOfAppealCivilDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when dailyHearings[0].caseDetails is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.dailyHearings[0].caseDetails;
    const result = validateCourtOfAppealCivilDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when dailyHearings[0].hearingType is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.dailyHearings[0].hearingType;
    const result = validateCourtOfAppealCivilDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when futureJudgments[0].date is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.futureJudgments[0].date;
    const result = validateCourtOfAppealCivilDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when futureJudgments[0].venue is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.futureJudgments[0].venue;
    const result = validateCourtOfAppealCivilDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when futureJudgments[0].judge is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.futureJudgments[0].judge;
    const result = validateCourtOfAppealCivilDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when futureJudgments[0].time is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.futureJudgments[0].time;
    const result = validateCourtOfAppealCivilDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when futureJudgments[0].caseNumber is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.futureJudgments[0].caseNumber;
    const result = validateCourtOfAppealCivilDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when futureJudgments[0].caseDetails is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.futureJudgments[0].caseDetails;
    const result = validateCourtOfAppealCivilDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when futureJudgments[0].hearingType is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.futureJudgments[0].hearingType;
    const result = validateCourtOfAppealCivilDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
