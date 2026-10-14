import ExcelJSPkg from "exceljs";
import { type FieldConfig, findFieldForHeader, readCellValue } from "../conversion/excel-to-json.js";
import { resolveWorksheet } from "../conversion/multi-sheet-converter.js";

const { Workbook } = ExcelJSPkg;

const HEADER_ROW_NUMBER = 1;

export async function reformatUploadedWorkbook(buffer: Buffer, sheets: ReformatSheetConfig[]): Promise<Buffer> {
  const workbook = new Workbook();
  // @ts-expect-error - ExcelJS types expect Node Buffer but accepts our Buffer type at runtime
  await workbook.xlsx.load(buffer);

  // A single-sheet upload can resolve to the same worksheet for several configs; only the first config fed the PDF
  const reformattedWorksheets = new Set<ExcelJSPkg.Worksheet>();

  for (const sheet of sheets) {
    const worksheet = resolveWorksheet(workbook, sheet);
    if (worksheet && !reformattedWorksheets.has(worksheet)) {
      reformattedWorksheets.add(worksheet);
      reformatWorksheet(worksheet, sheet);
    }
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function reformatWorksheet(worksheet: ExcelJSPkg.Worksheet, sheet: ReformatSheetConfig): void {
  const headerRow = worksheet.getRow(HEADER_ROW_NUMBER);
  const fieldNameByColumn = mapColumnsToFieldNames(headerRow, sheet.fields);

  if (fieldNameByColumn.size === 0) {
    return;
  }

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber !== HEADER_ROW_NUMBER) {
      rewriteDataRow(row, fieldNameByColumn, sheet);
    }
  });

  rewriteHeaderRow(headerRow, fieldNameByColumn, sheet.headers);
}

function mapColumnsToFieldNames(headerRow: ExcelJSPkg.Row, fields: FieldConfig[]): Map<number, string> {
  const fieldNameByColumn = new Map<number, string>();

  headerRow.eachCell((cell, colNumber) => {
    const field = findFieldForHeader(fields, readCellValue(cell.value));
    if (field) {
      fieldNameByColumn.set(colNumber, field.fieldName);
    }
  });

  return fieldNameByColumn;
}

function rewriteDataRow(row: ExcelJSPkg.Row, fieldNameByColumn: Map<number, string>, sheet: ReformatSheetConfig): void {
  const emptyRow = Object.fromEntries(sheet.fields.map((field) => [field.fieldName, ""]));
  const rawRow = { ...emptyRow };

  for (const [colNumber, fieldName] of fieldNameByColumn) {
    rawRow[fieldName] = readCellValue(row.getCell(colNumber).value);
  }

  const formattedRow = sheet.formatRow(rawRow);

  for (const [colNumber, fieldName] of fieldNameByColumn) {
    row.getCell(colNumber).value = formattedRow[fieldName] ?? "";
  }
}

function rewriteHeaderRow(headerRow: ExcelJSPkg.Row, fieldNameByColumn: Map<number, string>, headers: Readonly<Record<string, string>>): void {
  for (const [colNumber, fieldName] of fieldNameByColumn) {
    const cell = headerRow.getCell(colNumber);
    const heading = headers[fieldName];

    if (heading !== undefined) {
      cell.value = heading;
    }
    // Replace the style object rather than mutating it, as ExcelJS can share style objects between cells
    cell.style = { ...cell.style, font: { ...cell.style.font, bold: true } };
  }
}

export interface ReformatSheetConfig {
  worksheetName?: string;
  worksheetIndex: number;
  fields: FieldConfig[];
  headers: Readonly<Record<string, string>>;
  formatRow: (row: Record<string, string>) => Record<string, string>;
}
