import { describe, expect, it } from "vitest";
import { validateCourtOfAppealCivilDailyCauseList } from "./json-validator.js";

const VALID_DATA = {
  dailyHearings: [],
  futureJudgments: []
};

describe("validateCourtOfAppealCivilDailyCauseList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateCourtOfAppealCivilDailyCauseList(VALID_DATA);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when dailyHearings is missing", () => {
    const data = { ...VALID_DATA } as Record<string, unknown>;
    delete data.dailyHearings;

    const result = validateCourtOfAppealCivilDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when futureJudgments is missing", () => {
    const data = { ...VALID_DATA } as Record<string, unknown>;
    delete data.futureJudgments;

    const result = validateCourtOfAppealCivilDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
