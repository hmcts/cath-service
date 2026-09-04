import ExcelJSPkg from "exceljs";
import { convertExcelToJson, type ExcelConverterConfig } from "./excel-to-json.js";

const { Workbook } = ExcelJSPkg;

/**
 * Converts a single worksheet to JSON using the provided configuration
 * This is a helper for multi-sheet Excel converters
 */
export async function convertSheetToJson(worksheet: any, config: ExcelConverterConfig): Promise<any[]> {
  // Create a temporary buffer from the sheet
  const workbook = new Workbook();
  const tempSheet = workbook.addWorksheet("temp");

  // Copy all rows from source to temp worksheet
  worksheet.eachRow((row: any, rowNumber: number) => {
    const newRow = tempSheet.getRow(rowNumber);
    row.eachCell((cell: any, colNumber: number) => {
      newRow.getCell(colNumber).value = cell.value;
    });
    newRow.commit();
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return convertExcelToJson(Buffer.from(buffer), config);
}

export interface SheetConfig {
  /** Name of the worksheet to find (e.g., "Main hearings") */
  worksheetName: string;
  /** Fallback worksheet index if name not found (0-based) */
  worksheetIndex: number;
  /** Field name for this sheet's data in the returned object */
  dataKey: string;
  /** Configuration for converting this sheet */
  config: ExcelConverterConfig;
}

export interface MultiSheetConverterOptions {
  /**
   * Match worksheets by exact name only, disabling the positional-index fallback.
   * When true, a workbook whose tabs match none of the configured worksheet names is
   * rejected (throws) rather than silently filing data into the sheet at index 0. A tab
   * that matches no section still yields an empty array for that section. Use this for
   * lists where sibling tabs share the same field config (so the positional fallback
   * cannot distinguish sections and would mis-file data).
   */
  matchByNameOnly?: boolean;
}

/**
 * Generic converter for multi-sheet Excel files
 * Converts each sheet according to its configuration and returns an object with the results
 *
 * @param buffer - Excel file buffer
 * @param sheets - Array of sheet configurations
 * @param options - Optional behaviour flags; see {@link MultiSheetConverterOptions}
 * @returns Object with keys from dataKey containing the converted data
 *
 * @example
 * const result = await createMultiSheetConverter(buffer, [
 *   { worksheetName: "Main hearings", worksheetIndex: 0, dataKey: "mainHearings", config: STANDARD_CONFIG },
 *   { worksheetName: "Planning Court", worksheetIndex: 1, dataKey: "planningCourt", config: STANDARD_CONFIG }
 * ]);
 * // Returns: { mainHearings: [...], planningCourt: [...] }
 */
export async function createMultiSheetConverter(
  buffer: Buffer,
  sheets: SheetConfig[],
  options: MultiSheetConverterOptions = {}
): Promise<Record<string, any[]>> {
  const workbook = new Workbook();
  // @ts-expect-error - ExcelJS types expect Node Buffer but accepts our Buffer type at runtime
  await workbook.xlsx.load(buffer);

  // Ensure at least one worksheet exists
  if (!workbook.worksheets[0]) {
    throw new Error("Excel file must contain at least one worksheet");
  }

  // In name-only mode, a workbook whose tabs match none of the expected section names would
  // otherwise produce a silently-empty (or, without this mode, mis-filed) list. Reject it so
  // the publisher gets a clear error naming the tabs the workbook must contain.
  if (options.matchByNameOnly && !sheets.some((sheet) => findWorksheetByName(workbook, sheet.worksheetName))) {
    throw new Error(`Excel file has no recognised worksheet tabs. Expected tabs named: ${sheets.map((sheet) => sheet.worksheetName).join(", ")}`);
  }

  const result: Record<string, any[]> = {};

  for (const sheet of sheets) {
    const worksheet = options.matchByNameOnly
      ? findWorksheetByName(workbook, sheet.worksheetName)
      : workbook.getWorksheet(sheet.worksheetName) || workbook.worksheets[sheet.worksheetIndex];
    result[sheet.dataKey] = worksheet ? await convertSheetToJson(worksheet, sheet.config) : [];
  }

  return result;
}

// Excel truncates worksheet names to 31 characters, so a section named longer than that
// (e.g. "Intellectual Property and Enterprise Court") is stored under its truncated form.
// Match on the exact name first, then fall back to the truncated form so long section names
// still resolve by name rather than needing the positional-index fallback.
const EXCEL_WORKSHEET_NAME_MAX_LENGTH = 31;

function findWorksheetByName(workbook: InstanceType<typeof Workbook>, worksheetName: string): any {
  return workbook.getWorksheet(worksheetName) || workbook.getWorksheet(worksheetName.slice(0, EXCEL_WORKSHEET_NAME_MAX_LENGTH));
}
