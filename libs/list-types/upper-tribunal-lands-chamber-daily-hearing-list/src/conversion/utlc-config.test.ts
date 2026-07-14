import { describe, expect, it } from "vitest";
import { UTLC_EXCEL_CONFIG } from "./utlc-config.js";

describe("UTLC_EXCEL_CONFIG", () => {
  it("should have correct configuration structure", () => {
    expect(UTLC_EXCEL_CONFIG).toBeDefined();
    expect(UTLC_EXCEL_CONFIG.fields).toHaveLength(9);
    expect(UTLC_EXCEL_CONFIG.minRows).toBe(1);
  });

  it("should have all expected field names", () => {
    const fieldNames = UTLC_EXCEL_CONFIG.fields.map((f) => f.fieldName);
    expect(fieldNames).toEqual([
      "time",
      "caseReferenceNumber",
      "caseName",
      "judges",
      "members",
      "hearingType",
      "venue",
      "modeOfHearing",
      "additionalInformation"
    ]);
  });

  it("should have correct required flags", () => {
    const requiredFields = UTLC_EXCEL_CONFIG.fields.filter((f) => f.required).map((f) => f.fieldName);
    const optionalFields = UTLC_EXCEL_CONFIG.fields.filter((f) => !f.required).map((f) => f.fieldName);

    expect(requiredFields).toEqual([
      "time",
      "caseReferenceNumber",
      "caseName",
      "judges",
      "members",
      "hearingType",
      "venue",
      "modeOfHearing",
      "additionalInformation"
    ]);
    expect(optionalFields).toEqual([]);
  });

  describe("field validators", () => {
    it("should accept values without HTML tags", () => {
      for (const field of UTLC_EXCEL_CONFIG.fields) {
        expect(() => field.validators?.[0]("Plain text value", 1)).not.toThrow();
      }
    });

    it("should reject values containing HTML tags", () => {
      for (const field of UTLC_EXCEL_CONFIG.fields) {
        expect(() => field.validators?.[0]("<b>bold</b>", 1)).toThrow();
      }
    });
  });
});
