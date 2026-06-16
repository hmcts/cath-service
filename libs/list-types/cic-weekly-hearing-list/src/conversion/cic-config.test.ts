import { describe, expect, it } from "vitest";
import { CIC_EXCEL_CONFIG } from "./cic-config.js";

describe("CIC_EXCEL_CONFIG", () => {
  it("should have correct configuration structure", () => {
    // Arrange & Act & Assert
    expect(CIC_EXCEL_CONFIG).toBeDefined();
    expect(CIC_EXCEL_CONFIG.fields).toHaveLength(8);
    expect(CIC_EXCEL_CONFIG.minRows).toBe(1);
  });

  it("should have all required fields defined", () => {
    // Arrange & Act
    const fieldNames = CIC_EXCEL_CONFIG.fields.map((f) => f.fieldName);

    // Assert
    expect(fieldNames).toEqual(["date", "hearingTime", "caseReferenceNumber", "caseName", "venuePlatform", "judges", "members", "additionalInformation"]);
  });

  it("should have correct required flags", () => {
    // Arrange & Act
    const requiredFields = CIC_EXCEL_CONFIG.fields.filter((f) => f.required).map((f) => f.fieldName);

    // Assert
    expect(requiredFields).toEqual(["date", "hearingTime", "caseReferenceNumber", "caseName", "venuePlatform", "judges", "members", "additionalInformation"]);
  });

  it("should have correct header names", () => {
    // Arrange & Act
    const headers = CIC_EXCEL_CONFIG.fields.map((f) => f.header);

    // Assert
    expect(headers).toEqual([
      "Date",
      "Hearing time",
      "Case reference number",
      "Case name",
      "Venue/Platform",
      "Judge(s)",
      "Member(s)",
      "Additional information"
    ]);
  });

  describe("date field validation", () => {
    const dateField = CIC_EXCEL_CONFIG.fields.find((f) => f.fieldName === "date");

    it("should accept valid date formats dd/MM/yyyy", () => {
      // Arrange & Act & Assert
      expect(dateField).toBeDefined();
      expect(dateField?.validators).toBeDefined();
      expect(() => dateField?.validators?.[0]("15/06/2026", 1)).not.toThrow();
      expect(() => dateField?.validators?.[0]("01/01/2025", 1)).not.toThrow();
      expect(() => dateField?.validators?.[0]("31/12/2026", 1)).not.toThrow();
    });

    it("should reject invalid date formats", () => {
      // Arrange & Act & Assert
      expect(() => dateField?.validators?.[0]("2026-06-15", 1)).toThrow();
      expect(() => dateField?.validators?.[0]("15-06-2026", 1)).toThrow();
      expect(() => dateField?.validators?.[0]("15/6/2026", 1)).toThrow();
      expect(() => dateField?.validators?.[0]("invalid", 1)).toThrow();
    });

    it("should include row number in error message", () => {
      // Arrange & Act & Assert
      expect(() => dateField?.validators?.[0]("invalid", 5)).toThrow("row 5");
      expect(() => dateField?.validators?.[0]("2026-06-15", 10)).toThrow("row 10");
    });
  });

  describe("hearingTime field validation", () => {
    const timeField = CIC_EXCEL_CONFIG.fields.find((f) => f.fieldName === "hearingTime");

    it("should accept valid time formats with colon", () => {
      // Arrange & Act & Assert
      expect(timeField).toBeDefined();
      expect(timeField?.validators).toBeDefined();
      expect(() => timeField?.validators?.[0]("9:30am", 1)).not.toThrow();
      expect(() => timeField?.validators?.[0]("10:15pm", 1)).not.toThrow();
      expect(() => timeField?.validators?.[0]("12:00am", 1)).not.toThrow();
    });

    it("should accept valid time formats with dot", () => {
      // Arrange & Act & Assert
      expect(() => timeField?.validators?.[0]("9.30am", 1)).not.toThrow();
      expect(() => timeField?.validators?.[0]("10.15pm", 1)).not.toThrow();
    });

    it("should accept valid time formats without minutes", () => {
      // Arrange & Act & Assert
      expect(() => timeField?.validators?.[0]("9am", 1)).not.toThrow();
      expect(() => timeField?.validators?.[0]("2pm", 1)).not.toThrow();
      expect(() => timeField?.validators?.[0]("12pm", 1)).not.toThrow();
    });

    it("should accept times with spaces before am/pm", () => {
      // Arrange & Act & Assert
      expect(() => timeField?.validators?.[0]("9:30am ", 1)).not.toThrow();
      expect(() => timeField?.validators?.[0]("10:15 pm", 1)).not.toThrow();
    });

    it("should reject invalid time formats", () => {
      // Arrange & Act & Assert
      expect(() => timeField?.validators?.[0]("9", 1)).toThrow("Invalid time format");
      expect(() => timeField?.validators?.[0]("25:00am", 1)).toThrow("Invalid time format");
      expect(() => timeField?.validators?.[0]("9:30", 1)).toThrow("Invalid time format");
      expect(() => timeField?.validators?.[0]("invalid", 1)).toThrow("Invalid time format");
    });

    it("should include row number in error message", () => {
      // Arrange & Act & Assert
      expect(() => timeField?.validators?.[0]("invalid", 5)).toThrow("row 5");
      expect(() => timeField?.validators?.[0]("9:30", 10)).toThrow("row 10");
    });
  });

  describe("HTML tag validation", () => {
    const caseNameField = CIC_EXCEL_CONFIG.fields.find((f) => f.fieldName === "caseName");
    const venueField = CIC_EXCEL_CONFIG.fields.find((f) => f.fieldName === "venuePlatform");
    const judgesField = CIC_EXCEL_CONFIG.fields.find((f) => f.fieldName === "judges");

    it("should reject values with HTML tags in case name", () => {
      // Arrange & Act & Assert
      expect(caseNameField).toBeDefined();
      expect(() => caseNameField?.validators?.[0]("<script>alert('xss')</script>", 1)).toThrow();
      expect(() => caseNameField?.validators?.[0]("Smith <b>v</b> CICA", 1)).toThrow();
    });

    it("should accept values without HTML tags in case name", () => {
      // Arrange & Act & Assert
      expect(() => caseNameField?.validators?.[0]("Smith v CICA", 1)).not.toThrow();
      expect(() => caseNameField?.validators?.[0]("Brown & Others v CICA", 1)).not.toThrow();
    });

    it("should reject values with HTML tags in venuePlatform", () => {
      // Arrange & Act & Assert
      expect(venueField).toBeDefined();
      expect(() => venueField?.validators?.[0]("<iframe>test</iframe>", 1)).toThrow();
      expect(() => venueField?.validators?.[0]("Video <strong>Hearing</strong>", 1)).toThrow();
    });

    it("should accept values without HTML tags in venuePlatform", () => {
      // Arrange & Act & Assert
      expect(() => venueField?.validators?.[0]("Video Hearing", 1)).not.toThrow();
      expect(() => venueField?.validators?.[0]("Leicester Tribunal Centre", 1)).not.toThrow();
    });

    it("should reject values with HTML tags in judges", () => {
      // Arrange & Act & Assert
      expect(judgesField).toBeDefined();
      expect(() => judgesField?.validators?.[0]("<div>Judge Smith</div>", 1)).toThrow();
      expect(() => judgesField?.validators?.[0]("Judge <em>Smith</em>", 1)).toThrow();
    });

    it("should accept values without HTML tags in judges", () => {
      // Arrange & Act & Assert
      expect(() => judgesField?.validators?.[0]("Judge Smith", 1)).not.toThrow();
      expect(() => judgesField?.validators?.[0]("Judge Roberts, Judge Williams", 1)).not.toThrow();
    });
  });

  describe("caseReferenceNumber field validation", () => {
    const caseRefField = CIC_EXCEL_CONFIG.fields.find((f) => f.fieldName === "caseReferenceNumber");

    it("should accept valid case reference numbers", () => {
      // Arrange & Act & Assert
      expect(caseRefField).toBeDefined();
      expect(() => caseRefField?.validators?.[0]("CIC/2026/001", 1)).not.toThrow();
      expect(() => caseRefField?.validators?.[0]("CIC/2026/12345", 1)).not.toThrow();
    });

    it("should reject case reference numbers with HTML tags", () => {
      // Arrange & Act & Assert
      expect(() => caseRefField?.validators?.[0]("CIC/2026/<script>001</script>", 1)).toThrow();
      expect(() => caseRefField?.validators?.[0]("<b>CIC/2026/001</b>", 1)).toThrow();
    });
  });

  describe("members field validation", () => {
    const membersField = CIC_EXCEL_CONFIG.fields.find((f) => f.fieldName === "members");

    it("should accept valid member names", () => {
      // Arrange & Act & Assert
      expect(membersField).toBeDefined();
      expect(() => membersField?.validators?.[0]("Dr. Williams, Ms. Jones", 1)).not.toThrow();
      expect(() => membersField?.validators?.[0]("Mr. Taylor", 1)).not.toThrow();
    });

    it("should reject member names with HTML tags", () => {
      // Arrange & Act & Assert
      expect(() => membersField?.validators?.[0]("Dr. <span>Williams</span>", 1)).toThrow();
      expect(() => membersField?.validators?.[0]("<p>Ms. Jones</p>", 1)).toThrow();
    });
  });

  describe("additionalInformation field validation", () => {
    const additionalInfoField = CIC_EXCEL_CONFIG.fields.find((f) => f.fieldName === "additionalInformation");

    it("should accept valid additional information", () => {
      // Arrange & Act & Assert
      expect(additionalInfoField).toBeDefined();
      expect(() => additionalInfoField?.validators?.[0]("Interpreter required", 1)).not.toThrow();
      expect(() => additionalInfoField?.validators?.[0]("Hearing to be held in private", 1)).not.toThrow();
      expect(() => additionalInfoField?.validators?.[0]("", 1)).not.toThrow();
    });

    it("should reject additional information with HTML tags", () => {
      // Arrange & Act & Assert
      expect(() => additionalInfoField?.validators?.[0]("<script>alert('test')</script>", 1)).toThrow();
      expect(() => additionalInfoField?.validators?.[0]("Interpreter <b>required</b>", 1)).toThrow();
    });
  });

  describe("field configuration consistency", () => {
    it("should have validators for all fields", () => {
      // Arrange & Act
      const fieldsWithoutValidators = CIC_EXCEL_CONFIG.fields.filter((f) => !f.validators || f.validators.length === 0);

      // Assert
      expect(fieldsWithoutValidators).toHaveLength(0);
    });

    it("should have consistent field name format", () => {
      // Arrange & Act
      const fieldNames = CIC_EXCEL_CONFIG.fields.map((f) => f.fieldName);

      // Assert
      for (const fieldName of fieldNames) {
        expect(fieldName).toBeTruthy();
        expect(typeof fieldName).toBe("string");
      }
    });

    it("should have all fields marked as required", () => {
      // Arrange & Act
      const optionalFields = CIC_EXCEL_CONFIG.fields.filter((f) => !f.required);

      // Assert
      expect(optionalFields).toHaveLength(0);
    });
  });
});
