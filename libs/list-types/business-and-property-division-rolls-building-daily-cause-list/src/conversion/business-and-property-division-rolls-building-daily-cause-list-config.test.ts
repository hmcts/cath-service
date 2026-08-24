import { getConverterForListTypeName, hasConverterForListTypeName } from "@hmcts/list-types-common";
import * as ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { SECTIONS } from "../sections.js";
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
