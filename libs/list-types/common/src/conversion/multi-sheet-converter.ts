import ExcelJSPkg from "exceljs";
import { convertExcelToJson, type ExcelConverterConfig, loadWorkbook } from "./excel-to-json.js";
import { ExcelValidationError, type ExcelValidationIssue, isExcelValidationError } from "./excel-validation-error.js";

const { Workbook } = ExcelJSPkg;

// Excel truncates worksheet names to 31 characters, so a section named longer than that
// (e.g. "Intellectual Property and Enterprise Court") is stored under its truncated form.
// Match on the exact name first, then fall back to the truncated form so long section names
// still resolve by name rather than needing the positional-index fallback.
const EXCEL_WORKSHEET_NAME_MAX_LENGTH = 31;

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
   * rejected (throws) rather than silently filing data into the sheet at index 0. A section
   * whose tab is missing is left out of the result. Use this for
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
  const workbook = await loadWorkbook(buffer);

  // Ensure at least one worksheet exists
  if (!workbook.worksheets[0]) {
    throw new Error("Excel file must contain at least one worksheet");
  }

  // In name-only mode, a workbook whose tabs match none of the expected section names would
  // otherwise produce a silently-empty (or, without this mode, mis-filed) list. Reject it so
  // the publisher gets a clear error naming the tabs the workbook must contain.
  if (options.matchByNameOnly && !sheets.some((sheet) => findWorksheetByName(workbook, sheet.worksheetName))) {
    const message = `Excel file has no recognised worksheet tabs. Expected tabs named: ${sheets.map((sheet) => sheet.worksheetName).join(", ")}`;
    throw new ExcelValidationError([{ reason: message, message }]);
  }

  const result: Record<string, any[]> = {};
  const issues: ExcelValidationIssue[] = [];

  // A tab that cannot be found is left out of the result, so the list type schema decides whether it is required.
  // Every found tab is converted, even after one fails, so the publisher sees every error in one upload.
  for (const sheet of sheets) {
    const worksheet = resolveWorksheet(workbook, sheet, options.matchByNameOnly);
    if (!worksheet) {
      continue;
    }

    try {
      result[sheet.dataKey] = await convertSheetToJson(worksheet, sheet.config);
    } catch (error) {
      if (!isExcelValidationError(error)) {
        throw error;
      }
      issues.push(...error.issues.map((issue) => ({ ...issue, sheetName: worksheet.name, sheetKey: sheet.dataKey })));
      result[sheet.dataKey] = Array.isArray(error.partialData) ? error.partialData : [];
    }
  }

  if (issues.length > 0) {
    throw new ExcelValidationError(issues, result);
  }

  return result;
}

export function resolveWorksheet(workbook: ExcelJSPkg.Workbook, sheet: WorksheetLocator, matchByNameOnly = false): ExcelJSPkg.Worksheet | undefined {
  // getWorksheet(undefined) returns the first sheet, so only look up by name when one is given
  const namedWorksheet = sheet.worksheetName ? findWorksheetByName(workbook, sheet.worksheetName) : undefined;
  return matchByNameOnly ? namedWorksheet : namedWorksheet || workbook.worksheets[sheet.worksheetIndex];
}

function findWorksheetByName(workbook: ExcelJSPkg.Workbook, worksheetName: string): ExcelJSPkg.Worksheet | undefined {
  const candidates = [worksheetName, worksheetName.slice(0, EXCEL_WORKSHEET_NAME_MAX_LENGTH)];
  const exactMatch = candidates.map((name) => workbook.getWorksheet(name)).find(Boolean);
  if (exactMatch) {
    return exactMatch;
  }

  // PIP keys each tab by its camelCased name, so it accepts a tab whose case or spacing differs
  // from the template (e.g. "Commercial court" or "Commercial Court "). Match the same way.
  const candidateKeys = candidates.map(toSheetKey);
  return workbook.worksheets.find((worksheet) => worksheet && candidateKeys.includes(toSheetKey(worksheet.name)));
}

// Mirrors Apache Commons CaseUtils.toCamelCase(name, false, ' '), which PIP uses to key each tab
function toSheetKey(name: string): string {
  return name
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join("");
}

export interface WorksheetLocator {
  worksheetName?: string;
  worksheetIndex: number;
}
