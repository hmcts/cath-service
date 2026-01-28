import { convertExcelToJson } from "@hmcts/list-types-common";
import * as ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { STANDARD_CONFIG } from "./london-administrative-court-daily-cause-list-config.js";

async function createExcelBuffer(data: unknown[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sheet1");

  for (const row of data) {
    worksheet.addRow(row);
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("STANDARD_CONFIG", () => {
  it("should have the correct field structure", () => {
    expect(STANDARD_CONFIG.fields).toHaveLength(7);
    expect(STANDARD_CONFIG.fields.map((f) => f.fieldName)).toEqual([
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
    const additionalInfoField = STANDARD_CONFIG.fields.find((f) => f.fieldName === "additionalInformation");
    expect(additionalInfoField?.required).toBe(false);
  });

  it("should mark all other fields as required", () => {
    const requiredFields = STANDARD_CONFIG.fields.filter((f) => f.fieldName !== "additionalInformation");
    for (const field of requiredFields) {
      expect(field.required).toBe(true);
    }
  });

  it("should allow minRows of 0", () => {
    expect(STANDARD_CONFIG.minRows).toBe(0);
  });

  describe("time validation", () => {
    it("should accept valid time formats with minutes", async () => {
      const data = [
        ["Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information"],
        ["Court 1", "Mr Justice Smith", "10:30am", "CO/2025/001", "Test v Test", "Judicial review", ""]
      ];
      const buffer = await createExcelBuffer(data);
      const result = await convertExcelToJson(buffer, STANDARD_CONFIG);
      expect(result).toHaveLength(1);
      expect(result[0].time).toBe("10:30am");
    });

    it("should accept time format with dot separator", async () => {
      const data = [
        ["Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information"],
        ["Court 1", "Mr Justice Smith", "10.30am", "CO/2025/001", "Test v Test", "Judicial review", ""]
      ];
      const buffer = await createExcelBuffer(data);
      const result = await convertExcelToJson(buffer, STANDARD_CONFIG);
      expect(result).toHaveLength(1);
      expect(result[0].time).toBe("10.30am");
    });

    it("should accept time format without minutes", async () => {
      const data = [
        ["Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information"],
        ["Court 1", "Mr Justice Smith", "9am", "CO/2025/001", "Test v Test", "Judicial review", ""]
      ];
      const buffer = await createExcelBuffer(data);
      const result = await convertExcelToJson(buffer, STANDARD_CONFIG);
      expect(result).toHaveLength(1);
      expect(result[0].time).toBe("9am");
    });

    it("should accept PM times", async () => {
      const data = [
        ["Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information"],
        ["Court 1", "Mr Justice Smith", "2:15pm", "CO/2025/001", "Test v Test", "Judicial review", ""]
      ];
      const buffer = await createExcelBuffer(data);
      const result = await convertExcelToJson(buffer, STANDARD_CONFIG);
      expect(result).toHaveLength(1);
      expect(result[0].time).toBe("2:15pm");
    });

    it("should reject invalid time format", async () => {
      const data = [
        ["Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information"],
        ["Court 1", "Mr Justice Smith", "10:30", "CO/2025/001", "Test v Test", "Judicial review", ""]
      ];
      const buffer = await createExcelBuffer(data);
      await expect(convertExcelToJson(buffer, STANDARD_CONFIG)).rejects.toThrow(/Invalid time format/);
    });

    it("should reject 24-hour time format", async () => {
      const data = [
        ["Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information"],
        ["Court 1", "Mr Justice Smith", "14:30", "CO/2025/001", "Test v Test", "Judicial review", ""]
      ];
      const buffer = await createExcelBuffer(data);
      await expect(convertExcelToJson(buffer, STANDARD_CONFIG)).rejects.toThrow(/Invalid time format/);
    });
  });

  describe("HTML tag validation", () => {
    it("should reject HTML tags in venue field", async () => {
      const data = [
        ["Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information"],
        ["<script>alert('xss')</script>", "Mr Justice Smith", "10am", "CO/2025/001", "Test v Test", "Judicial review", ""]
      ];
      const buffer = await createExcelBuffer(data);
      await expect(convertExcelToJson(buffer, STANDARD_CONFIG)).rejects.toThrow(/HTML tags are not allowed/);
    });

    it("should reject HTML tags in judge field", async () => {
      const data = [
        ["Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information"],
        ["Court 1", "<b>Mr Justice Smith</b>", "10am", "CO/2025/001", "Test v Test", "Judicial review", ""]
      ];
      const buffer = await createExcelBuffer(data);
      await expect(convertExcelToJson(buffer, STANDARD_CONFIG)).rejects.toThrow(/HTML tags are not allowed/);
    });

    it("should reject HTML tags in case details field", async () => {
      const data = [
        ["Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information"],
        ["Court 1", "Mr Justice Smith", "10am", "CO/2025/001", "<div>Test v Test</div>", "Judicial review", ""]
      ];
      const buffer = await createExcelBuffer(data);
      await expect(convertExcelToJson(buffer, STANDARD_CONFIG)).rejects.toThrow(/HTML tags are not allowed/);
    });
  });

  it("should convert valid Excel data successfully", async () => {
    const data = [
      ["Venue", "Judge", "Time", "Case Number", "Case Details", "Hearing Type", "Additional Information"],
      ["Court 1", "Mr Justice Smith", "10:30am", "CO/2025/000123", "R (Claimant) v Secretary of State", "Judicial review", "Listed for 1 day"],
      ["Court 2", "Mrs Justice Jones", "2pm", "CO/2025/000456", "Smith v Home Office", "Permission hearing", ""]
    ];
    const buffer = await createExcelBuffer(data);
    const result = await convertExcelToJson(buffer, STANDARD_CONFIG);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      venue: "Court 1",
      judge: "Mr Justice Smith",
      time: "10:30am",
      caseNumber: "CO/2025/000123",
      caseDetails: "R (Claimant) v Secretary of State",
      hearingType: "Judicial review",
      additionalInformation: "Listed for 1 day"
    });
    expect(result[1]).toEqual({
      venue: "Court 2",
      judge: "Mrs Justice Jones",
      time: "2pm",
      caseNumber: "CO/2025/000456",
      caseDetails: "Smith v Home Office",
      hearingType: "Permission hearing",
      additionalInformation: ""
    });
  });
});
