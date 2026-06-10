import { describe, expect, it } from "vitest";
import { UTCC_EXCEL_CONFIG } from "./utcc-config.js";

describe("UTCC_EXCEL_CONFIG", () => {
  it("should have correct configuration structure", () => {
    expect(UTCC_EXCEL_CONFIG).toBeDefined();
    expect(UTCC_EXCEL_CONFIG.fields).toHaveLength(8);
    expect(UTCC_EXCEL_CONFIG.minRows).toBe(1);
  });

  it("should have all expected field names", () => {
    const fieldNames = UTCC_EXCEL_CONFIG.fields.map((f) => f.fieldName);
    expect(fieldNames).toEqual(["time", "caseReference", "caseName", "judges", "members", "hearingType", "venue", "additionalInformation"]);
  });

  it("should have correct required flags", () => {
    const requiredFields = UTCC_EXCEL_CONFIG.fields.filter((f) => f.required).map((f) => f.fieldName);
    const optionalFields = UTCC_EXCEL_CONFIG.fields.filter((f) => !f.required).map((f) => f.fieldName);

    expect(requiredFields).toEqual(["time", "caseReference", "caseName"]);
    expect(optionalFields).toEqual(["judges", "members", "hearingType", "venue", "additionalInformation"]);
  });

  describe("field validators", () => {
    it("should accept values without HTML tags", () => {
      for (const field of UTCC_EXCEL_CONFIG.fields) {
        expect(() => field.validators?.[0]("Plain text value", 1)).not.toThrow();
      }
    });

    it("should reject values containing HTML tags", () => {
      for (const field of UTCC_EXCEL_CONFIG.fields) {
        expect(() => field.validators?.[0]("<b>bold</b>", 1)).toThrow();
      }
    });
  });
});
