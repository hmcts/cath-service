import { describe, expect, it } from "vitest";
import { SEND_EXCEL_CONFIG } from "./send-config.js";

describe("SEND_EXCEL_CONFIG", () => {
  describe("field configuration", () => {
    it("should define all required fields", () => {
      // Assert
      expect(SEND_EXCEL_CONFIG.fields).toHaveLength(6);

      const fieldNames = SEND_EXCEL_CONFIG.fields.map((f) => f.fieldName);
      expect(fieldNames).toEqual(["time", "caseReferenceNumber", "respondent", "hearingType", "venue", "timeEstimate"]);
    });

    it("should mark all fields as required", () => {
      // Assert
      for (const field of SEND_EXCEL_CONFIG.fields) {
        expect(field.required).toBe(true);
      }
    });

    it("should have correct header mappings", () => {
      // Assert
      const headers = SEND_EXCEL_CONFIG.fields.map((f) => f.header);
      expect(headers).toEqual(["Time", "Case Reference Number", "Respondent", "Hearing Type", "Venue", "Time Estimate"]);
    });
  });

  describe("time validation", () => {
    it("should accept valid time formats", () => {
      // Arrange
      const timeField = SEND_EXCEL_CONFIG.fields[0];
      const validTimes = ["10:30am", "2pm", "9:45am", "11am", "10.30am", "2.45pm"];

      // Act & Assert
      for (const time of validTimes) {
        const errors = timeField.validators?.map((v) => v(time, 1)).filter(Boolean);
        expect(errors).toHaveLength(0);
      }
    });

    it("should reject invalid time formats", () => {
      // Arrange
      const timeField = SEND_EXCEL_CONFIG.fields[0];
      const invalidTimes = ["10:30", "10am-11am", "morning", "10:30 am", "abc"];

      // Act & Assert
      for (const time of invalidTimes) {
        const errors = timeField.validators?.map((v) => v(time, 1)).filter(Boolean);
        expect(errors!.length).toBeGreaterThan(0);
      }
    });

    it("should return error message with row number for invalid time", () => {
      // Arrange
      const timeField = SEND_EXCEL_CONFIG.fields[0];

      // Act
      const result = timeField.validators?.[0]("invalid", 5);

      // Assert
      expect(result).toContain("Row 5");
      expect(result).toContain("Time must be in format");
    });

    it("should return error message for missing time", () => {
      // Arrange
      const timeField = SEND_EXCEL_CONFIG.fields[0];

      // Act
      const result = timeField.validators?.[0]("", 10);

      // Assert
      expect(result).toContain("Row 10");
      expect(result).toContain("Time is required");
    });
  });

  describe("HTML tag validation", () => {
    it("should reject HTML tags in case reference number", () => {
      // Arrange
      const caseRefField = SEND_EXCEL_CONFIG.fields[1];

      // Act & Assert
      expect(() => caseRefField.validators?.[0]("<script>alert('xss')</script>", 1)).toThrow("Case Reference Number");
      expect(() => caseRefField.validators?.[0]("<script>alert('xss')</script>", 1)).toThrow("row 1");
      expect(() => caseRefField.validators?.[0]("<script>alert('xss')</script>", 1)).toThrow("HTML tags");
    });

    it("should reject HTML tags in respondent", () => {
      // Arrange
      const respondentField = SEND_EXCEL_CONFIG.fields[2];

      // Act & Assert
      expect(() => respondentField.validators?.[0]("<div>Test</div>", 2)).toThrow("Respondent");
      expect(() => respondentField.validators?.[0]("<div>Test</div>", 2)).toThrow("HTML tags");
    });

    it("should reject HTML tags in hearing type", () => {
      // Arrange
      const hearingTypeField = SEND_EXCEL_CONFIG.fields[3];

      // Act & Assert
      expect(() => hearingTypeField.validators?.[0]("<p>Type</p>", 3)).toThrow("Hearing Type");
      expect(() => hearingTypeField.validators?.[0]("<p>Type</p>", 3)).toThrow("HTML tags");
    });

    it("should reject HTML tags in venue", () => {
      // Arrange
      const venueField = SEND_EXCEL_CONFIG.fields[4];

      // Act & Assert
      expect(() => venueField.validators?.[0]("<span>Room 1</span>", 4)).toThrow("Venue");
      expect(() => venueField.validators?.[0]("<span>Room 1</span>", 4)).toThrow("HTML tags");
    });

    it("should reject HTML tags in time estimate", () => {
      // Arrange
      const timeEstimateField = SEND_EXCEL_CONFIG.fields[5];

      // Act & Assert
      expect(() => timeEstimateField.validators?.[0]("<b>2 hours</b>", 5)).toThrow("Time Estimate");
      expect(() => timeEstimateField.validators?.[0]("<b>2 hours</b>", 5)).toThrow("HTML tags");
    });

    it("should accept valid text without HTML tags", () => {
      // Arrange
      const fields = [
        SEND_EXCEL_CONFIG.fields[1], // caseReferenceNumber
        SEND_EXCEL_CONFIG.fields[2], // respondent
        SEND_EXCEL_CONFIG.fields[3], // hearingType
        SEND_EXCEL_CONFIG.fields[4], // venue
        SEND_EXCEL_CONFIG.fields[5] // timeEstimate
      ];

      const validValues = ["SEND/2026/001", "Birmingham City Council", "Case Management Hearing", "Royal Courts of Justice", "2 hours"];

      // Act & Assert
      for (let i = 0; i < fields.length; i++) {
        expect(() => fields[i].validators?.[0](validValues[i], 1)).not.toThrow();
      }
    });
  });

  describe("configuration settings", () => {
    it("should require at least one row", () => {
      // Assert
      expect(SEND_EXCEL_CONFIG.minRows).toBe(1);
    });

    it("should have validators for all fields", () => {
      // Assert
      for (const field of SEND_EXCEL_CONFIG.fields) {
        expect(field.validators).toBeDefined();
        expect(field.validators!.length).toBeGreaterThan(0);
      }
    });
  });
});
