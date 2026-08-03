import { convertExcelToJson, hasConverterForListTypeName } from "@hmcts/list-types-common";
import * as ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG } from "./companies-winding-up-chd-daily-cause-list-config.js";

async function createExcelBuffer(data: unknown[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sheet1");

  for (const row of data) {
    worksheet.addRow(row);
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

const HEADERS = ["Judge", "Time", "Venue", "Type", "Case Number", "Case Name", "Additional Information"];

describe("COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG", () => {
  it("should have the correct field structure", () => {
    expect(COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG.fields).toHaveLength(7);
    expect(COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG.fields.map((f) => f.fieldName)).toEqual([
      "judge",
      "time",
      "venue",
      "type",
      "caseNumber",
      "caseName",
      "additionalInformation"
    ]);
  });

  it("should mark additionalInformation as optional", () => {
    const additionalInfoField = COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG.fields.find((f) => f.fieldName === "additionalInformation");
    expect(additionalInfoField?.required).toBe(false);
  });

  it("should mark all other fields as required", () => {
    const requiredFields = COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG.fields.filter((f) => f.fieldName !== "additionalInformation");
    for (const field of requiredFields) {
      expect(field.required).toBe(true);
    }
  });

  it("should require at least 1 data row", () => {
    expect(COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG.minRows).toBe(1);
  });

  it("should be registered under the correct list type name", () => {
    expect(hasConverterForListTypeName("COMPANIES_WINDING_UP_CHD_DAILY_CAUSE_LIST")).toBe(true);
  });

  describe("missing column validation", () => {
    it("should reject a sheet missing a required column", async () => {
      const data = [
        ["Judge", "Time", "Venue", "Type", "Case Number", "Case Name"],
        ["Judge A", "9am", "Venue A", "Type A", "12345", "Case name A"]
      ];
      const buffer = await createExcelBuffer(data);
      await expect(convertExcelToJson(buffer, COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG)).rejects.toThrow(/Excel file must contain columns/);
    });
  });

  describe("empty required cell validation", () => {
    it("should reject a row with an empty required cell", async () => {
      const data = [HEADERS, ["", "9am", "Venue A", "Type A", "12345", "Case name A", ""]];
      const buffer = await createExcelBuffer(data);
      await expect(convertExcelToJson(buffer, COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG)).rejects.toThrow(/Missing required field 'Judge'/);
    });
  });

  describe("time validation", () => {
    it("should accept valid time formats with minutes", async () => {
      const data = [HEADERS, ["Judge A", "10:30pm", "Venue A", "Type A", "12345", "Case name A", ""]];
      const buffer = await createExcelBuffer(data);
      const result = await convertExcelToJson(buffer, COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG);
      expect(result).toHaveLength(1);
      expect(result[0].time).toBe("10:30pm");
    });

    it("should accept time format with dot separator", async () => {
      const data = [HEADERS, ["Judge A", "10.30am", "Venue A", "Type A", "12345", "Case name A", ""]];
      const buffer = await createExcelBuffer(data);
      const result = await convertExcelToJson(buffer, COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG);
      expect(result).toHaveLength(1);
      expect(result[0].time).toBe("10.30am");
    });

    it("should accept time format without minutes", async () => {
      const data = [HEADERS, ["Judge A", "9am", "Venue A", "Type A", "12345", "Case name A", ""]];
      const buffer = await createExcelBuffer(data);
      const result = await convertExcelToJson(buffer, COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG);
      expect(result).toHaveLength(1);
      expect(result[0].time).toBe("9am");
    });

    it("should reject a time without an am/pm suffix", async () => {
      const data = [HEADERS, ["Judge A", "10:30", "Venue A", "Type A", "12345", "Case name A", ""]];
      const buffer = await createExcelBuffer(data);
      await expect(convertExcelToJson(buffer, COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG)).rejects.toThrow(/Invalid time format/);
    });

    it("should reject 24-hour time format", async () => {
      const data = [HEADERS, ["Judge A", "14:30", "Venue A", "Type A", "12345", "Case name A", ""]];
      const buffer = await createExcelBuffer(data);
      await expect(convertExcelToJson(buffer, COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG)).rejects.toThrow(/Invalid time format/);
    });
  });

  describe("HTML tag validation", () => {
    it("should reject HTML tags in judge field", async () => {
      const data = [HEADERS, ["<b>Judge A</b>", "9am", "Venue A", "Type A", "12345", "Case name A", ""]];
      const buffer = await createExcelBuffer(data);
      await expect(convertExcelToJson(buffer, COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG)).rejects.toThrow(/HTML tags are not allowed/);
    });

    it("should reject HTML tags in venue field", async () => {
      const data = [HEADERS, ["Judge A", "9am", "<script>alert('xss')</script>", "Type A", "12345", "Case name A", ""]];
      const buffer = await createExcelBuffer(data);
      await expect(convertExcelToJson(buffer, COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG)).rejects.toThrow(/HTML tags are not allowed/);
    });

    it("should reject HTML tags in type field", async () => {
      const data = [HEADERS, ["Judge A", "9am", "Venue A", "<i>Type A</i>", "12345", "Case name A", ""]];
      const buffer = await createExcelBuffer(data);
      await expect(convertExcelToJson(buffer, COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG)).rejects.toThrow(/HTML tags are not allowed/);
    });

    it("should reject HTML tags in case number field", async () => {
      const data = [HEADERS, ["Judge A", "9am", "Venue A", "Type A", "<b>12345</b>", "Case name A", ""]];
      const buffer = await createExcelBuffer(data);
      await expect(convertExcelToJson(buffer, COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG)).rejects.toThrow(/HTML tags are not allowed/);
    });

    it("should reject HTML tags in case name field", async () => {
      const data = [HEADERS, ["Judge A", "9am", "Venue A", "Type A", "12345", "<div>Case name A</div>", ""]];
      const buffer = await createExcelBuffer(data);
      await expect(convertExcelToJson(buffer, COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG)).rejects.toThrow(/HTML tags are not allowed/);
    });

    it("should reject HTML tags in additional information field", async () => {
      const data = [HEADERS, ["Judge A", "9am", "Venue A", "Type A", "12345", "Case name A", "<script>alert('xss')</script>"]];
      const buffer = await createExcelBuffer(data);
      await expect(convertExcelToJson(buffer, COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG)).rejects.toThrow(/HTML tags are not allowed/);
    });
  });

  it("should handle a blank optional additionalInformation cell", async () => {
    const data = [HEADERS, ["Judge A", "9am", "Venue A", "Type A", "12345", "Case name A", ""]];
    const buffer = await createExcelBuffer(data);
    const result = await convertExcelToJson(buffer, COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG);
    expect(result).toHaveLength(1);
    expect(result[0].additionalInformation).toBe("");
  });

  it("should convert a valid sheet to the exact JSON shape and order", async () => {
    const data = [
      HEADERS,
      ["Judge A", "9am", "Venue A", "Type A", "12345", "Case name A", "This is additional information"],
      ["Judge B", "10:30pm", "Venue B", "Type B", "12346", "Case name B", "This is another additional information"]
    ];
    const buffer = await createExcelBuffer(data);
    const result = await convertExcelToJson(buffer, COMPANIES_WINDING_UP_CHD_EXCEL_CONFIG);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      judge: "Judge A",
      time: "9am",
      venue: "Venue A",
      type: "Type A",
      caseNumber: "12345",
      caseName: "Case name A",
      additionalInformation: "This is additional information"
    });
    expect(result[1]).toEqual({
      judge: "Judge B",
      time: "10:30pm",
      venue: "Venue B",
      type: "Type B",
      caseNumber: "12346",
      caseName: "Case name B",
      additionalInformation: "This is another additional information"
    });
  });
});
