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
