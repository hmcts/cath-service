import { convertExcelToJson } from "@hmcts/list-types-common";
import * as ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { DAILY_HEARINGS_CONFIG, FUTURE_JUDGMENTS_CONFIG } from "./court-of-appeal-civil-daily-cause-list-config.js";

async function createExcelBuffer(data: unknown[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sheet1");

  for (const row of data) {
    worksheet.addRow(row);
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("DAILY_HEARINGS_CONFIG", () => {
  it("should have the correct field structure", () => {
    expect(DAILY_HEARINGS_CONFIG.fields).toHaveLength(7);
    expect(DAILY_HEARINGS_CONFIG.fields.map((f) => f.fieldName)).toEqual([
      "venue",
      "judge",
      "time",
      "caseNumber",
      "caseDetails",
      "hearingType",
      "additionalInformation"
    ]);
  });

  it("should mark additionalInformation as optional", () => {
    const additionalInfoField = DAILY_HEARINGS_CONFIG.fields.find((f) => f.fieldName === "additionalInformation");
    expect(additionalInfoField?.required).toBe(false);
  });

  it("should mark all other fields as required", () => {
    const requiredFields = DAILY_HEARINGS_CONFIG.fields.filter((f) => f.fieldName !== "additionalInformation");
    for (const field of requiredFields) {
      expect(field.required).toBe(true);
    }
  });

  it("should allow minRows of 0", () => {
    expect(DAILY_HEARINGS_CONFIG.minRows).toBe(0);
  });

  describe("time validation", () => {
    it("should accept valid time formats with minutes", async () => {
      const data = [
        ["Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information"],
        ["Court 71", "Lord Justice Smith", "10:30am", "CA-2025-001", "Test v Test", "Appeal", ""]
      ];
      const buffer = await createExcelBuffer(data);
      const result = await convertExcelToJson(buffer, DAILY_HEARINGS_CONFIG);
      expect(result).toHaveLength(1);
      expect(result[0].time).toBe("10:30am");
    });

    it("should accept time format with dot separator", async () => {
      const data = [
        ["Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information"],
        ["Court 71", "Lord Justice Smith", "10.30am", "CA-2025-001", "Test v Test", "Appeal", ""]
      ];
      const buffer = await createExcelBuffer(data);
      const result = await convertExcelToJson(buffer, DAILY_HEARINGS_CONFIG);
      expect(result).toHaveLength(1);
      expect(result[0].time).toBe("10.30am");
    });

    it("should accept time format without minutes", async () => {
      const data = [
        ["Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information"],
        ["Court 71", "Lord Justice Smith", "9am", "CA-2025-001", "Test v Test", "Appeal", ""]
      ];
      const buffer = await createExcelBuffer(data);
      const result = await convertExcelToJson(buffer, DAILY_HEARINGS_CONFIG);
      expect(result).toHaveLength(1);
      expect(result[0].time).toBe("9am");
    });

    it("should accept PM times", async () => {
      const data = [
        ["Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information"],
        ["Court 71", "Lord Justice Smith", "2:15pm", "CA-2025-001", "Test v Test", "Appeal", ""]
      ];
      const buffer = await createExcelBuffer(data);
      const result = await convertExcelToJson(buffer, DAILY_HEARINGS_CONFIG);
      expect(result).toHaveLength(1);
      expect(result[0].time).toBe("2:15pm");
    });

    it("should reject invalid time format", async () => {
      const data = [
        ["Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information"],
        ["Court 71", "Lord Justice Smith", "10:30", "CA-2025-001", "Test v Test", "Appeal", ""]
      ];
      const buffer = await createExcelBuffer(data);
      await expect(convertExcelToJson(buffer, DAILY_HEARINGS_CONFIG)).rejects.toThrow(/Invalid time format/);
    });

    it("should reject 24-hour time format", async () => {
      const data = [
        ["Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information"],
        ["Court 71", "Lord Justice Smith", "14:30", "CA-2025-001", "Test v Test", "Appeal", ""]
      ];
      const buffer = await createExcelBuffer(data);
      await expect(convertExcelToJson(buffer, DAILY_HEARINGS_CONFIG)).rejects.toThrow(/Invalid time format/);
    });
  });

  describe("HTML tag validation", () => {
    it("should reject HTML tags in venue field", async () => {
      const data = [
        ["Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information"],
        ["<script>alert('xss')</script>", "Lord Justice Smith", "10am", "CA-2025-001", "Test v Test", "Appeal", ""]
      ];
      const buffer = await createExcelBuffer(data);
      await expect(convertExcelToJson(buffer, DAILY_HEARINGS_CONFIG)).rejects.toThrow(/HTML tags are not allowed/);
    });

    it("should reject HTML tags in judge field", async () => {
      const data = [
        ["Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information"],
        ["Court 71", "<b>Lord Justice Smith</b>", "10am", "CA-2025-001", "Test v Test", "Appeal", ""]
      ];
      const buffer = await createExcelBuffer(data);
      await expect(convertExcelToJson(buffer, DAILY_HEARINGS_CONFIG)).rejects.toThrow(/HTML tags are not allowed/);
    });

    it("should reject HTML tags in case details field", async () => {
      const data = [
        ["Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information"],
        ["Court 71", "Lord Justice Smith", "10am", "CA-2025-001", "<div>Test v Test</div>", "Appeal", ""]
      ];
      const buffer = await createExcelBuffer(data);
      await expect(convertExcelToJson(buffer, DAILY_HEARINGS_CONFIG)).rejects.toThrow(/HTML tags are not allowed/);
    });
  });

  it("should convert valid Excel data successfully", async () => {
    const data = [
      ["Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information"],
      ["Court 71", "Lord Justice Smith", "10:30am", "CA-2025-000123", "Appellant v Respondent", "Appeal hearing", "Reserved judgment"],
      ["Court 72", "Lady Justice Jones", "2pm", "CA-2025-000456", "Smith v Jones", "Permission hearing", ""]
    ];
    const buffer = await createExcelBuffer(data);
    const result = await convertExcelToJson(buffer, DAILY_HEARINGS_CONFIG);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      venue: "Court 71",
      judge: "Lord Justice Smith",
      time: "10:30am",
      caseNumber: "CA-2025-000123",
      caseDetails: "Appellant v Respondent",
      hearingType: "Appeal hearing",
      additionalInformation: "Reserved judgment"
    });
    expect(result[1]).toEqual({
      venue: "Court 72",
      judge: "Lady Justice Jones",
      time: "2pm",
      caseNumber: "CA-2025-000456",
      caseDetails: "Smith v Jones",
      hearingType: "Permission hearing",
      additionalInformation: ""
    });
  });
});

describe("FUTURE_JUDGMENTS_CONFIG", () => {
  it("should have the correct field structure with date field first", () => {
    expect(FUTURE_JUDGMENTS_CONFIG.fields).toHaveLength(8);
    expect(FUTURE_JUDGMENTS_CONFIG.fields.map((f) => f.fieldName)).toEqual([
      "date",
      "venue",
      "judge",
      "time",
      "caseNumber",
      "caseDetails",
      "hearingType",
      "additionalInformation"
    ]);
  });

  it("should mark additionalInformation as optional", () => {
    const additionalInfoField = FUTURE_JUDGMENTS_CONFIG.fields.find((f) => f.fieldName === "additionalInformation");
    expect(additionalInfoField?.required).toBe(false);
  });

  it("should mark all other fields as required", () => {
    const requiredFields = FUTURE_JUDGMENTS_CONFIG.fields.filter((f) => f.fieldName !== "additionalInformation");
    for (const field of requiredFields) {
      expect(field.required).toBe(true);
    }
  });

  it("should allow minRows of 0", () => {
    expect(FUTURE_JUDGMENTS_CONFIG.minRows).toBe(0);
  });

  describe("date validation", () => {
    it("should accept valid date format dd/MM/yyyy", async () => {
      const data = [
        ["Date", "Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information"],
        ["15/01/2025", "Court 71", "Lord Justice Smith", "10am", "CA-2025-001", "Test v Test", "Judgment", ""]
      ];
      const buffer = await createExcelBuffer(data);
      const result = await convertExcelToJson(buffer, FUTURE_JUDGMENTS_CONFIG);
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe("15/01/2025");
    });

    it("should reject invalid date format", async () => {
      const data = [
        ["Date", "Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information"],
        ["2025-01-15", "Court 71", "Lord Justice Smith", "10am", "CA-2025-001", "Test v Test", "Judgment", ""]
      ];
      const buffer = await createExcelBuffer(data);
      await expect(convertExcelToJson(buffer, FUTURE_JUDGMENTS_CONFIG)).rejects.toThrow(/Invalid date format/);
    });

    it("should reject date with single digit day", async () => {
      const data = [
        ["Date", "Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information"],
        ["5/01/2025", "Court 71", "Lord Justice Smith", "10am", "CA-2025-001", "Test v Test", "Judgment", ""]
      ];
      const buffer = await createExcelBuffer(data);
      await expect(convertExcelToJson(buffer, FUTURE_JUDGMENTS_CONFIG)).rejects.toThrow(/Invalid date format/);
    });

    it("should reject impossible dates", async () => {
      const data = [
        ["Date", "Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information"],
        ["32/01/2025", "Court 71", "Lord Justice Smith", "10am", "CA-2025-001", "Test v Test", "Judgment", ""]
      ];
      const buffer = await createExcelBuffer(data);
      await expect(convertExcelToJson(buffer, FUTURE_JUDGMENTS_CONFIG)).rejects.toThrow(/Date does not exist/);
    });
  });

  it("should convert valid Excel data with date successfully", async () => {
    const data = [
      ["Date", "Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information"],
      ["20/01/2025", "Court 71", "Lord Justice Smith", "10:30am", "CA-2025-000789", "Test judgment case", "Judgment", "Reserved"]
    ];
    const buffer = await createExcelBuffer(data);
    const result = await convertExcelToJson(buffer, FUTURE_JUDGMENTS_CONFIG);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      date: "20/01/2025",
      venue: "Court 71",
      judge: "Lord Justice Smith",
      time: "10:30am",
      caseNumber: "CA-2025-000789",
      caseDetails: "Test judgment case",
      hearingType: "Judgment",
      additionalInformation: "Reserved"
    });
  });
});
