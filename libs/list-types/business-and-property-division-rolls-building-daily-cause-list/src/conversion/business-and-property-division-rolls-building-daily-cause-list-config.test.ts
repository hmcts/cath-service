import { convertExcelToJson, getConverterForListTypeName, hasConverterForListTypeName } from "@hmcts/list-types-common";
import * as ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { SECTIONS } from "../sections.js";
import { STANDARD_CONFIG } from "./business-and-property-division-rolls-building-daily-cause-list-config.js";
import "./business-and-property-division-rolls-building-daily-cause-list-config.js";

const LIST_TYPE_NAME = "BUSINESS_AND_PROPERTY_DIVISION_ROLLS_BUILDING_DAILY_CAUSE_LIST";
const HEADERS = ["Judge", "Time", "Venue", "Type", "Case Number", "Case Name", "Additional Information"];

async function createWorkbook(sheets: { name: string; rows: unknown[][] }[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name);
    for (const row of sheet.rows) {
      worksheet.addRow(row);
    }
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe("Business and Property Division Rolls Building converter registration", () => {
  it("should register a converter under the stable list type name", () => {
    expect(hasConverterForListTypeName(LIST_TYPE_NAME)).toBe(true);
  });

  it("should convert a 16-tab workbook into a section-keyed object", async () => {
    const buffer = await createWorkbook(
      SECTIONS.map((section, index) => ({
        name: section.en,
        rows: [HEADERS, ["Mr Justice Smith", "10am", `Court ${index + 1}`, "Trial", `CR-2026-${index}`, `Case ${section.key}`, ""]]
      }))
    );

    const converter = getConverterForListTypeName(LIST_TYPE_NAME);
    const result = (await converter?.convertExcelToJson(buffer)) as unknown as Record<string, unknown[]>;

    for (const section of SECTIONS) {
      expect(result[section.key]).toHaveLength(1);
      expect((result[section.key][0] as { caseName: string }).caseName).toBe(`Case ${section.key}`);
    }
  });

  it("should yield an empty array for a missing section tab", async () => {
    const buffer = await createWorkbook([
      { name: SECTIONS[0].en, rows: [HEADERS, ["Mr Justice Smith", "10am", "Court 1", "Trial", "CR-2026-1", "Acme v Widgets", ""]] }
    ]);

    const converter = getConverterForListTypeName(LIST_TYPE_NAME);
    const result = (await converter?.convertExcelToJson(buffer)) as unknown as Record<string, unknown[]>;

    expect(result[SECTIONS[0].key]).toHaveLength(1);
    expect(result[SECTIONS[1].key]).toHaveLength(0);
  });

  it("should reject a workbook whose only tab matches no section name instead of filing it into Appeal List", async () => {
    const buffer = await createWorkbook([
      { name: "Sheet 1", rows: [HEADERS, ["Mr Justice Smith", "10am", "Court 1", "Trial", "CR-2026-1", "Acme v Widgets", ""]] }
    ]);

    const converter = getConverterForListTypeName(LIST_TYPE_NAME);

    await expect(converter?.convertExcelToJson(buffer)).rejects.toThrow("Excel file has no recognised worksheet tabs");
  });
});

describe("STANDARD_CONFIG", () => {
  it("should have the 7 ChD/KB fields in order", () => {
    expect(STANDARD_CONFIG.fields).toHaveLength(7);
    expect(STANDARD_CONFIG.fields.map((f) => f.fieldName)).toEqual(["judge", "time", "venue", "type", "caseNumber", "caseName", "additionalInformation"]);
  });

  it("should mark only additionalInformation as optional", () => {
    for (const field of STANDARD_CONFIG.fields) {
      expect(field.required).toBe(field.fieldName !== "additionalInformation");
    }
  });

  it("should allow empty section sheets with minRows of 0", () => {
    expect(STANDARD_CONFIG.minRows).toBe(0);
  });

  it("should accept an empty additional information cell", async () => {
    const buffer = await createWorkbook([
      { name: "Sheet1", rows: [HEADERS, ["Mr Justice Smith", "2pm", "Court 2", "Hearing", "CR-2026-000456", "Beta v Gamma", ""]] }
    ]);

    const result = await convertExcelToJson(buffer, STANDARD_CONFIG);

    expect(result[0].additionalInformation).toBe("");
  });

  it("should reject an invalid time format", async () => {
    const buffer = await createWorkbook([
      { name: "Sheet1", rows: [HEADERS, ["Mr Justice Smith", "14:30", "Court 1", "Trial", "CR-2026-000123", "Acme v Widgets", ""]] }
    ]);

    await expect(convertExcelToJson(buffer, STANDARD_CONFIG)).rejects.toThrow(/Invalid time format/);
  });

  it("should reject HTML tags in the case name field", async () => {
    const buffer = await createWorkbook([
      { name: "Sheet1", rows: [HEADERS, ["Mr Justice Smith", "10am", "Court 1", "Trial", "CR-2026-000123", "<script>alert('x')</script>", ""]] }
    ]);

    await expect(convertExcelToJson(buffer, STANDARD_CONFIG)).rejects.toThrow(/HTML tags are not allowed/);
  });
});
