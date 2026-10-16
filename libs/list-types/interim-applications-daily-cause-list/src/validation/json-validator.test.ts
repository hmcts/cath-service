import { describe, expect, it } from "vitest";
import { validateInterimApplicationsDailyCauseList } from "./json-validator.js";

const VALID_DATA = {
  hearingList: [
    {
      judge: "Judge A",
      time: "10.30am",
      venue: "This is a venue name",
      type: "Case type A",
      caseNumber: "1234",
      caseName: "This is a case name",
      additionalInformation: "This is additional information"
    }
  ],
  openJusticeStatementDetails: [
    {
      nameToBeDisplayed: "Judge OpenJusticeTest",
      email: "Judge.OpenJusticeTest@justice.gov.uk"
    }
  ]
};

describe("validateInterimApplicationsDailyCauseList", () => {
  it("should return valid when all required fields are present", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));

    const result = validateInterimApplicationsDailyCauseList(data);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return valid when openJusticeStatementDetails is an empty array", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    data.openJusticeStatementDetails = [];

    const result = validateInterimApplicationsDailyCauseList(data);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return invalid when hearingList is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.hearingList;

    const result = validateInterimApplicationsDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when openJusticeStatementDetails is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.openJusticeStatementDetails;

    const result = validateInterimApplicationsDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingList judge is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.hearingList[0].judge;

    const result = validateInterimApplicationsDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingList time is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.hearingList[0].time;

    const result = validateInterimApplicationsDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingList venue is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.hearingList[0].venue;

    const result = validateInterimApplicationsDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingList type is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.hearingList[0].type;

    const result = validateInterimApplicationsDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingList caseNumber is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.hearingList[0].caseNumber;

    const result = validateInterimApplicationsDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingList caseName is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.hearingList[0].caseName;

    const result = validateInterimApplicationsDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when hearingList additionalInformation is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.hearingList[0].additionalInformation;

    const result = validateInterimApplicationsDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when openJusticeStatementDetails nameToBeDisplayed is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.openJusticeStatementDetails[0].nameToBeDisplayed;

    const result = validateInterimApplicationsDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when openJusticeStatementDetails email is missing", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    delete data.openJusticeStatementDetails[0].email;

    const result = validateInterimApplicationsDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when time format is invalid", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    data.hearingList[0].time = "not-a-time";

    const result = validateInterimApplicationsDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should return invalid when a text field contains HTML tags", () => {
    const data = JSON.parse(JSON.stringify(VALID_DATA));
    data.hearingList[0].caseName = "<script>alert('xss')</script>";

    const result = validateInterimApplicationsDailyCauseList(data);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
