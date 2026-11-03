import { CONTAINER, uploadBlob } from "@hmcts/azure-blob";
import ExcelJS from "exceljs";

const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const CSV_INJECTION_CHARS = ["=", "+", "-", "@"];

const COLUMN_PADDING = 2;
const MIN_COLUMN_WIDTH = 10;
const MAX_COLUMN_WIDTH = 60;
const MAX_SHEET_NAME_LENGTH = 31;

export function sanitiseCellValue(value: string): string {
  if (CSV_INJECTION_CHARS.includes(value[0])) {
    return `'${value}`;
  }
  return value;
}

/**
 * ExcelJS cannot autofit, so widths are measured from the longest line in each
 * cell. Capped so a long offence wording does not push later columns off screen.
 */
export function autoFitColumns(worksheet: ExcelJS.Worksheet): void {
  // ExcelJS leaves columns null until a row is added.
  for (const column of worksheet.columns ?? []) {
    let longest = 0;

    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const lines = String(cell.value ?? "").split("\n");
      for (const line of lines) {
        if (line.length > longest) longest = line.length;
      }
    });

    column.width = Math.min(Math.max(longest + COLUMN_PADDING, MIN_COLUMN_WIDTH), MAX_COLUMN_WIDTH);
  }
}

export async function createSingleSheetExcelBuffer(sheetName: string, headers: string[], rows: string[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName.slice(0, MAX_SHEET_NAME_LENGTH));

  worksheet.addRow(headers).font = { bold: true };
  for (const row of rows) {
    worksheet.addRow(row.map(sanitiseCellValue));
  }
  autoFitColumns(worksheet);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function saveExcelToStorage(artefactId: string, buffer: Buffer): Promise<{ excelPath: string }> {
  const blobKey = `${artefactId}.xlsx`;
  await uploadBlob(blobKey, buffer, XLSX_CONTENT_TYPE, CONTAINER.PUBLICATIONS);
  return { excelPath: blobKey };
}
