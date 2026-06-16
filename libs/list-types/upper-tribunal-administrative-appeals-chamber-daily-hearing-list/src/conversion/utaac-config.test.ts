import { describe, expect, it } from "vitest";
import { UTAAC_EXCEL_CONFIG } from "./utaac-config.js";

describe("UTAAC_EXCEL_CONFIG", () => {
  it("should have correct configuration structure", () => {
    expect(UTAAC_EXCEL_CONFIG).toBeDefined();
    expect(UTAAC_EXCEL_CONFIG.fields).toHaveLength(8);
    expect(UTAAC_EXCEL_CONFIG.minRows).toBe(1);
  });

  it("should have all expected field names", () => {
    const fieldNames = UTAAC_EXCEL_CONFIG.fields.map((f) => f.fieldName);
    expect(fieldNames).toEqual(["time", "appellant", "caseReferenceNumber", "judges", "members", "modeOfHearing", "venue", "additionalInformation"]);
  });

  it("should have correct required flags", () => {
    const requiredFields = UTAAC_EXCEL_CONFIG.fields.filter((f) => f.required).map((f) => f.fieldName);
    const optionalFields = UTAAC_EXCEL_CONFIG.fields.filter((f) => !f.required).map((f) => f.fieldName);

    expect(requiredFields).toEqual(["time", "appellant", "caseReferenceNumber", "judges", "members", "modeOfHearing", "venue", "additionalInformation"]);
    expect(optionalFields).toEqual([]);
  });

  describe("field validators", () => {
    it("should accept values without HTML tags", () => {
      for (const field of UTAAC_EXCEL_CONFIG.fields) {
        expect(() => field.validators?.[0]("Plain text value", 1)).not.toThrow();
      }
    });

    it("should reject values containing HTML tags", () => {
      for (const field of UTAAC_EXCEL_CONFIG.fields) {
        expect(() => field.validators?.[0]("<b>bold</b>", 1)).toThrow();
      }
    });
  });
});
