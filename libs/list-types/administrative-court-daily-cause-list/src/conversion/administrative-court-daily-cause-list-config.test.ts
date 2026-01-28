import { describe, expect, it } from "vitest";
import { ADMIN_COURT_EXCEL_CONFIG } from "./administrative-court-daily-cause-list-config.js";

describe("ADMIN_COURT_EXCEL_CONFIG", () => {
  it("should have correct configuration structure", () => {
    expect(ADMIN_COURT_EXCEL_CONFIG).toBeDefined();
    expect(ADMIN_COURT_EXCEL_CONFIG.fields).toHaveLength(7);
    expect(ADMIN_COURT_EXCEL_CONFIG.minRows).toBe(1);
  });

  it("should have all required fields defined", () => {
    const fieldNames = ADMIN_COURT_EXCEL_CONFIG.fields.map((f) => f.fieldName);
    expect(fieldNames).toEqual(["venue", "judge", "time", "caseNumber", "caseDetails", "hearingType", "additionalInformation"]);
  });

  it("should have correct required flags", () => {
    const requiredFields = ADMIN_COURT_EXCEL_CONFIG.fields.filter((f) => f.required).map((f) => f.fieldName);
    const optionalFields = ADMIN_COURT_EXCEL_CONFIG.fields.filter((f) => !f.required).map((f) => f.fieldName);

    expect(requiredFields).toEqual(["venue", "judge", "time", "caseNumber", "caseDetails", "hearingType"]);
    expect(optionalFields).toEqual(["additionalInformation"]);
  });

  describe("time field validation", () => {
    const timeField = ADMIN_COURT_EXCEL_CONFIG.fields.find((f) => f.fieldName === "time");

    it("should accept valid time formats with colon", () => {
      expect(timeField).toBeDefined();
      expect(timeField?.validators).toBeDefined();
      expect(() => timeField?.validators?.[0]("9:30am", 1)).not.toThrow();
      expect(() => timeField?.validators?.[0]("10:15pm", 1)).not.toThrow();
      expect(() => timeField?.validators?.[0]("12:00am", 1)).not.toThrow();
    });

    it("should accept valid time formats with dot", () => {
      expect(() => timeField?.validators?.[0]("9.30am", 1)).not.toThrow();
      expect(() => timeField?.validators?.[0]("10.15pm", 1)).not.toThrow();
    });

    it("should accept valid time formats without minutes", () => {
      expect(() => timeField?.validators?.[0]("9am", 1)).not.toThrow();
      expect(() => timeField?.validators?.[0]("2pm", 1)).not.toThrow();
      expect(() => timeField?.validators?.[0]("12pm", 1)).not.toThrow();
    });

    it("should accept times with spaces before am/pm", () => {
      expect(() => timeField?.validators?.[0]("9:30am ", 1)).not.toThrow();
      expect(() => timeField?.validators?.[0]("10:15 pm", 1)).not.toThrow();
    });

    it("should reject invalid time formats", () => {
      expect(() => timeField?.validators?.[0]("9", 1)).toThrow("Invalid time format");
      expect(() => timeField?.validators?.[0]("25:00am", 1)).toThrow("Invalid time format");
      expect(() => timeField?.validators?.[0]("9:30", 1)).toThrow("Invalid time format");
      expect(() => timeField?.validators?.[0]("invalid", 1)).toThrow("Invalid time format");
    });

    it("should include row number in error message", () => {
      expect(() => timeField?.validators?.[0]("invalid", 5)).toThrow("row 5");
      expect(() => timeField?.validators?.[0]("9:30", 10)).toThrow("row 10");
    });
  });

  describe("HTML tag validation", () => {
    const venueField = ADMIN_COURT_EXCEL_CONFIG.fields.find((f) => f.fieldName === "venue");

    it("should reject values with HTML tags", () => {
      expect(venueField).toBeDefined();
      expect(() => venueField?.validators?.[0]("<script>alert('xss')</script>", 1)).toThrow();
      expect(() => venueField?.validators?.[0]("Court <b>1</b>", 1)).toThrow();
    });

    it("should accept values without HTML tags", () => {
      expect(() => venueField?.validators?.[0]("Court 1", 1)).not.toThrow();
      expect(() => venueField?.validators?.[0]("Birmingham Administrative Court", 1)).not.toThrow();
    });
  });
});
