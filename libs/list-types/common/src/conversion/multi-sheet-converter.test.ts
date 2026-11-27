import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { type ExcelConverterConfig, validateNoHtmlTags } from "./excel-to-json.js";
import { type ExcelValidationError, isExcelFileReadError, isExcelValidationError } from "./excel-validation-error.js";
import { createMultiSheetConverter, resolveWorksheet, type SheetConfig } from "./multi-sheet-converter.js";
import { validateTimeFormatSimple } from "./validators.js";

const CONFIG: ExcelConverterConfig = {
  fields: [{ header: "Venue", fieldName: "venue", required: true }],
  minRows: 0
};

function buildWorkbook(sheetNames: string[]): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  for (const name of sheetNames) {
    const worksheet = workbook.addWorksheet(name);
    worksheet.addRow(["Venue"]);
    worksheet.addRow([`${name} venue`]);
  }
  return workbook;
}

describe("resolveWorksheet", () => {
  it("should return the worksheet matching the name", () => {
    // Arrange
    const workbook = buildWorkbook(["Other", "Planning Court"]);

    // Act
    const worksheet = resolveWorksheet(workbook, { worksheetName: "Planning Court", worksheetIndex: 0 });

    // Assert
    expect(worksheet?.name).toBe("Planning Court");
  });

  it("should fall back to the index when the name is not found", () => {
    // Arrange
    const workbook = buildWorkbook(["Sheet1", "Sheet2"]);

    // Act
    const worksheet = resolveWorksheet(workbook, { worksheetName: "Planning Court", worksheetIndex: 1 });

    // Assert
    expect(worksheet?.name).toBe("Sheet2");
  });

  it("should use the index when no name is given", () => {
    // Arrange
    const workbook = buildWorkbook(["Sheet1", "Sheet2"]);

    // Act
    const worksheet = resolveWorksheet(workbook, { worksheetIndex: 1 });

    // Assert
    expect(worksheet?.name).toBe("Sheet2");
  });

  it("should match a tab whose name differs only in case or spacing, as PIP does", () => {
    // Arrange
    const workbook = buildWorkbook(["Other", " planning   COURT "]);

    // Act
    const worksheet = resolveWorksheet(workbook, { worksheetName: "Planning Court", worksheetIndex: 0 }, true);

    // Assert
    expect(worksheet?.name).toBe(" planning   COURT ");
  });

  it("should not match a tab whose words differ from the expected name", () => {
    // Arrange
    const workbook = buildWorkbook(["Planning Courts", "PlanningCourt"]);

    // Act
    const worksheet = resolveWorksheet(workbook, { worksheetName: "Planning Court", worksheetIndex: 0 }, true);

    // Assert
    expect(worksheet).toBeUndefined();
  });

  it("should return undefined when neither name nor index resolve", () => {
    // Arrange
    const workbook = buildWorkbook(["Sheet1"]);

    // Act
    const worksheet = resolveWorksheet(workbook, { worksheetName: "Missing", worksheetIndex: 3 });

    // Assert
    expect(worksheet).toBeUndefined();
  });
});

