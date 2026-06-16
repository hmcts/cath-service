import { describe, expect, it } from "vitest";
import { AST_EXCEL_CONFIG } from "./ast-daily-hearing-list-config.js";

describe("AST_EXCEL_CONFIG", () => {
  describe("field configuration", () => {
    it("should define all required fields", () => {
      // Assert
      expect(AST_EXCEL_CONFIG.fields).toHaveLength(6);

      const fieldNames = AST_EXCEL_CONFIG.fields.map((f) => f.fieldName);
      expect(fieldNames).toEqual(["appellant", "appealReferenceNumber", "caseType", "hearingType", "hearingTime", "additionalInformation"]);
    });

    it("should mark all fields as required", () => {
      // Assert
      for (const field of AST_EXCEL_CONFIG.fields) {
        expect(field.required).toBe(true);
      }
    });

    it("should have correct header mappings", () => {
      // Assert
      const headers = AST_EXCEL_CONFIG.fields.map((f) => f.header);
      expect(headers).toEqual(["Appellant", "Appeal reference number", "Case type", "Hearing type", "Hearing time", "Additional information"]);
    });
  });

  describe("hearing time validation", () => {
    it("should accept valid time formats", () => {
      // Arrange
      const timeField = AST_EXCEL_CONFIG.fields[4];
      const validTimes = ["10:30am", "2pm", "9:45am", "11am", "10.30am", "2.45pm"];

      // Act & Assert
      for (const time of validTimes) {
        expect(() => timeField.validators?.[0](time, 1)).not.toThrow();
      }
    });

    it("should reject invalid time formats", () => {
      // Arrange
      const timeField = AST_EXCEL_CONFIG.fields[4];
      const invalidTimes = ["10:30", "10am-11am", "morning", "10:30 am", "abc"];

      // Act & Assert
      for (const time of invalidTimes) {
        expect(() => timeField.validators?.[0](time, 1)).toThrow();
      }
    });

    it("should return error message with row number for invalid time", () => {
      // Arrange
      const timeField = AST_EXCEL_CONFIG.fields[4];

      // Act & Assert
      expect(() => timeField.validators?.[0]("invalid", 5)).toThrow('Invalid time format \'invalid\' in row 5. Expected format like "10:30am" or "2pm"');
    });

    it("should accept time without colon", () => {
      // Arrange
      const timeField = AST_EXCEL_CONFIG.fields[4];

      // Act & Assert
      expect(() => timeField.validators?.[0]("2pm", 1)).not.toThrow();
      expect(() => timeField.validators?.[0]("11am", 1)).not.toThrow();
    });

    it("should accept time with period separator", () => {
      // Arrange
      const timeField = AST_EXCEL_CONFIG.fields[4];

      // Act & Assert
      expect(() => timeField.validators?.[0]("10.30am", 1)).not.toThrow();
      expect(() => timeField.validators?.[0]("2.15pm", 1)).not.toThrow();
    });
  });

  describe("HTML tag validation", () => {
    it("should reject HTML tags in appellant", () => {
      // Arrange
      const appellantField = AST_EXCEL_CONFIG.fields[0];

      // Act & Assert
      expect(() => appellantField.validators?.[0]("<script>alert('xss')</script>", 1)).toThrow("Appellant");
      expect(() => appellantField.validators?.[0]("<script>alert('xss')</script>", 1)).toThrow("row 1");
      expect(() => appellantField.validators?.[0]("<script>alert('xss')</script>", 1)).toThrow("HTML tags");
    });

    it("should reject HTML tags in appeal reference number", () => {
      // Arrange
      const refField = AST_EXCEL_CONFIG.fields[1];

      // Act & Assert
      expect(() => refField.validators?.[0]("<div>AST/2025/123</div>", 2)).toThrow("Appeal reference number");
      expect(() => refField.validators?.[0]("<div>AST/2025/123</div>", 2)).toThrow("HTML tags");
    });

    it("should reject HTML tags in case type", () => {
      // Arrange
      const caseTypeField = AST_EXCEL_CONFIG.fields[2];

      // Act & Assert
      expect(() => caseTypeField.validators?.[0]("<p>Section 95</p>", 3)).toThrow("Case type");
      expect(() => caseTypeField.validators?.[0]("<p>Section 95</p>", 3)).toThrow("HTML tags");
    });

    it("should reject HTML tags in hearing type", () => {
      // Arrange
      const hearingTypeField = AST_EXCEL_CONFIG.fields[3];

      // Act & Assert
      expect(() => hearingTypeField.validators?.[0]("<span>Remote</span>", 4)).toThrow("Hearing type");
      expect(() => hearingTypeField.validators?.[0]("<span>Remote</span>", 4)).toThrow("HTML tags");
    });

    it("should reject HTML tags in additional information", () => {
      // Arrange
      const additionalInfoField = AST_EXCEL_CONFIG.fields[5];

      // Act & Assert
      expect(() => additionalInfoField.validators?.[0]("<b>Interpreter required</b>", 5)).toThrow("Additional information");
      expect(() => additionalInfoField.validators?.[0]("<b>Interpreter required</b>", 5)).toThrow("HTML tags");
    });

    it("should accept valid text without HTML tags", () => {
      // Arrange
      const fields = [
        AST_EXCEL_CONFIG.fields[0], // appellant
        AST_EXCEL_CONFIG.fields[1], // appealReferenceNumber
        AST_EXCEL_CONFIG.fields[2], // caseType
        AST_EXCEL_CONFIG.fields[3], // hearingType
        AST_EXCEL_CONFIG.fields[5] // additionalInformation
      ];

      const validValues = ["John Smith", "AST/2025/00123", "Section 95", "Remote - Teams", "Interpreter required - Arabic"];

      // Act & Assert
      for (let i = 0; i < fields.length; i++) {
        expect(() => fields[i].validators?.[0](validValues[i], 1)).not.toThrow();
      }
    });

    it("should accept empty additional information", () => {
      // Arrange
      const additionalInfoField = AST_EXCEL_CONFIG.fields[5];

      // Act & Assert
      expect(() => additionalInfoField.validators?.[0]("", 1)).not.toThrow();
    });
  });

  describe("configuration settings", () => {
    it("should require at least one row", () => {
      // Assert
      expect(AST_EXCEL_CONFIG.minRows).toBe(1);
    });

    it("should have validators for all fields", () => {
      // Assert
      for (const field of AST_EXCEL_CONFIG.fields) {
        expect(field.validators).toBeDefined();
        expect(field.validators!.length).toBeGreaterThan(0);
      }
    });
  });

  describe("field order", () => {
    it("should have fields in correct order", () => {
      // Arrange
      const expectedOrder = ["appellant", "appealReferenceNumber", "caseType", "hearingType", "hearingTime", "additionalInformation"];

      // Act
      const actualOrder = AST_EXCEL_CONFIG.fields.map((f) => f.fieldName);

      // Assert
      expect(actualOrder).toEqual(expectedOrder);
    });
  });

  describe("time format validation edge cases", () => {
    it("should accept time with optional minutes", () => {
      // Arrange
      const timeField = AST_EXCEL_CONFIG.fields[4];

      // Act & Assert
      expect(() => timeField.validators?.[0]("9am", 1)).not.toThrow();
      expect(() => timeField.validators?.[0]("12pm", 1)).not.toThrow();
    });

    it("should accept time with leading zero", () => {
      // Arrange
      const timeField = AST_EXCEL_CONFIG.fields[4];

      // Act & Assert
      expect(() => timeField.validators?.[0]("09:30am", 1)).not.toThrow();
      expect(() => timeField.validators?.[0]("01:15pm", 1)).not.toThrow();
    });

    it("should reject malformed time format", () => {
      // Arrange
      const timeField = AST_EXCEL_CONFIG.fields[4];

      // Act & Assert
      expect(() => timeField.validators?.[0]("10:30 AM", 1)).toThrow();
      expect(() => timeField.validators?.[0]("10-30am", 1)).toThrow();
    });

    it("should accept time without leading zero", () => {
      // Arrange
      const timeField = AST_EXCEL_CONFIG.fields[4];

      // Act & Assert
      expect(() => timeField.validators?.[0]("9am", 1)).not.toThrow();
      expect(() => timeField.validators?.[0]("1pm", 1)).not.toThrow();
    });
  });
});
