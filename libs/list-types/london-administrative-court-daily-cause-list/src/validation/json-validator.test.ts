import { describe, expect, it } from "vitest";
import { validateLondonAdministrativeCourtDailyCauseList } from "./json-validator.js";

const VALID_DATA = {
  mainHearings: [
    {
      venue: "Court 1",
      judge: "Judge Smith",
      time: "10am",
      caseNumber: "CO/2025/001",
      caseDetails: "Claimant v Secretary of State",
      hearingType: "Judicial Review"
    }
  ],
  planningCourt: [
    {
      venue: "Court 2",
      judge: "Judge Jones",
      time: "2pm",
      caseNumber: "CO/2025/002",
      caseDetails: "Appellant v Local Authority",
      hearingType: "Planning Appeal"
    }
  ]
};

describe("validateLondonAdministrativeCourtDailyCauseList", () => {
  it("should return valid when all required fields are present", () => {
    const result = validateLondonAdministrativeCourtDailyCauseList(VALID_DATA);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when mainHearings is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.mainHearings;
    const result = validateLondonAdministrativeCourtDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when planningCourt is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.planningCourt;
    const result = validateLondonAdministrativeCourtDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when mainHearings[0].venue is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.mainHearings[0].venue;
    const result = validateLondonAdministrativeCourtDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when mainHearings[0].judge is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.mainHearings[0].judge;
    const result = validateLondonAdministrativeCourtDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when mainHearings[0].time is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.mainHearings[0].time;
    const result = validateLondonAdministrativeCourtDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when mainHearings[0].caseNumber is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.mainHearings[0].caseNumber;
    const result = validateLondonAdministrativeCourtDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when mainHearings[0].caseDetails is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.mainHearings[0].caseDetails;
    const result = validateLondonAdministrativeCourtDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when mainHearings[0].hearingType is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.mainHearings[0].hearingType;
    const result = validateLondonAdministrativeCourtDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when planningCourt[0].venue is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.planningCourt[0].venue;
    const result = validateLondonAdministrativeCourtDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when planningCourt[0].judge is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.planningCourt[0].judge;
    const result = validateLondonAdministrativeCourtDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when planningCourt[0].time is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.planningCourt[0].time;
    const result = validateLondonAdministrativeCourtDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when planningCourt[0].caseNumber is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.planningCourt[0].caseNumber;
    const result = validateLondonAdministrativeCourtDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when planningCourt[0].caseDetails is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.planningCourt[0].caseDetails;
    const result = validateLondonAdministrativeCourtDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when planningCourt[0].hearingType is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.planningCourt[0].hearingType;
    const result = validateLondonAdministrativeCourtDailyCauseList(data);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