describe("createMultiSheetConverter", () => {
  it("should convert sheets resolved by name and by index fallback", async () => {
    // Arrange
    const buffer = Buffer.from(await buildWorkbook(["Main hearings", "Second"]).xlsx.writeBuffer());

    // Act
    const result = await createMultiSheetConverter(buffer, [
      { worksheetName: "Main hearings", worksheetIndex: 0, dataKey: "main", config: CONFIG },
      { worksheetName: "Planning Court", worksheetIndex: 1, dataKey: "planning", config: CONFIG }
    ]);

    // Assert
    expect(result).toEqual({
      main: [{ venue: "Main hearings venue" }],
      planning: [{ venue: "Second venue" }]
    });
  });

  it("should leave out the key of a sheet that cannot be resolved", async () => {
    // Arrange
    const buffer = Buffer.from(await buildWorkbook(["Main hearings"]).xlsx.writeBuffer());

    // Act
    const result = await createMultiSheetConverter(buffer, [
      { worksheetName: "Main hearings", worksheetIndex: 0, dataKey: "main", config: CONFIG },
      { worksheetName: "Planning Court", worksheetIndex: 1, dataKey: "planning", config: CONFIG }
    ]);

    // Assert
    expect(result).toEqual({ main: [{ venue: "Main hearings venue" }] });
    expect(result).not.toHaveProperty("planning");
  });
});

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

    it("should leave out a genuinely-missing tab when at least one matches", async () => {
      // Arrange — Financial List present, Appeal List absent.
      const buffer = await createWorkbook([{ name: "Financial List", rows: [HEADERS, ROW] }]);

      // Act
      const result = await createMultiSheetConverter(buffer, SHEETS, { matchByNameOnly: true });

      // Assert
      expect(result.financialList).toHaveLength(1);
      expect(result).not.toHaveProperty("appealList");
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
      expect(result).not.toHaveProperty("financialList");
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

describe("createMultiSheetConverter located issues", () => {
  async function captureError(promise: Promise<unknown>): Promise<unknown> {
    try {
      await promise;
    } catch (error) {
      return error;
    }
    throw new Error("Expected the conversion to throw");
  }

  it("should combine errors from every tab in tab order, tagged with the tab name", async () => {
    // Arrange - Financial List is first in the workbook but second in the config
    const buffer = await createWorkbook([
      { name: "Financial List", rows: [HEADERS, ["Judge B", "half ten", "Court 2", "Trial", "CR-2", "Financial case", ""]] },
      {
        name: "Appeal List",
        rows: [HEADERS, ["Judge A", "10am", "Court 1", "Trial", "CR-1", "Appeal case", ""], ["", "10am", "Court 1", "Trial", "CR-3", "Another", ""]]
      }
    ]);

    // Act
    const error = (await captureError(createMultiSheetConverter(buffer, SHEETS, { matchByNameOnly: true }))) as ExcelValidationError;

    // Assert
    expect(isExcelValidationError(error)).toBe(true);
    expect(error.issues.map(({ sheetName, sheetKey, rowNumber, columnHeader }) => ({ sheetName, sheetKey, rowNumber, columnHeader }))).toEqual([
      { sheetName: "Appeal List", sheetKey: "appealList", rowNumber: 2, columnHeader: "Judge" },
      { sheetName: "Financial List", sheetKey: "financialList", rowNumber: 1, columnHeader: "Time" }
    ]);
    expect(error.message).toBe("Error in row 3: Missing required field 'Judge' in row 3");
  });

  it("should keep row positions for every tab in the partial data", async () => {
    // Arrange
    const buffer = await createWorkbook([
      { name: "Appeal List", rows: [HEADERS, ["", "10am", "Court 1", "Trial", "CR-1", "Appeal case", ""]] },
      { name: "Financial List", rows: [HEADERS, ["Judge B", "2pm", "Court 2", "Trial", "CR-2", "Financial case", ""]] }
    ]);

    // Act
    const error = (await captureError(createMultiSheetConverter(buffer, SHEETS, { matchByNameOnly: true }))) as ExcelValidationError;

    // Assert
    const partialData = error.partialData as Record<string, { judge: string; caseName: string }[]>;
    expect(partialData.appealList).toHaveLength(1);
    expect(partialData.appealList[0].judge).toBe("");
    expect(partialData.financialList[0].caseName).toBe("Financial case");
  });

  it("should use the actual tab name under the positional fallback", async () => {
    // Arrange
    const buffer = await createWorkbook([{ name: "Sheet 1", rows: [HEADERS, ["", "10am", "Court 1", "Trial", "CR-1", "Case", ""]] }]);

    // Act
    const error = (await captureError(createMultiSheetConverter(buffer, SHEETS))) as ExcelValidationError;

    // Assert
    expect(error.issues[0].sheetName).toBe("Sheet 1");
    expect(error.issues[0].sheetKey).toBe("appealList");
  });

  it("should report a tab with missing headers once, alongside other tabs' errors", async () => {
    // Arrange
    const buffer = await createWorkbook([
      {
        name: "Appeal List",
        rows: [
          ["Judge", "Venue"],
          ["Judge A", "Court 1"]
        ]
      },
      { name: "Financial List", rows: [HEADERS, ["Judge B", "half ten", "Court 2", "Trial", "CR-2", "Financial case", ""]] }
    ]);

    // Act
    const error = (await captureError(createMultiSheetConverter(buffer, SHEETS, { matchByNameOnly: true }))) as ExcelValidationError;

    // Assert
    expect(error.issues).toHaveLength(2);
    expect(error.issues[0]).toMatchObject({ sheetName: "Appeal List", reason: "Missing columns: Time, Type, Case Number, Case Name, Additional Information" });
    expect(error.issues[0].rowNumber).toBeUndefined();
    expect(error.issues[1]).toMatchObject({ sheetName: "Financial List", rowNumber: 1, columnHeader: "Time" });
  });

  it("should rethrow a non-validation error from a tab at once", async () => {
    // Arrange
    const sheets: SheetConfig[] = [{ ...SHEETS[0], config: { ...FIXTURE_CONFIG, minRows: 2 } }, SHEETS[1]];
    const buffer = await createWorkbook([
      { name: "Appeal List", rows: [HEADERS, ROW] },
      { name: "Financial List", rows: [HEADERS, ["", "half ten", "Court 2", "Trial", "CR-2", "Financial case", ""]] }
    ]);

    // Act
    const error = await captureError(createMultiSheetConverter(buffer, sheets, { matchByNameOnly: true }));

    // Assert
    expect(isExcelValidationError(error)).toBe(false);
    expect((error as Error).message).toBe("Excel file must contain at least 2 data rows");
  });

  it("should throw ExcelFileReadError for a corrupt workbook", async () => {
    // Act
    const error = await captureError(createMultiSheetConverter(Buffer.from("not a workbook"), SHEETS));

    // Assert
    expect(isExcelFileReadError(error)).toBe(true);
  });
});
