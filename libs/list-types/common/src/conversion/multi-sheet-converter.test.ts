import * as ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { type ExcelConverterConfig, validateNoHtmlTags } from "./excel-to-json.js";
import { createMultiSheetConverter, type SheetConfig } from "./multi-sheet-converter.js";
import { validateTimeFormatSimple } from "./validators.js";

const HEADERS = ["Judge", "Time", "Venue", "Type", "Case Number", "Case Name", "Additional Information"];
const ROW = ["Mr Justice Smith", "10am", "Court 1", "Trial", "CR-2026-1", "Acme v Widgets", ""];

// Local 7-field fixture config — the multi-sheet converter only needs *a* config to route sheets;
// it does not depend on any specific list type's config, so we avoid importing one from a sibling package.
const FIXTURE_CONFIG: ExcelConverterConfig = {
  fields: [
    { header: "Judge", fieldName: "judge", required: true, validators: [(v, r) => validateNoHtmlTags(v, "Judge", r)] },
    { header: "Time", fieldName: "time", required: true, validators: [validateTimeFormatSimple] },
    { header: "Venue", fieldName: "venue", required: true, validators: [(v, r) => validateNoHtmlTags(v, "Venue", r)] },
    { header: "Type", fieldName: "type", required: true, validators: [(v, r) => validateNoHtmlTags(v, "Type", r)] },
    { header: "Case Number", fieldName: "caseNumber", required: true, validators: [(v, r) => validateNoHtmlTags(v, "Case Number", r)] },
    { header: "Case Name", fieldName: "caseName", required: true, validators: [(v, r) => validateNoHtmlTags(v, "Case Name", r)] },
    {
      header: "Additional Information",
      fieldName: "additionalInformation",
      required: false,
      validators: [(v, r) => validateNoHtmlTags(v, "Additional Information", r)]
    }
  ],
  minRows: 0
};

const SHEETS: SheetConfig[] = [
  { worksheetName: "Appeal List", worksheetIndex: 0, dataKey: "appealList", config: FIXTURE_CONFIG },
  { worksheetName: "Financial List", worksheetIndex: 1, dataKey: "financialList", config: FIXTURE_CONFIG }
];

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

describe("createMultiSheetConverter", () => {
  describe("matchByNameOnly: true", () => {
    it("should route each named tab to its section", async () => {
      // Arrange
      const buffer = await createWorkbook([
        { name: "Appeal List", rows: [HEADERS, ["Judge A", "10am", "Court 1", "Trial", "CR-1", "Appeal case", ""]] },
        { name: "Financial List", rows: [HEADERS, ["Judge B", "2pm", "Court 2", "Trial", "CR-2", "Financial case", ""]] }
      ]);

      // Act
      const result = await createMultiSheetConverter(buffer, SHEETS, { matchByNameOnly: true });

      // Assert
      expect(result.appealList).toHaveLength(1);
      expect((result.appealList[0] as { caseName: string }).caseName).toBe("Appeal case");
      expect(result.financialList).toHaveLength(1);
      expect((result.financialList[0] as { caseName: string }).caseName).toBe("Financial case");
    });

    it("should throw when no tab matches any expected section name", async () => {
      // Arrange — the reported bug: a single sheet named "Sheet 1" matched nothing and was
      // silently filed into the first section (Appeal List) via the positional-index fallback.
      const buffer = await createWorkbook([{ name: "Sheet 1", rows: [HEADERS, ROW] }]);

      // Act & Assert
      await expect(createMultiSheetConverter(buffer, SHEETS, { matchByNameOnly: true })).rejects.toThrow(
        "Excel file has no recognised worksheet tabs. Expected tabs named: Appeal List, Financial List"
      );
    });

    it("should yield an empty section for a genuinely-missing tab when at least one matches", async () => {
      // Arrange — Financial List present, Appeal List absent.
      const buffer = await createWorkbook([{ name: "Financial List", rows: [HEADERS, ROW] }]);

      // Act
      const result = await createMultiSheetConverter(buffer, SHEETS, { matchByNameOnly: true });

      // Assert
      expect(result.financialList).toHaveLength(1);
      expect(result.appealList).toHaveLength(0);
    });

    it("should match a section whose name exceeds Excel's 31-char tab-name limit", async () => {
      // Arrange — Excel truncates tab names to 31 chars, so this section is stored truncated.
      const longName = "Intellectual Property and Enterprise Court"; // 42 chars
      const sheets: SheetConfig[] = [{ worksheetName: longName, worksheetIndex: 0, dataKey: "ipec", config: FIXTURE_CONFIG }];
      const buffer = await createWorkbook([{ name: longName, rows: [HEADERS, ROW] }]);

      // Act
      const result = await createMultiSheetConverter(buffer, sheets, { matchByNameOnly: true });

      // Assert
      expect(result.ipec).toHaveLength(1);
    });
  });

  describe("default behaviour (positional-index fallback)", () => {
    it("should fall back to the positional index when a tab name is not found", async () => {
      // Arrange — one unmatched sheet; index 0 fallback routes it into the first section.
      const buffer = await createWorkbook([{ name: "Sheet 1", rows: [HEADERS, ROW] }]);

      // Act
      const result = await createMultiSheetConverter(buffer, SHEETS);

      // Assert — preserves existing behaviour for the other multi-tab list types.
      expect(result.appealList).toHaveLength(1);
      expect(result.financialList).toHaveLength(0);
    });
  });

  it("should throw when the workbook has no worksheets at all", async () => {
    // Arrange
    const workbook = new ExcelJS.Workbook();
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    // Act & Assert
    await expect(createMultiSheetConverter(buffer, SHEETS, { matchByNameOnly: true })).rejects.toThrow("Excel file must contain at least one worksheet");
  });
});
