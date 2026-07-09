import { describe, expect, it } from "vitest";
import { validateLondonAdministrativeCourtDailyCauseList } from "./json-validator.js";

const VALID_DATA = {
  mainHearings: [],
  planningCourt: []
};

describe("validateLondonAdministrativeCourtDailyCauseList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateLondonAdministrativeCourtDailyCauseList(VALID_DATA);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when mainHearings is missing", () => {
    const data = { ...VALID_DATA };
    delete (data as Record<string, unknown>).mainHearings;

    const result = validateLondonAdministrativeCourtDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when planningCourt is missing", () => {
    const data = { ...VALID_DATA };
    delete (data as Record<string, unknown>).planningCourt;

    const result = validateLondonAdministrativeCourtDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
