import { describe, expect, it } from "vitest";
import { SECTIONS } from "../sections.js";
import { validateBusinessAndPropertyDivisionRollsBuildingDailyCauseList } from "./json-validator.js";

const REQUIRED_FIELDS = ["judge", "time", "venue", "type", "caseNumber", "caseName"] as const;

function validHearing() {
  return {
    judge: "Mr Justice Smith",
    time: "10am",
    venue: "Court 1",
    type: "Trial",
    caseNumber: "CR-2026-000123",
    caseName: "Acme v Widgets",
    additionalInformation: "Listed for 1 day"
  };
}

// Fully-hydrated fixture: every one of the 16 sections has a valid hearing.
function buildValidData() {
  return Object.fromEntries(SECTIONS.map((s) => [s.key, [validHearing()]]));
}

describe("validateBusinessAndPropertyDivisionRollsBuildingDailyCauseList", () => {
  it("should return valid when all required fields are present in every section", () => {
    const data = JSON.parse(JSON.stringify(buildValidData()));

    const result = validateBusinessAndPropertyDivisionRollsBuildingDailyCauseList(data);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  describe.each(SECTIONS.map((s) => s.key))("section %s", (sectionKey) => {
    it("should return invalid when the section property is missing", () => {
      const data = JSON.parse(JSON.stringify(buildValidData()));
      delete data[sectionKey];

      const result = validateBusinessAndPropertyDivisionRollsBuildingDailyCauseList(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it.each(REQUIRED_FIELDS)("should return invalid when %s is missing from a hearing", (field) => {
      const data = JSON.parse(JSON.stringify(buildValidData()));
      delete data[sectionKey][0][field];

      const result = validateBusinessAndPropertyDivisionRollsBuildingDailyCauseList(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
