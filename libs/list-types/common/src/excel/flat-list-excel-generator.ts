import ExcelJS from "exceljs";
import { autoFitColumns, sanitiseCellValue, saveExcelToStorage } from "./excel-utilities.js";

const MAX_WORKSHEET_NAME_LENGTH = 31;

export async function generateFlatListExcel<T>(options: FlatListExcelOptions<T>): Promise<FlatListExcelResult> {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(options.worksheetName.slice(0, MAX_WORKSHEET_NAME_LENGTH));

    const headerRow = worksheet.addRow(options.columns.map((column) => column.header));
    headerRow.font = { bold: true };

    for (const row of options.rows) {
      worksheet.addRow(options.columns.map((column) => sanitiseCellValue(column.value(row) ?? "")));
    }

    autoFitColumns(worksheet);

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const { excelPath } = await saveExcelToStorage(options.artefactId, buffer);

    return { success: true, excelPath };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export interface FlatListExcelColumn<T> {
  header: string;
  value: (row: T) => string | undefined;
}

export interface FlatListExcelOptions<T> {
  artefactId: string;
  worksheetName: string;
  columns: FlatListExcelColumn<T>[];
  rows: T[];
}

export interface FlatListExcelResult {
  success: boolean;
  excelPath?: string;
  error?: string;
}
