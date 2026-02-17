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

/**
 * Generic converter for multi-sheet Excel files
 * Converts each sheet according to its configuration and returns an object with the results
 *
 * @param buffer - Excel file buffer
 * @param sheets - Array of sheet configurations
 * @returns Object with keys from dataKey containing the converted data
 *
 * @example
 * const result = await createMultiSheetConverter(buffer, [
 *   { worksheetName: "Main hearings", worksheetIndex: 0, dataKey: "mainHearings", config: STANDARD_CONFIG },
 *   { worksheetName: "Planning Court", worksheetIndex: 1, dataKey: "planningCourt", config: STANDARD_CONFIG }
 * ]);
 * // Returns: { mainHearings: [...], planningCourt: [...] }
 */
export async function createMultiSheetConverter(buffer: Buffer, sheets: SheetConfig[]): Promise<Record<string, any[]>> {
  const workbook = new Workbook();
  // @ts-expect-error - ExcelJS types expect Node Buffer but accepts our Buffer type at runtime
  await workbook.xlsx.load(buffer);

  // Ensure at least one worksheet exists
  if (!workbook.worksheets[0]) {
    throw new Error("Excel file must contain at least one worksheet");
  }

  const result: Record<string, any[]> = {};

  for (const sheet of sheets) {
    const worksheet = workbook.getWorksheet(sheet.worksheetName) || workbook.worksheets[sheet.worksheetIndex];
    result[sheet.dataKey] = worksheet ? await convertSheetToJson(worksheet, sheet.config) : [];
  }

  return result;
}
