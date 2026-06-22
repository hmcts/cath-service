import { describe, expect, it } from "vitest";
import { UTIAC_JR_LEEDS_EXCEL_CONFIG } from "./utiac-jr-leeds-config.js";

describe("UTIAC_JR_LEEDS_EXCEL_CONFIG", () => {
  it("should have correct configuration structure", () => {
    expect(UTIAC_JR_LEEDS_EXCEL_CONFIG).toBeDefined();
    expect(UTIAC_JR_LEEDS_EXCEL_CONFIG.fields).toHaveLength(7);
    expect(UTIAC_JR_LEEDS_EXCEL_CONFIG.minRows).toBe(1);
  });

  it("should have all fields with correct names", () => {
    const fieldNames = UTIAC_JR_LEEDS_EXCEL_CONFIG.fields.map((f) => f.fieldName);
    expect(fieldNames).toEqual(["venue", "judges", "hearingTime", "caseReferenceNumber", "caseTitle", "hearingType", "additionalInformation"]);
  });

  it("should have correct required flags", () => {
    const requiredFields = UTIAC_JR_LEEDS_EXCEL_CONFIG.fields.filter((f) => f.required).map((f) => f.fieldName);
    const optionalFields = UTIAC_JR_LEEDS_EXCEL_CONFIG.fields.filter((f) => !f.required).map((f) => f.fieldName);

    expect(requiredFields).toEqual(["venue", "judges", "hearingTime", "caseReferenceNumber", "caseTitle", "hearingType"]);
    expect(optionalFields).toEqual(["additionalInformation"]);
  });

  describe("hearingTime field validation", () => {
    const hearingTimeField = UTIAC_JR_LEEDS_EXCEL_CONFIG.fields.find((f) => f.fieldName === "hearingTime");

    it("should accept valid time formats", () => {
      expect(hearingTimeField?.validators).toBeDefined();
      expect(() => hearingTimeField?.validators?.[0]("9:30am", 1)).not.toThrow();
      expect(() => hearingTimeField?.validators?.[0]("10:15pm", 1)).not.toThrow();
      expect(() => hearingTimeField?.validators?.[0]("9am", 1)).not.toThrow();
    });

    it("should reject invalid time formats", () => {
      expect(() => hearingTimeField?.validators?.[0]("invalid", 1)).toThrow("Invalid time format");
      expect(() => hearingTimeField?.validators?.[0]("9:30", 1)).toThrow("Invalid time format");
    });
  });

  describe("HTML tag validation on all text fields", () => {
    const textFields = ["venue", "judges", "caseReferenceNumber", "caseTitle", "hearingType", "additionalInformation"];

    for (const fieldName of textFields) {
      it(`should reject HTML tags in ${fieldName}`, () => {
        const field = UTIAC_JR_LEEDS_EXCEL_CONFIG.fields.find((f) => f.fieldName === fieldName);
        expect(field).toBeDefined();
        expect(() => field?.validators?.[0]("<script>xss</script>", 1)).toThrow();
        expect(() => field?.validators?.[0]("Valid value", 1)).not.toThrow();
      });
    }
  });
});
