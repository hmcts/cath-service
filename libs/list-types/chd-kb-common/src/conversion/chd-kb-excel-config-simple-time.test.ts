import { convertExcelToJson } from "@hmcts/list-types-common";
import * as ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { CHD_KB_EXCEL_CONFIG_SIMPLE_TIME } from "./chd-kb-excel-config.js";

async function createExcelBuffer(data: unknown[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Sheet1");
  for (const row of data) {
    worksheet.addRow(row);
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

const HEADERS = ["Judge", "Time", "Venue", "Type", "Case Number", "Case Name", "Additional Information"];

describe("CHD_KB_EXCEL_CONFIG_SIMPLE_TIME", () => {
  it("should have the correct field structure in ChD/KB order", () => {
    expect(CHD_KB_EXCEL_CONFIG_SIMPLE_TIME.fields).toHaveLength(7);
    expect(CHD_KB_EXCEL_CONFIG_SIMPLE_TIME.fields.map((f) => f.fieldName)).toEqual([
      "judge",
      "time",
      "venue",
      "type",
      "caseNumber",
      "caseName",
      "additionalInformation"
    ]);
  });

  it("should mark only additionalInformation as optional", () => {
    for (const field of CHD_KB_EXCEL_CONFIG_SIMPLE_TIME.fields) {
      expect(field.required).toBe(field.fieldName !== "additionalInformation");
    }
  });

  it("should allow minRows of 0", () => {
    expect(CHD_KB_EXCEL_CONFIG_SIMPLE_TIME.minRows).toBe(0);
  });

  it("should convert valid ChD/KB data successfully", async () => {
    const buffer = await createExcelBuffer([
      HEADERS,
      ["Mr Justice Smith", "10:30am", "Court 1", "Trial", "CR-2026-000123", "Acme v Widgets", "Listed for 1 day"]
    ]);

    const result = await convertExcelToJson(buffer, CHD_KB_EXCEL_CONFIG_SIMPLE_TIME);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      judge: "Mr Justice Smith",
      time: "10:30am",
      venue: "Court 1",
      type: "Trial",
      caseNumber: "CR-2026-000123",
      caseName: "Acme v Widgets",
      additionalInformation: "Listed for 1 day"
    });
  });

  it("should accept an empty additional information cell", async () => {
    const buffer = await createExcelBuffer([HEADERS, ["Mr Justice Smith", "2pm", "Court 2", "Hearing", "CR-2026-000456", "Beta v Gamma", ""]]);

    const result = await convertExcelToJson(buffer, CHD_KB_EXCEL_CONFIG_SIMPLE_TIME);

    expect(result[0].additionalInformation).toBe("");
  });

  it("should reject an invalid time format", async () => {
    const buffer = await createExcelBuffer([HEADERS, ["Mr Justice Smith", "14:30", "Court 1", "Trial", "CR-2026-000123", "Acme v Widgets", ""]]);

    await expect(convertExcelToJson(buffer, CHD_KB_EXCEL_CONFIG_SIMPLE_TIME)).rejects.toThrow(/Invalid time format/);
  });

  it("should reject HTML tags in the case name field", async () => {
    const buffer = await createExcelBuffer([HEADERS, ["Mr Justice Smith", "10am", "Court 1", "Trial", "CR-2026-000123", "<script>alert('x')</script>", ""]]);

    await expect(convertExcelToJson(buffer, CHD_KB_EXCEL_CONFIG_SIMPLE_TIME)).rejects.toThrow(/HTML tags are not allowed/);
  });
});
